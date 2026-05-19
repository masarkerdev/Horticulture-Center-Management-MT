// routes/superadmin.js
const express   = require('express');
const router    = express.Router();
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { Pool }  = require('pg');
const masterDb  = require('../config/masterDb');
const { clearCache, getTenants } = require('../lib/tenantCache');

const SA_SECRET = process.env.SA_JWT_SECRET || 'sa-secret-change-this';

// Super Admin auth middleware
function saAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'Login করুন।' });
    try {
        req.saUser = jwt.verify(token, SA_SECRET);
        next();
    } catch {
        res.status(401).json({ success: false, message: 'Session শেষ হয়েছে।' });
    }
}

// Tenant-এর DB-তে query চালাও
async function queryTenant(dbUrl, sql, params = []) {
    const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
        max: 1,
        connectionTimeoutMillis: 8000,
    });
    try {
        const result = await pool.query(sql, params);
        return result.rows;
    } finally {
        await pool.end();
    }
}

// ===== LOGIN =====
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await masterDb.query(
            'SELECT * FROM super_admins WHERE email = $1', [email]
        );
        if (!result.rows.length)
            return res.status(401).json({ success: false, message: 'ইমেইল বা পাসওয়ার্ড ভুল।' });
        const admin = result.rows[0];
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch)
            return res.status(401).json({ success: false, message: 'ইমেইল বা পাসওয়ার্ড ভুল।' });
        const token = jwt.sign(
            { id: admin.id, email: admin.email, name: admin.name },
            SA_SECRET, { expiresIn: '8h' }
        );
        res.json({ success: true, token, name: admin.name });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== ALL TENANTS =====
