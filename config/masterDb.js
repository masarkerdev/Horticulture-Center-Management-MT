// config/masterDb.js
// Super Admin-এর master database — tenant list এখানে থাকে

const { Pool } = require('pg');

let masterPool = null;

function getMasterPool() {
    if (!masterPool) {
        const url = process.env.MASTER_DB_URL;
        if (!url) throw new Error('MASTER_DB_URL environment variable সেট করা নেই!');
        masterPool = new Pool({
            connectionString: url,
            ssl: { rejectUnauthorized: false },
            max: 2,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });
        masterPool.on('error', (err) => {
            console.error('[MasterDB] Pool Error:', err.message);
        });
    }
    return masterPool;
}

module.exports = {
    query: (text, params) => getMasterPool().query(text, params)
};
