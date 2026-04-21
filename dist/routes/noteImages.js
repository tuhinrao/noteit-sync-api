"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.noteImagesRouter = void 0;
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pool_1 = require("../db/pool");
const env_1 = require("../config/env");
const router = express_1.default.Router();
exports.noteImagesRouter = router;
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
    },
});
function safeSegment(value) {
    return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}
function getTokenEmail(req) {
    const rawEmail = req.auth?.email ??
        req.auth?.["https://noteit.tuhinrao.com/email"];
    return typeof rawEmail === "string" && rawEmail.trim()
        ? rawEmail.trim().toLowerCase()
        : null;
}
function getExtensionFromOriginalName(fileName) {
    const ext = path_1.default.extname(fileName).trim().toLowerCase();
    return ext || "";
}
router.post("/upload", upload.single("file"), async (req, res) => {
    const client = await pool_1.pool.connect();
    try {
        const userEmail = getTokenEmail(req);
        if (!userEmail) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const noteClientId = String(req.body.noteClientId || "").trim();
        const imageClientId = String(req.body.imageClientId || "").trim();
        if (!noteClientId || !imageClientId) {
            res.status(400).json({
                error: "noteClientId and imageClientId are required.",
            });
            return;
        }
        if (!req.file) {
            res.status(400).json({
                error: "No file uploaded.",
            });
            return;
        }
        const noteCheck = await client.query(`
        SELECT client_id
        FROM notes
        WHERE client_id = $1
          AND user_email = $2
          AND deleted_at IS NULL
        LIMIT 1
        `, [noteClientId, userEmail]);
        if (noteCheck.rowCount === 0) {
            res.status(404).json({
                error: "Note not found for this user.",
            });
            return;
        }
        const safeUser = safeSegment(userEmail);
        const ext = getExtensionFromOriginalName(req.file.originalname);
        const storedFileName = `${imageClientId}${ext}`;
        const relativeDir = path_1.default.posix.join("users", safeUser, "notes", noteClientId);
        const absoluteDir = path_1.default.join(env_1.env.storage.root, relativeDir);
        fs_1.default.mkdirSync(absoluteDir, { recursive: true });
        const absolutePath = path_1.default.join(absoluteDir, storedFileName);
        const remoteFileKey = path_1.default.posix.join(relativeDir, storedFileName);
        fs_1.default.writeFileSync(absolutePath, req.file.buffer);
        const now = new Date().toISOString();
        await client.query(`
        INSERT INTO note_images (
          client_id,
          note_client_id,
          user_email,
          remote_file_key,
          mime_type,
          file_name,
          file_size_bytes,
          width,
          height,
          sort_order,
          created_at,
          updated_at,
          last_synced_at,
          deleted_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          NULL, NULL, 0,
          $8, $9, NOW(), NULL
        )
        ON CONFLICT (client_id)
        DO UPDATE SET
          note_client_id = EXCLUDED.note_client_id,
          user_email = EXCLUDED.user_email,
          remote_file_key = EXCLUDED.remote_file_key,
          mime_type = EXCLUDED.mime_type,
          file_name = EXCLUDED.file_name,
          file_size_bytes = EXCLUDED.file_size_bytes,
          updated_at = EXCLUDED.updated_at,
          last_synced_at = NOW(),
          deleted_at = NULL
        WHERE note_images.user_email = $3
        `, [
            imageClientId,
            noteClientId,
            userEmail,
            remoteFileKey,
            req.file.mimetype,
            req.file.originalname,
            req.file.size,
            now,
            now,
        ]);
        res.status(201).json({
            clientId: imageClientId,
            noteClientId,
            remoteFileKey,
            mimeType: req.file.mimetype,
            fileName: req.file.originalname,
            fileSizeBytes: req.file.size,
        });
    }
    catch (error) {
        console.error("Image upload failed:", error);
        res.status(500).json({
            error: "Image upload failed.",
        });
    }
    finally {
        client.release();
    }
});
router.get("/file/:clientId", async (req, res) => {
    const client = await pool_1.pool.connect();
    try {
        const userEmail = getTokenEmail(req);
        if (!userEmail) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const imageClientId = String(req.params.clientId || "").trim();
        const result = await client.query(`
        SELECT
          remote_file_key,
          mime_type,
          file_name
        FROM note_images
        WHERE client_id = $1
          AND user_email = $2
          AND deleted_at IS NULL
        LIMIT 1
        `, [imageClientId, userEmail]);
        if (result.rowCount === 0) {
            res.status(404).json({ error: "Image not found." });
            return;
        }
        const row = result.rows[0];
        const absolutePath = path_1.default.join(env_1.env.storage.root, row.remote_file_key);
        if (!fs_1.default.existsSync(absolutePath)) {
            res.status(404).json({ error: "Stored file not found on disk." });
            return;
        }
        res.setHeader("Content-Type", row.mime_type);
        res.setHeader("Content-Disposition", `inline; filename="${row.file_name}"`);
        fs_1.default.createReadStream(absolutePath).pipe(res);
    }
    catch (error) {
        console.error("Image fetch failed:", error);
        res.status(500).json({
            error: "Image fetch failed.",
        });
    }
    finally {
        client.release();
    }
});
