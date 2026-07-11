function adminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ status: "fail", message: "Unauthorized" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ status: "fail", message: "Admin access required" });
  }

  return next();
}

module.exports = { adminOnly };
