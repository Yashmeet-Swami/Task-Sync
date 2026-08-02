import express from "express";
import { validateRequest } from "zod-express-middleware";
import { taskSchema } from "../libs/validate-schema.js";
import {
  createTask,
  getTaskById,
  updateTaskTitle,
  updateTaskDescription,
  updateTaskStatus,
  updateTaskAssignees,
  updateTaskPriority,
  updateTaskDueDate,
  addSubTask,
  updateSubTask,
  getActivityByResourceId,
  getCommentsByTaskId,
  addComment,
  archivedTask,
  watchTask,
  getMyTasks,
} from "../controllers/task.js";
import authMiddleware from "../middleware/auth-middleware.js";
import { requireProjectPermission } from "../middleware/project-permission.js";
import {
  requireTaskPermission,
  requireTaskUpdatePermission,
} from "../middleware/task-permission.js";
import { PROJECT_PERMISSIONS } from "../libs/permissions.js";
import { z } from "zod";

const router = express.Router();

/**
 * @openapi
 * /tasks/{projectId}/create-task:
 *   post:
 *     summary: Create a task in a project (requires CREATE_TASK permission)
 *     tags: [Tasks]
 *     parameters:
 *       - { in: path, name: projectId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, status, priority, dueDate, assignees]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               status: { type: string, enum: [To Do, In Progress, Done] }
 *               priority: { type: string, enum: [Low, Medium, High] }
 *               dueDate: { type: string, format: date }
 *               assignees: { type: array, items: { type: string }, minItems: 1 }
 *     responses:
 *       201: { description: Task created }
 *       403: { description: Missing CREATE_TASK permission }
 */
router.post(
  "/:projectId/create-task",
  authMiddleware,
  validateRequest({
    params: z.object({
      projectId: z.string(),
    }),
    body: taskSchema,
  }),
  requireProjectPermission(PROJECT_PERMISSIONS.CREATE_TASK),
  createTask
);

/**
 * @openapi
 * /tasks/{taskId}/add-subtask:
 *   post:
 *     summary: Add a subtask (manager can edit any task; contributor only tasks assigned to them)
 *     tags: [Tasks]
 *     parameters:
 *       - { in: path, name: taskId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties: { title: { type: string } }
 *     responses:
 *       201: { description: Subtask added }
 *       403: { description: Not permitted to update this task }
 */
router.post(
  "/:taskId/add-subtask",
  authMiddleware,
  validateRequest({
    params: z.object({ taskId: z.string() }),
    body: z.object({ title: z.string() }),
  }),
  requireTaskUpdatePermission(),
  addSubTask
);

/**
 * @openapi
 * /tasks/{taskId}/add-comment:
 *   post:
 *     summary: Add a comment to a task (requires COMMENT_TASK permission)
 *     tags: [Tasks]
 *     parameters:
 *       - { in: path, name: taskId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties: { text: { type: string } }
 *     responses:
 *       201: { description: Comment added }
 */
router.post(
  "/:taskId/add-comment",
  authMiddleware,
  validateRequest({
    params: z.object({ taskId: z.string() }),
    body: z.object({ text: z.string() }),
  }),
  requireTaskPermission(PROJECT_PERMISSIONS.COMMENT_TASK),
  addComment
);

/**
 * @openapi
 * /tasks/{taskId}/watch:
 *   post:
 *     summary: Toggle watching a task (any project member, including viewers)
 *     tags: [Tasks]
 *     parameters:
 *       - { in: path, name: taskId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Watch state toggled }
 */
router.post(
  "/:taskId/watch",
  authMiddleware,
  validateRequest({
    params: z.object({ taskId: z.string() }),
  }),
  requireTaskPermission(PROJECT_PERMISSIONS.VIEW_PROJECT),
  watchTask
);

/**
 * @openapi
 * /tasks/{taskId}/archived:
 *   post:
 *     summary: Toggle archiving a task (manager only)
 *     tags: [Tasks]
 *     parameters:
 *       - { in: path, name: taskId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Archive state toggled }
 *       403: { description: Missing ARCHIVE_TASK permission }
 */
router.post(
  "/:taskId/archived",
  authMiddleware,
  validateRequest({
    params: z.object({ taskId: z.string() }),
  }),
  requireTaskPermission(PROJECT_PERMISSIONS.ARCHIVE_TASK),
  archivedTask
);

/**
 * @openapi
 * /tasks/my-tasks:
 *   get:
 *     summary: List tasks assigned to the current user, across all projects
 *     tags: [Tasks]
 *     responses:
 *       200: { description: Task list }
 */
router.get(
  "/my-tasks",
  authMiddleware,
  getMyTasks
)

/**
 * @openapi
 * /tasks/{taskId}:
 *   get:
 *     summary: Get a task with its project (requires project membership)
 *     tags: [Tasks]
 *     parameters:
 *       - { in: path, name: taskId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Task and project }
 *       403: { description: Not a member of this project }
 */
router.get(
  "/:taskId",
  authMiddleware,
  validateRequest({
    params: z.object({
      taskId: z.string(),
    }),
  }),
  requireTaskPermission(PROJECT_PERMISSIONS.VIEW_PROJECT),
  getTaskById
)

/**
 * @openapi
 * /tasks/{resourceId}/activity:
 *   get:
 *     summary: Get the activity log for a task
 *     tags: [Tasks]
 *     parameters:
 *       - { in: path, name: resourceId, required: true, schema: { type: string }, description: "a task id" }
 *     responses:
 *       200: { description: Activity log entries for this task }
 */
