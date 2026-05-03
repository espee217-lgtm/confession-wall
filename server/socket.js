const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Admin = require("./models/Admin");

const onlineUsers = new Map();

const safeUserPayload = (user, socketId) => ({
  socketId,
  userId: String(user._id),
  username: user.username,
  email: user.email || "",
  profilePicture: user.profilePicture || null,
  isAdmin: Boolean(user.isAdmin),
  role: user.role || (user.isAdmin ? "admin" : "user"),
  connectedAt: user.connectedAt || new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
});

const getOnlineUsersList = () => {
  const byUser = new Map();

  for (const user of onlineUsers.values()) {
    const existing = byUser.get(user.userId);

    if (!existing || new Date(user.lastActiveAt) > new Date(existing.lastActiveAt)) {
      byUser.set(user.userId, user);
    }
  }

  return Array.from(byUser.values()).sort((a, b) =>
    a.username.localeCompare(b.username)
  );
};

const emitOnlineUsers = (io) => {
  io.to("admins").emit("online_users:update", getOnlineUsersList());
};

const setupSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];
      const mode = socket.handshake.auth?.mode || "user";

      if (!token) {
        return next(new Error("Socket auth token missing"));
      }

      if (mode === "admin") {
        const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
        const admin = await Admin.findById(decoded.id).select("-password");

        if (!admin) {
          return next(new Error("Socket admin not found"));
        }

        socket.user = {
          _id: admin._id,
          username: admin.username || "admin",
          email: "",
          profilePicture: null,
          isAdmin: true,
          role: "admin",
        };
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return next(new Error("Socket user not found"));
      }

      if (user.isBanned) {
        return next(new Error("Banned users cannot connect"));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Socket auth failed"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.user;

    onlineUsers.set(socket.id, safeUserPayload(user, socket.id));

    if (user.isAdmin) {
      socket.join("admins");
      socket.emit("online_users:update", getOnlineUsersList());
    }

    emitOnlineUsers(io);

    socket.on("user:active", () => {
      const existing = onlineUsers.get(socket.id);

      if (existing) {
        onlineUsers.set(socket.id, {
          ...existing,
          lastActiveAt: new Date().toISOString(),
        });

        emitOnlineUsers(io);
      }
    });

    socket.on("admin:request_online_users", () => {
      if (socket.user?.isAdmin) {
        socket.emit("online_users:update", getOnlineUsersList());
      }
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(socket.id);
      emitOnlineUsers(io);
    });
  });
};

module.exports = {
  setupSocket,
  getOnlineUsersList,
};