import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  syncAccessToken: required("SYNC_ACCESS_TOKEN"),
  db: {
    host: required("DATABASE_HOST"),
    port: Number(required("DATABASE_PORT")),
    database: required("DATABASE_NAME"),
    user: required("DATABASE_USERNAME"),
    password: required("DATABASE_PASSWORD"),
    ssl: process.env.DATABASE_SSL === "true"
  }
};