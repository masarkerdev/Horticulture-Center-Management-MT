// server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const tenantMiddleware = require("./middleware/tenant");

const app = express();

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/api/public", require("./routes/public"));

// ★ Tenant middleware
app.use(tenantMiddleware);

// ★ Super Admin routes
app.use("/api/superadmin", require("./routes/superadmin"));

// ★ Super Admin HTML page
app.get("/superadmin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "superadmin.html"));
});

// ★ Tenant info endpoint
app.get("/api/tenant-info", async (req, res) => {
  const slug =
    req.headers["x-tenant-id"] ||
    req.query?.tenant ||
    (() => {
      if (req.headers.cookie) {
        const m = req.headers.cookie.match(/(?:^|;\s*)tenant=([^;]+)/);
        if (m) return m[1];
      }
      return null;
    })() ||
    (req.headers.host?.includes("horticulturecenterasambasti")
      ? "asambasti"
      : null);

  if (!slug) return res.json({ success: false });

  try {
    const { getTenants } = require("./lib/tenantCache");
    const tenants = await getTenants();
    const tenant = tenants[slug];
    if (!tenant) return res.json({ success: false });
    res.json({
      success: true,
      tenant: {
        slug,
        name_bn: tenant.name_bn,
        name_en: tenant.name_en,
        location: tenant.location,
        currency: tenant.currency || "BDT",
      },
    });
  } catch {
    res.json({ success: false });
  }
});

// ★ Existing routes
app.use("/api", require("./routes/index"));

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err.message);
  res.status(500).json({ success: false, error: err.message });
});

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
