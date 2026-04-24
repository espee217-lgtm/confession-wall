const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const User = require("../models/User");
const Confession = require("../models/Confession");

// Middleware: protect admin routes
const adminProtect = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });
  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// POST /api/admin/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  if (!admin) return res.status(401).json({ message: "Invalid credentials" });
  const match = await bcrypt.compare(password, admin.password);
  if (!match) return res.status(401).json({ message: "Invalid credentials" });
  const token = jwt.sign({ id: admin._id }, process.env.ADMIN_JWT_SECRET, { expiresIn: "1d" });
  res.json({ token });
});

// GET /api/admin/users
router.get("/users", adminProtect, async (req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.json(users);
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", adminProtect, async (req, res) => {
  await Confession.deleteMany({ userId: req.params.id });
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "User and their confessions deleted" });
});

// GET /api/admin/confessions
router.get("/confessions", adminProtect, async (req, res) => {
  const confessions = await Confession.find()
    .populate("userId", "username profilePicture")
    .sort({ createdAt: -1 });
  res.json(confessions);
});

// DELETE /api/admin/confessions/:id
router.delete("/confessions/:id", adminProtect, async (req, res) => {
  await Confession.findByIdAndDelete(req.params.id);
  res.json({ message: "Confession deleted" });
});

module.exports = { router, adminProtect };
