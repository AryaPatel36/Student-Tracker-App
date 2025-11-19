import fetch from "node-fetch";

const CACHE = new Map();
const TTL_MS = 60_000;

// Normalize an incoming IP string (strip proxy prefixes, localhost, extra commas).
function cleanIp(ip) {
  if (!ip) return "";
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (ip.includes(",")) ip = ip.split(",")[0].trim();
  if (ip === "127.0.0.1" || ip === "::1") return "";
  return ip.trim();
}

// Look up IP geolocation via Abstract API with a short in-memory cache.
export async function lookupIp(rawIp) {
  const ip = cleanIp(rawIp);

  const hit = CACHE.get(ip);
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.data;

  const base = "https://ipgeolocation.abstractapi.com/v1/";
  const key = process.env.ABSTRACT_API_KEY || "";
  const url = `${base}?api_key=${encodeURIComponent(key)}${
    ip ? `&ip_address=${encodeURIComponent(ip)}` : ""
  }`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`Abstract error ${res.status}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  CACHE.set(ip, { data, ts: Date.now() });
  return data;
}
