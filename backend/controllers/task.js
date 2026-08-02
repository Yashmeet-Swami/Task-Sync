import AppError from "../libs/app-error.js";
import asyncHandler from "../libs/async-handler.js";
import { recordActivity } from "../libs/index.js";
import { deleteCache, workspaceStatsCacheKey } from "../libs/cache.js";
import { emitToProject } from "../libs/socket.js";
import ActivityLog from "../models/activity.js";
import Comment from "../models/comment.js";
import Task from "../models/task.js";

const createTask = asyncHandler(async (req, res) => {
  const { title, description, status, priority, dueDate, assignees } = req.body;
  const project = req.project;

  const newTask = await Task.create({
    title,
    description,
    status,
    priority,
    dueDate,
    assignees,
    project: project._id,
    createdBy: req.user._id,
  });

  project.tasks.push(newTask._id);
  await project.save();
  await deleteCache(workspaceStatsCacheKey(project.workspace));
  emitToProject(project._id.toString(), "task:created", { taskId: newTask._id, projectId: project._id });

  res.status(201).json(newTask);
});

const getTaskById = asyncHandler(async (req, res) => {
  const task = req.task;
  const project = req.project;

  await task.populate([
    { path: "assignees", select: "name profilePicture" },
    { path: "watchers", select: "name profilePicture" },
  ]);
  await project.populate("members.user", "name profilePicture");

  res.status(200).json({ task, project });
});

const updateTaskTitle = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { title } = req.body;
  const task = req.task;

  const oldTitle = task.title;

  task.title = title;
  await task.save();
  emitToProject(task.project.toString(), "task:updated", { taskId, projectId: task.project });

  await recordActivity(req.user._id, "updated_task", "Task", taskId, {
    description: `updated task title from ${oldTitle} to ${title}`,
  });

  res.status(200).json(task);
});

const updateTaskDescription = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { description } = req.body;
  const task = req.task;

  const oldDescription =
    task.description.substring(0, 50) + (task.description.length > 50 ? "..." : "");
  const newDescription =
    description.substring(0, 50) + (description.length > 50 ? "..." : "");

  task.description = description;
  await task.save();
  emitToProject(task.project.toString(), "task:updated", { taskId, projectId: task.project });

  await recordActivity(req.user._id, "updated_task", "Task", taskId, {
    description: `updated task description from ${oldDescription} to ${newDescription}`,
  });

  res.status(200).json(task);
});

const updateTaskStatus = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;
  const task = req.task;

  const oldStatus = task.status;

  task.status = status;
  await task.save();
  await deleteCache(workspaceStatsCacheKey(req.project.workspace));
  emitToProject(task.project.toString(), "task:updated", { taskId, projectId: task.project });

  await recordActivity(req.user._id, "updated_task", "Task", taskId, {
    description: `updated task status from ${oldStatus} to ${status}`,
  });

  res.status(200).json(task);
});

const updateTaskAssignees = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { assignees } = req.body;
  const task = req.task;

  const oldAssigneeCount = task.assignees.length;

  task.assignees = assignees;
  await task.save();
  emitToProject(task.project.toString(), "task:updated", { taskId, projectId: task.project });

  await recordActivity(req.user._id, "updated_task", "Task", taskId, {
    description: `updated task assignees from ${oldAssigneeCount} to ${assignees.length}`,
  });

  res.status(200).json(task);
});

const updateTaskPriority = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { priority } = req.body;
  const task = req.task;

  const oldPriority = task.priority;

  task.priority = priority;
  await task.save();
  await deleteCache(workspaceStatsCacheKey(req.project.workspace));
  emitToProject(task.project.toString(), "task:updated", { taskId, projectId: task.project });

  await recordActivity(req.user._id, "updated_task", "Task", taskId, {
    description: `updated task priority from ${oldPriority} to ${priority}`,
  });

  res.status(200).json(task);
});

const addSubTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { title } = req.body;
  const task = req.task;

  task.subtasks.push({ title, completed: false });
  await task.save();
  emitToProject(task.project.toString(), "task:updated", { taskId, projectId: task.project });

  await recordActivity(req.user._id, "created_subtask", "Task", taskId, {
    description: `created subtask ${title}`,
  });

  res.status(201).json(task);
});

const updateSubTask = asyncHandler(async (req, res) => {
  const { taskId, subTaskId } = req.params;
  const { completed, title } = req.body;
  const task = req.task;

  const subTask = task.subtasks.find((st) => st._id.toString() === subTaskId);

  if (!subTask) {
    throw new AppError("Subtask not found", 404);
  }

  if (completed !== undefined) subTask.completed = completed;
  if (title !== undefined) subTask.title = title;
  await task.save();
  emitToProject(task.project.toString(), "task:updated", { taskId, projectId: task.project });

  await recordActivity(req.user._id, "updated_subtask", "Task", taskId, {
    description: `updated subtask ${subTask.title}`,
  });

  res.status(200).json(task);
});

const getActivityByResourceId = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;

  const activity = await ActivityLog.find({ resourceId })
    .populate("user", "name profilePicture")
    .sort({ createdAt: -1 });

  res.status(200).json(activity);
});

const getCommentsByTaskId = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const comments = await Comment.find({ task: taskId })
    .populate("author", "name profilePicture")
    .sort({ createdAt: -1 });

  res.status(200).json(comments);
});

const addComment = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { text } = req.body;
  const task = req.task;

  const newComment = await Comment.create({
    text,
    task: taskId,
    author: req.user._id,
  });

  task.comments.push(newComment._id);
  await task.save();
  emitToProject(task.project.toString(), "comment:added", { taskId, projectId: task.project });

  await recordActivity(req.user._id, "added_comment", "Task", taskId, {
    description: `added comment ${text.substring(0, 50) + (text.length > 50 ? "..." : "")}`,
  });

  res.status(201).json(newComment);
});

const watchTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const task = req.task;

  const isWatching = task.watchers.includes(req.user._id);

  if (!isWatching) {
    task.watchers.push(req.user._id);
  } else {
    task.watchers = task.watchers.filter(
      (watcher) => watcher.toString() !== req.user._id.toString()
    );
  }

  await task.save();

  await recordActivity(req.user._id, "updated_task", "Task", taskId, {
    description: `${isWatching ? "stopped watching" : "started watching"} task ${task.title}`,
  });

  res.status(200).json(task);
});

const archivedTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const task = req.task;

  const isArchived = task.isArchived;

  task.isArchived = !isArchived;
  await task.save();
  await deleteCache(workspaceStatsCacheKey(req.project.workspace));
  emitToProject(task.project.toString(), "task:updated", { taskId, projectId: task.project });

  await recordActivity(req.user._id, "updated_task", "Task", taskId, {
    description: `${isArchived ? "unarchived" : "archived"} task ${task.title}`,
  });

  res.status(200).json(task);
});

const getMyTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({ assignees: { $in: [req.user._id] } })
    .populate("project", "title workspace")
    .sort({ createdAt: -1 });

  res.status(200).json(tasks);
});

const updateTaskDueDate = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { dueDate } = req.body;
  const task = req.task;

  task.dueDate = dueDate ? new Date(dueDate) : null;
  await task.save();
  await deleteCache(workspaceStatsCacheKey(req.project.workspace));
  emitToProject(task.project.toString(), "task:updated", { taskId, projectId: task.project });

  await recordActivity(req.user._id, "updated_task", "Task", taskId, {
    description: `updated due date`,
  });

  res.status(200).json(task);
});

export {
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
  watchTask,
  archivedTask,
  getMyTasks,
};
