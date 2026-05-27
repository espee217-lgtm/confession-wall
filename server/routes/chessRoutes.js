const express = require("express");
const mongoose = require("mongoose");
const { Chess } = require("chess.js");
const ChessGame = require("../models/ChessGame");
const Friendship = require("../models/Friendship");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { protect, blockSuspended } = require("../middleware/auth");

const router = express.Router();

const PUBLIC_USER_SELECT =
  "username profilePicture role isAdmin equippedCosmetics achievementTitles createdAt";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || ""));
const sameId = (a, b) => String(a || "") === String(b || "");
const STARTING_FEN = new Chess().fen();
const normalizeFen = (fen) => {
  const value = String(fen || "").trim();
  return value && value !== "start" ? value : STARTING_FEN;
};

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

const sideFor = (game, userId) => {
  if (sameId(game.white?._id || game.white, userId)) return "w";
  if (sameId(game.black?._id || game.black, userId)) return "b";
  return "spectator";
};

const opponentFor = (game, userId) =>
  sameId(game.white?._id || game.white, userId) ? game.black : game.white;

const serializeGame = (game, currentUserId) => ({
  _id: game._id,
  mode: game.mode,
  status: game.status,
  fen: normalizeFen(game.fen),
  pgn: game.pgn || "",
  turn: game.turn,
  moves: game.moves || [],
  result: game.result || "",
  resultReason: game.resultReason || "",
  winner: game.winner || null,
  acceptedAt: game.acceptedAt,
  completedAt: game.completedAt,
  createdAt: game.createdAt,
  updatedAt: game.updatedAt,
  white: publicUser(game.white),
  black: publicUser(game.black),
  challenger: publicUser(game.challenger),
  challenged: publicUser(game.challenged),
  opponent: publicUser(opponentFor(game, currentUserId)),
  mySide: sideFor(game, currentUserId),
  isMyTurn: game.status === "active" && sideFor(game, currentUserId) === game.turn,
  isChallenger: sameId(game.challenger?._id || game.challenger, currentUserId),
  isChallenged: sameId(game.challenged?._id || game.challenged, currentUserId),
});

const populateGame = (query) =>
  query
    .populate("white", PUBLIC_USER_SELECT)
    .populate("black", PUBLIC_USER_SELECT)
    .populate("challenger", PUBLIC_USER_SELECT)
    .populate("challenged", PUBLIC_USER_SELECT)
    .populate("winner", PUBLIC_USER_SELECT);

const getAcceptedFriendship = (userA, userB) =>
  Friendship.findOne({
    status: "accepted",
    $or: [
      { requester: userA, recipient: userB },
      { requester: userB, recipient: userA },
    ],
  }).lean();

const emitGame = (req, game, eventName = "chess:game:update") => {
  const io = req.app.get("io");
  if (!io || !game) return;

  const whiteId = String(game.white?._id || game.white || "");
  const blackId = String(game.black?._id || game.black || "");

  [whiteId, blackId].filter(Boolean).forEach((userId) => {
    io.to(`user:${userId}`).emit(eventName, { gameId: String(game._id) });
  });
};

const notifyUser = async ({ userId, type, message, link }) => {
  try {
    await Notification.create({ userId, type, message, link });
  } catch (err) {
    console.error("Chess notification error:", err.message);
  }
};

router.use(protect);

router.get("/home", async (req, res) => {
  try {
    const [incomingInvites, outgoingInvites, activeGames, completedGames] = await Promise.all([
      populateGame(
        ChessGame.find({ challenged: req.user._id, status: "invited" }).sort({ createdAt: -1 }).limit(20)
      ).lean(),
      populateGame(
        ChessGame.find({ challenger: req.user._id, status: "invited" }).sort({ createdAt: -1 }).limit(20)
      ).lean(),
      populateGame(
        ChessGame.find({ players: req.user._id, status: "active" }).sort({ updatedAt: -1 }).limit(20)
      ).lean(),
      populateGame(
        ChessGame.find({ players: req.user._id, status: { $in: ["completed", "declined", "abandoned"] } })
          .sort({ updatedAt: -1 })
          .limit(10)
      ).lean(),
    ]);

    res.json({
      incomingInvites: incomingInvites.map((game) => serializeGame(game, req.user._id)),
      outgoingInvites: outgoingInvites.map((game) => serializeGame(game, req.user._id)),
      activeGames: activeGames.map((game) => serializeGame(game, req.user._id)),
      completedGames: completedGames.map((game) => serializeGame(game, req.user._id)),
    });
  } catch (err) {
    console.error("Chess home error:", err);
    res.status(500).json({ message: "Could not load chess lobby." });
  }
});

