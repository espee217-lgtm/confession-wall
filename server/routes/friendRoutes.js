const express = require("express");
const mongoose = require("mongoose");
const Friendship = require("../models/Friendship");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { protect, blockSuspended } = require("../middleware/auth");
const { friendRequestLimiter } = require("../middleware/rateLimiter");
const { getPresenceForUserIds } = require("../socket");

const router = express.Router();

const PUBLIC_USER_SELECT =
  "username profilePicture role isAdmin equippedCosmetics achievementTitles createdAt";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));
const sameId = (a, b) => String(a || "") === String(b || "");

const publicUser = (user) => {
  if (!user) return null;
  const source = typeof user.toObject === "function" ? user.toObject() : user;
  return {
    _id: source._id,
    username: source.username,
    profilePicture: source.profilePicture || null,
    role: source.role || "user",
    isAdmin: Boolean(source.isAdmin),
    equippedCosmetics: source.equippedCosmetics || {},
    achievementTitles: source.achievementTitles || [],
    createdAt: source.createdAt,
  };
};

const participantFor = (friendship, currentUserId) => {
  const requester = friendship.requester;
  const recipient = friendship.recipient;
  return sameId(requester?._id || requester, currentUserId) ? recipient : requester;
};

const serializeFriendship = (friendship, currentUserId) => {
  const friend = participantFor(friendship, currentUserId);

  return {
    friendshipId: friendship._id,
    status: friendship.status,
    direction: sameId(friendship.requester?._id || friendship.requester, currentUserId)
      ? "outgoing"
      : "incoming",
    acceptedAt: friendship.acceptedAt,
    updatedAt: friendship.updatedAt,
    user: publicUser(friend),
  };
};

const getFriendshipBetween = (userA, userB) =>
  Friendship.findOne({
    $or: [
      { requester: userA, recipient: userB },
      { requester: userB, recipient: userA },
    ],
  });

const buildStatus = (friendship, currentUserId, targetUserId) => {
  if (sameId(currentUserId, targetUserId)) {
    return { status: "self", direction: "self", friendshipId: null };
  }

  if (!friendship) {
    return { status: "none", direction: "none", friendshipId: null };
  }

  return {
    status: friendship.status,
    direction: sameId(friendship.requester, currentUserId) ? "outgoing" : "incoming",
    friendshipId: friendship._id,
    acceptedAt: friendship.acceptedAt,
    updatedAt: friendship.updatedAt,
  };
};

const notifyUser = async ({ userId, type, message, link = "/friends" }) => {
  try {
    await Notification.create({ userId, type, message, link });
  } catch (err) {
    console.error("Friend notification error:", err.message);
  }
};

router.use(protect);

router.get("/", async (req, res) => {
  try {
    const friendships = await Friendship.find({
      status: "accepted",
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
    })
      .sort({ acceptedAt: -1, updatedAt: -1 })
      .populate("requester", PUBLIC_USER_SELECT)
      .populate("recipient", PUBLIC_USER_SELECT)
      .lean();

    res.json(friendships.map((item) => serializeFriendship(item, req.user._id)));
  } catch (err) {
    console.error("Get friends error:", err);
    res.status(500).json({ message: "Could not load friends." });
  }
});

router.get("/requests", async (req, res) => {
  try {
    const [incomingRows, outgoingRows] = await Promise.all([
      Friendship.find({ recipient: req.user._id, status: "pending" })
        .sort({ createdAt: -1 })
        .populate("requester", PUBLIC_USER_SELECT)
        .populate("recipient", PUBLIC_USER_SELECT)
        .lean(),
      Friendship.find({ requester: req.user._id, status: "pending" })
        .sort({ createdAt: -1 })
        .populate("requester", PUBLIC_USER_SELECT)
        .populate("recipient", PUBLIC_USER_SELECT)
        .lean(),
    ]);

    res.json({
      incoming: incomingRows.map((item) => serializeFriendship(item, req.user._id)),
      outgoing: outgoingRows.map((item) => serializeFriendship(item, req.user._id)),
    });
  } catch (err) {
    console.error("Get friend requests error:", err);
    res.status(500).json({ message: "Could not load friend requests." });
  }
});


router.get("/presence", async (req, res) => {
  try {
    const rawIds = String(req.query.ids || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 80);

    const validIds = Array.from(new Set(rawIds.filter(isValidObjectId)));

    if (validIds.length === 0) {
      return res.json({});
    }

    const acceptedFriendships = await Friendship.find({
      status: "accepted",
      $or: [
        { requester: req.user._id, recipient: { $in: validIds } },
        { requester: { $in: validIds }, recipient: req.user._id },
      ],
    })
      .select("requester recipient")
      .lean();

    const allowedIds = acceptedFriendships.map((friendship) =>
      sameId(friendship.requester, req.user._id)
        ? String(friendship.recipient)
        : String(friendship.requester)
    );

    res.json(getPresenceForUserIds(allowedIds));
  } catch (err) {
    console.error("Get friend presence error:", err);
    res.status(500).json({ message: "Could not load friend presence." });
  }
});

router.get("/status/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user." });
    }

    const friendship = await getFriendshipBetween(req.user._id, userId).lean();
    res.json(buildStatus(friendship, req.user._id, userId));
  } catch (err) {
    console.error("Get friendship status error:", err);
    res.status(500).json({ message: "Could not load friendship status." });
  }
});

