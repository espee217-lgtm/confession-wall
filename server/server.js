const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
// load environment variables
dotenv.config();
console.log("Mongo URI:", process.env.MONGO_URI);

const app = express();

// middleware
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
// routes
const confessionRoutes = require("./routes/confessionRoutes");
const authRoutes = require("./routes/authRoutes");
app.use("/api/confessions", confessionRoutes);
app.use("/api/auth", authRoutes);
const { router: adminRoutes } = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

// basic route
app.get("/", (req, res) => {
  res.send("Confession Wall Server is running!");
});

// connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(5000, () => console.log("🚀 Server running on port 5000"));
  })
  .catch((err) => console.error("MongoDB connection error:", err));

