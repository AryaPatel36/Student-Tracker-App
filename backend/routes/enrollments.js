import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const r = Router();

// GET roster for a class
r.get("/:classId", requireAuth, requireRole("INSTRUCTOR","ADMIN"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.email
       FROM enrollment e JOIN app_user u ON u.id = e.student_id
       WHERE e.class_id = $1
       ORDER BY u.full_name`,
      [req.params.classId]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// POST enroll a student
r.post("/", requireAuth, requireRole("INSTRUCTOR","ADMIN"), async (req, res, next) => {
  try {
    const { classId, studentId } = req.body || {};
    const { rows } = await pool.query(
      "INSERT INTO enrollment(class_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *",
      [classId, studentId]
    );
    res.status(201).json(rows[0] || { inserted: false });
  } catch (e) { next(e); }
});

// DELETE unenroll
r.delete("/", requireAuth, requireRole("INSTRUCTOR","ADMIN"), async (req, res, next) => {
  try {
    const { classId, studentId } = req.body || {};
    await pool.query("DELETE FROM enrollment WHERE class_id=$1 AND student_id=$2", [classId, studentId]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
