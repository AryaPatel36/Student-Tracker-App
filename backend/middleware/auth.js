import jwt from "jsonwebtoken";

// Create a signed JWT for the user (id, role, full name, email) valid for 8 hours.
export function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, fullName: user.full_name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
}

// Express middleware that validates a Bearer JWT and populates req.user or returns 401.
export function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Factory for role-based access middleware; requires req.user.role to be in the allowed list.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
