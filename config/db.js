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

    // db.pool.connect() — controllers যেগুলো db.pool ব্যবহার করে
    get pool() {
        const pool = als.getStore();
        if (!pool) throw new Error('Tenant DB pool পাওয়া যায়নি।');
        return pool;
    },

    // db.run(pool, next) — tenant middleware এটা call করে
    run: (pool, fn) => {
        return als.run(pool, fn);
    },

    // Pool সরাসরি নেওয়া
    getPool: () => als.getStore(),

    // AsyncLocalStorage
    als
};

module.exports = db;
