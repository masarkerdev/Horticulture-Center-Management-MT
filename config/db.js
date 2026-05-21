// config/db.js
const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();

const db = {
    // সাধারণ query
    query: (text, params) => {
        const pool = als.getStore();
        if (!pool) throw new Error('Tenant DB pool পাওয়া যায়নি।');
        return pool.query(text, params);
    },

    // db.connect() — transaction-এর জন্য
    connect: () => {
        const pool = als.getStore();
        if (!pool) throw new Error('Tenant DB pool পাওয়া যায়নি।');
        return pool.connect();
    },

    // db.pool.connect() — controllers যেগুলো db.pool.connect() use করে
    get pool() {
        const pool = als.getStore();
        if (!pool) throw new Error('Tenant DB pool পাওয়া যায়নি।');
        return pool;
    },

    // Pool সরাসরি
    getPool: () => als.getStore(),

    // AsyncLocalStorage
    als
};

module.exports = db;
