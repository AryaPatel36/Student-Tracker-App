import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();

// GET my threads
r.get("/threads", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT mt.id, mt.kind, mt.title, mt.created_at
       FROM message_thread mt
       JOIN message_thread_participant p ON p.thread_id = mt.id
       WHERE p.user_id = $1
       ORDER BY mt.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// GET messages in a thread
r.get("/threads/:id/messages", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.id, m.sender_id, m.body, m.created_at, u.full_name
       FROM message m
       JOIN app_user u ON u.id = m.sender_id
       WHERE m.thread_id = $1
       ORDER BY m.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// POST send a message
r.post("/threads/:id/messages", requireAuth, async (req, res, next) => {
  try {
    const mem = await pool.query(
      "SELECT 1 FROM message_thread_participant WHERE thread_id=$1 AND user_id=$2",
      [req.params.id, req.user.id]
    );
    if (!mem.rowCount) return res.status(403).json({ error: "Not in thread" });

    const { body } = req.body || {};
    const { rows } = await pool.query(
      "INSERT INTO message(thread_id, sender_id, body) VALUES ($1,$2,$3) RETURNING *",
      [req.params.id, req.user.id, body]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

// POST create thread (instructor creates group, student creates 1:1)
r.post("/threads", requireAuth, async (req, res, next) => {
  try {
    const { kind, title, participantIds } = req.body || {};
    const { rows } = await pool.query(
      "INSERT INTO message_thread(kind, title, created_by) VALUES ($1,$2,$3) RETURNING id",
      [kind || "DIRECT", title || null, req.user.id]
    );
    const threadId = rows[0].id;
    await pool.query(
      "INSERT INTO message_thread_participant(thread_id, user_id) SELECT $1, unnest($2::bigint[])",
      [threadId, [req.user.id, ...participantIds]]
    );
    res.status(201).json({ id: threadId });
  } catch (e) { next(e); }
});

export default r;
