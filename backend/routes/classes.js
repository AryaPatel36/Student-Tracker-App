import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const r = Router();

// GET /api/classes?instructorId=:id  (INSTRUCTOR or ADMIN)
r.get("/", requireAuth, requireRole("INSTRUCTOR", "ADMIN"), async (req, res, next) => {
  try {
    const instructorId = Number(req.query.instructorId || req.user.id);
    const { rows } = await pool.query(
      "SELECT id, title, term, section, created_at FROM class WHERE instructor_id = $1 ORDER BY created_at DESC",
      [instructorId]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/classes/mine  (STUDENT)
r.get("/mine", requireAuth, requireRole("STUDENT"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.title, c.term, c.section, c.created_at
       FROM class c
       JOIN enrollment e ON e.class_id = c.id
       WHERE e.student_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/classes/:id - get single class (INSTRUCTOR or ADMIN)
r.get("/:id", requireAuth, requireRole("INSTRUCTOR", "ADMIN"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, title, term, section, instructor_id, created_at FROM class WHERE id = $1",
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Class not found" });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// POST /api/classes  (INSTRUCTOR or ADMIN)
r.post("/", requireAuth, requireRole("INSTRUCTOR", "ADMIN"), async (req, res, next) => {
  try {
    const { title, term, section } = req.body || {};
    const { rows } = await pool.query(
      "INSERT INTO class(title, term, section, instructor_id) VALUES ($1,$2,$3,$4) RETURNING *",
      [title, term, section, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

// DELETE /api/classes/:id  (INSTRUCTOR or ADMIN)
r.delete("/:id", requireAuth, requireRole("INSTRUCTOR", "ADMIN"), async (req, res, next) => {
  try {
    const classId = Number(req.params.id);

    const result = await pool.query(
      "DELETE FROM class WHERE id = $1 RETURNING id",
      [classId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Class not found" });
    }

    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default r;