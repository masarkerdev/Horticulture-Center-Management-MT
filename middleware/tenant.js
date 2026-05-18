// middleware/tenant.js
// Request-এ tenant detect করে সঠিক DB pool inject করে

const { getPool } = require('../config/poolManager');
const db = require('../config/db');

// Tenant config লোড করো (Vercel env var থেকে)
function loadTenants() {
    const raw = process.env.TENANTS_CONFIG;
    if (!raw) throw new Error('TENANTS_CONFIG environment variable সেট করা নেই!');
    return JSON.parse(raw);
}

// Request থেকে tenant slug বের করো
function extractSlug(req) {
    // ১. Header (API call / dev)
    if (req.headers['x-tenant-id']) return req.headers['x-tenant-id'].toLowerCase();

    // ২. Query param (local dev)
    if (req.query?.tenant) return req.query.tenant.toLowerCase();

    // ৩. Subdomain থেকে
    const host = req.headers.host || '';
    const parts = host.split('.');
    if (parts.length >= 3) {
        const sub = parts[0].toLowerCase();
        if (!['www', 'localhost', 'vercel'].includes(sub)) return sub;
    }

    // ৪. পুরনো Vercel URL (backward compatible)
    if (host.includes('horticulturecenterasambasti')) return 'asambasti';

    return null;
}

function tenantMiddleware(req, res, next) {
    // Static files bypass
    if (req.path.startsWith('/images/') ||
        req.path.startsWith('/css/') ||
        req.path.startsWith('/js/') ||
        req.path === '/favicon.ico' ||
        req.path === '/health') {
        return next();
    }

    // Tenant config endpoint — slug লাগে না
    if (req.path === '/api/tenant-info' && req.method === 'GET') {
        return next();
    }

    const slug = extractSlug(req);
    if (!slug) {
        return res.status(400).json({
            success: false,
            message: 'Tenant চেনা যাচ্ছে না। Subdomain বা X-Tenant-ID header দিন।'
        });
    }

    let tenants;
    try {
        tenants = loadTenants();
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }

    const tenant = tenants[slug];
    if (!tenant || tenant.active === false) {
        return res.status(404).json({
            success: false,
            message: `"${slug}" নামের কোনো center পাওয়া যায়নি।`
        });
    }

    // Pool তৈরি করো বা cache থেকে নাও
    const pool = getPool(tenant.db_url, slug);

    // req-এ tenant info রাখো
    req.tenant = {
        slug,
        name_bn:   tenant.name_bn,
        name_en:   tenant.name_en,
        location:  tenant.location,
        currency:  tenant.currency || 'BDT',
    };

    // ⚡ AsyncLocalStorage-এ pool set করে next() চালাও
    // এখন সব db.query() এই tenant-এর DB-তে যাবে
    db.run(pool, next);
}

module.exports = tenantMiddleware;
