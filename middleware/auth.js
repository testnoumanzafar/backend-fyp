const jwt = require("jsonwebtoken");
const NewUser = require("../models/register.js");
 

const authenticateUser = async (req, res, next) => {
    console.log(req,"front");
    
  const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>
  
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await NewUser.findById(decoded.id)// Don't return password
    if (!req.user) {
      return res.status(404).json({ message: "User not found" });
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = authenticateUser;
