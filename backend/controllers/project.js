import asyncHandler from "../libs/async-handler.js";
import { deleteCache, workspaceStatsCacheKey } from "../libs/cache.js";
import Project from "../models/project.js";
import Task from "../models/task.js";
import ActivityLog from "../models/activity.js";
import mongoose from "mongoose";

const createProject = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { title, description, status, startDate, dueDate, tags, members } = req.body;

  const workspace = req.workspace;

  const tagArray = tags ? tags.split(",") : [];

  const newProject = await Project.create({
    title,
    description,
    status,
    startDate,
    dueDate,
    tags: tagArray,
    workspace: workspaceId,
    members,
    createdBy: req.user._id,
  });

  workspace.projects.push(newProject._id);
  await workspace.save();
  await deleteCache(workspaceStatsCacheKey(workspaceId));

  res.status(201).json(newProject);
});

const getProjectDetails = asyncHandler(async (req, res) => {
  const project = req.project;

  res.status(200).json(project);
});

const getProjectTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const {
    search,
    status,
    priority,
    assignee,
    dueDate,
    dueDateStart,
    dueDateEnd,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const project = await req.project.populate("members.user");

  const filter = {
    project: new mongoose.Types.ObjectId(projectId),
    isArchived: false,
  };

  if (search) {
    filter.title = { $regex: search, $options: "i" };
  }

  if (status) {
    filter.status = Array.isArray(status) ? { $in: status } : status;
  }

  if (priority) {
    filter.priority = Array.isArray(priority) ? { $in: priority } : priority;
  }

  if (assignee) {
    // If assignee comes as a comma-separated string or array
    const assigneesArray = Array.isArray(assignee) ? assignee : assignee.split(",");
    filter.assignees = { $in: assigneesArray.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  if (dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dueDate === "overdue") {
      filter.dueDate = { $lt: today };
      if (!filter.status) {
        filter.status = { $ne: "Done" };
      } else if (filter.status.$in) {
        filter.status.$in = filter.status.$in.filter((s) => s !== "Done");
      }
    } else if (dueDate === "today") {
      filter.dueDate = { $gte: today, $lt: tomorrow };
    } else if (dueDate === "this_week") {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7 - nextWeek.getDay());
      filter.dueDate = { $gte: today, $lt: nextWeek };
    } else if (dueDate === "custom" && dueDateStart && dueDateEnd) {
      filter.dueDate = {
        $gte: new Date(dueDateStart),
        $lte: new Date(dueDateEnd),
      };
    }
  }

  const sortDir = sortOrder === "asc" ? 1 : -1;
  let tasks;
  let total;

  const parsedPage = Math.max(1, parseInt(page));
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit))); // Enforce limit 100 max

  if (sortBy === "priority") {
    const pipeline = [
      { $match: filter },
      {
        $addFields: {
          priorityWeight: {
            $switch: {
              branches: [
                { case: { $eq: ["$priority", "High"] }, then: 3 },
                { case: { $eq: ["$priority", "Medium"] }, then: 2 },
                { case: { $eq: ["$priority", "Low"] }, then: 1 },
              ],
              default: 0,
            },
          },
        },
      },
      { $sort: { priorityWeight: sortDir, createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: (parsedPage - 1) * parsedLimit }, { $limit: parsedLimit }],
        },
      },
    ];

    const results = await Task.aggregate(pipeline);
    total = results[0].metadata[0]?.total || 0;
    tasks = results[0].data;

    // Populate assignees
    tasks = await Task.populate(tasks, { path: "assignees", select: "name profilePicture" });
  } else {
    let sortOptions = {};
    sortOptions[sortBy] = sortDir;

    total = await Task.countDocuments(filter);
    tasks = await Task.find(filter)
      .populate("assignees", "name profilePicture")
      .sort(sortOptions)
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);
  }

  res.status(200).json({
    project,
    tasks,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    },
  });
});

// Paginated, filterable audit trail for a project: everything ActivityLog
// already records for the project itself and every task within it.
const getProjectActivity = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, action, userId } = req.query;
  const project = req.project;

  const resourceIds = [project._id, ...project.tasks];

  const filter = { resourceId: { $in: resourceIds } };
  if (action) filter.action = action;
  if (userId) filter.user = userId;

  const parsedPage = Math.max(1, parseInt(page));
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit)));

  const [total, activity] = await Promise.all([
    ActivityLog.countDocuments(filter),
    ActivityLog.find(filter)
      .populate("user", "name profilePicture")
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit),
  ]);

  res.status(200).json({
    activity,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    },
  });
});

export { createProject, getProjectDetails, getProjectTasks, getProjectActivity };
