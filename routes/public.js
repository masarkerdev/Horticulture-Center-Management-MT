// routes/public.js — কৃষক পোর্টাল (login ছাড়া)
const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const { getTenants } = require("../lib/tenantCache");

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
  } catch {
    return [];
  } finally {
    await pool.end();
  }
}

// ===== সব সেন্টারের তালিকা =====
router.get("/centers", async (req, res) => {
  try {
    const tenants = await getTenants();
    const centers = Object.entries(tenants)
      .filter(([, t]) => t.active !== false)
      .map(([slug, t]) => ({
        slug,
        name_bn: t.name_bn,
        name_en: t.name_en,
        location: t.location,
        district: t.district,
        division: t.division,
        category: t.category,
      }));
    res.json({ success: true, data: centers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== একটি সেন্টারের সব চারা =====
router.get("/center/:slug/seedlings", async (req, res) => {
  try {
    const tenants = await getTenants();
    const tenant = tenants[req.params.slug];
    if (!tenant)
      return res
        .status(404)
        .json({ success: false, message: "সেন্টার পাওয়া যায়নি।" });

    const seedlings = await queryTenant(
      tenant.db_url,
      `
            SELECT s.name_bn, s.variety, s.seedling_code,
                   s.unit_price, s.current_stock,
                   c.name_bn AS category_bn
            FROM seedlings s
            LEFT JOIN categories c ON s.category_id = c.id
            WHERE s.is_active = true AND s.current_stock > 0
            ORDER BY c.name_bn, s.name_bn
        `,
    );

    res.json({
      success: true,
      center: {
        name_bn: tenant.name_bn,
        name_en: tenant.name_en,
        location: tenant.location,
        district: tenant.district,
      },
      data: seedlings,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== চারার নাম দিয়ে সব সেন্টারে খোঁজ =====
router.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json({ success: true, data: [] });

  try {
    const tenants = await getTenants();
    const results = await Promise.all(
      Object.entries(tenants)
        .filter(([, t]) => t.active !== false)
        .map(async ([slug, tenant]) => {
          const rows = await queryTenant(
            tenant.db_url,
            `
                        SELECT s.name_bn, s.variety, s.seedling_code,
                               s.unit_price, s.current_stock,
                               c.name_bn AS category_bn
                        FROM seedlings s
                        LEFT JOIN categories c ON s.category_id = c.id
                        WHERE s.is_active = true
                          AND s.current_stock > 0
                          AND (s.name_bn ILIKE $1 OR s.variety ILIKE $1)
                        ORDER BY s.name_bn
                    `,
            [`%${q}%`],
          );

          if (!rows.length) return null;
          return {
            slug,
            name_bn: tenant.name_bn,
            location: tenant.location,
            district: tenant.district,
            seedlings: rows,
          };
        }),
    );

    res.json({ success: true, data: results.filter(Boolean) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
