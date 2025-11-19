import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const r = Router();

// POST /api/attendance/checkin  (STUDENT)
r.post("/checkin", requireAuth, requireRole("STUDENT"), async (req, res, next) => {
  try {
    const { classId, lat, lon, method } = req.body || {};
    const enrolled = await pool.query(
      "SELECT 1 FROM enrollment WHERE class_id=$1 AND student_id=$2",
      [classId, req.user.id]
    );
    if (!enrolled.rowCount) return res.status(403).json({ error: "Not enrolled" });

    const { rows } = await pool.query(
      `INSERT INTO attendance(class_id, student_id, check_in_lat, check_in_lon, method)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [classId, req.user.id, lat, lon, method || "self"]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Open session exists" });
    next(e);
  }
});

// POST /api/attendance/checkout (STUDENT)
r.post("/checkout", requireAuth, requireRole("STUDENT"), async (req, res, next) => {
  try {
    const { classId, lat, lon } = req.body || {};
    const { rows } = await pool.query(
      `UPDATE attendance
       SET check_out_time = NOW(), check_out_lat=$3, check_out_lon=$4
       WHERE class_id=$1 AND student_id=$2 AND check_out_time IS NULL
       RETURNING *`,
      [classId, req.user.id, lat, lon]
    );
    if (!rows[0]) return res.status(404).json({ error: "No open session" });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// NEW: GET /api/attendance/my/:classId  (STUDENT)
// Returns this student's attendance history for a class.
r.get("/my/:classId", requireAuth, requireRole("STUDENT"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT *
       FROM attendance
       WHERE class_id = $1 AND student_id = $2
       ORDER BY check_in_time DESC`,
      [req.params.classId, req.user.id]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/attendance/:classId (INSTRUCTOR/ADMIN)
r.get("/:classId", requireAuth, requireRole("INSTRUCTOR","ADMIN"), async (req, res, next) => {
  try {
    const { from, to, studentId } = req.query;
    const sql = `
      SELECT a.*, u.full_name
      FROM attendance a
      JOIN app_user u ON u.id = a.student_id
      WHERE a.class_id = $1
        AND ($2::timestamptz IS NULL OR a.check_in_time >= $2)
        AND ($3::timestamptz IS NULL OR a.check_in_time <  $3)
        AND ($4::bigint IS NULL OR a.student_id = $4)
      ORDER BY a.check_in_time DESC`;
    const { rows } = await pool.query(sql, [req.params.classId, from || null, to || null, studentId || null]);
    res.json(rows);
  } catch (e) { next(e); }
});

export default r;
