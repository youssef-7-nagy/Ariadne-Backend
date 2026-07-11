const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

function authMiddleWare(request, response, next) {
  const auth = request.headers?.authorization || request.headers?.Authorization;

  if (!auth) {
    return response.status(401).json({ message: "Token Not Provided.." });
  }

  if (!auth.startsWith("Bearer ")) {
    return response.status(401).json({ message: "Invalid Token Format.. Use Bearer [token]" });
  }

  const token = auth.split(" ")[1];

  try {
    const userData = jwt.verify(token, process.env.JWT_SECRET);
    request.user = userData; 
    next();
  } catch (error) {
    return response.status(401).json({ message: "Invalid Token or Expired.." });
  }
}

module.exports = { authMiddleWare };