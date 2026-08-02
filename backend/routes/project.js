import express from "express";
import authMiddleware from "../middleware/auth-middleware.js";
import { requireProjectPermission } from "../middleware/project-permission.js";
import { requireWorkspacePermission } from "../middleware/workspace-permission.js";
import { validateRequest } from "zod-express-middleware";
import {
  PROJECT_PERMISSIONS,
  WORKSPACE_PERMISSIONS,
} from "../libs/permissions.js";
import { projectSchema } from "../libs/validate-schema.js";
import { z } from "zod";
import {
  createProject,
  getProjectDetails,
  getProjectTasks,
  getProjectActivity,
} from "../controllers/project.js";

const router = express.Router();

/**
 * @openapi
 * /projects/{workspaceId}/create-project:
 *   post:
 *     summary: Create a project within a workspace (requires CREATE_PROJECT permission)
 *     tags: [Projects]
 *     parameters:
 *       - { in: path, name: workspaceId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, status, startDate]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               status: { type: string, enum: [Planning, In Progress, On Hold, Completed, Cancelled] }
 *               startDate: { type: string, format: date }
 *               dueDate: { type: string, format: date }
 *               tags: { type: string, description: "comma-separated" }
 *               members:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     user: { type: string }
 *                     role: { type: string, enum: [manager, contributor, viewer] }
 *     responses:
 *       201: { description: Project created }
 *       403: { description: Missing CREATE_PROJECT permission }
 */
router.post(
  "/:workspaceId/create-project",
  authMiddleware,
  validateRequest({
    params: z.object({
      workspaceId: z.string(),
    }),
    body: projectSchema,
  }),
  requireWorkspacePermission(WORKSPACE_PERMISSIONS.CREATE_PROJECT),
  createProject
);

/**
 * @openapi
 * /projects/{projectId}:
 *   get:
 *     summary: Get project details (requires project membership)
 *     tags: [Projects]
 *     parameters:
 *       - { in: path, name: projectId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Project details }
 *       403: { description: Not a member of this project }
 */
router.get(
  "/:projectId",
  authMiddleware,
  validateRequest({
    params: z.object({ projectId: z.string() }),
  }),
  requireProjectPermission(PROJECT_PERMISSIONS.VIEW_PROJECT),
  getProjectDetails
);

/**
 * @openapi
 * /projects/{projectId}/tasks:
 *   get:
 *     summary: List/search/filter tasks within a project (paginated)
 *     tags: [Projects]
 *     parameters:
 *       - { in: path, name: projectId, required: true, schema: { type: string } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string } }
 *       - { in: query, name: priority, schema: { type: string } }
 *       - { in: query, name: assignee, schema: { type: string } }
 *       - { in: query, name: dueDate, schema: { type: string, enum: [overdue, today, this_week, custom] } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10 } }
 *       - { in: query, name: sortBy, schema: { type: string, default: createdAt } }
 *       - { in: query, name: sortOrder, schema: { type: string, enum: [asc, desc], default: desc } }
 *     responses:
 *       200: { description: Paginated task list }
 */
router.get(
  "/:projectId/tasks",
  authMiddleware,
  validateRequest({ params: z.object({ projectId: z.string() }) }),
  requireProjectPermission(PROJECT_PERMISSIONS.VIEW_PROJECT),
  getProjectTasks
);

/**
 * @openapi
 * /projects/{projectId}/activity:
 *   get:
 *     summary: Paginated audit trail for a project and every task within it
 *     tags: [Projects]
 *     parameters:
 *       - { in: path, name: projectId, required: true, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *       - { in: query, name: action, schema: { type: string }, description: "filter by activity action type" }
 *       - { in: query, name: userId, schema: { type: string }, description: "filter by the acting user" }
 *     responses:
 *       200: { description: Paginated activity log entries }
 */
router.get(
  "/:projectId/activity",
  authMiddleware,
  validateRequest({ params: z.object({ projectId: z.string() }) }),
  requireProjectPermission(PROJECT_PERMISSIONS.VIEW_PROJECT),
  getProjectActivity
);

export default router;
