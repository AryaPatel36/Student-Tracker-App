import dotenv from "dotenv";
dotenv.config();

function need(name) {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const NODE_ENV     = process.env.NODE_ENV || "development";
export const PORT         = parseInt(process.env.PORT || "3000", 10);
export const DATABASE_URL = need("DATABASE_URL");
export const JWT_SECRET   = need("JWT_SECRET");
export const ABSTRACT_API_KEY = process.env.ABSTRACT_API_KEY;
export const PG_SSL = NODE_ENV === "production" ? { rejectUnauthorized: false } : false;