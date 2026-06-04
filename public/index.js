const express = require("express");
const router = express.Router();

const {
  authenticate,
  adminOnly,
  adminOrManager,
  canProduce,
  canSell,
} = require("../middleware/auth");

const {
  login,
  getProfile,
  changePassword,
} = require("../controllers/authController");
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/userController");
const {
  getAllSeedlings,
  getSeedlingById,
  createSeedling,
  updateSeedling,
  deleteSeedling,
  getLowStockSeedlings,
} = require("../controllers/seedlingController");
const {
  getAllBatches,
  createSeedBatch,
  createAsexualBatch,
  getBatchById,
} = require("../controllers/productionController");
const {
  getAllSales,
  getSaleById,
  createSale,
  getTodaySummary,
  getMonthlySales,
} = require("../controllers/salesController");
const {
  getStockSummary,
  getStockLedger,
  stockAdjustment,
  getAllDamages,
  reportDamage,
  getDashboardStats,
} = require("../controllers/stockController");

// ============================================================
// AUTH ROUTES - /api/auth
// ============================================================
router.post("/auth/login", login);
router.get("/auth/profile", authenticate, getProfile);
router.put("/auth/change-password", authenticate, changePassword);

// ============================================================
// DASHBOARD - /api/dashboard
// ============================================================
router.get("/dashboard/stats", authenticate, getDashboardStats);

// ============================================================
// USER ROUTES - /api/users
// ============================================================
router.get("/users", authenticate, adminOnly, getAllUsers);
router.post("/users", authenticate, adminOnly, createUser);
router.put("/users/:id", authenticate, adminOnly, updateUser);
router.delete("/users/:id", authenticate, adminOnly, deleteUser);

