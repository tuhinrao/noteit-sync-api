"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSync = runSync;
const syncStore_1 = require("../utils/syncStore");
async function runSync(input) {
    return (0, syncStore_1.runSync)(input);
}
