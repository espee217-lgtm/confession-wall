import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DisplayTitlePill from "../components/DisplayTitlePill";
import FramedAvatar from "../components/FramedAvatar";
import { useAuth } from "../context/AuthContext";
import { getSocket } from "../socket";
import { getDisplayCosmetics } from "../utils/engagement";
import "./ChessPage.css";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com");

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const pieceMap = {
  p: "♟",
  r: "♜",
  n: "♞",
  b: "♝",
  q: "♛",
  k: "♚",
  P: "♙",
  R: "♖",
  N: "♘",
  B: "♗",
  Q: "♕",
  K: "♔",
};

function parseFenBoard(fen) {
  const safeFen = !fen || fen === "start" ? STARTING_FEN : String(fen);
  const boardPart = safeFen.split(" ")[0];
  const ranks = boardPart.split("/");
  const board = [];

  ranks.slice(0, 8).forEach((rank, rankIndex) => {
    let fileIndex = 0;
    rank.split("").forEach((char) => {
      if (fileIndex >= 8) return;

      if (/\d/.test(char)) {
        const emptyCount = Number(char);
        for (let i = 0; i < emptyCount && fileIndex < 8; i += 1) {
          board.push({ square: `${files[fileIndex]}${8 - rankIndex}`, piece: "" });
          fileIndex += 1;
        }
      } else if (pieceMap[char]) {
        board.push({ square: `${files[fileIndex]}${8 - rankIndex}`, piece: char });
        fileIndex += 1;
      }
    });

    while (fileIndex < 8) {
      board.push({ square: `${files[fileIndex]}${8 - rankIndex}`, piece: "" });
      fileIndex += 1;
    }
  });

  while (board.length < 64) {
    const index = board.length;
    const rankIndex = Math.floor(index / 8);
    const fileIndex = index % 8;
    board.push({ square: `${files[fileIndex]}${8 - rankIndex}`, piece: "" });
  }

  return board.slice(0, 64);
}

function isWhitePiece(piece) {
  return piece && piece === piece.toUpperCase();
}

function isMyPiece(piece, side) {
  if (!piece || !["w", "b"].includes(side)) return false;
  return side === "w" ? isWhitePiece(piece) : !isWhitePiece(piece);
}

function UserChip({ user, label }) {
  const cosmetics = getDisplayCosmetics(user || {});

  return (
    <div className="cw-chess-user-chip">
      <FramedAvatar
        src={user?.profilePicture}
        username={user?.username}
        frameId={cosmetics?.frame}
        effectId={cosmetics?.visualEffect}
        size={44}
        context="chess"
        placeholder={user?.username?.[0]?.toUpperCase?.() || "U"}
      />
      <div>
        <span>{label}</span>
        <strong>{user?.username || "Unknown"}</strong>
        <DisplayTitlePill titleId={cosmetics?.title} size="small" />
      </div>
    </div>
  );
}

function GameCard({ game, onAccept, onDecline, actionBusy }) {
  const statusText =
    game.status === "invited"
      ? game.isChallenged
        ? "Invite waiting for you"
        : "Waiting for friend"
      : game.status === "active"
      ? game.isMyTurn
        ? "Your move"
        : "Opponent turn"
      : game.resultReason || game.status;

  return (
    <article className="cw-chess-card">
      <div>
        <p className="cw-chess-card-kicker">friend chess</p>
        <h3>{game.opponent?.username || "Chess match"}</h3>
        <span className={`cw-chess-status cw-chess-status--${game.status}`}>{statusText}</span>
      </div>
      <div className="cw-chess-card-actions">
        {game.status === "invited" && game.isChallenged ? (
          <>
            <button type="button" onClick={() => onAccept(game._id)} disabled={actionBusy === game._id}>
              Accept
            </button>
            <button type="button" className="is-ghost" onClick={() => onDecline(game._id)} disabled={actionBusy === game._id}>
              Decline
            </button>
          </>
        ) : null}
        <Link to={`/chess/${game._id}`}>{game.status === "active" ? "Open board" : "View"}</Link>
      </div>
    </article>
  );
}

function ChessBoard({ game, selected, onSquareClick }) {
  const mySide = game?.mySide || "w";
  const cells = parseFenBoard(game?.fen);
  const ordered = mySide === "b" ? [...cells].reverse() : cells;

  return (
    <div className={`cw-chess-board ${mySide === "b" ? "is-black-view" : ""}`}>
      {ordered.map((cell) => {
        const isSelected = selected === cell.square;
        const ownPiece = isMyPiece(cell.piece, mySide);
        return (
          <button
            key={cell.square}
            type="button"
            className={`cw-chess-square ${isSelected ? "is-selected" : ""} ${ownPiece ? "has-own-piece" : ""}`}
            onClick={() => onSquareClick(cell)}
            aria-label={`Square ${cell.square}`}
          >
            <span className={`cw-chess-piece ${isWhitePiece(cell.piece) ? "is-white" : "is-black"}`}>
              {pieceMap[cell.piece] || ""}
            </span>
            <small>{cell.square}</small>
          </button>
        );
      })}
    </div>
  );
}