router.get("/:gameId", async (req, res) => {
  try {
    const { gameId } = req.params;
    if (!isValidObjectId(gameId)) return res.status(400).json({ message: "Invalid chess game." });

    const game = await populateGame(
      ChessGame.findOne({ _id: gameId, players: req.user._id })
    ).lean();

    if (!game) return res.status(404).json({ message: "Chess game not found." });

    res.json(serializeGame(game, req.user._id));
  } catch (err) {
    console.error("Get chess game error:", err);
    res.status(500).json({ message: "Could not load chess game." });
  }
});

router.post("/challenge/:friendId", blockSuspended, async (req, res) => {
  try {
    const { friendId } = req.params;
    if (!isValidObjectId(friendId)) return res.status(400).json({ message: "Invalid friend." });
    if (sameId(req.user._id, friendId)) return res.status(400).json({ message: "You cannot challenge yourself." });

    const [friendship, friend] = await Promise.all([
      getAcceptedFriendship(req.user._id, friendId),
      User.findOne({ _id: friendId, isBanned: { $ne: true } }).select(PUBLIC_USER_SELECT).lean(),
    ]);

    if (!friendship || !friend) {
      return res.status(403).json({ message: "You can only challenge accepted friends." });
    }

    const existingInvite = await ChessGame.findOne({
      mode: "friend",
      status: "invited",
      $or: [
        { challenger: req.user._id, challenged: friendId },
        { challenger: friendId, challenged: req.user._id },
      ],
    }).lean();

    if (existingInvite) {
      return res.status(409).json({ message: "A chess invite between you two is already waiting." });
    }

    const requesterIsWhite = Math.random() >= 0.5;
    let game = await ChessGame.create({
      white: requesterIsWhite ? req.user._id : friendId,
      black: requesterIsWhite ? friendId : req.user._id,
      challenger: req.user._id,
      challenged: friendId,
      players: [req.user._id, friendId],
      status: "invited",
      mode: "friend",
      fen: STARTING_FEN,
      turn: "w",
    });

    game = await populateGame(ChessGame.findById(game._id));

    await notifyUser({
      userId: friendId,
      type: "chess_invite",
      message: `${req.user.username} challenged you to a chess match.`,
      link: `/chess/${game._id}`,
    });

    emitGame(req, game, "chess:invite:new");

    res.status(201).json({ message: "Chess invite sent.", game: serializeGame(game, req.user._id) });
  } catch (err) {
    console.error("Create chess challenge error:", err);
    res.status(500).json({ message: "Could not send chess challenge." });
  }
});

router.post("/invites/:gameId/accept", blockSuspended, async (req, res) => {
  try {
    const { gameId } = req.params;
    if (!isValidObjectId(gameId)) return res.status(400).json({ message: "Invalid chess invite." });

    let game = await ChessGame.findOne({ _id: gameId, challenged: req.user._id, status: "invited" });
    if (!game) return res.status(404).json({ message: "Chess invite not found." });

    game.status = "active";
    game.fen = normalizeFen(game.fen);
    game.acceptedAt = new Date();
    await game.save();
    game = await populateGame(ChessGame.findById(game._id));

    await notifyUser({
      userId: game.challenger._id || game.challenger,
      type: "chess_accept",
      message: `${req.user.username} accepted your chess challenge.`,
      link: `/chess/${game._id}`,
    });

    emitGame(req, game, "chess:game:accepted");

    res.json({ message: "Chess challenge accepted.", game: serializeGame(game, req.user._id) });
  } catch (err) {
    console.error("Accept chess invite error:", err);
    res.status(500).json({ message: "Could not accept chess invite." });
  }
});

