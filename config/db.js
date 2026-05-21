// config/db.js
const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();

const db = {
    query: (text, params) => {
        const pool = als.getStore();
        if (!pool) throw new Error('Tenant DB pool পাওয়া যায়নি।');
        return pool.query(text, params);
    },
    connect: () => {
        const pool = als.getStore();
        if (!pool) throw new Error('Tenant DB pool পাওয়া যায়নি।');
        return pool.connect();
    },
    getPool: () => als.getStore(),
    als
};

module.exports = db;
