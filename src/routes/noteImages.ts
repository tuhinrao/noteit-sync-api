import express, { Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { pool } from "../db/pool";
import { env } from "../config/env";
import { AuthenticatedRequest } from "../middleware/authBearer";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getTokenEmail(req: AuthenticatedRequest): string | null {
  const rawEmail =
    req.auth?.email ??
    req.auth?.["https://noteit.tuhinrao.com/email"];

  return typeof rawEmail === "string" && rawEmail.trim()
    ? rawEmail.trim().toLowerCase()
    : null;
}

function getExtensionFromOriginalName(fileName: string): string {
  const ext = path.extname(fileName).trim().toLowerCase();
  return ext || "";
}

router.post(
  "/upload",
  upload.single("file"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const client = await pool.connect();

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

      const noteCheck = await client.query(
        `
        SELECT client_id
        FROM notes
        WHERE client_id = $1
          AND user_email = $2
          AND deleted_at IS NULL
        LIMIT 1
        `,
        [noteClientId, userEmail]
      );

      if (noteCheck.rowCount === 0) {
        res.status(404).json({
          error: "Note not found for this user.",
        });
        return;
      }

      const safeUser = safeSegment(userEmail);
      const ext = getExtensionFromOriginalName(req.file.originalname);
      const storedFileName = `${imageClientId}${ext}`;

      const relativeDir = path.posix.join(
        "users",
        safeUser,
        "notes",
        noteClientId
      );

      const absoluteDir = path.join(env.storage.root, relativeDir);
      fs.mkdirSync(absoluteDir, { recursive: true });

      const absolutePath = path.join(absoluteDir, storedFileName);
      const remoteFileKey = path.posix.join(relativeDir, storedFileName);

      fs.writeFileSync(absolutePath, req.file.buffer);

      const now = new Date().toISOString();

      await client.query(
        `
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
        `,
        [
          imageClientId,
          noteClientId,
          userEmail,
          remoteFileKey,
          req.file.mimetype,
          req.file.originalname,
          req.file.size,
          now,
          now,
        ]
      );

      res.status(201).json({
        clientId: imageClientId,
        noteClientId,
        remoteFileKey,
        mimeType: req.file.mimetype,
        fileName: req.file.originalname,
        fileSizeBytes: req.file.size,
      });
    } catch (error) {
      console.error("Image upload failed:", error);
      res.status(500).json({
        error: "Image upload failed.",
      });
    } finally {
      client.release();
    }
  }
);

router.get(
  "/file/:clientId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
      const userEmail = getTokenEmail(req);
      if (!userEmail) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const imageClientId = String(req.params.clientId || "").trim();

      const result = await client.query(
        `
        SELECT
          remote_file_key,
          mime_type,
          file_name
        FROM note_images
        WHERE client_id = $1
          AND user_email = $2
          AND deleted_at IS NULL
        LIMIT 1
        `,
        [imageClientId, userEmail]
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: "Image not found." });
        return;
      }

      const row = result.rows[0] as {
        remote_file_key: string;
        mime_type: string;
        file_name: string;
      };

      const absolutePath = path.join(env.storage.root, row.remote_file_key);

      if (!fs.existsSync(absolutePath)) {
        res.status(404).json({ error: "Stored file not found on disk." });
        return;
      }

      res.setHeader("Content-Type", row.mime_type);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${row.file_name}"`
      );

      fs.createReadStream(absolutePath).pipe(res);
    } catch (error) {
      console.error("Image fetch failed:", error);
      res.status(500).json({
        error: "Image fetch failed.",
      });
    } finally {
      client.release();
    }
  }
);

export { router as noteImagesRouter };