router.post("/invites/:gameId/decline", blockSuspended, async (req, res) => {
  try {
    const { gameId } = req.params;
    if (!isValidObjectId(gameId)) return res.status(400).json({ message: "Invalid chess invite." });

    let game = await ChessGame.findOne({ _id: gameId, challenged: req.user._id, status: "invited" });
    if (!game) return res.status(404).json({ message: "Chess invite not found." });

    game.status = "declined";
    game.resultReason = "Challenge declined";
    game.completedAt = new Date();
    await game.save();
    game = await populateGame(ChessGame.findById(game._id));

    emitGame(req, game, "chess:game:declined");

    res.json({ message: "Chess challenge declined.", game: serializeGame(game, req.user._id) });
  } catch (err) {
    console.error("Decline chess invite error:", err);
    res.status(500).json({ message: "Could not decline chess invite." });
  }
});

router.post("/:gameId/move", blockSuspended, async (req, res) => {
  try {
    const { gameId } = req.params;
    const from = String(req.body.from || "").trim().toLowerCase();
    const to = String(req.body.to || "").trim().toLowerCase();
    const promotion = String(req.body.promotion || "q").trim().toLowerCase().slice(0, 1) || "q";

    if (!isValidObjectId(gameId)) return res.status(400).json({ message: "Invalid chess game." });
    if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) {
      return res.status(400).json({ message: "Invalid move squares." });
    }

    let game = await ChessGame.findOne({ _id: gameId, players: req.user._id, status: "active" });
    if (!game) return res.status(404).json({ message: "Active chess game not found." });

    const mySide = sideFor(game, req.user._id);
    if (mySide !== game.turn) return res.status(403).json({ message: "It is not your turn." });

    const chess = new Chess(normalizeFen(game.fen));
    const moved = chess.move({ from, to, promotion });

    if (!moved) return res.status(400).json({ message: "Illegal chess move." });

    game.fen = chess.fen();
    game.pgn = chess.pgn();
    game.turn = chess.turn();
    game.moves.push({
      from: moved.from,
      to: moved.to,
      san: moved.san,
      promotion: moved.promotion || "",
      color: moved.color,
      by: req.user._id,
      fenAfter: chess.fen(),
    });

    if (chess.isCheckmate()) {
      game.status = "completed";
      game.winner = req.user._id;
      game.result = mySide === "w" ? "1-0" : "0-1";
      game.resultReason = "Checkmate";
      game.completedAt = new Date();
    } else if (chess.isDraw()) {
      game.status = "completed";
      game.winner = null;
      game.result = "1/2-1/2";
      game.resultReason = "Draw";
      game.completedAt = new Date();
    }

    await game.save();
    game = await populateGame(ChessGame.findById(game._id));
    emitGame(req, game, "chess:move");

    res.json({ message: "Move played.", game: serializeGame(game, req.user._id) });
  } catch (err) {
    console.error("Chess move error:", err);
    const message = err?.message?.toLowerCase?.().includes("invalid") ? "Illegal chess move." : "Could not play move.";
    res.status(500).json({ message });
  }
});

router.post("/:gameId/resign", blockSuspended, async (req, res) => {
  try {
    const { gameId } = req.params;
    if (!isValidObjectId(gameId)) return res.status(400).json({ message: "Invalid chess game." });

    let game = await ChessGame.findOne({ _id: gameId, players: req.user._id, status: "active" });
    if (!game) return res.status(404).json({ message: "Active chess game not found." });

    const mySide = sideFor(game, req.user._id);
    const winnerId = mySide === "w" ? game.black : game.white;

    game.status = "completed";
    game.winner = winnerId;
    game.result = mySide === "w" ? "0-1" : "1-0";
    game.resultReason = "Resignation";
    game.completedAt = new Date();

    await game.save();
    game = await populateGame(ChessGame.findById(game._id));
    emitGame(req, game, "chess:game:completed");

    res.json({ message: "Game resigned.", game: serializeGame(game, req.user._id) });
  } catch (err) {
    console.error("Chess resign error:", err);
    res.status(500).json({ message: "Could not resign chess game." });
  }
});

module.exports = router;
