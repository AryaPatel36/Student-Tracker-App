import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db.js";

import authRoutes from "./routes/auth.js";
import classesRoutes from "./routes/classes.js";
import enrollmentsRoutes from "./routes/enrollments.js";
import attendanceRoutes from "./routes/attendance.js";
import chatRoutes from "./routes/chat.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get("/api/health", async (_req, res) => {
  const { rows } = await pool.query("SELECT NOW() AS now");
  res.json({ ok: true, now: rows[0].now });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/classes", classesRoutes);
app.use("/api/enrollments", enrollmentsRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/chat", chatRoutes);

// Error handler (last)
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ API running on http://localhost:${PORT}`));
