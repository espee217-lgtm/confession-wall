const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Admin = require("./models/Admin");

const onlineUsers = new Map();
const lastSeenUsers = new Map();

const RECENTLY_ACTIVE_MS = 5 * 60 * 1000;

const toId = (value) => String(value || "");

const safeUserPayload = (user, socketId) => {
  const now = new Date().toISOString();

  return {
    socketId,
    userId: toId(user._id),
    username: user.username,
    email: user.email || "",
    profilePicture: user.profilePicture || null,
    isAdmin: Boolean(user.isAdmin),
    role: user.role || (user.isAdmin ? "admin" : "user"),
    connectedAt: user.connectedAt || now,
    lastActiveAt: now,
  };
};

const rememberLastSeen = (userId, lastActiveAt = new Date().toISOString()) => {
  if (!userId) return;
  lastSeenUsers.set(toId(userId), lastActiveAt);
};

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

const getOnlinePayloadByUserId = (userId) =>
  getOnlineUsersList().find((item) => item.userId === toId(userId)) || null;

const getPresenceForUserIds = (userIds = []) => {
  const now = Date.now();
  const uniqueIds = Array.from(new Set(userIds.map(toId).filter(Boolean)));

  return uniqueIds.reduce((acc, userId) => {
    const onlinePayload = getOnlinePayloadByUserId(userId);

    if (onlinePayload) {
      acc[userId] = {
        userId,
        status: "online",
        isOnline: true,
        lastActiveAt: onlinePayload.lastActiveAt,
        connectedAt: onlinePayload.connectedAt,
      };
      return acc;
    }

    const lastActiveAt = lastSeenUsers.get(userId) || null;
    const lastActiveMs = lastActiveAt ? new Date(lastActiveAt).getTime() : 0;
    const isRecent = lastActiveMs && now - lastActiveMs <= RECENTLY_ACTIVE_MS;

    acc[userId] = {
      userId,
      status: isRecent ? "recent" : "offline",
      isOnline: false,
      lastActiveAt,
      connectedAt: null,
    };

    return acc;
  }, {});
};

const getPresenceForUserId = (userId) =>
  getPresenceForUserIds([userId])[toId(userId)] || {
    userId: toId(userId),
    status: "offline",
    isOnline: false,
    lastActiveAt: null,
    connectedAt: null,
  };

const emitOnlineUsers = (io) => {
  io.to("admins").emit("online_users:update", getOnlineUsersList());
};

const emitPresenceChange = (io, userId) => {
  if (!userId) return;

  io.emit("presence:changed", getPresenceForUserId(userId));
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
    const userId = toId(user._id);

    onlineUsers.set(socket.id, safeUserPayload(user, socket.id));
    rememberLastSeen(userId);
    socket.join(`user:${userId}`);

    if (user.isAdmin) {
      socket.join("admins");
      socket.emit("online_users:update", getOnlineUsersList());
    }

    emitOnlineUsers(io);
    emitPresenceChange(io, userId);

    socket.on("user:active", () => {
      const existing = onlineUsers.get(socket.id);

      if (existing) {
        const lastActiveAt = new Date().toISOString();

        onlineUsers.set(socket.id, {
          ...existing,
          lastActiveAt,
        });
        rememberLastSeen(existing.userId, lastActiveAt);

        emitOnlineUsers(io);
        emitPresenceChange(io, existing.userId);
      }
    });

    socket.on("friends:presence:request", (ids = [], callback) => {
      const requestedIds = Array.isArray(ids) ? ids : [];
      const presence = getPresenceForUserIds(requestedIds);

      if (typeof callback === "function") {
        callback(presence);
      } else {
        socket.emit("friends:presence:update", presence);
      }
    });

    socket.on("admin:request_online_users", () => {
      if (socket.user?.isAdmin) {
        socket.emit("online_users:update", getOnlineUsersList());
      }
    });

    socket.on("disconnect", () => {
      const existing = onlineUsers.get(socket.id);
      const changedUserId = existing?.userId;
      const lastActiveAt = existing?.lastActiveAt || new Date().toISOString();

      onlineUsers.delete(socket.id);
      rememberLastSeen(changedUserId, lastActiveAt);

      emitOnlineUsers(io);
      emitPresenceChange(io, changedUserId);
    });
  });
};

module.exports = {
  setupSocket,
  getOnlineUsersList,
  getPresenceForUserIds,
};