router.get('/tenants', saAuth, async (req, res) => {
    try {
        const result = await masterDb.query(
            'SELECT id, slug, name_bn, name_en, location, currency, active, created_at FROM tenants ORDER BY created_at DESC'
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== SINGLE CENTER STATS =====
router.get('/stats/:slug', saAuth, async (req, res) => {
    try {
        const tenants = await getTenants();
        const tenant  = tenants[req.params.slug];
        if (!tenant) return res.status(404).json({ success: false, message: 'Center পাওয়া যায়নি।' });

        const [sales, production, stock, todaySales, recentSales] = await Promise.all([
            // মোট বিক্রয়
            queryTenant(tenant.db_url, `
                SELECT
                    COUNT(*) AS total_invoices,
                    COALESCE(SUM(total_amount), 0) AS total_revenue,
                    COALESCE(SUM(CASE WHEN payment_status='due' THEN total_amount ELSE 0 END), 0) AS due_amount
                FROM sales`),
            // মোট উৎপাদন
            queryTenant(tenant.db_url, `
                SELECT
                    COUNT(*) AS total_batches,
                    COALESCE(SUM(produced_quantity), 0) AS total_produced,
                    COALESCE(SUM(available_quantity), 0) AS total_available
                FROM production_batches`),
            // স্টক
            queryTenant(tenant.db_url, `
                SELECT
                    COUNT(*) AS total_seedlings,
                    COALESCE(SUM(current_stock), 0) AS total_stock,
                    COALESCE(SUM(current_stock * unit_price), 0) AS stock_value
                FROM seedlings WHERE is_active = true`),
            // আজকের বিক্রয়
            queryTenant(tenant.db_url, `
                SELECT COALESCE(SUM(total_amount), 0) AS today_revenue, COUNT(*) AS today_invoices
                FROM sales WHERE sale_date = CURRENT_DATE`),
            // সাম্প্রতিক ৫টি বিক্রয়
            queryTenant(tenant.db_url, `
                SELECT invoice_no, customer_name, total_amount, sale_date, payment_status
                FROM sales ORDER BY created_at DESC LIMIT 5`),
        ]);

        res.json({
            success: true,
            slug: req.params.slug,
            name_bn: tenant.name_bn,
            name_en: tenant.name_en,
            location: tenant.location,
            stats: {
                sales:      sales[0],
                production: production[0],
                stock:      stock[0],
                today:      todaySales[0],
            },
            recent_sales: recentSales,
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== ALL CENTERS COMBINED STATS =====
router.get('/stats-all', saAuth, async (req, res) => {
    try {
        const tenants = await getTenants();
        const results = await Promise.all(
            Object.entries(tenants).map(async ([slug, tenant]) => {
                try {
                    const [sales, production, stock, today] = await Promise.all([
                        queryTenant(tenant.db_url, `
                            SELECT COALESCE(SUM(total_amount),0) AS total_revenue,
                                   COUNT(*) AS total_invoices
                            FROM sales`),
                        queryTenant(tenant.db_url, `
                            SELECT COALESCE(SUM(produced_quantity),0) AS total_produced
                            FROM production_batches`),
                        queryTenant(tenant.db_url, `
                            SELECT COALESCE(SUM(current_stock),0) AS total_stock,
                                   COALESCE(SUM(current_stock*unit_price),0) AS stock_value
                            FROM seedlings WHERE is_active=true`),
                        queryTenant(tenant.db_url, `
                            SELECT COALESCE(SUM(total_amount),0) AS today_revenue
                            FROM sales WHERE sale_date=CURRENT_DATE`),
                    ]);
                    return {
                        slug,
                        name_bn:       tenant.name_bn,
                        name_en:       tenant.name_en,
                        location:      tenant.location,
                        total_revenue: parseFloat(sales[0].total_revenue),
                        total_invoices:parseInt(sales[0].total_invoices),
                        total_produced:parseInt(production[0].total_produced),
                        total_stock:   parseInt(stock[0].total_stock),
                        stock_value:   parseFloat(stock[0].stock_value),
                        today_revenue: parseFloat(today[0].today_revenue),
                        status: 'ok'
                    };
                } catch (e) {
                    return { slug, name_en: tenant.name_en, status: 'error', error: e.message };
                }
            })
        );
        res.json({ success: true, data: results });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== ADD TENANT =====
router.post('/tenants', saAuth, async (req, res) => {
    const { slug, name_bn, name_en, location, db_url, currency } = req.body;
    if (!slug || !name_bn || !name_en || !db_url)
        return res.status(400).json({ success: false, message: 'সব তথ্য দিন।' });
    try {
        const exists = await masterDb.query('SELECT id FROM tenants WHERE slug=$1', [slug]);
        if (exists.rows.length)
            return res.status(400).json({ success: false, message: 'এই slug আগে থেকে আছে।' });
        const result = await masterDb.query(
            `INSERT INTO tenants (slug, name_bn, name_en, location, db_url, currency, active)
             VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING id, slug, name_bn, name_en, location, active`,
            [slug.toLowerCase(), name_bn, name_en, location, db_url, currency || 'BDT']
        );
        clearCache();
        res.json({ success: true, message: 'নতুন center যোগ হয়েছে।', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== UPDATE TENANT =====
router.put('/tenants/:id', saAuth, async (req, res) => {
    const { name_bn, name_en, location, db_url, currency, active } = req.body;
    try {
        await masterDb.query(
            `UPDATE tenants SET name_bn=$1, name_en=$2, location=$3, db_url=$4,
             currency=$5, active=$6, updated_at=NOW() WHERE id=$7`,
            [name_bn, name_en, location, db_url, currency, active, req.params.id]
        );
        clearCache();
        res.json({ success: true, message: 'Center আপডেট হয়েছে।' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== TOGGLE ACTIVE =====
router.post('/tenants/:id/toggle', saAuth, async (req, res) => {
    try {
        const current = await masterDb.query('SELECT active, name_en FROM tenants WHERE id=$1', [req.params.id]);
        if (!current.rows.length)
            return res.status(404).json({ success: false, message: 'পাওয়া যায়নি।' });
        const newStatus = !current.rows[0].active;
        await masterDb.query('UPDATE tenants SET active=$1, updated_at=NOW() WHERE id=$2', [newStatus, req.params.id]);
        clearCache();
        res.json({ success: true, message: current.rows[0].name_en + (newStatus ? ' সক্রিয়।' : ' বন্ধ।'), active: newStatus });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== DELETE TENANT =====
router.delete('/tenants/:id', saAuth, async (req, res) => {
    try {
        await masterDb.query('DELETE FROM tenants WHERE id=$1', [req.params.id]);
        clearCache();
        res.json({ success: true, message: 'Center মুছে ফেলা হয়েছে।' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
