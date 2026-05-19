// routes/superadmin.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const masterDb = require("../config/masterDb");
const { clearCache, getTenants } = require("../lib/tenantCache");

const SA_SECRET = process.env.SA_JWT_SECRET || "sa-secret-change-this";

function saAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token)
    return res.status(401).json({ success: false, message: "Login করুন।" });
  try {
    req.saUser = jwt.verify(token, SA_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: "Session শেষ।" });
  }
}

async function queryTenant(dbUrl, sql, params = []) {
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 8000,
  });
  try {
    const r = await pool.query(sql, params);
    return r.rows;
  } finally {
    await pool.end();
  }
}

// ===== LOGIN =====
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const r = await masterDb.query(
      "SELECT * FROM super_admins WHERE email=$1",
      [email],
    );
    if (!r.rows.length)
      return res
        .status(401)
        .json({ success: false, message: "ইমেইল বা পাসওয়ার্ড ভুল।" });
    const isMatch = await bcrypt.compare(password, r.rows[0].password);
    if (!isMatch)
      return res
        .status(401)
        .json({ success: false, message: "ইমেইল বা পাসওয়ার্ড ভুল।" });
    const token = jwt.sign(
      { id: r.rows[0].id, email: r.rows[0].email, name: r.rows[0].name },
      SA_SECRET,
      { expiresIn: "8h" },
    );
    res.json({ success: true, token, name: r.rows[0].name });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== TENANT LIST =====
