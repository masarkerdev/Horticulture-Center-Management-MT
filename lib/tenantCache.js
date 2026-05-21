// lib/tenantCache.js
// Vercel serverless-এ in-memory cache কাজ করে না
// তাই সরাসরি Master DB থেকে data নেওয়া হচ্ছে
const masterDb = require('../config/masterDb');

async function getTenants() {
    const result = await masterDb.query(
        'SELECT * FROM tenants WHERE active = true ORDER BY category, slug'
    );
    const tenants = {};
    for (const row of result.rows) {
        tenants[row.slug] = row;
    }
    return tenants;
}

function clearCache() {
    // No-op: serverless-এ cache নেই
}

module.exports = { getTenants, clearCache };
