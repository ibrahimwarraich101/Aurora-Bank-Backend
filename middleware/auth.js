const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret_key");
    req.user = decoded; // { id, name, email, role }
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token." });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin only." });
  }
  next();
};

const requireEmployee = (req, res, next) => {
  if (!req.user || (req.user.role !== "employee" && req.user.role !== "admin")) {
    return res.status(403).json({ error: "Access denied." });
  }
  next();
};

module.exports = { verifyToken, requireAdmin, requireEmployee };
