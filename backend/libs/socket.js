import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import env from "./env.js";
import logger from "./logger.js";
import User from "../models/user.js";
import Project from "../models/project.js";
import Workspace from "../models/workspace.js";

let io;

const isMemberOf = (doc, userId) =>
  doc?.members?.some((member) => member.user.toString() === userId) ?? false;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [env.FRONTEND_URL, "http://localhost:5173"].filter(Boolean),
      credentials: true,
    },
  });

  // Same access-token verification as authMiddleware, applied to the socket
  // handshake instead of an HTTP request.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Unauthorized"));

      const payload = jwt.verify(token, env.ACCESS_TOKEN_SECRET);
      if (payload.purpose !== "access-token") return next(new Error("Unauthorized"));

      const user = await User.findById(payload.userId);
      if (!user) return next(new Error("Unauthorized"));

      socket.userId = user._id.toString();
      next();
    } catch (error) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    logger.debug({ userId: socket.userId }, "socket connected");

    // Rooms are joined on request rather than automatically, and only after
    // verifying membership - the same authorization boundary as the HTTP RBAC
    // middleware, so a socket can't be used to peek at a project/workspace the
    // connecting user isn't actually a member of.
    socket.on("join:project", async (projectId) => {
      try {
        const project = await Project.findById(projectId).select("members");
        if (isMemberOf(project, socket.userId)) {
          socket.join(`project:${projectId}`);
        }
      } catch (error) {
        logger.warn({ err: error, projectId }, "join:project failed");
      }
    });

    socket.on("leave:project", (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on("join:workspace", async (workspaceId) => {
      try {
        const workspace = await Workspace.findById(workspaceId).select("members");
        if (isMemberOf(workspace, socket.userId)) {
          socket.join(`workspace:${workspaceId}`);
        }
      } catch (error) {
        logger.warn({ err: error, workspaceId }, "join:workspace failed");
      }
    });

    socket.on("leave:workspace", (workspaceId) => {
      socket.leave(`workspace:${workspaceId}`);
    });
  });

  return io;
};

export const getIO = () => io;

export const emitToProject = (projectId, event, payload) => {
  getIO()?.to(`project:${projectId}`).emit(event, payload);
};

export const emitToWorkspace = (workspaceId, event, payload) => {
  getIO()?.to(`workspace:${workspaceId}`).emit(event, payload);
};
