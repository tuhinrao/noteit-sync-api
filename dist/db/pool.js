"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
const env_1 = require("../config/env");
exports.pool = new pg_1.Pool({
    host: env_1.env.db.host,
    port: env_1.env.db.port,
    database: env_1.env.db.database,
    user: env_1.env.db.user,
    password: env_1.env.db.password,
    ssl: env_1.env.db.ssl ? { rejectUnauthorized: false } : false
});
