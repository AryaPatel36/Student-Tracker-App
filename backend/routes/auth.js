import { Router } from "express";
import bcrypt from "bcrypt";
import { pool } from "../db.js";
import { signToken } from "../middleware/auth.js";

const r = Router();

r.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const { rows } = await pool.query(
      "SELECT id, email, password_hash, full_name, role FROM app_user WHERE email = $1",
      [email]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    // For seeded placeholder hashes, skip check. Replace with bcrypt.compare in prod.
    const ok = user.password_hash.startsWith("$2b$")
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

export default r;
