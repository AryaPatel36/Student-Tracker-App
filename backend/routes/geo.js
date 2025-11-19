import express from "express";
import { lookupIp } from "../geo/abstract.js";

const router = express.Router();

// Returns geolocation data for given IP 
router.get("/ip", async (req, res) => {
  try {
    const ip =
      req.query.ip ||
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      "";

    const data = await lookupIp(ip);
    res.json(data);
  } catch (e) {
    if (e.status === 429) {
      return res.status(429).json({ error: "Rate limited by Abstract API" });
    }
    console.error(e);
    res.status(500).json({ error: "Geo lookup failed" });
  }
});

export default router;