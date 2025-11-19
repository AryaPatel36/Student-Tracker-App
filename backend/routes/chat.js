// backend/routes/chat.js
import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();

// GET /api/chat/threads: Return all threads the current user is in, including participant ids. 
r.get("/threads", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        t.id,
        t.kind,
        t.title,
        t.created_at,
        array_agg(DISTINCT p_all.user_id ORDER BY p_all.user_id) AS participants
      FROM message_thread t
      JOIN message_thread_participant p_me
        ON p_me.thread_id = t.id
       AND p_me.user_id = $1
      JOIN message_thread_participant p_all
        ON p_all.thread_id = t.id
      GROUP BY t.id
      ORDER BY t.created_at DESC;
      `,
      [req.user.id]
    );

    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// GET /api/chat/threads/:id/messages: Messages in a single thread. 
r.get("/threads/:id/messages", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        m.id,
        m.sender_id,
        m.body,
        m.created_at,
        u.full_name
      FROM message m
      JOIN app_user u ON u.id = m.sender_id
      WHERE m.thread_id = $1
      ORDER BY m.created_at ASC;
      `,
      [req.params.id]
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// POST /api/chat/threads/:id/messages: Send a message into a thread (only if you're a participant). 
r.post("/threads/:id/messages", requireAuth, async (req, res, next) => {
  try {
    const threadId = Number(req.params.id);
    const meId = Number(req.user.id);

    const mem = await pool.query(
      "SELECT 1 FROM message_thread_participant WHERE thread_id = $1 AND user_id = $2",
      [threadId, meId]
    );
    if (!mem.rowCount) {
      return res.status(403).json({ error: "Not in thread" });
    }

    const { body } = req.body || {};
    if (!body || !body.trim()) {
      return res.status(400).json({ error: "Message body required" });
    }

    const { rows } = await pool.query(
      "INSERT INTO message(thread_id, sender_id, body) VALUES ($1, $2, $3) RETURNING *",
      [threadId, meId, body.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
});

// POST /api/chat/threads: Create a thread (DIRECT: find-or-create; GROUP: always new). 
r.post("/threads", requireAuth, async (req, res, next) => {
  try {
    const meId = Number(req.user.id);
    const { kind, title, participantIds = [] } = req.body || {};
    const KIND = String(kind || "DIRECT").toUpperCase();

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ error: "participantIds is required" });
    }

    if (KIND === "DIRECT") {
      if (participantIds.length !== 1) {
        return res
          .status(400)
          .json({ error: "DIRECT requires exactly one participantId" });
      }

      const otherId = Number(participantIds[0]);
      if (!otherId || otherId === meId) {
        return res.status(400).json({ error: "Invalid participant" });
      }

      const findSql = `
        SELECT t.id
        FROM message_thread t
        JOIN message_thread_participant p1
          ON p1.thread_id = t.id AND p1.user_id = $1
        JOIN message_thread_participant p2
          ON p2.thread_id = t.id AND p2.user_id = $2
        WHERE t.kind = 'DIRECT'
        GROUP BY t.id
        HAVING COUNT(*) = 2
           AND NOT EXISTS (
             SELECT 1
             FROM message_thread_participant p3
             WHERE p3.thread_id = t.id
               AND p3.user_id NOT IN ($1, $2)
           )
        LIMIT 1;
      `;
      const { rows: existing } = await pool.query(findSql, [meId, otherId]);
      if (existing.length) {
        return res.json({ id: existing[0].id, existed: true });
      }

      const { rows: tRows } = await pool.query(
        "INSERT INTO message_thread(kind, title, created_by) VALUES ('DIRECT', $1, $2) RETURNING id",
        [title || null, meId]
      );
      const threadId = tRows[0].id;

      await pool.query(
        "INSERT INTO message_thread_participant(thread_id, user_id) VALUES ($1, $2), ($1, $3)",
        [threadId, meId, otherId]
      );

      return res.status(201).json({ id: threadId, existed: false });
    }

    const { rows: newRows } = await pool.query(
      "INSERT INTO message_thread(kind, title, created_by) VALUES ($1, $2, $3) RETURNING id",
      [KIND, title || null, meId]
    );
    const threadId = newRows[0].id;

    const members = Array.from(
      new Set([meId, ...participantIds.map(Number)])
    ).filter(Boolean);

    if (!members.length) {
      return res.status(400).json({ error: "No valid members for group" });
    }

    const values = members.map((_, i) => `($1, $${i + 2})`).join(", ");
    await pool.query(
      `INSERT INTO message_thread_participant(thread_id, user_id) VALUES ${values}`,
      [threadId, ...members]
    );

    res.status(201).json({ id: threadId, existed: false });
  } catch (e) {
    next(e);
  }
});

export default r;
