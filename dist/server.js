"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sync_1 = require("./routes/sync");
const cash_1 = require("./routes/cash");
const dayValidation_1 = require("./routes/dayValidation");
const authBearer_1 = require("./middleware/authBearer");
const env_1 = require("./config/env");
const noteImages_1 = require("./routes/noteImages");
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: "1mb" }));
app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
});
app.post("/api/sync", authBearer_1.requireBearerToken, sync_1.postSync);
app.post("/api/cash/sync", authBearer_1.requireBearerToken, cash_1.postCashSync);
app.post("/api/day-validations/sync", authBearer_1.requireBearerToken, dayValidation_1.postDayValidationSync);
app.use("/api/note-images", authBearer_1.requireBearerToken, noteImages_1.noteImagesRouter);
app.listen(env_1.env.port, () => {
    console.log(`NoteIt sync API running on port ${env_1.env.port}`);
});
