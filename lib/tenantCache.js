// lib/tenantCache.js
// Master DB থেকে tenant list cache করে রাখে (৫ মিনিট)

const masterDb = require('../config/masterDb');

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // ৫ মিনিট

async function getTenants() {
    const now = Date.now();
    if (cache && (now - cacheTime) < CACHE_TTL) {
        return cache;
    }
    const result = await masterDb.query(
        'SELECT * FROM tenants WHERE active = true ORDER BY slug'
    );
    cache = {};
    for (const row of result.rows) {
        cache[row.slug] = row;
    }
    cacheTime = now;
    return cache;
}

function clearCache() {
    cache = null;
    cacheTime = 0;
}

module.exports = { getTenants, clearCache };
