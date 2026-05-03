import { io } from "socket.io-client";

const SOCKET_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://confession-wall-hn63.onrender.com";

let currentSocket = null;

export const connectSocket = (token, role = "user") => {
  if (!token) return null;

  if (currentSocket) {
    currentSocket.disconnect();
    currentSocket = null;
  }

  currentSocket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
   auth: {
  token,
  role,
  mode: role,
},
  });

  currentSocket.on("connect", () => {
    console.log("Socket connected:", currentSocket.id);
  });

  currentSocket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
  });

  return currentSocket;
};

export const getSocket = () => currentSocket;

export const disconnectSocket = () => {
  if (currentSocket) {
    currentSocket.disconnect();
    currentSocket = null;
  }
};

export default currentSocket;