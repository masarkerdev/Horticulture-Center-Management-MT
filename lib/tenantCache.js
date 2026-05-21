// lib/tenantCache.js
const masterDb = require('../config/masterDb');

let cache     = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000; // ১ মিনিট

async function getTenants() {
    const now = Date.now();
    if (cache && Object.keys(cache).length > 0 && (now - cacheTime) < CACHE_TTL) {
        return cache;
    }
    try {
        const result = await masterDb.query(
            'SELECT * FROM tenants WHERE active = true ORDER BY category, slug'
        );
        if (result.rows.length > 0) {
            const newCache = {};
            for (const row of result.rows) {
                newCache[row.slug] = row;
            }
            cache     = newCache;
            cacheTime = now;
            return cache;
        }
        if (cache && Object.keys(cache).length > 0) return cache;
        return {};
    } catch (e) {
        console.error('[TenantCache] Error:', e.message);
        if (cache && Object.keys(cache).length > 0) return cache;
        throw e;
    }
}

function clearCache() {
    cache     = null;
    cacheTime = 0;
}

module.exports = { getTenants, clearCache };
