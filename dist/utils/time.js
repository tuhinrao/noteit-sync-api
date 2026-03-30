"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toIsoString = toIsoString;
exports.isValidIsoDate = isValidIsoDate;
function toIsoString(value) {
    if (!value)
        return null;
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString();
}
function isValidIsoDate(value) {
    if (typeof value !== "string")
        return false;
    const time = Date.parse(value);
    return !Number.isNaN(time);
}
