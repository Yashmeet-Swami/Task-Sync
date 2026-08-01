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

router.post(
  "/:taskId/watch",
  authMiddleware,
  validateRequest({
    params: z.object({ taskId: z.string() }),
  }),
  requireTaskPermission(PROJECT_PERMISSIONS.VIEW_PROJECT),
  watchTask
);

router.post(
  "/:taskId/archived",
  authMiddleware,
  validateRequest({
    params: z.object({ taskId: z.string() }),
  }),
  requireTaskPermission(PROJECT_PERMISSIONS.ARCHIVE_TASK),
  archivedTask
);

router.get(
  "/my-tasks",
  authMiddleware,
  getMyTasks
)

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

router.get(
  "/:resourceId/activity",
  authMiddleware,
  validateRequest({
    params: z.object({ resourceId: z.string() }),
  }),
  requireTaskPermission(PROJECT_PERMISSIONS.VIEW_PROJECT, { taskParam: "resourceId" }),
  getActivityByResourceId
);

router.get(
  "/:taskId/comments",
  authMiddleware,
  validateRequest({
    params: z.object({ taskId: z.string() }),
  }),
  requireTaskPermission(PROJECT_PERMISSIONS.VIEW_PROJECT),
  getCommentsByTaskId
);

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
