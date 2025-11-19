// Main HTTP API server for Student Tracker
import "./config.js";
import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import { PORT } from "./config.js";
import authRoutes from "./routes/auth.js";
import classesRoutes from "./routes/classes.js";
import enrollmentsRoutes from "./routes/enrollments.js";
import attendanceRoutes from "./routes/attendance.js";
import chatRoutes from "./routes/chat.js";
import geoRoutes from "./routes/geo.js";
import usersRoutes from "./routes/users.js";

const app = express();

// Basic middleware: CORS + JSON body parsing
app.use(cors());
app.use(express.json());

// Allow correct client IPs when behind a proxy (Docker, reverse proxy, etc.)
app.set("trust proxy", true);

// Simple health-check endpoint to verify DB + server are up
app.get("/api/health", async (_req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT NOW() AS now");
    res.json({ ok: true, now: rows[0].now });
  } catch (e) {
    console.error("Health check failed:", e.code, e.message);
    next(e);
  }
});

// Mount feature routes under /api/*
app.use("/api/auth", authRoutes);
app.use("/api/classes", classesRoutes);
app.use("/api/enrollments", enrollmentsRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/geo", geoRoutes);
app.use("/api/users", usersRoutes);

// Central error handler (must be last middleware)
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

// Start HTTP server
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
