// config/db.js
// ⚡ AsyncLocalStorage magic — controllers/routes-এ কোনো পরিবর্তন লাগবে না!
// db.query() আগের মতোই কাজ করবে, কিন্তু সঠিক tenant-এর DB-তে যাবে

const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

module.exports = {
    /**
     * Current request-এর tenant pool থেকে query চালাও
     * এটা আগের db.query() এর মতোই কাজ করে
     */
    query: (text, params) => {
        const pool = storage.getStore();
        if (!pool) {
            // Local dev fallback — DATABASE_URL থেকে নাও
            const { Pool } = require('pg');
            const fallback = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false },
                max: 3,
            });
            return fallback.query(text, params);
        }
        return pool.query(text, params);
    },

    /**
     * Middleware এটা call করে tenant-এর pool set করতে
     * সব async operation এই context-এ সঠিক pool পাবে
     */
    run: (pool, callback) => storage.run(pool, callback),
};
