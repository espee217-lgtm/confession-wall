const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const reportRoutes = require("./routes/reportRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const confessionRoutes = require("./routes/confessionRoutes");
const authRoutes = require("./routes/authRoutes");
const { router: adminRoutes } = require("./routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://confession-wall-ooqkkrirq-espee217-lgtms-projects.vercel.app",
  process.env.CLIENT_URL,
  process.env.CORS_ORIGIN,
].filter(Boolean));

const isAllowedVercelPreview = (origin) => {
  try {
    const url = new URL(origin);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".vercel.app") &&
      url.hostname.startsWith("confession-wall")
    );
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server tools, curl, and health checks with no Origin header.
      if (!origin) return callback(null, true);

      if (allowedOrigins.has(origin) || isAllowedVercelPreview(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api/confessions", confessionRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.send("Confession Wall Server is running!");
});

app.use((req, res) => {
  res.status(404).json({ message: "API route not found" });
});

app.use((err, req, res, next) => {
  console.error("Server error:", err.message);

  if (err.message && err.message.startsWith("CORS blocked origin")) {
    return res.status(403).json({ message: "This origin is not allowed." });
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "Image is too large. Maximum size is 5MB." });
  }

  if (err.message && err.message.includes("file type")) {
    return res.status(400).json({ message: err.message });
  }

  res.status(500).json({ message: "Something went wrong on the server." });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection error:", err.message));