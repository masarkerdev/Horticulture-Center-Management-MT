// lib/tenantCache.js
const masterDb = require('../config/masterDb');

let cache     = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // ৫ মিনিট

async function getTenants() {
    const now = Date.now();

    // Cache valid থাকলে সেটা দাও
    if (cache && Object.keys(cache).length > 0 && (now - cacheTime) < CACHE_TTL) {
        return cache;
    }

    // ১. Master DB থেকে চেষ্টা করো
    try {
        const result = await masterDb.query(
            'SELECT * FROM tenants WHERE active = true ORDER BY slug'
        );
        if (result.rows.length > 0) {
            cache = {};
            for (const row of result.rows) {
                cache[row.slug] = row;
            }
            cacheTime = now;
            console.log(`[TenantCache] Loaded ${result.rows.length} tenants from Master DB`);
            return cache;
        }
        console.warn('[TenantCache] Master DB returned 0 tenants — using fallback');
    } catch (e) {
        console.error('[TenantCache] Master DB error:', e.message);
    }

    // ২. Fallback: TENANTS_CONFIG env var
    const raw = process.env.TENANTS_CONFIG;
    if (raw) {
        try {
            const config = JSON.parse(raw);
            cache = config;
            cacheTime = now;
            console.log('[TenantCache] Loaded tenants from TENANTS_CONFIG fallback');
            return cache;
        } catch (e) {
            console.error('[TenantCache] TENANTS_CONFIG parse error:', e.message);
        }
    }

    return {};
}

function clearCache() {
    cache     = null;
    cacheTime = 0;
}

module.exports = { getTenants, clearCache };
