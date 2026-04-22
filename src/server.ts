import express from "express";
import { postSync } from "./routes/sync";
import { postCashSync } from "./routes/cash";
import { requireBearerToken } from "./middleware/authBearer";
import { env } from "./config/env";
import { noteImagesRouter } from "./routes/noteImages";

const app = express();

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.post("/api/sync", requireBearerToken, postSync);
app.post("/api/cash/sync", requireBearerToken, postCashSync);
app.use("/api/note-images", requireBearerToken, noteImagesRouter);

app.listen(env.port, () => {
  console.log(`NoteIt sync API running on port ${env.port}`);
});