router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (q.length < 2) {
      return res.json([]);
    }

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const users = await User.find({
      _id: { $ne: req.user._id },
      isBanned: { $ne: true },
      username: { $regex: escaped, $options: "i" },
    })
      .select(PUBLIC_USER_SELECT)
      .sort({ username: 1 })
      .limit(12)
      .lean();

    const userIds = users.map((u) => u._id);
    const friendships = await Friendship.find({
      $or: [
        { requester: req.user._id, recipient: { $in: userIds } },
        { requester: { $in: userIds }, recipient: req.user._id },
      ],
    }).lean();

    const friendshipByUser = new Map();
    friendships.forEach((friendship) => {
      const otherId = sameId(friendship.requester, req.user._id)
        ? String(friendship.recipient)
        : String(friendship.requester);
      friendshipByUser.set(otherId, friendship);
    });

    res.json(
      users.map((foundUser) => ({
        ...publicUser(foundUser),
        friendship: buildStatus(
          friendshipByUser.get(String(foundUser._id)),
          req.user._id,
          foundUser._id
        ),
      }))
    );
  } catch (err) {
    console.error("Friend search error:", err);
    res.status(500).json({ message: "Could not search users." });
  }
});

router.post("/request/:userId", blockSuspended, friendRequestLimiter, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user." });
    }

    if (sameId(req.user._id, userId)) {
      return res.status(400).json({ message: "You cannot send a friend request to yourself." });
    }

    const target = await User.findOne({ _id: userId, isBanned: { $ne: true } }).select(
      PUBLIC_USER_SELECT
    );

    if (!target) {
      return res.status(404).json({ message: "User not found." });
    }

    let friendship = await getFriendshipBetween(req.user._id, target._id);

    if (friendship) {
      if (friendship.status === "accepted") {
        return res.status(409).json({ message: "You are already friends.", friendship: buildStatus(friendship, req.user._id, target._id) });
      }

      if (friendship.status === "pending") {
        const message = sameId(friendship.requester, req.user._id)
          ? "Friend request already sent."
          : "This user already sent you a friend request.";
        return res.status(409).json({ message, friendship: buildStatus(friendship, req.user._id, target._id) });
      }

      friendship.requester = req.user._id;
      friendship.recipient = target._id;
      friendship.status = "pending";
      friendship.acceptedAt = null;
    } else {
      friendship = new Friendship({
        requester: req.user._id,
        recipient: target._id,
        status: "pending",
      });
    }

    await friendship.save();

    await notifyUser({
      userId: target._id,
      type: "friend_request",
      message: `${req.user.username} sent you a friend request.`,
      link: "/friends",
    });

    await friendship.populate("requester", PUBLIC_USER_SELECT);
    await friendship.populate("recipient", PUBLIC_USER_SELECT);

    res.status(201).json({
      message: "Friend request sent.",
      friendship: serializeFriendship(friendship, req.user._id),
    });
  } catch (err) {
    console.error("Send friend request error:", err);
    res.status(500).json({ message: "Could not send friend request." });
  }
});

router.post("/accept/:friendshipId", blockSuspended, async (req, res) => {
  try {
    const { friendshipId } = req.params;

    if (!isValidObjectId(friendshipId)) {
      return res.status(400).json({ message: "Invalid friend request." });
    }

    const friendship = await Friendship.findOne({
      _id: friendshipId,
      recipient: req.user._id,
      status: "pending",
    });

    if (!friendship) {
      return res.status(404).json({ message: "Friend request not found." });
    }

    friendship.status = "accepted";
    friendship.acceptedAt = new Date();
    await friendship.save();

    await notifyUser({
      userId: friendship.requester,
      type: "friend_accept",
      message: `${req.user.username} accepted your friend request.`,
      link: "/friends",
    });

    await friendship.populate("requester", PUBLIC_USER_SELECT);
    await friendship.populate("recipient", PUBLIC_USER_SELECT);

    res.json({
      message: "Friend request accepted.",
      friendship: serializeFriendship(friendship, req.user._id),
    });
  } catch (err) {
    console.error("Accept friend request error:", err);
    res.status(500).json({ message: "Could not accept friend request." });
  }
});

router.post("/decline/:friendshipId", blockSuspended, async (req, res) => {
  try {
    const { friendshipId } = req.params;

    if (!isValidObjectId(friendshipId)) {
      return res.status(400).json({ message: "Invalid friend request." });
    }

    const friendship = await Friendship.findOne({
      _id: friendshipId,
      recipient: req.user._id,
      status: "pending",
    });

    if (!friendship) {
      return res.status(404).json({ message: "Friend request not found." });
    }

    friendship.status = "declined";
    friendship.acceptedAt = null;
    await friendship.save();

    res.json({ message: "Friend request declined." });
  } catch (err) {
    console.error("Decline friend request error:", err);
    res.status(500).json({ message: "Could not decline friend request." });
  }
});

router.delete("/:friendshipId", blockSuspended, async (req, res) => {
  try {
    const { friendshipId } = req.params;

    if (!isValidObjectId(friendshipId)) {
      return res.status(400).json({ message: "Invalid friendship." });
    }

    const friendship = await Friendship.findOne({
      _id: friendshipId,
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
      status: { $in: ["pending", "accepted"] },
    });

    if (!friendship) {
      return res.status(404).json({ message: "Friendship not found." });
    }

    if (friendship.status === "pending") {
      friendship.status = sameId(friendship.requester, req.user._id) ? "cancelled" : "declined";
    } else {
      friendship.status = "cancelled";
    }

    friendship.acceptedAt = null;
    await friendship.save();

    res.json({ message: "Friendship updated." });
  } catch (err) {
    console.error("Remove friend error:", err);
    res.status(500).json({ message: "Could not update friendship." });
  }
});

module.exports = router;
