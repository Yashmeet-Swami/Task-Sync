import { io, type Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

let socket: Socket | null = null;

// Created lazily (not at module load) and connected on first use by a
// component that actually needs live updates - the auth callback re-reads the
// token from localStorage on every (re)connection attempt rather than freezing
// it at creation time, since the token can be refreshed after the socket exists.
export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: (cb) => cb({ token: localStorage.getItem("token") }),
    });
  }
  return socket;
};
