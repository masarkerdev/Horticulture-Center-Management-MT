// server.js — শুধু এই changes করতে হবে (★ মার্ক করা লাইনগুলো নতুন)

const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

// ★ Tenant middleware import
const tenantMiddleware = require('./middleware/tenant');

const app = express();

// MIDDLEWARE
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files — Frontend
app.use(express.static(path.join(__dirname, 'public')));

// ★ Tenant middleware — ROUTES-এর আগে বসাও
app.use(tenantMiddleware);

// ★ Tenant info endpoint — Frontend center-এর নাম জানতে call করবে
app.get('/api/tenant-info', (req, res) => {
    const slug = req.headers['x-tenant-id'] ||
                 req.query?.tenant ||
                 (req.headers.host?.includes('horticulturecenterasambasti') ? 'asambasti' : null);

    try {
        const tenants = JSON.parse(process.env.TENANTS_CONFIG || '{}');
        const tenant  = tenants[slug];
        if (!tenant) return res.json({ success: false });
        res.json({
            success: true,
            tenant: {
                slug,
                name_bn:  tenant.name_bn,
                name_en:  tenant.name_en,
                location: tenant.location,
                currency: tenant.currency || 'BDT',
            }
        });
    } catch {
        res.json({ success: false });
    }
});

// ROUTES — কোনো পরিবর্তন নেই
app.use('/api', require('./routes/index'));

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found.' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
});

// Local dev
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
