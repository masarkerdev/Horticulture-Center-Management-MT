// middleware/tenant.js
const { getPool } = require('../config/poolManager');
const db = require('../config/db');

function loadTenants() {
    const raw = process.env.TENANTS_CONFIG;
    if (!raw) throw new Error('TENANTS_CONFIG environment variable সেট করা নেই!');
    return JSON.parse(raw);
}

function extractSlug(req) {
    // ১. Header
    if (req.headers['x-tenant-id']) return req.headers['x-tenant-id'].toLowerCase();

    // ২. Query param
    if (req.query?.tenant) return req.query.tenant.toLowerCase();

    // ৩. Cookie — tenant-init.js সেট করে
    if (req.headers.cookie) {
        const match = req.headers.cookie.match(/(?:^|;\s*)tenant=([^;]+)/);
        if (match) return match[1].toLowerCase();
    }

    // ৪. Subdomain
    const host = req.headers.host || '';
    const parts = host.split('.');
    if (parts.length >= 3) {
        const sub = parts[0].toLowerCase();
        if (!['www', 'localhost', 'vercel'].includes(sub)) return sub;
    }

    // ৫. পুরনো URL backward compatible
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

    // tenant-info endpoint bypass
    if (req.path === '/api/tenant-info' && req.method === 'GET') {
        return next();
    }

    const slug = extractSlug(req);
    if (!slug) {
        return res.status(400).json({
            success: false,
            message: 'Tenant চেনা যাচ্ছে না।'
        });
    }

    let tenants;
    try { tenants = loadTenants(); }
    catch (e) { return res.status(500).json({ success: false, message: e.message }); }

    const tenant = tenants[slug];
    if (!tenant || tenant.active === false) {
        return res.status(404).json({
            success: false,
            message: `"${slug}" নামের কোনো center পাওয়া যায়নি।`
        });
    }

    const pool = getPool(tenant.db_url, slug);
    req.tenant = {
        slug,
        name_bn:  tenant.name_bn,
        name_en:  tenant.name_en,
        location: tenant.location,
        currency: tenant.currency || 'BDT',
    };

    db.run(pool, next);
}

module.exports = tenantMiddleware;
