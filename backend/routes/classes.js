import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const r = Router();

// GET /api/classes?instructorId=:id  (INSTRUCTOR or ADMIN)
r.get("/", requireAuth, requireRole("INSTRUCTOR","ADMIN"), async (req, res, next) => {
  try {
    const instructorId = Number(req.query.instructorId || req.user.id);
    const { rows } = await pool.query(
      "SELECT id, title, term, created_at FROM class WHERE instructor_id = $1 ORDER BY created_at DESC",
      [instructorId]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/classes  (INSTRUCTOR or ADMIN)
r.post("/", requireAuth, requireRole("INSTRUCTOR","ADMIN"), async (req, res, next) => {
  try {
    const { title, term } = req.body || {};
    const { rows } = await pool.query(
      "INSERT INTO class(title, term, instructor_id) VALUES ($1,$2,$3) RETURNING *",
      [title, term, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

export default r;
