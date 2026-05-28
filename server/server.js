const http = require("http");
const dotenv = require("dotenv");

dotenv.config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");

const { setupSocket } = require("./socket");
const { startWeeklyEventAutomation } = require("./utils/weeklyForestEvents");

const reportRoutes = require("./routes/reportRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const specialRoutes = require("./routes/specialRoutes");
const confessionRoutes = require("./routes/confessionRoutes");
const authRoutes = require("./routes/authRoutes");
const triviaRoutes = require("./routes/triviaRoutes");
const specialActivityRoutes = require("./routes/specialActivityRoutes");
const giftRoutes = require("./routes/giftRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const shopRoutes = require("./routes/shopRoutes");
const titleRoutes = require("./routes/titleRoutes");
const friendRoutes = require("./routes/friendRoutes");
const chessRoutes = require("./routes/chessRoutes");
const translateRoutes = require("./routes/translateRoutes");
const { router: adminRoutes } = require("./routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

const defaultDevOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
const envOrigins = (process.env.CORS_ORIGIN || process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = Array.from(
  new Set([
    ...envOrigins,
    ...(envOrigins.length === 0 ? defaultDevOrigins : []),
  ])
);

console.log("Allowed CORS origins:", allowedOrigins);

const isAllowedOrigin = (origin) => !origin || allowedOrigins.includes(origin);

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    console.warn("Blocked by CORS:", origin);
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-admin-log-secret", "x-razorpay-signature"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(
  "/api/payments/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  paymentRoutes
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api/confessions", confessionRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/trivia", triviaRoutes);
app.use("/api/special-activity", specialActivityRoutes);
app.use("/api/gift", giftRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/titles", titleRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/chess", chessRoutes);
app.use("/api/translate", translateRoutes);
app.use("/api/special", specialRoutes);

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
    return res
      .status(413)
      .json({ message: "Image is too large. Maximum size is 5MB." });
  }

  if (err.message && err.message.includes("file type")) {
    return res.status(400).json({ message: err.message });
  }

  res.status(500).json({ message: "Something went wrong on the server." });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      console.warn("Socket blocked by CORS:", origin);
      return callback(new Error(`Socket CORS blocked origin: ${origin}`));
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    credentials: true,
  },
});

setupSocket(io);
app.set("io", io);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    startWeeklyEventAutomation();
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
  });
