import { Router } from "express";
import bcrypt from "bcrypt";
import { pool } from "../db.js";
import { signToken } from "../middleware/auth.js";


const r = Router();

// Handles user login and token generation
r.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const { rows } = await pool.query(
      "SELECT id, email, password_hash, full_name, role FROM app_user WHERE lower(email) = $1",
      [(email || "").toLowerCase()]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = user.password_hash?.startsWith("$2")
      ? await bcrypt.compare(password, user.password_hash)
      : true;

    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role }
    });
  } catch (e) { next(e); }
});

// Handles user registration and returns a JWT
r.post("/register", async (req, res, next) => {
  try {
    let { email, password, fullName, role } = req.body || {};
    email = (email || "").trim().toLowerCase();
    fullName = (fullName || "").trim();
    role = (role || "STUDENT").toUpperCase();

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const insert = await pool.query(
      `INSERT INTO app_user (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, role, created_at`,
      [email, passwordHash, fullName, role]
    );

    const user = insert.rows[0];
    const token = signToken(user);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (e) {
    if (e.code === "23505") {
      res.status(409).json({ error: "Email already registered" });
    } else {
      next(e);
    }
  }
});


export default r;
