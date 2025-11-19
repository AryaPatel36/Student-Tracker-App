import pg from "pg";
import { DATABASE_URL, PG_SSL } from "./config.js";

// Create a PostgreSQL connection pool
export const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: PG_SSL,
});


export const query = (text, params) => pool.query(text, params);