export default function ChessPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [home, setHome] = useState(null);
  const [game, setGame] = useState(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token]
  );

  const request = useCallback(
    async (path, options = {}) => {
      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: { ...authHeaders, ...(options.headers || {}) },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Chess action failed.");
      return data;
    },
    [authHeaders]
  );

  const loadHome = useCallback(async () => {
    if (!token) return;
    try {
      setError("");
      const data = await request("/api/chess/home");
      setHome(data);
    } catch (err) {
      console.error("Load chess home error:", err);
      setError(err.message || "Could not load chess lobby.");
    } finally {
      setLoading(false);
    }
  }, [request, token]);

  const loadGame = useCallback(async () => {
    if (!token || !gameId) return;
    try {
      setError("");
      const data = await request(`/api/chess/${gameId}`);
      setGame(data);
    } catch (err) {
      console.error("Load chess game error:", err);
      setError(err.message || "Could not load chess game.");
    } finally {
      setLoading(false);
    }
  }, [gameId, request, token]);

  useEffect(() => {
    setLoading(true);
    setSelected("");
    if (gameId) loadGame();
    else loadHome();
  }, [gameId, loadGame, loadHome]);

  useEffect(() => {
    if (!token) return undefined;

    let socket = getSocket();
    let cancelled = false;

    const refresh = (payload = {}) => {
      if (cancelled) return;
      if (gameId) {
        if (!payload.gameId || String(payload.gameId) === String(gameId)) loadGame();
      } else {
        loadHome();
      }
    };

    const attach = () => {
      socket = getSocket();
      if (!socket) return;
      socket.on("chess:invite:new", refresh);
      socket.on("chess:game:accepted", refresh);
      socket.on("chess:game:declined", refresh);
      socket.on("chess:move", refresh);
      socket.on("chess:game:completed", refresh);
      socket.on("chess:game:update", refresh);
    };

    attach();
    const retry = setTimeout(attach, 700);

    return () => {
      cancelled = true;
      clearTimeout(retry);
      if (!socket) return;
      socket.off("chess:invite:new", refresh);
      socket.off("chess:game:accepted", refresh);
      socket.off("chess:game:declined", refresh);
      socket.off("chess:move", refresh);
      socket.off("chess:game:completed", refresh);
      socket.off("chess:game:update", refresh);
    };
  }, [gameId, loadGame, loadHome, token]);

  const acceptInvite = async (id) => {
    try {
      setBusy(id);
      const data = await request(`/api/chess/invites/${id}/accept`, { method: "POST" });
      window.cwToast?.("Chess challenge accepted.", "success");
      navigate(`/chess/${data.game?._id || id}`);
    } catch (err) {
      window.cwToast?.(err.message || "Could not accept chess invite.", "error");
    } finally {
      setBusy("");
    }
  };

  const declineInvite = async (id) => {
    try {
      setBusy(id);
      await request(`/api/chess/invites/${id}/decline`, { method: "POST" });
      window.cwToast?.("Chess challenge declined.", "success");
      await loadHome();
    } catch (err) {
      window.cwToast?.(err.message || "Could not decline chess invite.", "error");
    } finally {
      setBusy("");
    }
  };

  const makeMove = async (from, to) => {
    try {
      setBusy("move");
      const data = await request(`/api/chess/${gameId}/move`, {
        method: "POST",
        body: JSON.stringify({ from, to, promotion: "q" }),
      });
      setGame(data.game);
      setSelected("");
    } catch (err) {
      window.cwToast?.(err.message || "Illegal move.", "error");
      setSelected("");
    } finally {
      setBusy("");
    }
  };

  const resign = async () => {
    if (!window.confirm("Resign this chess game?")) return;
    try {
      setBusy("resign");
      const data = await request(`/api/chess/${gameId}/resign`, { method: "POST" });
      setGame(data.game);
      window.cwToast?.("Game resigned.", "success");
    } catch (err) {
      window.cwToast?.(err.message || "Could not resign.", "error");
    } finally {
      setBusy("");
    }
  };

  const onSquareClick = (cell) => {
    if (!game || game.status !== "active" || !game.isMyTurn || busy) return;

    if (!selected) {
      if (isMyPiece(cell.piece, game.mySide)) setSelected(cell.square);
      return;
    }

    if (selected === cell.square) {
      setSelected("");
      return;
    }

    if (isMyPiece(cell.piece, game.mySide)) {
      setSelected(cell.square);
      return;
    }

    makeMove(selected, cell.square);
  };

  if (!user || !token) {
    return (
      <main className="cw-chess-page">
        <section className="cw-chess-shell cw-chess-empty-auth">
          <span>♟</span>
          <h1>Forest Chess</h1>
          <p>Log in to challenge friends.</p>
          <button type="button" onClick={() => navigate("/login")}>Login</button>
        </section>
      </main>
    );
  }

  if (loading) {
    return <main className="cw-chess-page"><div className="cw-chess-loading">setting up the board...</div></main>;
  }

  const allLobbyGames = [
    ...(home?.incomingInvites || []),
    ...(home?.outgoingInvites || []),
    ...(home?.activeGames || []),
  ];

  return (
    <main className="cw-chess-page">
      <section className="cw-chess-shell">
        <div className="cw-chess-hero">
          <div>
            <p className="cw-chess-kicker">phase 3</p>
            <h1>Forest Chess</h1>
            <p>Challenge accepted friends and play live matches inside Confession Wall.</p>
          </div>
          <Link to="/friends" className="cw-chess-hero-link">Find friends</Link>
        </div>

        {error ? <div className="cw-chess-error">{error}</div> : null}

        {!gameId ? (
          <div className="cw-chess-lobby">
            {allLobbyGames.length === 0 ? (
              <div className="cw-chess-empty">
                <span>♙</span>
                <strong>No chess matches yet</strong>
                <p>Go to Friends and use Challenge beside an accepted friend.</p>
                <Link to="/friends">Open Friends</Link>
              </div>
            ) : (
              <>
                {home?.incomingInvites?.length ? <h2>Incoming challenges</h2> : null}
                {(home?.incomingInvites || []).map((item) => (
                  <GameCard key={item._id} game={item} onAccept={acceptInvite} onDecline={declineInvite} actionBusy={busy} />
                ))}
                {home?.activeGames?.length ? <h2>Active games</h2> : null}
                {(home?.activeGames || []).map((item) => (
                  <GameCard key={item._id} game={item} onAccept={acceptInvite} onDecline={declineInvite} actionBusy={busy} />
                ))}
                {home?.outgoingInvites?.length ? <h2>Sent challenges</h2> : null}
                {(home?.outgoingInvites || []).map((item) => (
                  <GameCard key={item._id} game={item} onAccept={acceptInvite} onDecline={declineInvite} actionBusy={busy} />
                ))}
              </>
            )}
          </div>
        ) : game ? (
          <div className="cw-chess-game-layout">
            <div className="cw-chess-board-panel">
              <div className="cw-chess-versus">
                <UserChip user={game.black} label="Black" />
                <span className="cw-chess-turn-pill">
                  {game.status === "active" ? (game.isMyTurn ? "Your move" : "Waiting") : game.resultReason || game.status}
                </span>
                <UserChip user={game.white} label="White" />
              </div>

              {game.status === "invited" && game.isChallenged ? (
                <div className="cw-chess-invite-bar">
                  <strong>{game.challenger?.username} challenged you.</strong>
                  <button type="button" onClick={() => acceptInvite(game._id)} disabled={busy === game._id}>Accept</button>
                  <button type="button" onClick={() => declineInvite(game._id)} disabled={busy === game._id}>Decline</button>
                </div>
              ) : null}

              <ChessBoard game={game} selected={selected} onSquareClick={onSquareClick} />

              <div className="cw-chess-board-footer">
                <span>You are {game.mySide === "w" ? "White" : game.mySide === "b" ? "Black" : "watching"}</span>
                {game.status === "active" ? (
                  <button type="button" onClick={resign} disabled={busy === "resign"}>Resign</button>
                ) : null}
              </div>
            </div>

            <aside className="cw-chess-side-panel">
              <h2>Move log</h2>
              {(game.moves || []).length === 0 ? (
                <p>No moves yet.</p>
              ) : (
                <ol className="cw-chess-moves">
                  {game.moves.map((move, index) => (
                    <li key={`${move.from}-${move.to}-${index}`}>
                      <span>{index + 1}.</span> {move.san || `${move.from}-${move.to}`}
                    </li>
                  ))}
                </ol>
              )}
              {game.status === "completed" ? (
                <div className="cw-chess-result">
                  <strong>{game.result || "Game over"}</strong>
                  <span>{game.resultReason}</span>
                </div>
              ) : null}
              <Link to="/chess" className="cw-chess-back-link">Back to lobby</Link>
            </aside>
          </div>
        ) : null}
      </section>
    </main>
  );
}