// ============================================================
// CATEGORY ROUTES - /api/categories
// ============================================================
const db = require("../config/db");
router.get("/categories", authenticate, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM categories ORDER BY name_bn");
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// নতুন ক্যাটাগরি যোগ (Admin only)
router.post("/categories", authenticate, adminOnly, async (req, res) => {
  const { name_bn, name_en } = req.body;
  if (!name_bn)
    return res.status(400).json({ success: false, message: "বাংলা নাম দিন।" });
  try {
    const exists = await db.query(
      "SELECT id FROM categories WHERE name_bn=$1",
      [name_bn],
    );
    if (exists.rows.length)
      return res
        .status(400)
        .json({ success: false, message: "এই ক্যাটাগরি আগে থেকে আছে।" });
    const result = await db.query(
      "INSERT INTO categories (name_bn, name_en) VALUES ($1,$2) RETURNING *",
      [name_bn, name_en || null],
    );
    res.json({
      success: true,
      message: "ক্যাটাগরি যোগ হয়েছে।",
      data: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ক্যাটাগরি মুছুন (Admin only)
router.delete("/categories/:id", authenticate, adminOnly, async (req, res) => {
  try {
    const used = await db.query(
      "SELECT COUNT(*) FROM seedlings WHERE category_id=$1",
      [req.params.id],
    );
    if (parseInt(used.rows[0].count) > 0)
      return res
        .status(400)
        .json({
          success: false,
          message: "এই ক্যাটাগরিতে চারা আছে — মুছা যাবে না।",
        });
    await db.query("DELETE FROM categories WHERE id=$1", [req.params.id]);
    res.json({ success: true, message: "ক্যাটাগরি মুছে ফেলা হয়েছে।" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// SEEDLING ROUTES - /api/seedlings
// ============================================================
router.get("/seedlings/low-stock", authenticate, getLowStockSeedlings);
router.get("/seedlings", authenticate, getAllSeedlings);
router.get("/seedlings/:id", authenticate, getSeedlingById);
router.post("/seedlings", authenticate, canProduce, createSeedling);
router.put("/seedlings/:id", authenticate, canProduce, updateSeedling);
router.delete(
  "/seedlings/:id",
  authenticate,
  adminOrManager,
  async (req, res) => {
    try {
      const item = await db.query("SELECT * FROM seedlings WHERE id=$1", [
        req.params.id,
      ]);
      if (item.rows.length) {
        await db.query(
          "INSERT INTO recycle_bin (table_name,record_id,record_data,module,item_name,deleted_by) VALUES ($1,$2,$3,$4,$5,$6)",
          [
            "seedlings",
            req.params.id,
            JSON.stringify(item.rows[0]),
            "চারা তালিকা",
            item.rows[0].name_bn,
            req.user.id,
          ],
        );
      }
      // NOT NULL constraint আছে — DELETE করতে হবে
      await db.query("DELETE FROM sales_items WHERE seedling_id=$1", [
        req.params.id,
      ]);
      await db.query("DELETE FROM stock_transactions WHERE seedling_id=$1", [
        req.params.id,
      ]);
      // NULL করা যায় এমন columns
      await db.query(
        "UPDATE mother_plants SET seedling_id=NULL WHERE seedling_id=$1",
        [req.params.id],
      );
      await db.query(
        "UPDATE production_batches SET seedling_id=NULL WHERE seedling_id=$1",
        [req.params.id],
      );
      await db.query(
        "UPDATE damages SET seedling_id=NULL WHERE seedling_id=$1",
        [req.params.id],
      );
      await db.query("DELETE FROM seedlings WHERE id=$1", [req.params.id]);
      res.json({ success: true, message: "চারা Recycle Bin-এ পাঠানো হয়েছে।" });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

// ============================================================
// PRODUCTION ROUTES - /api/production
// ============================================================
router.get("/production", authenticate, getAllBatches);
router.get("/production/:id", authenticate, getBatchById);
router.post("/production/seed", authenticate, canProduce, createSeedBatch);
router.post(
  "/production/asexual",
  authenticate,
  canProduce,
  createAsexualBatch,
);

// Batch আপডেট করুন (edit করলে নতুন তৈরি না হয়ে আপডেট হবে)
router.post(
  "/production/:id/update",
  authenticate,
  canProduce,
  async (req, res) => {
    const { id } = req.params;
    const fields = req.body;
    try {
      const setClauses = [];
      const values = [];
      let idx = 1;
      const allowed = [
        "produced_quantity",
        "success_quantity",
        "failed_quantity",
        "seed_source",
        "seed_quantity",
        "sowing_date",
        "germination_date",
        "germination_percent",
        "propagation_date",
        "success_percent",
        "remarks",
        "status",
        "available_quantity",
      ];
      for (const key of allowed) {
        if (fields[key] !== undefined) {
          setClauses.push(`${key} = $${idx++}`);
          values.push(fields[key]);
        }
      }
      if (setClauses.length === 0)
        return res.json({ success: true, message: "কিছু পরিবর্তন নেই।" });
      values.push(id);
      const result = await db.query(
        `UPDATE production_batches SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
        values,
      );
      res.json({
        success: true,
        message: "ব্যাচ আপডেট হয়েছে।",
        data: result.rows[0],
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

// ============================================================
// MOTHER PLANT ROUTES - /api/mother-plants
// ============================================================
router.get("/mother-plants", authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT mp.*, s.name_bn AS seedling_bn, s.seedling_code
             FROM mother_plants mp
             LEFT JOIN seedlings s ON mp.seedling_id = s.id
             WHERE mp.is_active = TRUE ORDER BY mp.mp_code`,
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/mother-plants", authenticate, canProduce, async (req, res) => {
  const { variety, seedling_id, age_years, location, health_status, notes } =
    req.body;
  try {
    const countResult = await db.query("SELECT COUNT(*) FROM mother_plants");
    const nextNum = parseInt(countResult.rows[0].count) + 1;
    const mp_code = "MP-" + String(nextNum).padStart(3, "0");

    const result = await db.query(
      `INSERT INTO mother_plants (mp_code, variety, seedling_id, age_years, location, health_status, notes, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        mp_code,
        variety,
        seedling_id,
        age_years,
        location,
        health_status || "good",
        notes,
        req.user.id,
      ],
    );
    res
      .status(201)
      .json({
        success: true,
        message: "মাদার প্ল্যান্ট যোগ হয়েছে।",
        data: result.rows[0],
      });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// STOCK ROUTES - /api/stock
// ============================================================
router.get("/stock", authenticate, getStockSummary);
router.get("/stock/ledger", authenticate, getStockLedger);
router.post("/stock/adjustment", authenticate, adminOrManager, stockAdjustment);

// ============================================================
// SALES ROUTES - /api/sales
// ============================================================
router.get("/sales", authenticate, getAllSales);
router.get("/sales/today", authenticate, getTodaySummary);
router.get("/sales/monthly", authenticate, getMonthlySales);
router.get("/sales/:id", authenticate, getSaleById);
router.post("/sales", authenticate, canSell, createSale);

// ============================================================
// DAMAGE ROUTES - /api/damages
// ============================================================
router.get("/damages", authenticate, getAllDamages);
router.post("/damages", authenticate, canProduce, reportDamage);

// ============================================================
// CUSTOMER ROUTES - /api/customers
// ============================================================
router.get("/customers", authenticate, async (req, res) => {
  const { search } = req.query;
  try {
    const params = [];
    const where = search
      ? (params.push(`%${search}%`),
        `WHERE c.name ILIKE $1 OR c.phone ILIKE $1`)
      : "";
    const result = await db.query(
      `SELECT c.*,
                COUNT(s.id) AS total_orders,
                COALESCE(SUM(s.total_amount), 0) AS total_spent
             FROM customers c
             LEFT JOIN sales s ON (c.id = s.customer_id OR c.phone = s.customer_phone)
             ${where}
             GROUP BY c.id
             ORDER BY total_orders DESC, c.name`,
      params,
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/customers", authenticate, canSell, async (req, res) => {
  const { name, phone, address, email, notes } = req.body;
  if (!name)
    return res.status(400).json({ success: false, message: "নাম দিন।" });
  try {
    const result = await db.query(
      "INSERT INTO customers (name, phone, address, email, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [name, phone, address, email, notes],
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// গ্রাহক আপডেট করুন
router.put("/customers/:id", authenticate, canSell, async (req, res) => {
  const { name, phone, address, email, notes } = req.body;
  try {
    const result = await db.query(
      `UPDATE customers SET name=$1, phone=$2, address=$3, email=$4, notes=$5
             WHERE id=$6 RETURNING *`,
      [name, phone, address, email, notes, req.params.id],
    );
    if (result.rows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "গ্রাহক পাওয়া যায়নি।" });
    res.json({
      success: true,
      message: "গ্রাহক আপডেট হয়েছে।",
      data: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// গ্রাহক মুছুন
router.delete(
  "/customers/:id",
  authenticate,
  adminOrManager,
  async (req, res) => {
    try {
      await db.query("DELETE FROM customers WHERE id = $1", [req.params.id]);
      res.json({ success: true, message: "গ্রাহক মুছে ফেলা হয়েছে।" });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

// ============================================================
// SALES UPDATE - /api/sales/:id (নতুন — বিক্রয় আপডেট)
// ============================================================
router.put("/sales/:id", authenticate, canSell, async (req, res) => {
  const {
    customer_name,
    customer_phone,
    customer_address,
    payment_method,
    payment_status,
    discount,
    notes,
  } = req.body;
  try {
    const result = await db.query(
      `UPDATE sales SET
                customer_name = COALESCE($1, customer_name),
                customer_phone = COALESCE($2, customer_phone),
                customer_address = COALESCE($3, customer_address),
                payment_method = COALESCE($4, payment_method),
                payment_status = COALESCE($5, payment_status),
                discount = COALESCE($6, discount),
                notes = COALESCE($7, notes)
             WHERE id = $8 RETURNING *`,
      [
        customer_name,
        customer_phone,
        customer_address,
        payment_method,
        payment_status,
        discount,
        notes,
        req.params.id,
      ],
    );
    if (result.rows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "বিক্রয় পাওয়া যায়নি।" });
    res.json({
      success: true,
      message: "বিক্রয় আপডেট হয়েছে।",
      data: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// SALES DELETE - /api/sales/:id
// ============================================================
router.delete("/sales/:id", authenticate, adminOrManager, async (req, res) => {
  try {
    const item = await db.query("SELECT * FROM sales WHERE id=$1", [
      req.params.id,
    ]);
    if (item.rows.length) {
      await db.query(
        "INSERT INTO recycle_bin (table_name,record_id,record_data,module,item_name,deleted_by) VALUES ($1,$2,$3,$4,$5,$6)",
        [
          "sales",
          req.params.id,
          JSON.stringify(item.rows[0]),
          "বিক্রয়",
          item.rows[0].invoice_no,
          req.user.id,
        ],
      );
    }
    await db.query("DELETE FROM sales_items WHERE sale_id = $1", [
      req.params.id,
    ]);
    await db.query("DELETE FROM sales WHERE id = $1", [req.params.id]);
    res.json({
      success: true,
      message: "বিক্রয় Recycle Bin-এ পাঠানো হয়েছে।",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// PRODUCTION BATCH DELETE - /api/production-batches/:id
// ============================================================
router.delete(
  "/production-batches/:id",
  authenticate,
  adminOrManager,
  async (req, res) => {
    try {
      // Recycle bin-এ save করার চেষ্টা করুন (fail হলেও delete চলবে)
      try {
        const item = await db.query(
          "SELECT * FROM production_batches WHERE id=$1",
          [req.params.id],
        );
        if (item.rows.length) {
          await db.query(
            "INSERT INTO recycle_bin (table_name,record_id,record_data,module,item_name,deleted_by) VALUES ($1,$2,$3,$4,$5,$6)",
            [
              "production_batches",
              req.params.id,
              JSON.stringify(item.rows[0]),
              "উৎপাদন ব্যাচ",
              item.rows[0].batch_code,
              req.user.id,
            ],
          );
        }
      } catch (rbErr) {
        console.log("Recycle bin save skipped:", rbErr.message);
      }
      // Foreign key references ঠিক করুন তারপর delete করুন
      await db.query("UPDATE damages SET batch_id=NULL WHERE batch_id=$1", [
        req.params.id,
      ]);
      await db.query("UPDATE sales_items SET batch_id=NULL WHERE batch_id=$1", [
        req.params.id,
      ]);
      await db.query("DELETE FROM stock_transactions WHERE batch_id=$1", [
        req.params.id,
      ]);
      await db.query("DELETE FROM production_batches WHERE id=$1", [
        req.params.id,
      ]);
      res.json({ success: true, message: "ব্যাচ মুছে ফেলা হয়েছে।" });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

// ============================================================
// MOTHER PLANT DELETE - /api/mother-plants/:id
// ============================================================
router.delete(
  "/mother-plants/:id",
  authenticate,
  adminOrManager,
  async (req, res) => {
    try {
      const item = await db.query("SELECT * FROM mother_plants WHERE id=$1", [
        req.params.id,
      ]);
      if (item.rows.length) {
        await db.query(
          "INSERT INTO recycle_bin (table_name,record_id,record_data,module,item_name,deleted_by) VALUES ($1,$2,$3,$4,$5,$6)",
          [
            "mother_plants",
            req.params.id,
            JSON.stringify(item.rows[0]),
            "মাদার প্ল্যান্ট",
            item.rows[0].mp_code + " " + item.rows[0].variety,
            req.user.id,
          ],
        );
      }
      await db.query("DELETE FROM mother_plants WHERE id=$1", [req.params.id]);
      res.json({
        success: true,
        message: "মাদার প্ল্যান্ট Recycle Bin-এ পাঠানো হয়েছে।",
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

// ============================================================
// DAMAGE DELETE - /api/damages/:id
// ============================================================
router.delete(
  "/damages/:id",
  authenticate,
  adminOrManager,
  async (req, res) => {
    try {
      const item = await db.query("SELECT * FROM damages WHERE id=$1", [
        req.params.id,
      ]);
      if (item.rows.length) {
        await db.query(
          "INSERT INTO recycle_bin (table_name,record_id,record_data,module,item_name,deleted_by) VALUES ($1,$2,$3,$4,$5,$6)",
          [
            "damages",
            req.params.id,
            JSON.stringify(item.rows[0]),
            "ক্ষতি/নষ্ট",
            "ক্ষতি #" + req.params.id,
            req.user.id,
          ],
        );
      }
      await db.query("DELETE FROM damages WHERE id = $1", [req.params.id]);
      res.json({
        success: true,
        message: "ক্ষতি রিপোর্ট Recycle Bin-এ পাঠানো হয়েছে।",
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

// ============================================================
// REPORTS ROUTES - /api/reports
// ============================================================
router.get("/reports/production", authenticate, async (req, res) => {
  const { from_date, to_date } = req.query;
  try {
    const result = await db.query(
      `SELECT pb.batch_code, s.name_bn, pb.production_type,
                    pb.produced_quantity, pb.success_quantity, pb.failed_quantity,
                    COALESCE(pb.success_percent, pb.germination_percent) AS success_rate,
                    pb.available_quantity, pb.status, pb.created_at
             FROM production_batches pb
             LEFT JOIN seedlings s ON pb.seedling_id = s.id
             WHERE ($1::DATE IS NULL OR DATE(pb.created_at) >= $1::DATE)
               AND ($2::DATE IS NULL OR DATE(pb.created_at) <= $2::DATE)
             ORDER BY pb.created_at DESC`,
      [from_date || null, to_date || null],
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get(
  "/reports/profit-loss",
  authenticate,
  adminOrManager,
  async (req, res) => {
    const { from_date, to_date } = req.query;
    try {
      const revenue = await db.query(
        `SELECT COALESCE(SUM(total_amount),0) AS total
             FROM sales WHERE ($1::DATE IS NULL OR sale_date >= $1::DATE)
               AND ($2::DATE IS NULL OR sale_date <= $2::DATE)`,
        [from_date || null, to_date || null],
      );

      const cost = await db.query(
        `SELECT COALESCE(SUM(pb.produced_quantity * s.production_cost), 0) AS total
             FROM production_batches pb
             LEFT JOIN seedlings s ON pb.seedling_id = s.id
             WHERE ($1::DATE IS NULL OR DATE(pb.created_at) >= $1::DATE)
               AND ($2::DATE IS NULL OR DATE(pb.created_at) <= $2::DATE)`,
        [from_date || null, to_date || null],
      );

      const totalRevenue = parseFloat(revenue.rows[0].total);
      const totalCost = parseFloat(cost.rows[0].total);

      res.json({
        success: true,
        data: {
          total_revenue: totalRevenue,
          total_cost: totalCost,
          profit: totalRevenue - totalCost,
          profit_margin:
            totalRevenue > 0
              ? (((totalRevenue - totalCost) / totalRevenue) * 100).toFixed(2)
              : 0,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

// ============================================================
// মাসিক উৎপাদন — /api/reports/monthly-production
// ============================================================
router.get("/reports/monthly-production", authenticate, async (req, res) => {
  try {
    const result = await db.query(`
            SELECT
                TO_CHAR(created_at, 'YYYY-MM') AS month_key,
                TO_CHAR(created_at, 'Mon') AS month_name,
                EXTRACT(MONTH FROM created_at) AS month_num,
                EXTRACT(YEAR FROM created_at) AS year_num,
                SUM(CASE WHEN production_type = 'seed' THEN produced_quantity ELSE 0 END) AS seed_qty,
                SUM(CASE WHEN production_type != 'seed' THEN produced_quantity ELSE 0 END) AS asexual_qty,
                SUM(produced_quantity) AS total_qty
            FROM production_batches
            WHERE created_at >= NOW() - INTERVAL '6 months'
            GROUP BY month_key, month_name, month_num, year_num
            ORDER BY year_num, month_num
        `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// ক্যাটাগরি অনুযায়ী বিক্রয় — /api/reports/sales-by-category
// ============================================================
router.get("/reports/sales-by-category", authenticate, async (req, res) => {
  try {
    const result = await db.query(`
            SELECT
                c.name_bn AS category,
                COALESCE(SUM(si.total_price), 0) AS total_sales,
                COUNT(DISTINCT si.sale_id) AS total_orders
            FROM categories c
            LEFT JOIN seedlings s ON s.category_id = c.id
            LEFT JOIN sales_items si ON si.seedling_id = s.id
            GROUP BY c.id, c.name_bn
            ORDER BY total_sales DESC
        `);

    const total = result.rows.reduce(
      (sum, r) => sum + parseFloat(r.total_sales),
      0,
    );
    const dataWithPercent = result.rows.map((r) => ({
      ...r,
      percent:
        total > 0 ? ((parseFloat(r.total_sales) / total) * 100).toFixed(1) : 0,
    }));

    res.json({ success: true, data: dataWithPercent, total });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ব্যবহারকারী নিষ্ক্রিয়/সক্রিয় toggle
router.post(
  "/users/:id/toggle-active",
  authenticate,
  adminOnly,
  async (req, res) => {
    try {
      const user = await db.query(
        "SELECT is_active, name FROM users WHERE id=$1",
        [req.params.id],
      );
      if (!user.rows.length)
        return res
          .status(404)
          .json({ success: false, message: "পাওয়া যায়নি।" });
      const newStatus = !user.rows[0].is_active;
      await db.query("UPDATE users SET is_active=$1 WHERE id=$2", [
        newStatus,
        req.params.id,
      ]);
      res.json({
        success: true,
        message:
          user.rows[0].name +
          (newStatus ? " সক্রিয় করা হয়েছে।" : " নিষ্ক্রিয় করা হয়েছে।"),
        is_active: newStatus,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

// Best Selling Seedlings
router.get("/reports/best-selling", authenticate, async (req, res) => {
  try {
    const result = await db.query(`
            SELECT s.name_bn, s.name_en, s.variety,
                   COALESCE(SUM(si.quantity), 0) AS total_sold,
                   COALESCE(SUM(si.total_price), 0) AS total_revenue,
                   COUNT(DISTINCT si.sale_id) AS order_count
            FROM seedlings s
            LEFT JOIN sales_items si ON s.id = si.seedling_id
            LEFT JOIN sales sa ON si.sale_id = sa.id
            WHERE s.is_active = TRUE
            GROUP BY s.id, s.name_bn, s.name_en, s.variety
            ORDER BY total_sold DESC
            LIMIT 10
        `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Monthly Sales Report
router.get("/reports/monthly-summary", authenticate, async (req, res) => {
  const { year } = req.query;
  const y = year || new Date().getFullYear();
  try {
    const sales = await db.query(
      `
            SELECT
                TO_CHAR(sale_date,'MM') AS month_num,
                TO_CHAR(sale_date,'Mon') AS month_name,
                COUNT(*) AS total_invoices,
                COALESCE(SUM(total_amount), 0) AS total_revenue,
                COALESCE(SUM(discount), 0) AS total_discount
            FROM sales
            WHERE EXTRACT(YEAR FROM sale_date) = $1
            GROUP BY month_num, month_name
            ORDER BY month_num`,
      [y],
    );

    const production = await db.query(
      `
            SELECT
                TO_CHAR(created_at,'MM') AS month_num,
                TO_CHAR(created_at,'Mon') AS month_name,
                COALESCE(SUM(produced_quantity), 0) AS total_produced,
                COUNT(*) AS total_batches
            FROM production_batches
            WHERE EXTRACT(YEAR FROM created_at) = $1
            GROUP BY month_num, month_name
            ORDER BY month_num`,
      [y],
    );

    res.json({
      success: true,
      data: { sales: sales.rows, production: production.rows, year: y },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fiscal Year Target vs Achievement
router.get("/reports/fiscal-achievement", authenticate, async (req, res) => {
  const fy = parseInt(req.query.fy) || new Date().getFullYear();

  // FY Start: July 1st, End: June 30th
  const fyStart = `${fy}-07-01`;
  const fyEnd = `${fy + 1}-06-30`;

  try {
    // 1. Total Production
    const prodTotal = await db.query(
      `
            SELECT COALESCE(SUM(produced_quantity), 0) AS total
            FROM production_batches 
            WHERE created_at BETWEEN $1 AND $2`,
      [fyStart, fyEnd],
    );

    // 2. Total Sales
    const saleTotal = await db.query(
      `
            SELECT COALESCE(SUM(total_amount), 0) AS total, COUNT(*) AS invoices
            FROM sales 
            WHERE sale_date BETWEEN $1 AND $2`,
      [fyStart, fyEnd],
    );

    // 3. Sales by Category
    const catSales = await db.query(
      `
            SELECT c.name_bn AS category,
                   COALESCE(SUM(si.quantity), 0) AS total_qty,
                   COALESCE(SUM(si.total_price), 0) AS total_amount
            FROM categories c
            LEFT JOIN seedlings s ON s.category_id = c.id
            LEFT JOIN sales_items si ON si.seedling_id = s.id
            LEFT JOIN sales sa ON si.sale_id = sa.id AND sa.sale_date BETWEEN $1 AND $2
            GROUP BY c.id, c.name_bn
            ORDER BY total_qty DESC`,
      [fyStart, fyEnd],
    );

    // 4. Current Month Logic
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    const curMonthTarget = await db.query(
      `
            SELECT COALESCE(target_quantity, 0) AS qty
            FROM targets WHERE target_type = 'production'
            AND target_month = $1 AND target_year = $2`,
      [curMonth, curYear],
    );

    const curMonthActual = await db.query(
      `
            SELECT COALESCE(SUM(produced_quantity), 0) AS total
            FROM production_batches
            WHERE EXTRACT(MONTH FROM created_at) = $1
            AND EXTRACT(YEAR FROM created_at) = $2`,
      [curMonth, curYear],
    );

    // 5. Fiscal Year Target Logic (Annual vs Sum of Months)
    const prodAnnualTgt = await db.query(
      `SELECT target_quantity FROM targets WHERE target_type = 'production' AND target_year = $1 AND target_month = 0`,
      [fy],
    );
    const saleAnnualTgt = await db.query(
      `SELECT target_amount FROM targets WHERE target_type = 'sales' AND target_year = $1 AND target_month = 0`,
      [fy],
    );

    const prodMonthlySum = await db.query(
      `
            SELECT COALESCE(SUM(target_quantity), 0) AS total
            FROM targets
            WHERE target_type = 'production' AND target_month > 0
            AND ((target_year = $1 AND target_month >= 7)
                 OR (target_year = $2 AND target_month <= 6))`,
      [fy, fy + 1],
    );

    const saleMonthlySum = await db.query(
      `
            SELECT COALESCE(SUM(target_amount), 0) AS total
            FROM targets
            WHERE target_type = 'sales' AND target_month > 0
            AND ((target_year = $1 AND target_month >= 7)
                 OR (target_year = $2 AND target_month <= 6))`,
      [fy, fy + 1],
    );

    // Decision logic for targets
    const finalProdTarget = prodAnnualTgt.rows.length
      ? parseFloat(prodAnnualTgt.rows[0].target_quantity)
      : parseFloat(prodMonthlySum.rows[0].total) || 0;

    const finalSaleTarget = saleAnnualTgt.rows.length
      ? parseFloat(saleAnnualTgt.rows[0].target_amount)
      : parseFloat(saleMonthlySum.rows[0].total) || 0;

    // 6. Response Construction
    res.json({
      success: true,
      data: {
        fy: `${fy}-${fy + 1}`,
        period: { start: fyStart, end: fyEnd },
        current_month: {
          month: curMonth,
          year: curYear,
          target: parseFloat(curMonthTarget.rows[0]?.qty) || 0,
          actual: parseFloat(curMonthActual.rows[0]?.total) || 0,
        },
        production: {
          target: finalProdTarget,
          monthly_target_sum: parseFloat(prodMonthlySum.rows[0].total) || 0,
          actual: parseFloat(prodTotal.rows[0].total) || 0,
        },
        sales: {
          target: finalSaleTarget,
          monthly_target_sum: parseFloat(saleMonthlySum.rows[0].total) || 0,
          actual: parseFloat(saleTotal.rows[0].total) || 0,
          invoices: parseInt(saleTotal.rows[0].invoices) || 0,
        },
        categories: catSales.rows,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

// ============================================================
// RECYCLE BIN ROUTES
// ============================================================
router.get("/recycle-bin", authenticate, adminOnly, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT rb.*, u.name AS deleted_by_name
             FROM recycle_bin rb
             LEFT JOIN users u ON rb.deleted_by = u.id
             ORDER BY rb.deleted_at DESC`,
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Restore করুন
router.post(
  "/recycle-bin/:id/restore",
  authenticate,
  adminOnly,
  async (req, res) => {
    try {
      const item = await db.query("SELECT * FROM recycle_bin WHERE id=$1", [
        req.params.id,
      ]);
      if (!item.rows.length)
        return res
          .status(404)
          .json({ success: false, message: "পাওয়া যায়নি।" });
      const { table_name, record_data } = item.rows[0];
      const data = record_data;
      const keys = Object.keys(data).join(",");
      const vals = Object.values(data);
      const phs = vals.map((_, i) => `$${i + 1}`).join(",");
      await db.query(
        `INSERT INTO ${table_name} (${keys}) VALUES (${phs}) ON CONFLICT DO NOTHING`,
        vals,
      );
      await db.query("DELETE FROM recycle_bin WHERE id=$1", [req.params.id]);
      res.json({ success: true, message: "সফলভাবে পুনরুদ্ধার হয়েছে।" });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

// চিরতরে মুছুন
router.delete("/recycle-bin/:id", authenticate, adminOnly, async (req, res) => {
  try {
    await db.query("DELETE FROM recycle_bin WHERE id=$1", [req.params.id]);
    res.json({ success: true, message: "স্থায়ীভাবে মুছে ফেলা হয়েছে।" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// সব Recycle Bin খালি করুন
router.delete("/recycle-bin", authenticate, adminOnly, async (req, res) => {
  try {
    await db.query("DELETE FROM recycle_bin");
    res.json({ success: true, message: "Recycle Bin খালি করা হয়েছে।" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// TARGET vs ACHIEVEMENT ROUTES
// ============================================================

// লক্ষ্যমাত্রা সেট করুন (Admin only)
router.post("/targets", authenticate, adminOnly, async (req, res) => {
  const {
    target_type,
    target_month,
    target_year,
    target_quantity,
    target_amount,
    notes,
  } = req.body;
  try {
    const result = await db.query(
      `
            INSERT INTO targets (target_type, target_month, target_year, target_quantity, target_amount, notes, created_by)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT (target_type, target_month, target_year)
            DO UPDATE SET target_quantity=$4, target_amount=$5, notes=$6
            RETURNING *`,
      [
        target_type,
        target_month,
        target_year,
        target_quantity || 0,
        target_amount || 0,
        notes || null,
        req.user.id,
      ],
    );
    res.json({
      success: true,
      message: "লক্ষ্যমাত্রা সংরক্ষণ হয়েছে।",
      data: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// লক্ষ্যমাত্রা বনাম অর্জন
router.get("/reports/target-achievement", authenticate, async (req, res) => {
  const { year } = req.query;
  const y = year || new Date().getFullYear();
  try {
    // উৎপাদন target vs actual
    const prodResult = await db.query(
      `
            SELECT
                t.target_month AS month,
                t.target_quantity,
                t.target_amount,
                COALESCE(SUM(pb.produced_quantity), 0) AS actual_quantity
            FROM targets t
            LEFT JOIN production_batches pb ON
                EXTRACT(MONTH FROM pb.created_at) = t.target_month AND
                EXTRACT(YEAR FROM pb.created_at) = $1
            WHERE t.target_type = 'production' AND t.target_year = $1
            GROUP BY t.target_month, t.target_quantity, t.target_amount
            ORDER BY t.target_month`,
      [y],
    );

    // বিক্রয় target vs actual
    const saleResult = await db.query(
      `
            SELECT
                t.target_month AS month,
                t.target_quantity,
                t.target_amount,
                COALESCE(COUNT(s.id), 0) AS actual_invoices,
                COALESCE(SUM(s.total_amount), 0) AS actual_amount
            FROM targets t
            LEFT JOIN sales s ON
                EXTRACT(MONTH FROM s.sale_date) = t.target_month AND
                EXTRACT(YEAR FROM s.sale_date) = $1
            WHERE t.target_type = 'sales' AND t.target_year = $1
            GROUP BY t.target_month, t.target_quantity, t.target_amount
            ORDER BY t.target_month`,
      [y],
    );

    res.json({
      success: true,
      data: { production: prodResult.rows, sales: saleResult.rows, year: y },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// সব target দেখুন (FY support)
router.get("/targets", authenticate, async (req, res) => {
  const fy = parseInt(req.query.fy) || new Date().getFullYear();
  try {
    const result = await db.query(
      `
            SELECT * FROM targets
            WHERE (target_year=$1 AND target_month=0)
               OR (target_year=$1 AND target_month>=7)
               OR (target_year=$2 AND target_month BETWEEN 1 AND 6)
            ORDER BY 
                CASE WHEN target_month=0 THEN 0 ELSE 1 END,
                target_type, target_month`,
      [fy, fy + 1],
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Target মুছুন (Admin only)
router.delete("/targets/:id", authenticate, adminOnly, async (req, res) => {
  try {
    await db.query("DELETE FROM targets WHERE id=$1", [req.params.id]);
    res.json({ success: true, message: "লক্ষ্যমাত্রা মুছে ফেলা হয়েছে।" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// TWO FACTOR AUTH — OTP Email System
// ============================================================
const otpStore = {};

router.post("/auth/send-otp", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query(
      "SELECT * FROM users WHERE email=$1 AND is_active=TRUE",
      [email],
    );
    if (!result.rows.length)
      return res
        .status(401)
        .json({ success: false, message: "ইমেইল বা পাসওয়ার্ড ভুল।" });
    const user = result.rows[0];
    const bcrypt = require("bcryptjs");
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(401)
        .json({ success: false, message: "ইমেইল বা পাসওয়ার্ড ভুল।" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000;
    otpStore[email] = { otp, expires, userId: user.id };

    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
    });
    await transporter.sendMail({
      from: `"উদ্যানতত্ত্ববিদের কার্যালয়" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "🔐 Login OTP — উদ্যানতত্ত্ববিদের কার্যালয়",
      html: `<div style="font-family:Arial,sans-serif;max-width:400px;margin:auto;padding:30px;border:1px solid #e2ddd5;border-radius:12px">
              <div style="text-align:center;margin-bottom:20px">
                <h2 style="color:#3B6D11">🌿 উদ্যানতত্ত্ববিদের কার্যালয়</h2>
                <p style="color:#888">Asambasti, Rangamati</p>
              </div>
              <p style="color:#333">আপনার Login OTP Code:</p>
              <div style="text-align:center;padding:20px;background:#EAF3DE;border-radius:10px;margin:20px 0">
                <h1 style="color:#3B6D11;font-size:40px;letter-spacing:10px;margin:0">${otp}</h1>
              </div>
              <p style="color:#888;font-size:13px">⏱ এই Code <strong>৫ মিনিট</strong> এর জন্য valid।</p>
              <p style="color:#e24b4a;font-size:13px">⚠️ অন্য কাউকে এই Code দেবেন না।</p>
            </div>`,
    });
    res.json({ success: true, message: `OTP পাঠানো হয়েছে।` });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "OTP পাঠাতে সমস্যা হয়েছে: " + err.message,
      });
  }
});

router.post("/auth/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const stored = otpStore[email];
    if (!stored)
      return res
        .status(401)
        .json({
          success: false,
          message: "OTP পাওয়া যায়নি। আবার চেষ্টা করুন।",
        });
    if (Date.now() > stored.expires)
      return res
        .status(401)
        .json({ success: false, message: "OTP মেয়াদ শেষ। আবার চেষ্টা করুন।" });
    if (stored.otp !== otp)
      return res.status(401).json({ success: false, message: "OTP ভুল।" });

    delete otpStore[email];
    const user = await db.query("SELECT * FROM users WHERE id=$1", [
      stored.userId,
    ]);
    const jwt = require("jsonwebtoken");
    const token = jwt.sign(
      {
        id: user.rows[0].id,
        role: user.rows[0].role,
        email: user.rows[0].email,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );
    res.json({
      success: true,
      token,
      user: {
        id: user.rows[0].id,
        name: user.rows[0].name,
        email: user.rows[0].email,
        role: user.rows[0].role,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// নিজের Profile আপডেট
router.put("/auth/update-profile", authenticate, async (req, res) => {
  const { name, email, current_password, new_password } = req.body;
  try {
    // বর্তমান user এর তথ্য নিন
    const userResult = await db.query("SELECT * FROM users WHERE id=$1", [
      req.user.id,
    ]);
    if (!userResult.rows.length)
      return res
        .status(404)
        .json({ success: false, message: "ব্যবহারকারী পাওয়া যায়নি।" });
    const user = userResult.rows[0];

    // বর্তমান password যাচাই করুন
    const bcrypt = require("bcryptjs");
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, message: "বর্তমান পাসওয়ার্ড ভুল।" });

    // Email আগে থেকে আছে কিনা চেক করুন
    if (email && email !== user.email) {
      const exists = await db.query(
        "SELECT id FROM users WHERE email=$1 AND id!=$2",
        [email, req.user.id],
      );
      if (exists.rows.length)
        return res
          .status(400)
          .json({
            success: false,
            message: "এই ইমেইল আগে থেকে ব্যবহৃত হচ্ছে।",
          });
    }

    // আপডেট করুন
    let newHash = user.password;
    if (new_password && new_password.length >= 6) {
      newHash = await bcrypt.hash(new_password, 10);
    }
    await db.query(
      "UPDATE users SET name=$1, email=$2, password=$3 WHERE id=$4",
      [name || user.name, email || user.email, newHash, req.user.id],
    );
    res.json({ success: true, message: "প্রোফাইল আপডেট হয়েছে।" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// পাসওয়ার্ড পরিবর্তনের অনুরোধ — /api/auth/request-password-change
// ============================================================
router.post("/auth/request-password-change", authenticate, async (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6)
    return res
      .status(400)
      .json({ success: false, message: "কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।" });
  try {
    const bcrypt = require("bcryptjs");
    const hashed = await bcrypt.hash(new_password, 10);
    await db.query(
      `UPDATE users SET pending_password=$1, password_request_status='pending' WHERE id=$2`,
      [hashed, req.user.id],
    );
    res.json({
      success: true,
      message:
        "পাসওয়ার্ড পরিবর্তনের অনুরোধ পাঠানো হয়েছে। Admin অনুমোদনের জন্য অপেক্ষা করুন।",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin — অনুরোধ Approve করুন
router.post(
  "/users/:id/approve-password",
  authenticate,
  adminOnly,
  async (req, res) => {
    try {
      const user = await db.query(
        "SELECT pending_password FROM users WHERE id=$1",
        [req.params.id],
      );
      if (!user.rows[0]?.pending_password)
        return res
          .status(400)
          .json({ success: false, message: "কোনো pending অনুরোধ নেই।" });
      await db.query(
        `UPDATE users SET password=$1, pending_password=NULL, password_request_status='approved' WHERE id=$2`,
        [user.rows[0].pending_password, req.params.id],
      );
      res.json({
        success: true,
        message: "পাসওয়ার্ড পরিবর্তন অনুমোদিত হয়েছে।",
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

// Admin — অনুরোধ Reject করুন
router.post(
  "/users/:id/reject-password",
  authenticate,
  adminOnly,
  async (req, res) => {
    try {
      await db.query(
        `UPDATE users SET pending_password=NULL, password_request_status='rejected' WHERE id=$1`,
        [req.params.id],
      );
      res.json({
        success: true,
        message: "পাসওয়ার্ড পরিবর্তনের অনুরোধ প্রত্যাখ্যান করা হয়েছে।",
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

module.exports = router;
