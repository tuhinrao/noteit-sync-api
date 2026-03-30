import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optionalBoolean(name: string, defaultValue = false): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return defaultValue;
  return value === "true";
}

export const env = {
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
};