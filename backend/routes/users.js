// backend/routes/users.js
import { Router } from "express";
import bcrypt from "bcrypt";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const r = Router();

// GET /api/users: Admin-only: list all users 
r.get("/", requireAuth, requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, full_name, email, role, created_at FROM app_user ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/users: Admin-only: create user
r.post("/", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    let { email, password, fullName, role } = req.body || {};
    email = (email || "").trim().toLowerCase();
    fullName = (fullName || "").trim();
    role = (role || "STUDENT").toUpperCase();

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "Missing fields" });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password too short" });
    }

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO app_user (email, password_hash, full_name, role)
       VALUES ($1,$2,$3,$4)
       RETURNING id, full_name, email, role, created_at`,
      [email, hash, fullName, role]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Email already exists" });
    next(e);
  }
});

// DELETE /api/users/:id: Admin-only, cannot delete self or admins
r.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }

    const { rows } = await pool.query("SELECT id, role FROM app_user WHERE id = $1", [id]);
    const target = rows[0];
    if (!target) return res.status(404).json({ error: "User not found" });
    if (target.role === "ADMIN") {
      return res.status(400).json({ error: "Cannot delete admin users" });
    }

    await pool.query("DELETE FROM app_user WHERE id = $1", [id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// GET /api/users/students: Any authenticated user may fetch the list of students.
r.get("/students", requireAuth, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, full_name, email, 'STUDENT'::text AS role FROM app_user WHERE role = 'STUDENT' ORDER BY full_name"
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/users/instructors: Any authenticated user may fetch the list of instructors.
r.get("/instructors", requireAuth, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, full_name, email, 'INSTRUCTOR'::text AS role FROM app_user WHERE role = 'INSTRUCTOR' ORDER BY full_name"
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/users/people: Any authenticated user: students + instructors together.
r.get("/people", requireAuth, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, full_name, email, role FROM app_user WHERE role IN ('STUDENT','INSTRUCTOR') ORDER BY full_name"
    );
    res.json(rows);
  } catch (e) { next(e); }
});

export default r;
