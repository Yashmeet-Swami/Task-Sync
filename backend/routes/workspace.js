import express from "express";
import { validateRequest } from "zod-express-middleware";
import { inviteMemberSchema, tokenSchema, workspaceSchema } from "../libs/validate-schema.js";
import authMiddleware from "../middleware/auth-middleware.js";
import { requireWorkspacePermission } from "../middleware/workspace-permission.js";
import { WORKSPACE_PERMISSIONS } from "../libs/permissions.js";
import {
  createWorkspace,
  getWorkspaces,
  getWorkspaceDetails,
  getWorkspaceInviteInfo,
  getWorkspaceProjects,
  getWorkspaceStats,
  acceptInviteByToken,
  inviteUserToWorkspace,
  acceptGenerateInvite,
} from "../controllers/workspace.js";
import { z } from "zod";

const router = express.Router();

/**
 * @openapi
 * /workspaces:
 *   post:
 *     summary: Create a workspace (creator becomes the owner)
 *     tags: [Workspaces]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, color]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               color: { type: string }
 *     responses:
 *       201: { description: Workspace created }
 *   get:
 *     summary: List workspaces the current user is a member of
 *     tags: [Workspaces]
 *     responses:
 *       200: { description: List of workspaces }
 */
router.post(
  "/",
  authMiddleware,
  validateRequest({ body: workspaceSchema }),
  createWorkspace
);

/**
 * @openapi
 * /workspaces/accept-invite-token:
 *   post:
 *     summary: Accept a workspace invite using the token from the invite email
 *     tags: [Workspaces]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200: { description: Invitation accepted }
 *       404: { description: Workspace or invitation not found }
 */
router.post(
  "/accept-invite-token",
  authMiddleware,
  validateRequest({ body: tokenSchema }),
  acceptInviteByToken
);

/**
 * @openapi
 * /workspaces/{workspaceId}/invite-member:
 *   post:
 *     summary: Invite a user to a workspace by email (requires INVITE_MEMBER permission)
 *     tags: [Workspaces]
 *     parameters:
 *       - { in: path, name: workspaceId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, role]
 *             properties:
 *               email: { type: string, format: email }
 *               role: { type: string, enum: [admin, member, viewer] }
 *     responses:
 *       200: { description: Invitation email queued }
 *       403: { description: Missing INVITE_MEMBER permission }
 */
router.post(
  "/:workspaceId/invite-member",
  authMiddleware,
  validateRequest({
    params: z.object({ workspaceId: z.string() }),
    body: inviteMemberSchema,
  }),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.INVITE_MEMBER),
  inviteUserToWorkspace
);

/**
 * @openapi
 * /workspaces/{workspaceId}/accept-generate-invite:
 *   post:
 *     summary: Join a workspace directly (e.g. via a shareable invite link) as a member
 *     tags: [Workspaces]
 *     parameters:
 *       - { in: path, name: workspaceId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Joined the workspace }
 *       400: { description: Already a member }
 */
router.post(
  "/:workspaceId/accept-generate-invite",
  authMiddleware,
  validateRequest({ params: z.object({ workspaceId: z.string() }) }),
  acceptGenerateInvite
);

router.get("/", authMiddleware, getWorkspaces);

/**
 * @openapi
 * /workspaces/{workspaceId}/invite-info:
 *   get:
 *     summary: Preview a workspace's public info before joining
 *     tags: [Workspaces]
 *     parameters:
 *       - { in: path, name: workspaceId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Workspace name/description/color }
 *       404: { description: Workspace not found }
 */
router.get(
  "/:workspaceId/invite-info",
  authMiddleware,
  validateRequest({ params: z.object({ workspaceId: z.string() }) }),
  getWorkspaceInviteInfo
);

/**
 * @openapi
 * /workspaces/{workspaceId}:
 *   get:
 *     summary: Get workspace details (requires membership)
 *     tags: [Workspaces]
 *     parameters:
 *       - { in: path, name: workspaceId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Workspace with populated members }
 *       403: { description: Not a member of this workspace }
 */
router.get(
  "/:workspaceId",
  authMiddleware,
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.VIEW_WORKSPACE),
  getWorkspaceDetails
);

/**
 * @openapi
 * /workspaces/{workspaceId}/projects:
 *   get:
 *     summary: List the current user's projects within a workspace
 *     tags: [Workspaces]
 *     parameters:
 *       - { in: path, name: workspaceId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Projects and workspace details }
 */
router.get(
  "/:workspaceId/projects",
  authMiddleware,
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.VIEW_WORKSPACE),
  getWorkspaceProjects
);

/**
 * @openapi
 * /workspaces/{workspaceId}/stats:
 *   get:
 *     summary: Dashboard analytics for a workspace (cached in Redis for 60s)
 *     tags: [Workspaces]
 *     parameters:
 *       - { in: path, name: workspaceId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Aggregated task/project stats and trend data }
 */
router.get(
  "/:workspaceId/stats",
  authMiddleware,
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.VIEW_WORKSPACE),
  getWorkspaceStats
);

export default router;
