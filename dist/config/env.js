"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function required(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Missing required env var: ${name}`);
    }
    return value;
}
function optionalBoolean(name, defaultValue = false) {
    const value = process.env[name]?.trim().toLowerCase();
    if (!value)
        return defaultValue;
    return value === "true";
}
function optionalString(name, defaultValue) {
    return process.env[name]?.trim() || defaultValue;
}
exports.env = {
    port: Number(process.env.PORT?.trim() || 4000),
    auth0: {
        domain: required("AUTH0_DOMAIN"),
        audience: required("AUTH0_AUDIENCE"),
    },
    db: {
        host: required("DATABASE_HOST"),
        port: Number(required("DATABASE_PORT")),
        database: required("DATABASE_NAME"),
        user: required("DATABASE_USERNAME"),
        password: required("DATABASE_PASSWORD"),
        ssl: optionalBoolean("DATABASE_SSL", false),
    },
    storage: {
        root: optionalString("NOTEIT_STORAGE_ROOT", "/opt/noteit-storage"),
    },
};