router.get(
  "/:resourceId/activity",
  authMiddleware,
  validateRequest({
    params: z.object({ resourceId: z.string() }),
  }),
  requireTaskPermission(PROJECT_PERMISSIONS.VIEW_PROJECT, { taskParam: "resourceId" }),
  getActivityByResourceId
);

/**
 * @openapi
 * /tasks/{taskId}/comments:
 *   get:
 *     summary: List comments on a task
 *     tags: [Tasks]
 *     parameters:
 *       - { in: path, name: taskId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Comment list }
 */
router.get(
  "/:taskId/comments",
  authMiddleware,
  validateRequest({
    params: z.object({ taskId: z.string() }),
  }),
  requireTaskPermission(PROJECT_PERMISSIONS.VIEW_PROJECT),
  getCommentsByTaskId
);

/**
 * @openapi
 * /tasks/{taskId}/update-subtask/{subTaskId}:
 *   put:
 *     summary: Update a subtask's title/completion
 *     tags: [Tasks]
 *     parameters:
 *       - { in: path, name: taskId, required: true, schema: { type: string } }
 *       - { in: path, name: subTaskId, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               completed: { type: boolean }
 *               title: { type: string }
 *     responses:
 *       200: { description: Subtask updated }
 *       404: { description: Subtask not found }
 */
router.put(
  "/:taskId/update-subtask/:subTaskId",
  authMiddleware,
  validateRequest({
    params: z.object({ taskId: z.string(), subTaskId: z.string() }),
    body: z.object({
        completed: z.boolean().optional(),
        title: z.string().optional()
    }),
  }),
  requireTaskUpdatePermission(),
  updateSubTask
);

/**
 * @openapi
 * /tasks/{taskId}/title:
 *   put:
 *     summary: Rename a task
 *     tags: [Tasks]
 *     parameters:
 *       - { in: path, name: taskId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [title], properties: { title: { type: string } } }
 *     responses:
 *       200: { description: Task updated }
 */
router.put(
  "/:taskId/title",
  authMiddleware,
  validateRequest({
    params: z.object({ taskId: z.string() }),
    body: z.object({ title: z.string() }),
  }),
  requireTaskUpdatePermission(),
  updateTaskTitle
)

/**
 * @openapi
 * /tasks/{taskId}/description:
 *   put:
 *     summary: Update a task's description
 *     tags: [Tasks]
 *     parameters:
 *       - { in: path, name: taskId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [description], properties: { description: { type: string } } }
 *     responses:
 *       200: { description: Task updated }
 */
router.put(
  "/:taskId/description",
  authMiddleware,
  validateRequest({
    params: z.object({ taskId: z.string() }),
    body: z.object({ description: z.string() }),
  }),
  requireTaskUpdatePermission(),
  updateTaskDescription
)

/**
 * @openapi
 * /tasks/{taskId}/status:
 *   put:
 *     summary: Update a task's status
 *     tags: [Tasks]
 *     parameters:
 *       - { in: path, name: taskId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [status], properties: { status: { type: string } } }
 *     responses:
 *       200: { description: Task updated }
 */
router.put(
  "/:taskId/status",
  authMiddleware,
  validateRequest({
    params: z.object({ taskId: z.string() }),
    body: z.object({ status: z.string() }),
  }),
  requireTaskUpdatePermission(),
  updateTaskStatus
)

/**
 * @openapi
 * /tasks/{taskId}/assignees:
 *   put:
 *     summary: Reassign a task (manager only)
 *     tags: [Tasks]
 *     parameters:
 *       - { in: path, name: taskId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assignees]
 *             properties: { assignees: { type: array, items: { type: string } } }
 *     responses:
 *       200: { description: Task updated }
 *       403: { description: Missing ASSIGN_TASK_MEMBERS permission }
 */
router.put(
  "/:taskId/assignees",
  authMiddleware,
  validateRequest({
    params: z.object({ taskId: z.string() }),
    body: z.object({ assignees: z.array(z.string()) }),
  }),
  requireTaskPermission(PROJECT_PERMISSIONS.ASSIGN_TASK_MEMBERS),
  updateTaskAssignees
)

/**
 * @openapi
 * /tasks/{taskId}/priority:
 *   put:
 *     summary: Update a task's priority
 *     tags: [Tasks]
 *     parameters:
 *       - { in: path, name: taskId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [priority], properties: { priority: { type: string } } }
 *     responses:
 *       200: { description: Task updated }
 */
router.put(
  "/:taskId/priority",
  authMiddleware,
  validateRequest({
    params: z.object({ taskId: z.string() }),
    body: z.object({ priority: z.string() }),
  }),
  requireTaskUpdatePermission(),
  updateTaskPriority
);

/**
 * @openapi
 * /tasks/{taskId}/due-date:
 *   put:
 *     summary: Update (or clear) a task's due date
 *     tags: [Tasks]
 *     parameters:
 *       - { in: path, name: taskId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dueDate]
 *             properties: { dueDate: { type: string, nullable: true, format: date } }
 *     responses:
 *       200: { description: Task updated }
 */
router.put(
  "/:taskId/due-date",
  authMiddleware,
  validateRequest({
    params: z.object({ taskId: z.string() }),
    body: z.object({ dueDate: z.union([z.string(), z.date(), z.null()]) }),
  }),
  requireTaskUpdatePermission(),
  updateTaskDueDate
);

export default router;