router.get("/tenants", saAuth, async (req, res) => {
  try {
    const r = await masterDb.query(
      "SELECT id,slug,name_bn,name_en,location,currency,active,created_at FROM tenants ORDER BY created_at DESC",
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== ALL CENTER QUICK STATS (Enhanced) =====
router.get("/stats-all", saAuth, async (req, res) => {
  try {
    const tenants = await getTenants();
    const results = await Promise.all(
      Object.entries(tenants).map(async ([slug, tenant]) => {
        try {
          const [
            sales,
            todaySales,
            currentMonth,
            lastMonth,
            monthlyTarget,
            production,
            stock,
            lowStock,
          ] = await Promise.all([
            // মোট বিক্রয়
            queryTenant(
              tenant.db_url,
              `
                            SELECT COALESCE(SUM(total_amount),0) AS total_revenue,
                                COUNT(*) AS total_invoices
                            FROM sales`,
            ),

            // আজকের বিক্রয়
            queryTenant(
              tenant.db_url,
              `
                            SELECT COALESCE(SUM(total_amount),0) AS today_revenue
                            FROM sales WHERE sale_date = CURRENT_DATE`,
            ),

            // চলতি মাসের বিক্রয়
            queryTenant(
              tenant.db_url,
              `
                            SELECT COALESCE(SUM(total_amount),0) AS revenue, COUNT(*) AS invoices
                            FROM sales
                            WHERE EXTRACT(MONTH FROM sale_date) = EXTRACT(MONTH FROM NOW())
                            AND EXTRACT(YEAR FROM sale_date) = EXTRACT(YEAR FROM NOW())`,
            ),

            // গত মাসের বিক্রয়
            queryTenant(
              tenant.db_url,
              `
                            SELECT COALESCE(SUM(total_amount),0) AS revenue
                            FROM sales
                            WHERE EXTRACT(MONTH FROM sale_date) = EXTRACT(MONTH FROM NOW() - INTERVAL '1 month')
                            AND EXTRACT(YEAR FROM sale_date) = EXTRACT(YEAR FROM (NOW() - INTERVAL '1 month'))`,
            ),

            // চলতি মাসের বিক্রয় লক্ষ্যমাত্রা
            queryTenant(
              tenant.db_url,
              `
                            SELECT COALESCE(target_amount,0) AS target_amount,
                                COALESCE(target_quantity,0) AS target_quantity
                            FROM targets
                            WHERE target_type='sales'
                            AND target_month=EXTRACT(MONTH FROM NOW())
                            AND target_year=EXTRACT(YEAR FROM NOW())
                            LIMIT 1`,
            ),

            // উৎপাদন
            queryTenant(
              tenant.db_url,
              `
                            SELECT COUNT(*) AS total_batches,
                                COALESCE(SUM(produced_quantity),0) AS total_produced,
                                COALESCE(AVG(CASE WHEN success_percent>0 THEN success_percent END),0) AS avg_success,
                                COALESCE(SUM(available_quantity),0) AS total_available
                            FROM production_batches`,
            ),

            // স্টক
            queryTenant(
              tenant.db_url,
              `
                            SELECT COALESCE(SUM(current_stock),0) AS total_stock,
                                COALESCE(SUM(current_stock*unit_price),0) AS stock_value,
                                COUNT(*) AS total_species
                            FROM seedlings WHERE is_active=true`,
            ),

            // কম স্টক সংখ্যা
            queryTenant(
              tenant.db_url,
              `
                            SELECT COUNT(*) AS low_count
                            FROM seedlings
                            WHERE is_active=true AND current_stock<=min_stock_alert`,
            ),
          ]);

          // Growth rate হিসাব
          const curRev = parseFloat(currentMonth[0].revenue);
          const lastRev = parseFloat(lastMonth[0].revenue);
          const growthRate =
            lastRev > 0
              ? ((curRev - lastRev) / lastRev) * 100
              : curRev > 0
                ? 100
                : 0;

          // Target achievement
          const targetAmt = parseFloat(monthlyTarget[0]?.target_amount || 0);
          const targetAchv =
            targetAmt > 0 ? Math.min((curRev / targetAmt) * 100, 200) : null; // null = target set করা নেই

          // Performance Score (০-১০০)
          const totalSpecies = parseInt(stock[0].total_species) || 1;
          const lowCount = parseInt(lowStock[0].low_count) || 0;
          const stockHealth = Math.max(0, 1 - lowCount / totalSpecies) * 100;
          const successRate = parseFloat(production[0].avg_success) || 0;

          // Score components:
          const growthScore = Math.min(Math.max(growthRate + 50, 0), 100) * 0.3; // 30 pts
          const targetScore =
            targetAchv !== null
              ? Math.min(targetAchv, 100) * 0.3
              : stockHealth * 0.3; // 30 pts
          const successScore = successRate * 0.2; // 20 pts
          const stockScore = stockHealth * 0.2; // 20 pts
          const perfScore = Math.round(
            growthScore + targetScore + successScore + stockScore,
          );

          // Traffic light
          const trafficLight =
            perfScore >= 70 ? "green" : perfScore >= 45 ? "yellow" : "red";

          // Revenue per batch (efficiency)
          const totalBatches = parseInt(production[0].total_batches) || 1;
          const revPerBatch = parseFloat(sales[0].total_revenue) / totalBatches;

          return {
            slug,
            name_bn: tenant.name_bn,
            name_en: tenant.name_en,
            location: tenant.location,
            // Core stats
            total_revenue: parseFloat(sales[0].total_revenue),
            total_invoices: parseInt(sales[0].total_invoices),
            today_revenue: parseFloat(todaySales[0].today_revenue),
            total_produced: parseInt(production[0].total_produced),
            total_available: parseInt(production[0].total_available),
            total_stock: parseInt(stock[0].total_stock),
            stock_value: parseFloat(stock[0].stock_value),
            // Enhanced stats
            current_month_rev: curRev,
            last_month_rev: lastRev,
            growth_rate: parseFloat(growthRate.toFixed(1)),
            target_amount: targetAmt,
            target_achieved: targetAchv,
            avg_success: parseFloat(successRate.toFixed(1)),
            low_stock_count: lowCount,
            total_species: parseInt(stock[0].total_species),
            stock_health: parseFloat(stockHealth.toFixed(1)),
            rev_per_batch: parseFloat(revPerBatch.toFixed(0)),
            perf_score: perfScore,
            traffic_light: trafficLight,
            status: "ok",
          };
        } catch (e) {
          return {
            slug,
            name_en: tenant.name_en,
            name_bn: tenant.name_bn,
            status: "error",
            error: e.message,
          };
        }
      }),
    );
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== COMPREHENSIVE CENTER DATA =====
router.get("/center/:slug", saAuth, async (req, res) => {
  try {
    const tenants = await getTenants();
    const tenant = tenants[req.params.slug];
    if (!tenant)
      return res
        .status(404)
        .json({ success: false, message: "Center পাওয়া যায়নি।" });

    const [
      salesSummary,
      todaySales,
      monthlySales,
      productionSummary,
      productionByType,
      stockSummary,
      lowStock,
      damagesSummary,
      topSeedlings,
      recentSales,
      recentBatches,
      users,
      otherIncome,
      targets,
      categories,
    ] = await Promise.all([
      // মোট বিক্রয় summary
      queryTenant(
        tenant.db_url,
        `
                SELECT COUNT(*) AS total_invoices,
                    COALESCE(SUM(total_amount),0) AS total_revenue,
                    COALESCE(SUM(discount),0) AS total_discount,
                    COALESCE(SUM(CASE WHEN payment_status='due' THEN total_amount ELSE 0 END),0) AS due_amount,
                    COALESCE(SUM(CASE WHEN payment_status='paid' THEN total_amount ELSE 0 END),0) AS paid_amount,
                    COUNT(CASE WHEN payment_method='cash' THEN 1 END) AS cash_count,
                    COUNT(CASE WHEN payment_method='bkash' THEN 1 END) AS bkash_count
                FROM sales`,
      ),

      // আজকের বিক্রয়
      queryTenant(
        tenant.db_url,
        `
                SELECT COALESCE(SUM(total_amount),0) AS today_revenue,
                    COUNT(*) AS today_invoices,
                    COALESCE(SUM(discount),0) AS today_discount
                FROM sales WHERE sale_date=CURRENT_DATE`,
      ),

      // গত ৬ মাসের মাসিক বিক্রয়
      queryTenant(
        tenant.db_url,
        `
                SELECT TO_CHAR(sale_date,'YYYY-MM') AS month,
                    TO_CHAR(sale_date,'Mon YY') AS label,
                    COALESCE(SUM(total_amount),0) AS revenue,
                    COUNT(*) AS invoices
                FROM sales
                WHERE sale_date >= NOW() - INTERVAL '6 months'
                GROUP BY month, label ORDER BY month`,
      ),

      // উৎপাদন summary
      queryTenant(
        tenant.db_url,
        `
                SELECT COUNT(*) AS total_batches,
                    COALESCE(SUM(produced_quantity),0) AS total_produced,
                    COALESCE(SUM(success_quantity),0) AS total_success,
                    COALESCE(SUM(failed_quantity),0) AS total_failed,
                    COALESCE(SUM(available_quantity),0) AS total_available,
                    COALESCE(AVG(CASE WHEN success_percent>0 THEN success_percent END),0) AS avg_success,
                    COUNT(CASE WHEN status='active' THEN 1 END) AS active_batches
                FROM production_batches`,
      ),

      // পদ্ধতি অনুযায়ী উৎপাদন
      queryTenant(
        tenant.db_url,
        `
                SELECT production_type,
                    COUNT(*) AS batches,
                    COALESCE(SUM(produced_quantity),0) AS total_qty
                FROM production_batches
                GROUP BY production_type ORDER BY total_qty DESC`,
      ),

      // স্টক summary
      queryTenant(
        tenant.db_url,
        `
                SELECT COUNT(*) AS total_species,
                    COALESCE(SUM(current_stock),0) AS total_stock,
                    COALESCE(SUM(current_stock*unit_price),0) AS stock_value,
                    COUNT(CASE WHEN current_stock<=min_stock_alert THEN 1 END) AS low_stock_count
                FROM seedlings WHERE is_active=true`,
      ),

      // কম স্টক সতর্কতা
      queryTenant(
        tenant.db_url,
        `
                SELECT s.name_bn, s.seedling_code, s.current_stock, s.min_stock_alert, c.name_bn AS category
                FROM seedlings s LEFT JOIN categories c ON s.category_id=c.id
                WHERE s.is_active=true AND s.current_stock<=s.min_stock_alert
                ORDER BY s.current_stock ASC LIMIT 8`,
      ),

      // ক্ষতি summary
      queryTenant(
        tenant.db_url,
        `
                SELECT COUNT(*) AS total_reports,
                    COALESCE(SUM(quantity),0) AS total_damaged,
                    reason, COUNT(*) AS count
                FROM damages GROUP BY reason ORDER BY count DESC`,
      ),

      // সর্বাধিক বিক্রিত চারা (Top 8)
      queryTenant(
        tenant.db_url,
        `
                SELECT s.name_bn, s.variety, s.unit_price, s.current_stock,
                    COALESCE(SUM(si.quantity),0) AS total_sold,
                    COALESCE(SUM(si.total_price),0) AS revenue,
                    COUNT(DISTINCT si.sale_id) AS orders
                FROM seedlings s
                LEFT JOIN sales_items si ON s.id=si.seedling_id
                LEFT JOIN sales sa ON si.sale_id=sa.id
                WHERE s.is_active=true
                GROUP BY s.id, s.name_bn, s.variety, s.unit_price, s.current_stock
                ORDER BY total_sold DESC LIMIT 8`,
      ),

      // সাম্প্রতিক বিক্রয় (Last 8)
      queryTenant(
        tenant.db_url,
        `
                SELECT s.invoice_no, s.customer_name, s.customer_phone,
                    s.total_amount, s.payment_method, s.payment_status, s.sale_date,
                    u.name AS created_by
                FROM sales s LEFT JOIN users u ON s.created_by=u.id
                ORDER BY s.created_at DESC LIMIT 8`,
      ),

      // সাম্প্রতিক উৎপাদন ব্যাচ (Last 6)
      queryTenant(
        tenant.db_url,
        `
                SELECT pb.batch_code, s.name_bn AS seedling, pb.production_type,
                    pb.produced_quantity, pb.available_quantity, pb.status, pb.created_at
                FROM production_batches pb LEFT JOIN seedlings s ON pb.seedling_id=s.id
                ORDER BY pb.created_at DESC LIMIT 6`,
      ),

      // ব্যবহারকারী তালিকা
      queryTenant(
        tenant.db_url,
        `
                SELECT id, name, email, role, is_active, created_at
                FROM users ORDER BY created_at DESC`,
      ),

      // অন্যান্য আয়
      queryTenant(
        tenant.db_url,
        `
                SELECT income_type, COALESCE(SUM(amount),0) AS total, COUNT(*) AS count
                FROM other_income GROUP BY income_type`,
      ),

      // লক্ষ্যমাত্রা (চলতি বছর)
      queryTenant(
        tenant.db_url,
        `
                SELECT target_type, target_month, target_year, target_quantity, target_amount
                FROM targets
                WHERE target_year=EXTRACT(YEAR FROM NOW())
                ORDER BY target_type, target_month`,
      ),

      // ক্যাটাগরি তালিকা
      queryTenant(
        tenant.db_url,
        `
                SELECT c.name_bn, COUNT(s.id) AS seedling_count,
                    COALESCE(SUM(s.current_stock),0) AS total_stock
                FROM categories c LEFT JOIN seedlings s ON c.id=s.category_id AND s.is_active=true
                GROUP BY c.id, c.name_bn ORDER BY seedling_count DESC`,
      ),
    ]);

    // ক্ষতির summary গুছিয়ে নাও
    const dmgTotal =
      damagesSummary.reduce((s, r) => s + parseInt(r.total_damaged || 0), 0) ||
      (damagesSummary[0]?.total_damaged
        ? parseInt(damagesSummary[0].total_damaged)
        : 0);
    const dmgReports =
      damagesSummary.reduce(
        (s, r) => s + parseInt(r.total_reports || r.count || 0),
        0,
      ) || parseInt(damagesSummary[0]?.total_reports || 0);

    // অন্যান্য আয়ের মোট
    const totalOtherIncome = otherIncome.reduce(
      (s, r) => s + parseFloat(r.total || 0),
      0,
    );

    res.json({
      success: true,
      center: {
        slug: req.params.slug,
        name_bn: tenant.name_bn,
        name_en: tenant.name_en,
        location: tenant.location,
        currency: tenant.currency,
      },
      sales: {
        summary: salesSummary[0],
        today: todaySales[0],
        monthly: monthlySales,
        recent: recentSales,
      },
      production: {
        summary: productionSummary[0],
        by_type: productionByType,
        recent: recentBatches,
      },
      stock: {
        summary: stockSummary[0],
        low_stock: lowStock,
        categories: categories,
      },
      damages: {
        total_damaged: dmgTotal,
        total_reports: dmgReports,
        by_reason: damagesSummary,
      },
      top_seedlings: topSeedlings,
      users: users,
      other_income: {
        breakdown: otherIncome,
        total: totalOtherIncome,
      },
      targets: targets,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== ADD TENANT =====
router.post("/tenants", saAuth, async (req, res) => {
  const { slug, name_bn, name_en, location, db_url, currency } = req.body;
  if (!slug || !name_bn || !name_en || !db_url)
    return res.status(400).json({ success: false, message: "সব তথ্য দিন।" });
  try {
    const ex = await masterDb.query("SELECT id FROM tenants WHERE slug=$1", [
      slug,
    ]);
    if (ex.rows.length)
      return res
        .status(400)
        .json({ success: false, message: "এই slug আগে থেকে আছে।" });
    const r = await masterDb.query(
      `INSERT INTO tenants (slug,name_bn,name_en,location,db_url,currency,active) VALUES($1,$2,$3,$4,$5,$6,true) RETURNING id,slug,name_bn`,
      [
        slug.toLowerCase(),
        name_bn,
        name_en,
        location,
        db_url,
        currency || "BDT",
      ],
    );
    clearCache();
    res.json({
      success: true,
      message: "নতুন center যোগ হয়েছে।",
      data: r.rows[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== UPDATE TENANT =====
router.put("/tenants/:id", saAuth, async (req, res) => {
  const { name_bn, name_en, location, db_url, currency, active } = req.body;
  try {
    await masterDb.query(
      `UPDATE tenants SET name_bn=$1,name_en=$2,location=$3,db_url=$4,currency=$5,active=$6,updated_at=NOW() WHERE id=$7`,
      [name_bn, name_en, location, db_url, currency, active, req.params.id],
    );
    clearCache();
    res.json({ success: true, message: "আপডেট হয়েছে।" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== TOGGLE =====
router.post("/tenants/:id/toggle", saAuth, async (req, res) => {
  try {
    const cur = await masterDb.query(
      "SELECT active,name_en FROM tenants WHERE id=$1",
      [req.params.id],
    );
    if (!cur.rows.length)
      return res
        .status(404)
        .json({ success: false, message: "পাওয়া যায়নি।" });
    const newStatus = !cur.rows[0].active;
    await masterDb.query(
      "UPDATE tenants SET active=$1,updated_at=NOW() WHERE id=$2",
      [newStatus, req.params.id],
    );
    clearCache();
    res.json({
      success: true,
      message: cur.rows[0].name_en + (newStatus ? " সক্রিয়।" : " বন্ধ।"),
      active: newStatus,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== DELETE =====
router.delete("/tenants/:id", saAuth, async (req, res) => {
  try {
    await masterDb.query("DELETE FROM tenants WHERE id=$1", [req.params.id]);
    clearCache();
    res.json({ success: true, message: "মুছে ফেলা হয়েছে।" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
