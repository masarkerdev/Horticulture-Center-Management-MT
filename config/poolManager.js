// config/poolManager.js
// প্রতিটা tenant-এর জন্য আলাদা pg Pool তৈরি ও cache করে

const { Pool } = require('pg');

const pools = new Map();

/**
 * Tenant-এর connection string দিলে pool দেয় (cache থেকে)
 * @param {string} connectionString - PostgreSQL connection string
 * @param {string} tenantSlug - শুধু logging-এর জন্য
 */
function getPool(connectionString, tenantSlug) {
    if (!pools.has(tenantSlug)) {
        const pool = new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false },
            max: 3,                        // Vercel serverless-এর জন্য কম রাখো
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });

        pool.on('error', (err) => {
            console.error(`[${tenantSlug}] DB Pool Error:`, err.message);
        });

        pools.set(tenantSlug, pool);
        console.log(`[${tenantSlug}] New DB pool created.`);
    }

    return pools.get(tenantSlug);
}

module.exports = { getPool };
