const express = require('express');
const router = express.Router();

const { authenticate, adminOnly, adminOrManager, canProduce, canSell } = require('../middleware/auth');
const { login, getProfile, changePassword }             = require('../controllers/authController');
const { getAllUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { getAllSeedlings, getSeedlingById, createSeedling, updateSeedling, deleteSeedling, getLowStockSeedlings } = require('../controllers/seedlingController');
const { getAllBatches, createSeedBatch, createAsexualBatch, getBatchById } = require('../controllers/productionController');
const { getAllSales, getSaleById, createSale, getTodaySummary, getMonthlySales } = require('../controllers/salesController');
const { getStockSummary, getStockLedger, stockAdjustment, getAllDamages, reportDamage, getDashboardStats } = require('../controllers/stockController');
const db = require('../config/db');

// ============================================================
// FY HELPER — অর্থবছর তারিখ নির্ধারণ
// ============================================================
const getCurrentFY = () => {
    const now = new Date();
    return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
};
const getFYDates = (fy) => {
    const f = parseInt(fy) || getCurrentFY();
    return { start: `${f}-07-01`, end: `${f+1}-06-30`, fy: f };
};

// FY Middleware — সব route-এ req.fy, req.fyStart, req.fyEnd inject করে
const fyMiddleware = (req, res, next) => {
    const { start, end, fy } = getFYDates(req.query.fy);
    req.fy = fy;
    req.fyStart = start;
    req.fyEnd = end;
    next();
};

// ============================================================
// AUTH ROUTES
// ============================================================
router.post('/auth/login',           login);
router.get ('/auth/profile',         authenticate, getProfile);
router.put ('/auth/change-password', authenticate, changePassword);

// ============================================================
// DASHBOARD — FY-ভিত্তিক stats
// ============================================================
router.get('/dashboard/stats', authenticate, fyMiddleware, async (req, res) => {
    try {
        const { fyStart, fyEnd } = req;
        const [sales, todaySales, prod, stock, damages, lowStock, recentSales] = await Promise.all([
            db.query(`SELECT COUNT(*) AS total_invoices, COALESCE(SUM(total_amount),0) AS total_revenue, COALESCE(SUM(CASE WHEN payment_status='due' THEN total_amount ELSE 0 END),0) AS due_amount FROM sales WHERE sale_date BETWEEN $1 AND $2`, [fyStart, fyEnd]),
            db.query(`SELECT COALESCE(SUM(total_amount),0) AS today_revenue, COUNT(*) AS today_invoices FROM sales WHERE sale_date=CURRENT_DATE`),
            db.query(`SELECT COUNT(*) AS total_batches, COALESCE(SUM(produced_quantity),0) AS total_produced, COALESCE(SUM(success_quantity),0) AS total_success, COALESCE(SUM(failed_quantity),0) AS total_failed, COALESCE(AVG(CASE WHEN success_percent>0 THEN success_percent END),0) AS avg_success, COUNT(CASE WHEN status='active' THEN 1 END) AS active_batches FROM production_batches WHERE sowing_date BETWEEN $1 AND $2`, [fyStart, fyEnd]),
            db.query(`SELECT COUNT(*) AS total_species, COALESCE(SUM(current_stock),0) AS total_stock, COALESCE(SUM(current_stock*unit_price),0) AS stock_value FROM seedlings WHERE is_active=TRUE`),
            db.query(`SELECT COALESCE(SUM(quantity),0) AS total_damaged FROM damages WHERE damage_date BETWEEN $1 AND $2`, [fyStart, fyEnd]),
            db.query(`SELECT s.name_bn, s.seedling_code, s.current_stock, s.min_stock_alert FROM seedlings s WHERE s.is_active=TRUE AND s.current_stock<=s.min_stock_alert ORDER BY s.current_stock ASC LIMIT 5`),
            db.query(`SELECT s.invoice_no, s.customer_name, s.total_amount, s.payment_status, s.sale_date FROM sales s WHERE s.sale_date BETWEEN $1 AND $2 ORDER BY s.created_at DESC LIMIT 5`, [fyStart, fyEnd]),
        ]);
        res.json({ success: true, data: {
            // Master data — FY filter নেই
            seedling_types: parseInt(stock.rows[0].total_species || 0),
            total_stock:    parseInt(stock.rows[0].total_stock || 0),
            stock_value:    parseFloat(stock.rows[0].stock_value || 0),
            low_stock_count: lowStock.rows.length,
            // Today — FY filter নেই
            today_revenue:  parseFloat(todaySales.rows[0].today_revenue || 0),
            today_invoices: parseInt(todaySales.rows[0].today_invoices || 0),
            today_production: parseInt(prod.rows[0].total_produced || 0),
            // FY-ভিত্তিক stats
            monthly_revenue:  parseFloat(sales.rows[0].total_revenue || 0),
            total_invoices:   parseInt(sales.rows[0].total_invoices || 0),
            due_amount:       parseFloat(sales.rows[0].due_amount || 0),
            total_produced:   parseInt(prod.rows[0].total_produced || 0),
            total_success:    parseInt(prod.rows[0].total_success || 0),
            total_failed:     parseInt(prod.rows[0].total_failed || 0),
            avg_success:      parseFloat(prod.rows[0].avg_success || 0),
            active_batches:   parseInt(prod.rows[0].active_batches || 0),
            total_damaged:    parseInt(damages.rows[0].total_damaged || 0),
            // Lists
            low_stock:    lowStock.rows,
            recent_sales: recentSales.rows,
            fy: req.fy
        }});
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// USER ROUTES
// ============================================================
router.get   ('/users',     authenticate, adminOnly, getAllUsers);
router.post  ('/users',     authenticate, adminOnly, createUser);
router.put   ('/users/:id', authenticate, adminOnly, updateUser);
router.delete('/users/:id', authenticate, adminOnly, deleteUser);

// ============================================================
// CATEGORY ROUTES
// ============================================================
router.get('/categories', authenticate, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM categories ORDER BY name_bn');
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.post('/categories', authenticate, adminOnly, async (req, res) => {
    const { name_bn, name_en } = req.body;
    if (!name_bn) return res.status(400).json({ success: false, message: 'বাংলা নাম দিন।' });
    try {
        const exists = await db.query('SELECT id FROM categories WHERE name_bn=$1', [name_bn]);
        if (exists.rows.length) return res.status(400).json({ success: false, message: 'এই ক্যাটাগরি আগে থেকে আছে।' });
        const result = await db.query('INSERT INTO categories (name_bn, name_en) VALUES ($1,$2) RETURNING *', [name_bn, name_en||null]);
        res.json({ success: true, message: 'ক্যাটাগরি যোগ হয়েছে।', data: result.rows[0] });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.delete('/categories/:id', authenticate, adminOnly, async (req, res) => {
    try {
        const used = await db.query('SELECT COUNT(*) FROM seedlings WHERE category_id=$1', [req.params.id]);
        if (parseInt(used.rows[0].count) > 0) return res.status(400).json({ success: false, message: 'এই ক্যাটাগরিতে চারা আছে — মুছা যাবে না।' });
        await db.query('DELETE FROM categories WHERE id=$1', [req.params.id]);
        res.json({ success: true, message: 'ক্যাটাগরি মুছে ফেলা হয়েছে।' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// SEEDLING ROUTES — Master data, FY filter নেই
// ============================================================
router.get   ('/seedlings/low-stock', authenticate, getLowStockSeedlings);
router.get   ('/seedlings',           authenticate, getAllSeedlings);
router.get   ('/seedlings/:id',       authenticate, getSeedlingById);
router.post  ('/seedlings',           authenticate, canProduce, createSeedling);
router.put   ('/seedlings/:id',       authenticate, canProduce, updateSeedling);
router.delete('/seedlings/:id', authenticate, adminOrManager, async (req, res) => {
    try {
        const item = await db.query('SELECT * FROM seedlings WHERE id=$1', [req.params.id]);
        if (item.rows.length) {
            await db.query('INSERT INTO recycle_bin (table_name,record_id,record_data,module,item_name,deleted_by) VALUES ($1,$2,$3,$4,$5,$6)', ['seedlings', req.params.id, JSON.stringify(item.rows[0]), 'চারা তালিকা', item.rows[0].name_bn, req.user.id]);
        }
        await db.query('DELETE FROM damages WHERE seedling_id=$1', [req.params.id]);
        await db.query('DELETE FROM sales_items WHERE seedling_id=$1', [req.params.id]);
        await db.query('DELETE FROM stock_transactions WHERE seedling_id=$1', [req.params.id]);
        await db.query('UPDATE mother_plants SET seedling_id=NULL WHERE seedling_id=$1', [req.params.id]);
        await db.query('UPDATE production_batches SET seedling_id=NULL WHERE seedling_id=$1', [req.params.id]);
        await db.query('DELETE FROM seedlings WHERE id=$1', [req.params.id]);
        res.json({ success: true, message: 'চারা Recycle Bin-এ পাঠানো হয়েছে।' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// PRODUCTION ROUTES — FY filter যোগ
// ============================================================
router.get('/production', authenticate, fyMiddleware, async (req, res) => {
    try {
        const { fyStart, fyEnd } = req;
        const result = await db.query(
            `SELECT pb.*,
                    s.name_bn AS seedling_bn,
                    s.variety AS seedling_variety,
                    s.seedling_code
             FROM production_batches pb
             LEFT JOIN seedlings s ON pb.seedling_id=s.id
             WHERE (
                (pb.sowing_date IS NOT NULL AND pb.sowing_date BETWEEN $1 AND $2)
                OR
                (pb.sowing_date IS NULL AND pb.propagation_date IS NOT NULL AND pb.propagation_date BETWEEN $1 AND $2)
                OR
                (pb.sowing_date IS NULL AND pb.propagation_date IS NULL AND DATE(pb.created_at) BETWEEN $1 AND $2)
             )
             ORDER BY pb.created_at DESC`,
            [fyStart, fyEnd]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.get ('/production/:id', authenticate, getBatchById);
router.post('/production/seed',    authenticate, canProduce, createSeedBatch);
router.post('/production/asexual', authenticate, canProduce, createAsexualBatch);
router.post('/production/:id/update', authenticate, canProduce, async (req, res) => {
    const { id } = req.params;
    const fields = req.body;
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // পুরানো batch data নাও
        const oldBatch = await client.query('SELECT * FROM production_batches WHERE id=$1', [id]);
        if (!oldBatch.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'ব্যাচ পাওয়া যায়নি।' });
        }
        const old = oldBatch.rows[0];

        const setClauses = []; const values = []; let idx = 1;
        const allowed = ['produced_quantity','success_quantity','failed_quantity','seed_source','seed_quantity','sowing_date','germination_date','germination_percent','propagation_date','success_percent','remarks','status','available_quantity'];
        for (const key of allowed) {
            if (fields[key] !== undefined) { setClauses.push(`${key} = $${idx++}`); values.push(fields[key]); }
        }
        if (setClauses.length === 0) {
            await client.query('ROLLBACK');
            return res.json({ success: true, message: 'কিছু পরিবর্তন নেই।' });
        }
        values.push(id);
        const result = await client.query(
            `UPDATE production_batches SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );

        // ✅ produced_quantity পরিবর্তন হলে current_stock sync করো
        const newProduced = parseInt(fields.produced_quantity);
        const oldProduced = parseInt(old.produced_quantity || 0);
        if (!isNaN(newProduced) && newProduced !== oldProduced && old.seedling_id) {
            const diff = newProduced - oldProduced;
            await client.query(
                'UPDATE seedlings SET current_stock = GREATEST(0, current_stock + $1) WHERE id = $2',
                [diff, old.seedling_id]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'ব্যাচ আপডেট হয়েছে।', data: result.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, error: err.message });
    } finally { client.release(); }
});

// ============================================================
// MOTHER PLANT ROUTES — Master data, FY filter নেই
// ============================================================
router.get('/mother-plants', authenticate, async (req, res) => {
    try {
        const result = await db.query(`SELECT mp.*, s.name_bn AS seedling_bn, s.seedling_code FROM mother_plants mp LEFT JOIN seedlings s ON mp.seedling_id=s.id WHERE mp.is_active=TRUE ORDER BY mp.mp_code`);
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.post('/mother-plants', authenticate, canProduce, async (req, res) => {
    const { variety, seedling_id, age_years, location, health_status, notes } = req.body;
    try {
        const countResult = await db.query('SELECT COUNT(*) FROM mother_plants');
        const mp_code = 'MP-' + String(parseInt(countResult.rows[0].count)+1).padStart(3,'0');
        const result = await db.query(`INSERT INTO mother_plants (mp_code,variety,seedling_id,age_years,location,health_status,notes,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [mp_code,variety,seedling_id,age_years,location,health_status||'good',notes,req.user.id]);
        res.status(201).json({ success: true, message: 'মাদার প্ল্যান্ট যোগ হয়েছে।', data: result.rows[0] });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// STOCK ROUTES — মোট স্টক FY filter নেই, Ledger FY filter আছে
// ============================================================
router.get ('/stock', authenticate, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                s.id, s.name_bn, s.variety, s.seedling_code,
                s.unit_price, s.category_id, s.current_stock, s.min_stock_alert,
                c.name_bn AS category_bn,
                CASE WHEN s.current_stock <= COALESCE(s.min_stock_alert, 0)
                     THEN true ELSE false END AS is_low_stock,

                COALESCE((
                    SELECT SUM(t.quantity)
                    FROM stock_transactions t
                    WHERE t.seedling_id = s.id AND t.txn_type = 'opening_balance'
                ), 0) AS opening_balance,

                COALESCE((
                    SELECT SUM(pb.produced_quantity)
                    FROM production_batches pb
                    WHERE pb.seedling_id = s.id
                ), 0) AS total_produced,

                COALESCE((
                    SELECT SUM(si.quantity)
                    FROM sales_items si
                    JOIN sales sl ON si.sale_id = sl.id
                    WHERE si.seedling_id = s.id
                ), 0) AS total_sale,

                COALESCE((
                    SELECT SUM(d.quantity)
                    FROM damages d
                    WHERE d.seedling_id = s.id
                ), 0) AS total_damage

            FROM seedlings s
            LEFT JOIN categories c ON s.category_id = c.id
            WHERE s.is_active = true
            ORDER BY s.name_bn
        `);
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.get ('/stock/ledger',     authenticate, fyMiddleware, async (req, res) => {
    try {
        const { fyStart, fyEnd } = req;
        const result = await db.query(
            `SELECT st.*, s.name_bn, s.seedling_code
             FROM stock_transactions st
             LEFT JOIN seedlings s ON st.seedling_id=s.id
             WHERE st.created_at BETWEEN $1 AND $2
             ORDER BY st.created_at DESC`,
            [fyStart, fyEnd]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.post('/stock/adjustment', authenticate, adminOrManager, stockAdjustment);

// ============================================================
// SALES ROUTES — FY filter যোগ
// ============================================================
router.get('/sales', authenticate, fyMiddleware, async (req, res) => {
    try {
        const { fyStart, fyEnd } = req;
        const result = await db.query(
            `SELECT s.*, u.name AS created_by_name FROM sales s LEFT JOIN users u ON s.created_by=u.id WHERE s.sale_date BETWEEN $1 AND $2 ORDER BY s.created_at DESC`,
            [fyStart, fyEnd]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.get ('/sales/today',   authenticate, getTodaySummary);
router.get ('/sales/monthly', authenticate, getMonthlySales);
router.get ('/sales/:id',     authenticate, getSaleById);
router.post('/sales',         authenticate, canSell, createSale);
router.put ('/sales/:id',     authenticate, canSell, async (req, res) => {
    const { customer_name, customer_phone, customer_address, payment_method, payment_status, discount, notes } = req.body;
    try {
        const result = await db.query(`UPDATE sales SET customer_name=COALESCE($1,customer_name), customer_phone=COALESCE($2,customer_phone), customer_address=COALESCE($3,customer_address), payment_method=COALESCE($4,payment_method), payment_status=COALESCE($5,payment_status), discount=COALESCE($6,discount), notes=COALESCE($7,notes) WHERE id=$8 RETURNING *`, [customer_name,customer_phone,customer_address,payment_method,payment_status,discount,notes,req.params.id]);
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'বিক্রয় পাওয়া যায়নি।' });
        res.json({ success: true, message: 'বিক্রয় আপডেট হয়েছে।', data: result.rows[0] });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.delete('/sales/:id', authenticate, adminOrManager, async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const item = await client.query('SELECT * FROM sales WHERE id=$1', [req.params.id]);
        if (!item.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'পাওয়া যায়নি।' }); }
        // Recycle bin
        await client.query('INSERT INTO recycle_bin (table_name,record_id,record_data,module,item_name,deleted_by) VALUES ($1,$2,$3,$4,$5,$6)', ['sales',req.params.id,JSON.stringify(item.rows[0]),'বিক্রয়',item.rows[0].invoice_no,req.user.id]);
        // Stock restore — sold items ফিরিয়ে দাও
        const saleItems = await client.query('SELECT seedling_id, quantity FROM sales_items WHERE sale_id=$1', [req.params.id]);
        for (const si of saleItems.rows) {
            if (si.seedling_id && si.quantity > 0) {
                await client.query('UPDATE seedlings SET current_stock=current_stock+$1 WHERE id=$2', [si.quantity, si.seedling_id]);
            }
        }
        // stock_transactions মুছো
        await client.query("DELETE FROM stock_transactions WHERE reference_type='sale' AND reference_id=$1", [req.params.id]);
        await client.query('DELETE FROM sales_items WHERE sale_id=$1', [req.params.id]);
        await client.query('DELETE FROM sales WHERE id=$1', [req.params.id]);
        await client.query('COMMIT');
        res.json({ success: true, message: 'বিক্রয় Recycle Bin-এ পাঠানো হয়েছে।' });
    } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ success: false, error: err.message }); }
    finally { client.release(); }
});

// ============================================================
// DAMAGE ROUTES — FY filter যোগ
// ============================================================
router.get('/damages', authenticate, fyMiddleware, async (req, res) => {
    try {
        const { fyStart, fyEnd } = req;
        const result = await db.query(
            `SELECT d.*, s.name_bn, s.variety, s.seedling_code, pb.batch_code FROM damages d LEFT JOIN seedlings s ON d.seedling_id=s.id LEFT JOIN production_batches pb ON d.batch_id=pb.id WHERE d.damage_date BETWEEN $1 AND $2 ORDER BY d.damage_date DESC`,
            [fyStart, fyEnd]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.post('/damages', authenticate, canProduce, reportDamage);
router.put('/damages/:id', authenticate, adminOrManager, async (req, res) => {
    const { seedling_id, batch_id, damage_date, quantity, reason, remarks } = req.body;
    try {
        const old = await db.query('SELECT quantity, seedling_id FROM damages WHERE id=$1', [req.params.id]);
        if (old.rows.length) {
            const diff = parseInt(quantity)-parseInt(old.rows[0].quantity);
            if (diff !== 0 && old.rows[0].seedling_id) await db.query('UPDATE seedlings SET current_stock=GREATEST(0,current_stock-$1) WHERE id=$2', [diff, old.rows[0].seedling_id]);
        }
        await db.query(`UPDATE damages SET seedling_id=$1,batch_id=$2,damage_date=$3,quantity=$4,reason=$5,remarks=$6 WHERE id=$7`, [seedling_id,batch_id||null,damage_date,quantity,reason,remarks||null,req.params.id]);
        res.json({ success: true, message: 'ক্ষতি রিপোর্ট আপডেট হয়েছে।' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.delete('/damages/:id', authenticate, adminOrManager, async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const item = await client.query('SELECT * FROM damages WHERE id=$1', [req.params.id]);
        if (item.rows.length) {
            await client.query('INSERT INTO recycle_bin (table_name,record_id,record_data,module,item_name,deleted_by) VALUES ($1,$2,$3,$4,$5,$6)',
                ['damages',req.params.id,JSON.stringify(item.rows[0]),'ক্ষতি/নষ্ট','ক্ষতি #'+req.params.id,req.user.id]);
            const qty = parseInt(item.rows[0].quantity)||0;
            // Stock restore
            if (item.rows[0].seedling_id && qty>0) {
                await client.query('UPDATE seedlings SET current_stock=current_stock+$1 WHERE id=$2', [qty, item.rows[0].seedling_id]);
            }
            // stock_transactions মুছো
            await client.query("DELETE FROM stock_transactions WHERE reference_type='damage' AND reference_id=$1", [req.params.id]);
        }
        await client.query('DELETE FROM damages WHERE id=$1', [req.params.id]);
        await client.query('COMMIT');
        res.json({ success: true, message: 'ক্ষতি রিপোর্ট Recycle Bin-এ পাঠানো হয়েছে।' });
    } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ success: false, error: err.message }); }
    finally { client.release(); }
});

// ============================================================
// CUSTOMER ROUTES — Master data, FY filter নেই
// ============================================================
router.get('/customers', authenticate, async (req, res) => {
    const { search } = req.query;
    try {
        const params = [];
        const where = search ? (params.push(`%${search}%`), `WHERE c.name ILIKE $1 OR c.phone ILIKE $1`) : '';
        const result = await db.query(`SELECT c.*, COUNT(s.id) AS total_orders, COALESCE(SUM(s.total_amount),0) AS total_spent FROM customers c LEFT JOIN sales s ON (c.id=s.customer_id OR c.phone=s.customer_phone) ${where} GROUP BY c.id ORDER BY total_orders DESC, c.name`, params);
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.post('/customers', authenticate, canSell, async (req, res) => {
    const { name, phone, address, email, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'নাম দিন।' });
    try {
        const result = await db.query('INSERT INTO customers (name,phone,address,email,notes) VALUES ($1,$2,$3,$4,$5) RETURNING *', [name,phone,address,email,notes]);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.put('/customers/:id', authenticate, canSell, async (req, res) => {
    const { name, phone, address, email, notes } = req.body;
    try {
        const result = await db.query(`UPDATE customers SET name=$1,phone=$2,address=$3,email=$4,notes=$5 WHERE id=$6 RETURNING *`, [name,phone,address,email,notes,req.params.id]);
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'গ্রাহক পাওয়া যায়নি।' });
        res.json({ success: true, message: 'গ্রাহক আপডেট হয়েছে।', data: result.rows[0] });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.delete('/customers/:id', authenticate, adminOrManager, async (req, res) => {
    try {
        await db.query('DELETE FROM customers WHERE id=$1', [req.params.id]);
        res.json({ success: true, message: 'গ্রাহক মুছে ফেলা হয়েছে।' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// PRODUCTION BATCH DELETE
// ============================================================
router.delete('/production-batches/:id', authenticate, adminOrManager, async (req, res) => {
    try {
        const item = await db.query('SELECT * FROM production_batches WHERE id=$1', [req.params.id]);
        if (item.rows.length) {
            try { await db.query('INSERT INTO recycle_bin (table_name,record_id,record_data,module,item_name,deleted_by) VALUES ($1,$2,$3,$4,$5,$6)', ['production_batches',req.params.id,JSON.stringify(item.rows[0]),'উৎপাদন ব্যাচ',item.rows[0].batch_code,req.user.id]); } catch(e){}
            const produced = parseInt(item.rows[0].produced_quantity)||0;
            if (item.rows[0].seedling_id && produced>0) await db.query('UPDATE seedlings SET current_stock=GREATEST(0,current_stock-$1) WHERE id=$2', [produced,item.rows[0].seedling_id]);
        }
        await db.query('UPDATE damages SET batch_id=NULL WHERE batch_id=$1', [req.params.id]);
        await db.query('UPDATE sales_items SET batch_id=NULL WHERE batch_id=$1', [req.params.id]);
        await db.query('DELETE FROM stock_transactions WHERE batch_id=$1', [req.params.id]);
        await db.query('DELETE FROM production_batches WHERE id=$1', [req.params.id]);
        res.json({ success: true, message: 'ব্যাচ Recycle Bin-এ পাঠানো হয়েছে।' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// MOTHER PLANT DELETE
// ============================================================
router.delete('/mother-plants/:id', authenticate, adminOrManager, async (req, res) => {
    try {
        const item = await db.query('SELECT * FROM mother_plants WHERE id=$1', [req.params.id]);
        if (item.rows.length) await db.query('INSERT INTO recycle_bin (table_name,record_id,record_data,module,item_name,deleted_by) VALUES ($1,$2,$3,$4,$5,$6)', ['mother_plants',req.params.id,JSON.stringify(item.rows[0]),'মাদার প্ল্যান্ট',item.rows[0].mp_code+' '+item.rows[0].variety,req.user.id]);
        await db.query('DELETE FROM mother_plants WHERE id=$1', [req.params.id]);
        res.json({ success: true, message: 'মাদার প্ল্যান্ট Recycle Bin-এ পাঠানো হয়েছে।' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// REPORTS ROUTES — FY filter যোগ
// ============================================================
router.get('/reports/production', authenticate, fyMiddleware, async (req, res) => {
    const { fyStart, fyEnd } = req;
    try {
        const result = await db.query(
            `SELECT pb.batch_code, s.name_bn, pb.production_type,
                    pb.produced_quantity, pb.success_quantity, pb.failed_quantity,
                    COALESCE(pb.success_percent,pb.germination_percent) AS success_rate,
                    pb.available_quantity, pb.status, pb.created_at
             FROM production_batches pb
             LEFT JOIN seedlings s ON pb.seedling_id=s.id
             WHERE (
                (pb.sowing_date IS NOT NULL AND pb.sowing_date BETWEEN $1 AND $2)
                OR (pb.sowing_date IS NULL AND pb.propagation_date IS NOT NULL AND pb.propagation_date BETWEEN $1 AND $2)
                OR (pb.sowing_date IS NULL AND pb.propagation_date IS NULL AND DATE(pb.created_at) BETWEEN $1 AND $2)
             )
             ORDER BY pb.created_at DESC`,
            [fyStart, fyEnd]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/reports/profit-loss', authenticate, adminOrManager, fyMiddleware, async (req, res) => {
    const { fyStart, fyEnd } = req;
    try {
        const revenue = await db.query(`SELECT COALESCE(SUM(total_amount),0) AS total FROM sales WHERE sale_date BETWEEN $1 AND $2`, [fyStart, fyEnd]);
        const cost = await db.query(`SELECT COALESCE(SUM(pb.produced_quantity*s.production_cost),0) AS total FROM production_batches pb LEFT JOIN seedlings s ON pb.seedling_id=s.id WHERE pb.sowing_date BETWEEN $1 AND $2`, [fyStart, fyEnd]);
        const totalRevenue = parseFloat(revenue.rows[0].total);
        const totalCost = parseFloat(cost.rows[0].total);
        res.json({ success: true, data: { total_revenue: totalRevenue, total_cost: totalCost, profit: totalRevenue-totalCost, profit_margin: totalRevenue>0?((totalRevenue-totalCost)/totalRevenue*100).toFixed(2):0 }});
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/reports/monthly-production', authenticate, fyMiddleware, async (req, res) => {
    const { fyStart, fyEnd } = req;
    try {
        const result = await db.query(`SELECT TO_CHAR(sowing_date,'YYYY-MM') AS month_key, TO_CHAR(sowing_date,'Mon') AS month_name, EXTRACT(MONTH FROM sowing_date) AS month_num, EXTRACT(YEAR FROM sowing_date) AS year_num, SUM(CASE WHEN production_type='seed' THEN produced_quantity ELSE 0 END) AS seed_qty, SUM(CASE WHEN production_type!='seed' THEN produced_quantity ELSE 0 END) AS asexual_qty, SUM(produced_quantity) AS total_qty FROM production_batches WHERE sowing_date BETWEEN $1 AND $2 GROUP BY month_key,month_name,month_num,year_num ORDER BY year_num,month_num`, [fyStart, fyEnd]);
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/reports/sales-by-category', authenticate, fyMiddleware, async (req, res) => {
    const { fyStart, fyEnd } = req;
    try {
        const result = await db.query(`SELECT c.name_bn AS category, COALESCE(SUM(si.total_price),0) AS total_sales, COUNT(DISTINCT si.sale_id) AS total_orders FROM categories c LEFT JOIN seedlings s ON s.category_id=c.id LEFT JOIN sales_items si ON si.seedling_id=s.id LEFT JOIN sales sa ON si.sale_id=sa.id AND sa.sale_date BETWEEN $1 AND $2 GROUP BY c.id,c.name_bn ORDER BY total_sales DESC`, [fyStart, fyEnd]);
        const total = result.rows.reduce((s,r)=>s+parseFloat(r.total_sales),0);
        res.json({ success: true, data: result.rows.map(r=>({...r,percent:total>0?((parseFloat(r.total_sales)/total)*100).toFixed(1):0})), total });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/reports/best-selling', authenticate, fyMiddleware, async (req, res) => {
    const { fyStart, fyEnd } = req;
    try {
        const result = await db.query(`SELECT s.name_bn,s.name_en,s.variety, COALESCE(SUM(si.quantity),0) AS total_sold, COALESCE(SUM(si.total_price),0) AS total_revenue, COUNT(DISTINCT si.sale_id) AS order_count FROM seedlings s LEFT JOIN sales_items si ON s.id=si.seedling_id LEFT JOIN sales sa ON si.sale_id=sa.id AND sa.sale_date BETWEEN $1 AND $2 WHERE s.is_active=TRUE GROUP BY s.id,s.name_bn,s.name_en,s.variety ORDER BY total_sold DESC LIMIT 10`, [fyStart, fyEnd]);
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/reports/monthly-summary', authenticate, fyMiddleware, async (req, res) => {
    const { fyStart, fyEnd } = req;
    try {
        const sales = await db.query(`SELECT TO_CHAR(sale_date,'MM') AS month_num, TO_CHAR(sale_date,'Mon') AS month_name, COUNT(*) AS total_invoices, COALESCE(SUM(total_amount),0) AS total_revenue, COALESCE(SUM(discount),0) AS total_discount FROM sales WHERE sale_date BETWEEN $1 AND $2 GROUP BY month_num,month_name ORDER BY month_num`, [fyStart, fyEnd]);
        const production = await db.query(`SELECT TO_CHAR(sowing_date,'MM') AS month_num, TO_CHAR(sowing_date,'Mon') AS month_name, COALESCE(SUM(produced_quantity),0) AS total_produced, COUNT(*) AS total_batches FROM production_batches WHERE sowing_date BETWEEN $1 AND $2 GROUP BY month_num,month_name ORDER BY month_num`, [fyStart, fyEnd]);
        res.json({ success: true, data: { sales: sales.rows, production: production.rows, fy: req.fy }});
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/reports/fiscal-achievement', authenticate, fyMiddleware, async (req, res) => {
    const { fyStart, fyEnd, fy } = req;
    try {
        const prodTotal = await db.query(`SELECT COALESCE(SUM(pb.produced_quantity),0) AS total FROM production_batches pb WHERE pb.sowing_date BETWEEN $1 AND $2`, [fyStart, fyEnd]);
        const saleTotal = await db.query(`SELECT COALESCE(SUM(total_amount),0) AS total, COUNT(*) AS invoices FROM sales WHERE sale_date BETWEEN $1 AND $2`, [fyStart, fyEnd]);
        const catSales = await db.query(`SELECT c.name_bn AS category, COALESCE(SUM(si.quantity),0) AS total_qty, COALESCE(SUM(si.total_price),0) AS total_amount FROM categories c LEFT JOIN seedlings s ON s.category_id=c.id LEFT JOIN sales_items si ON si.seedling_id=s.id LEFT JOIN sales sa ON si.sale_id=sa.id AND sa.sale_date BETWEEN $1 AND $2 GROUP BY c.id,c.name_bn ORDER BY total_qty DESC`, [fyStart, fyEnd]);
        const now = new Date();
        const curMonth = now.getMonth()+1; const curYear = now.getFullYear();
        const curMonthTarget = await db.query(`SELECT COALESCE(target_quantity,0) AS qty FROM targets WHERE target_type='production' AND target_month=$1 AND target_year=$2`, [curMonth, curYear]);
        const curMonthActual = await db.query(`SELECT COALESCE(SUM(produced_quantity),0) AS total FROM production_batches WHERE EXTRACT(MONTH FROM sowing_date)=$1 AND EXTRACT(YEAR FROM sowing_date)=$2`, [curMonth, curYear]);
        const prodAnnualTgt = await db.query(`SELECT target_quantity FROM targets WHERE target_type='production' AND target_year=$1 AND target_month=0`, [fy]);
        const saleAnnualTgt = await db.query(`SELECT target_amount FROM targets WHERE target_type='sales' AND target_year=$1 AND target_month=0`, [fy]);
        const prodTargets = await db.query(`SELECT COALESCE(SUM(target_quantity),0) AS total FROM targets WHERE target_type='production' AND target_month>0 AND ((target_year=$1 AND target_month=ANY($2)) OR (target_year=$3 AND target_month=ANY($4)))`, [fy,[7,8,9,10,11,12],fy+1,[1,2,3,4,5,6]]);
        const saleTargets = await db.query(`SELECT COALESCE(SUM(target_amount),0) AS total FROM targets WHERE target_type='sales' AND target_month>0 AND ((target_year=$1 AND target_month=ANY($2)) OR (target_year=$3 AND target_month=ANY($4)))`, [fy,[7,8,9,10,11,12],fy+1,[1,2,3,4,5,6]]);
        const prodTarget = prodAnnualTgt.rows.length ? parseFloat(prodAnnualTgt.rows[0].target_quantity) : parseFloat(prodTargets.rows[0].total)||0;
        const saleTarget = saleAnnualTgt.rows.length ? parseFloat(saleAnnualTgt.rows[0].target_amount) : parseFloat(saleTargets.rows[0].total)||0;
        res.json({ success: true, data: { fy:`${fy}-${fy+1}`, fyStart, fyEnd, current_month: { month:curMonth, year:curYear, target:parseFloat(curMonthTarget.rows[0]?.qty)||0, actual:parseFloat(curMonthActual.rows[0]?.total)||0 }, production: { target:prodTarget, actual:parseFloat(prodTotal.rows[0].total)||0 }, sales: { target:saleTarget, actual:parseFloat(saleTotal.rows[0].total)||0, invoices:parseInt(saleTotal.rows[0].invoices)||0 }, categories:catSales.rows }});
    } catch(err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// USER TOGGLE, PASSWORD ROUTES
// ============================================================
router.post('/users/:id/toggle-active', authenticate, adminOnly, async (req, res) => {
    try {
        const user = await db.query('SELECT is_active, name FROM users WHERE id=$1', [req.params.id]);
        if (!user.rows.length) return res.status(404).json({ success: false, message: 'পাওয়া যায়নি।' });
        const newStatus = !user.rows[0].is_active;
        await db.query('UPDATE users SET is_active=$1 WHERE id=$2', [newStatus, req.params.id]);
        res.json({ success: true, message: user.rows[0].name+(newStatus?' সক্রিয় করা হয়েছে।':' নিষ্ক্রিয় করা হয়েছে।'), is_active: newStatus });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/auth/update-profile', authenticate, async (req, res) => {
    const { name, email, current_password, new_password } = req.body;
    try {
        const userResult = await db.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
        if (!userResult.rows.length) return res.status(404).json({ success: false, message: 'ব্যবহারকারী পাওয়া যায়নি।' });
        const user = userResult.rows[0];
        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(current_password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: 'বর্তমান পাসওয়ার্ড ভুল।' });
        if (email && email !== user.email) {
            const exists = await db.query('SELECT id FROM users WHERE email=$1 AND id!=$2', [email, req.user.id]);
            if (exists.rows.length) return res.status(400).json({ success: false, message: 'এই ইমেইল আগে থেকে ব্যবহৃত হচ্ছে।' });
        }
        let newHash = user.password;
        if (new_password && new_password.length >= 6) newHash = await bcrypt.hash(new_password, 10);
        await db.query('UPDATE users SET name=$1,email=$2,password=$3 WHERE id=$4', [name||user.name, email||user.email, newHash, req.user.id]);
        res.json({ success: true, message: 'প্রোফাইল আপডেট হয়েছে।' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/auth/request-password-change', authenticate, async (req, res) => {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) return res.status(400).json({ success: false, message: 'কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।' });
    try {
        const bcrypt = require('bcryptjs');
        const hashed = await bcrypt.hash(new_password, 10);
        await db.query(`UPDATE users SET pending_password=$1, password_request_status='pending' WHERE id=$2`, [hashed, req.user.id]);
        res.json({ success: true, message: 'পাসওয়ার্ড পরিবর্তনের অনুরোধ পাঠানো হয়েছে।' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/users/:id/approve-password', authenticate, adminOnly, async (req, res) => {
    try {
        const user = await db.query('SELECT pending_password FROM users WHERE id=$1', [req.params.id]);
        if (!user.rows[0]?.pending_password) return res.status(400).json({ success: false, message: 'কোনো pending অনুরোধ নেই।' });
        await db.query(`UPDATE users SET password=$1,pending_password=NULL,password_request_status='approved' WHERE id=$2`, [user.rows[0].pending_password, req.params.id]);
        res.json({ success: true, message: 'পাসওয়ার্ড পরিবর্তন অনুমোদিত হয়েছে।' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/users/:id/reject-password', authenticate, adminOnly, async (req, res) => {
    try {
        await db.query(`UPDATE users SET pending_password=NULL,password_request_status='rejected' WHERE id=$1`, [req.params.id]);
        res.json({ success: true, message: 'প্রত্যাখ্যান করা হয়েছে।' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// RECYCLE BIN
// ============================================================
router.get('/recycle-bin', authenticate, adminOnly, async (req, res) => {
    try {
        const result = await db.query(`SELECT rb.*, u.name AS deleted_by_name FROM recycle_bin rb LEFT JOIN users u ON rb.deleted_by=u.id ORDER BY rb.deleted_at DESC`);
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.post('/recycle-bin/:id/restore', authenticate, adminOnly, async (req, res) => {
    try {
        const item = await db.query('SELECT * FROM recycle_bin WHERE id=$1', [req.params.id]);
        if (!item.rows.length) return res.status(404).json({ success: false, message: 'পাওয়া যায়নি।' });
        const { table_name, record_data } = item.rows[0];
        const keys = Object.keys(record_data).join(',');
        const vals = Object.values(record_data);
        const phs = vals.map((_,i)=>`$${i+1}`).join(',');
        await db.query(`INSERT INTO ${table_name} (${keys}) VALUES (${phs}) ON CONFLICT DO NOTHING`, vals);
        await db.query('DELETE FROM recycle_bin WHERE id=$1', [req.params.id]);
        res.json({ success: true, message: 'সফলভাবে পুনরুদ্ধার হয়েছে।' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.delete('/recycle-bin/:id', authenticate, adminOnly, async (req, res) => {
    try { await db.query('DELETE FROM recycle_bin WHERE id=$1', [req.params.id]); res.json({ success: true, message: 'স্থায়ীভাবে মুছে ফেলা হয়েছে।' }); }
    catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.delete('/recycle-bin', authenticate, adminOnly, async (req, res) => {
    try { await db.query('DELETE FROM recycle_bin'); res.json({ success: true, message: 'Recycle Bin খালি করা হয়েছে।' }); }
    catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// TARGET ROUTES
// ============================================================
router.post('/targets', authenticate, adminOnly, async (req, res) => {
    const { target_type, target_month, target_year, target_quantity, target_amount, notes } = req.body;
    try {
        const result = await db.query(`INSERT INTO targets (target_type,target_month,target_year,target_quantity,target_amount,notes,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (target_type,target_month,target_year) DO UPDATE SET target_quantity=$4,target_amount=$5,notes=$6 RETURNING *`, [target_type,target_month,target_year,target_quantity||0,target_amount||0,notes||null,req.user.id]);
        res.json({ success: true, message: 'লক্ষ্যমাত্রা সংরক্ষণ হয়েছে।', data: result.rows[0] });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/targets/:id', authenticate, adminOnly, async (req, res) => {
    const { target_type, target_month, target_year, target_quantity, target_amount, notes } = req.body;
    try {
        const result = await db.query(`UPDATE targets SET target_type=$1,target_month=$2,target_year=$3,target_quantity=$4,target_amount=$5,notes=$6 WHERE id=$7 RETURNING *`, [target_type,target_month,target_year,target_quantity||0,target_amount||0,notes||null,req.params.id]);
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'পাওয়া যায়নি।' });
        res.json({ success: true, message: 'লক্ষ্যমাত্রা আপডেট হয়েছে।', data: result.rows[0] });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/targets', authenticate, fyMiddleware, async (req, res) => {
    const { fy } = req;
    try {
        const result = await db.query(`SELECT * FROM targets WHERE (target_year=$1 AND target_month=0) OR (target_year=$1 AND target_month>=7) OR (target_year=$2 AND target_month BETWEEN 1 AND 6) ORDER BY CASE WHEN target_month=0 THEN 0 ELSE 1 END, target_type, target_month`, [fy, fy+1]);
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/reports/target-achievement', authenticate, fyMiddleware, async (req, res) => {
    const { fy } = req;
    try {
        const prodResult = await db.query(`SELECT t.target_month AS month, t.target_quantity, t.target_amount, COALESCE(SUM(pb.produced_quantity),0) AS actual_quantity FROM targets t LEFT JOIN production_batches pb ON EXTRACT(MONTH FROM pb.sowing_date)=t.target_month AND EXTRACT(YEAR FROM pb.sowing_date)=$1 WHERE t.target_type='production' AND t.target_year=$1 GROUP BY t.target_month,t.target_quantity,t.target_amount ORDER BY t.target_month`, [fy]);
        const saleResult = await db.query(`SELECT t.target_month AS month, t.target_quantity, t.target_amount, COALESCE(COUNT(s.id),0) AS actual_invoices, COALESCE(SUM(s.total_amount),0) AS actual_amount FROM targets t LEFT JOIN sales s ON EXTRACT(MONTH FROM s.sale_date)=t.target_month AND EXTRACT(YEAR FROM s.sale_date)=$1 WHERE t.target_type='sales' AND t.target_year=$1 GROUP BY t.target_month,t.target_quantity,t.target_amount ORDER BY t.target_month`, [fy]);
        res.json({ success: true, data: { production: prodResult.rows, sales: saleResult.rows, fy }});
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/targets/:id', authenticate, adminOnly, async (req, res) => {
    try { await db.query('DELETE FROM targets WHERE id=$1', [req.params.id]); res.json({ success: true, message: 'লক্ষ্যমাত্রা মুছে ফেলা হয়েছে।' }); }
    catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// OTHER INCOME — FY filter যোগ
// ============================================================
router.get('/other-income', authenticate, fyMiddleware, async (req, res) => {
    const { fyStart, fyEnd } = req;
    try {
        const result = await db.query(`SELECT oi.*, u.name AS created_by_name FROM other_income oi LEFT JOIN users u ON u.id=oi.created_by WHERE oi.income_date BETWEEN $1 AND $2 ORDER BY oi.income_date DESC, oi.created_at DESC`, [fyStart, fyEnd]);
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.post('/other-income', authenticate, async (req, res) => {
    const { income_type, category, amount, income_date, description } = req.body;
    try {
        const result = await db.query(`INSERT INTO other_income (income_type,category,amount,income_date,description,created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [income_type,category||null,amount,income_date,description||null,req.user.id]);
        res.json({ success: true, data: result.rows[0], message: 'আয় সংরক্ষিত হয়েছে।' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.put('/other-income/:id', authenticate, adminOrManager, async (req, res) => {
    const { income_type, category, amount, income_date, description } = req.body;
    try {
        await db.query(`UPDATE other_income SET income_type=$1,category=$2,amount=$3,income_date=$4,description=$5 WHERE id=$6`, [income_type,category||null,amount,income_date,description||null,req.params.id]);
        res.json({ success: true, message: 'আপডেট হয়েছে।' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.delete('/other-income/:id', authenticate, adminOrManager, async (req, res) => {
    try { await db.query('DELETE FROM other_income WHERE id=$1', [req.params.id]); res.json({ success: true, message: 'মুছে ফেলা হয়েছে।' }); }
    catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// OTP AUTH
// ============================================================
const otpStore = {};
router.post('/auth/send-otp', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE email=$1 AND is_active=TRUE', [email]);
        if (!result.rows.length) return res.status(401).json({ success: false, message: 'ইমেইল বা পাসওয়ার্ড ভুল।' });
        const user = result.rows[0];
        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'ইমেইল বা পাসওয়ার্ড ভুল।' });
        const otp = Math.floor(100000+Math.random()*900000).toString();
        otpStore[email] = { otp, expires: Date.now()+5*60*1000, userId: user.id };
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({ service:'gmail', auth:{ user:process.env.GMAIL_USER, pass:process.env.GMAIL_PASS }});
        await transporter.sendMail({ from:`"উদ্যানতত্ত্ববিদের কার্যালয়" <${process.env.GMAIL_USER}>`, to:email, subject:'🔐 Login OTP', html:`<div style="font-family:Arial;max-width:400px;margin:auto;padding:30px;border:1px solid #e2ddd5;border-radius:12px"><h2 style="color:#3B6D11">🌿 উদ্যানতত্ত্ববিদের কার্যালয়</h2><p>আপনার Login OTP:</p><div style="text-align:center;padding:20px;background:#EAF3DE;border-radius:10px;margin:20px 0"><h1 style="color:#3B6D11;font-size:40px;letter-spacing:10px">${otp}</h1></div><p style="color:#888;font-size:13px">⏱ ৫ মিনিট valid।</p></div>`});
        res.json({ success: true, message: 'OTP পাঠানো হয়েছে।' });
    } catch (err) { res.status(500).json({ success: false, message: 'OTP পাঠাতে সমস্যা: '+err.message }); }
});
router.post('/auth/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    try {
        const stored = otpStore[email];
        if (!stored) return res.status(401).json({ success: false, message: 'OTP পাওয়া যায়নি।' });
        if (Date.now()>stored.expires) return res.status(401).json({ success: false, message: 'OTP মেয়াদ শেষ।' });
        if (stored.otp!==otp) return res.status(401).json({ success: false, message: 'OTP ভুল।' });
        delete otpStore[email];
        const user = await db.query('SELECT * FROM users WHERE id=$1', [stored.userId]);
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ id:user.rows[0].id, role:user.rows[0].role, email:user.rows[0].email }, process.env.JWT_SECRET, { expiresIn:process.env.JWT_EXPIRES_IN||'7d' });
        res.json({ success: true, token, user: { id:user.rows[0].id, name:user.rows[0].name, email:user.rows[0].email, role:user.rows[0].role }});
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Opening Balance Stats
router.get('/stock/opening-balance/stats', authenticate, async (req, res) => {
    try {
        const now = new Date();
        const curFY = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
        const fyStart = `${curFY}-07-01`;
        const fyEnd   = `${curFY+1}-06-30`;

        const [obStats, perSeedling, prevFYProd, prevFYSales, prevFYDmg,
               curFYProd, curFYSales, curFYDmg, totalStock] = await Promise.all([

            // মোট প্রারম্ভিক স্টক
            db.query(`SELECT COALESCE(SUM(quantity),0) AS total
                      FROM stock_transactions WHERE txn_type='opening_balance'`),

            // Per seedling opening balance
            db.query(`SELECT seedling_id, SUM(quantity) AS total_qty
                      FROM stock_transactions WHERE txn_type='opening_balance'
                      GROUP BY seedling_id`),

            // পূর্ববর্তী FY উৎপাদন
            db.query(`SELECT COALESCE(SUM(produced_quantity),0) AS total
                      FROM production_batches
                      WHERE COALESCE(sowing_date, propagation_date, created_at::date) < $1`, [fyStart]),

            // পূর্ববর্তী FY বিক্রয়
            db.query(`SELECT COALESCE(SUM(si.quantity),0) AS total
                      FROM sales_items si JOIN sales s ON si.sale_id=s.id
                      WHERE s.sale_date < $1`, [fyStart]),

            // পূর্ববর্তী FY ক্ষতি
            db.query(`SELECT COALESCE(SUM(quantity),0) AS total
                      FROM damages WHERE damage_date < $1`, [fyStart]),

            // চলতি FY উৎপাদন
            db.query(`SELECT COALESCE(SUM(produced_quantity),0) AS total
                      FROM production_batches
                      WHERE COALESCE(sowing_date, propagation_date, created_at::date) BETWEEN $1 AND $2`,
                      [fyStart, fyEnd]),

            // চলতি FY বিক্রয়
            db.query(`SELECT COALESCE(SUM(si.quantity),0) AS total
                      FROM sales_items si JOIN sales s ON si.sale_id=s.id
                      WHERE s.sale_date BETWEEN $1 AND $2`, [fyStart, fyEnd]),

            // চলতি FY ক্ষতি
            db.query(`SELECT COALESCE(SUM(quantity),0) AS total
                      FROM damages WHERE damage_date BETWEEN $1 AND $2`, [fyStart, fyEnd]),

            // মোট বর্তমান স্টক
            db.query(`SELECT COALESCE(SUM(current_stock),0) AS total
                      FROM seedlings WHERE is_active=TRUE`)
        ]);

        const obMap = {};
        perSeedling.rows.forEach(r => { obMap[r.seedling_id] = parseInt(r.total_qty || 0); });

        const prevNet = parseInt(prevFYProd.rows[0].total) - parseInt(prevFYSales.rows[0].total) - parseInt(prevFYDmg.rows[0].total);
        const curNet  = parseInt(curFYProd.rows[0].total) - parseInt(curFYSales.rows[0].total) - parseInt(curFYDmg.rows[0].total);

        res.json({ success: true, data: {
            total_opening:  parseInt(obStats.rows[0].total || 0),
            prev_fy_stock:  Math.max(0, prevNet),
            cur_fy_stock:   Math.max(0, curNet),
            total_stock:    parseInt(totalStock.rows[0].total || 0),
            ob_map: obMap,
            fy: `${curFY}-${curFY+1}`
        }});
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Opening Balance Update (edit)
router.put('/stock/opening-balance/:seedlingId', authenticate, adminOnly, async (req, res) => {
    const { seedlingId } = req.params;
    const { new_qty } = req.body; // নতুন মোট পরিমাণ
    if (new_qty === undefined || new_qty === null || isNaN(parseInt(new_qty))) {
        return res.status(400).json({ success: false, message: 'পরিমাণ দিন।' });
    }
    const newQty = Math.max(0, parseInt(new_qty));
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        // পুরানো opening balance sum
        const oldResult = await client.query(
            `SELECT COALESCE(SUM(quantity),0) AS old_qty FROM stock_transactions
             WHERE txn_type='opening_balance' AND seedling_id=$1`, [seedlingId]);
        const oldQty = parseInt(oldResult.rows[0].old_qty || 0);
        const diff = newQty - oldQty;
        // পুরানো opening_balance transactions মুছো
        await client.query(`DELETE FROM stock_transactions WHERE txn_type='opening_balance' AND seedling_id=$1`, [seedlingId]);
        // নতুন transaction তৈরি করো (newQty > 0 হলে)
        if (newQty > 0) {
            const stockResult = await client.query('SELECT current_stock FROM seedlings WHERE id=$1', [seedlingId]);
            const currentStock = parseInt(stockResult.rows[0]?.current_stock || 0);
            await client.query(
                `INSERT INTO stock_transactions (seedling_id, txn_type, quantity, direction, balance_after, notes, created_by)
                 VALUES ($1,'opening_balance',$2,'+',$3,'প্রারম্ভিক স্টক (সংশোধিত)',$4)`,
                [seedlingId, newQty, currentStock, req.user.id]);
        }
        // current_stock adjust করো
        if (diff !== 0) {
            await client.query(
                `UPDATE seedlings SET current_stock=GREATEST(0, current_stock+$1) WHERE id=$2`,
                [diff, seedlingId]);
        }
        const updated = await client.query('SELECT current_stock FROM seedlings WHERE id=$1', [seedlingId]);
        await client.query('COMMIT');
        res.json({ success: true, message: 'প্রারম্ভিক স্টক আপডেট হয়েছে।', new_balance: updated.rows[0].current_stock, new_opening: newQty });
    } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ success: false, error: err.message }); }
    finally { client.release(); }
});

router.post('/stock/opening-balance', authenticate, adminOnly, async (req, res) => {
    const { entries } = req.body; // [{seedling_id, quantity, notes}]
    if (!entries || !entries.length)
        return res.status(400).json({ success: false, message: 'কোনো data নেই।' });

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        let updated = 0;
        const results = [];

        for (const entry of entries) {
            if (!entry.seedling_id || !entry.quantity || parseInt(entry.quantity) <= 0) continue;

            const stockResult = await client.query(
                'SELECT current_stock, name_bn FROM seedlings WHERE id=$1', [entry.seedling_id]
            );
            if (!stockResult.rows.length) continue;

            const currentStock = parseInt(stockResult.rows[0].current_stock);
            const addQty = parseInt(entry.quantity);
            const newBalance = currentStock + addQty;

            await client.query(
                `INSERT INTO stock_transactions
                 (seedling_id, txn_type, quantity, direction, balance_after, notes, created_by)
                 VALUES ($1,'opening_balance',$2,'+',$3,$4,$5)`,
                [entry.seedling_id, addQty, newBalance,
                 entry.notes || 'প্রারম্ভিক স্টক এন্ট্রি', req.user.id]
            );

            await client.query(
                'UPDATE seedlings SET current_stock=$1 WHERE id=$2',
                [newBalance, entry.seedling_id]
            );

            results.push({ name: stockResult.rows[0].name_bn, added: addQty, total: newBalance });
            updated++;
        }

        await client.query('COMMIT');
        res.json({ success: true, message: `${updated}টি চারার স্টক যোগ হয়েছে।`, data: results });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, error: err.message });
    } finally {
        client.release();
    }
});

// ============================================================
// EMPLOYEE ROUTES — কর্মচারী তালিকা
// ============================================================
router.get('/employees-info', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT e.*, u.name AS created_by_name
             FROM employees e
             LEFT JOIN users u ON e.created_by = u.id
             ORDER BY e.designation, e.name_bn`
        );
        res.json({ success: true, data: result.rows });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/employees-info', authenticate, adminOnly, async (req, res) => {
    const { name_bn, name_en, designation, staff_type, worker_type, employee_id, join_date, nid, mobile, address, notes } = req.body;
    if (!name_bn || !designation) return res.status(400).json({ success: false, message: 'নাম ও পদবি দিন।' });
    try {
        const result = await db.query(
            `INSERT INTO employees (name_bn, name_en, designation, staff_type, worker_type, employee_id, join_date, nid, mobile, address, notes, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
            [name_bn, name_en||null, designation, staff_type||'permanent', worker_type||null, employee_id||null, join_date||null, nid||null, mobile||null, address||null, notes||null, req.user.id]
        );
        res.json({ success: true, message: 'কর্মচারী যোগ হয়েছে।', data: result.rows[0] });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/employees-info/:id', authenticate, adminOnly, async (req, res) => {
    const { name_bn, name_en, designation, staff_type, worker_type, employee_id, join_date, nid, mobile, address, status, notes } = req.body;
    try {
        const result = await db.query(
            `UPDATE employees SET name_bn=$1, name_en=$2, designation=$3, staff_type=$4, worker_type=$5,
             employee_id=$6, join_date=$7, nid=$8, mobile=$9, address=$10, status=$11, notes=$12, updated_at=NOW()
             WHERE id=$13 RETURNING *`,
            [name_bn, name_en||null, designation, staff_type||'permanent', worker_type||null, employee_id||null, join_date||null, nid||null, mobile||null, address||null, status||'active', notes||null, req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'পাওয়া যায়নি।' });
        res.json({ success: true, message: 'আপডেট হয়েছে।', data: result.rows[0] });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/employees-info/:id', authenticate, adminOnly, async (req, res) => {
    try {
        await db.query('DELETE FROM employees WHERE id=$1', [req.params.id]);
        res.json({ success: true, message: 'কর্মচারী মুছে ফেলা হয়েছে।' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
