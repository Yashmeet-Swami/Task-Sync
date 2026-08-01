import AppError from "../libs/app-error.js";
import asyncHandler from "../libs/async-handler.js";
import { hasProjectPermission, PROJECT_PERMISSIONS } from "../libs/permissions.js";
import mongoose from "mongoose";
import Task from "../models/task.js";
import Project from "../models/project.js";

const getMemberUserId = (member) => {
  return member.user?._id?.toString() || member.user?.toString();
};

const loadTaskAndMembership = async (req, taskParam) => {
  const taskId = req.params[taskParam];

  if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
    throw new AppError("Invalid task ID format", 400);
  }

  const task = await Task.findById(taskId);
  if (!task) {
    throw new AppError("Task not found", 404);
  }

  const project = await Project.findById(task.project);
  if (!project) {
    throw new AppError("Project not found", 404);
  }

  const member = project.members.find(
    (projectMember) => getMemberUserId(projectMember) === req.user._id.toString()
  );

  if (!member) {
    throw new AppError("You are not a member of this project", 403);
  }

  return { task, project, member };
};

// Fixed-permission check (view/comment/archive/assign) — same permission for every role.
export const requireTaskPermission = (permission, { taskParam = "taskId" } = {}) =>
  asyncHandler(async (req, res, next) => {
    const { task, project, member } = await loadTaskAndMembership(req, taskParam);

    if (!hasProjectPermission(member.role, permission)) {
      throw new AppError("You do not have permission to perform this action", 403);
    }

    req.task = task;
    req.project = project;
    req.projectRole = member.role;
    next();
  });

// Content-edit check (title/description/status/priority/due-date/subtasks): a manager can
// edit any task in the project; a contributor can only edit tasks they are assigned to.
export const requireTaskUpdatePermission = () =>
  asyncHandler(async (req, res, next) => {
    const { task, project, member } = await loadTaskAndMembership(req, "taskId");

    const canUpdateAny = hasProjectPermission(
      member.role,
      PROJECT_PERMISSIONS.UPDATE_ANY_TASK
    );

    const isAssignee = task.assignees.some(
      (assignee) => assignee.toString() === req.user._id.toString()
    );

    const canUpdateAssigned =
      isAssignee &&
      hasProjectPermission(member.role, PROJECT_PERMISSIONS.UPDATE_ASSIGNED_TASK);

    if (!canUpdateAny && !canUpdateAssigned) {
      throw new AppError("You do not have permission to update this task", 403);
    }

    req.task = task;
    req.project = project;
    req.projectRole = member.role;
    next();
  });
