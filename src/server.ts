import express from "express";
import { postSync } from "./routes/sync";
import { requireBearerToken } from "./middleware/authBearer";
import { env } from "./config/env";

const app = express();

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.post("/api/sync", requireBearerToken, postSync);

app.listen(env.port, () => {
  console.log(`NoteIt sync API running on port ${env.port}`);
});