import AppError from "../libs/app-error.js";
import asyncHandler from "../libs/async-handler.js";
import Workspace from "../models/workspace.js";
import WorkspaceInvite from "../models/workspace-invite.js";
import Project from "../models/project.js";
import jwt from "jsonwebtoken";
import { queueEmail } from "../queues/email-queue.js";
import User from "../models/user.js";
import { recordActivity } from "../libs/index.js";
import { getOrSetCache, workspaceStatsCacheKey } from "../libs/cache.js";

const createWorkspace = asyncHandler(async (req, res) => {
  const { name, description, color } = req.body;

  const workspace = await Workspace.create({
    name,
    description,
    color,
    owner: req.user._id,
    members: [
      {
        user: req.user._id,
        role: "owner",
        joinedAt: new Date(),
      },
    ],
  });

  res.status(201).json(workspace);
});

const getWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await Workspace.find({
    "members.user": req.user._id,
  }).sort({ createdAt: -1 });

  res.status(200).json(workspaces);
});

const getWorkspaceDetails = asyncHandler(async (req, res) => {
  const workspace = await req.workspace.populate(
    "members.user",
    "name email profilePicture"
  );

  res.status(200).json(workspace);
});

const getWorkspaceInviteInfo = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;

  const workspace = await Workspace.findById(workspaceId).select(
    "name description color"
  );

  if (!workspace) {
    throw new AppError("Workspace not found", 404);
  }

  res.status(200).json(workspace);
});

const getWorkspaceProjects = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;

  const workspace = await req.workspace.populate(
    "members.user",
    "name email profilePicture"
  );

  const projects = await Project.find({
    workspace: workspaceId,
    isArchived: false,
    members: { $elemMatch: { user: req.user._id } },
  })
    .populate("tasks", "status")
    .sort({ createdAt: -1 });

  res.status(200).json({ projects, workspace });
});

const WORKSPACE_STATS_CACHE_TTL_SECONDS = 60;

const getWorkspaceStats = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;

  const payload = await getOrSetCache(
    workspaceStatsCacheKey(workspaceId),
    WORKSPACE_STATS_CACHE_TTL_SECONDS,
    async () => {
      const [totalProjects, projects] = await Promise.all([
        Project.countDocuments({ workspace: workspaceId }),
        Project.find({ workspace: workspaceId })
          .populate(
            "tasks",
            "title status dueDate project updatedAt isArchived priority"
          )
          .sort({ createdAt: -1 }),
      ]);

      const totalTasks = projects.reduce((acc, project) => {
        return acc + project.tasks.length;
      }, 0);

      const totalProjectInProgress = projects.filter(
        (project) => project.status === "In Progress"
      ).length;

      const totalTaskCompleted = projects.reduce((acc, project) => {
        return (
          acc + project.tasks.filter((task) => task.status === "Done").length
        );
      }, 0);

      const totalTaskToDo = projects.reduce((acc, project) => {
        return (
          acc + project.tasks.filter((task) => task.status === "To Do").length
        );
      }, 0);

      const totalTaskInProgress = projects.reduce((acc, project) => {
        return (
          acc +
          project.tasks.filter((task) => task.status === "In Progress").length
        );
      }, 0);

      const tasks = projects.flatMap((project) => project.tasks);

      // get upcoming task in next 7 days

      const upcomingTasks = tasks.filter((task) => {
        const taskDate = new Date(task.dueDate);
        const today = new Date();
        return (
          taskDate > today &&
          taskDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        );
      });

      const taskTrendsData = [
        { name: "Sun", completed: 0, inProgress: 0, toDo: 0 },
        { name: "Mon", completed: 0, inProgress: 0, toDo: 0 },
        { name: "Tue", completed: 0, inProgress: 0, toDo: 0 },
        { name: "Wed", completed: 0, inProgress: 0, toDo: 0 },
        { name: "Thu", completed: 0, inProgress: 0, toDo: 0 },
        { name: "Fri", completed: 0, inProgress: 0, toDo: 0 },
        { name: "Sat", completed: 0, inProgress: 0, toDo: 0 },
      ];

      // get last 7 days tasks date
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date;
      }).reverse();

      // populate

      for (const project of projects) {
        for (const task of project.tasks) {
          const taskDate = new Date(task.updatedAt);

          const dayInDate = last7Days.findIndex(
            (date) =>
              date.getDate() === taskDate.getDate() &&
              date.getMonth() === taskDate.getMonth() &&
              date.getFullYear() === taskDate.getFullYear()
          );

          if (dayInDate !== -1) {
            const dayName = last7Days[dayInDate].toLocaleDateString("en-US", {
              weekday: "short",
            });

            const dayData = taskTrendsData.find((day) => day.name === dayName);

            if (dayData) {
              switch (task.status) {
                case "Done":
                  dayData.completed++;
                  break;
                case "In Progress":
                  dayData.inProgress++;
                  break;
                case "To Do":
                  dayData.toDo++;
                  break;
              }
            }
          }
        }
      }

      // get project status distribution
      const projectStatusData = [
        { name: "Completed", value: 0, color: "#10b981" },
        { name: "In Progress", value: 0, color: "#3b82f6" },
        { name: "Planning", value: 0, color: "#f59e0b" },
      ];

      for (const project of projects) {
        switch (project.status) {
          case "Completed":
            projectStatusData[0].value++;
            break;
          case "In Progress":
            projectStatusData[1].value++;
            break;
          case "Planning":
            projectStatusData[2].value++;
            break;
        }
      }

      // Task priority distribution
      const taskPriorityData = [
        { name: "High", value: 0, color: "#ef4444" },
        { name: "Medium", value: 0, color: "#f59e0b" },
        { name: "Low", value: 0, color: "#6b7280" },
      ];

      for (const task of tasks) {
        switch (task.priority) {
          case "High":
            taskPriorityData[0].value++;
            break;
          case "Medium":
            taskPriorityData[1].value++;
            break;
          case "Low":
            taskPriorityData[2].value++;
            break;
        }
      }

      const workspaceProductivityData = [];

      for (const project of projects) {
        const projectTask = tasks.filter(
          (task) => task.project.toString() === project._id.toString()
        );

        const completedTask = projectTask.filter(
          (task) => task.status === "Done" && task.isArchived === false
        );

        workspaceProductivityData.push({
          name: project.title,
          completed: completedTask.length,
          total: projectTask.length,
        });
      }

      const stats = {
        totalProjects,
        totalTasks,
        totalProjectInProgress,
        totalTaskCompleted,
        totalTaskToDo,
        totalTaskInProgress,
      };

      return {
        stats,
        taskTrendsData,
        projectStatusData,
        taskPriorityData,
        workspaceProductivityData,
        upcomingTasks,
        recentProjects: projects.slice(0, 5),
      };
    }
  );

  res.status(200).json(payload);
});

const inviteUserToWorkspace = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { email, role } = req.body;

  const workspace = req.workspace;

  const existingUser = await User.findOne({ email });

  if (!existingUser) {
    throw new AppError("User not found", 400);
  }

  const isMember = workspace.members.some(
    (member) => member.user.toString() === existingUser._id.toString()
  );

  if (isMember) {
    throw new AppError("User already a member of this workspace", 400);
  }

  const isInvited = await WorkspaceInvite.findOne({
    user: existingUser._id,
    workspaceId: workspaceId,
  });

  if (isInvited && isInvited.expiresAt > new Date()) {
    throw new AppError("User already invited to this workspace", 400);
  }

  if (isInvited && isInvited.expiresAt < new Date()) {
    await WorkspaceInvite.deleteOne({ _id: isInvited._id });
  }

  const inviteToken = jwt.sign(
    {
      user: existingUser._id,
      workspaceId: workspaceId,
      role: role || "member",
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  await WorkspaceInvite.create({
    user: existingUser._id,
    workspaceId: workspaceId,
    token: inviteToken,
    role: role || "member",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const invitationLink = `${process.env.FRONTEND_URL}/workspace-invite/${workspace._id}?tk=${inviteToken}`;

  const emailContent = `
      <p>You have been invited to join ${workspace.name} workspace</p>
      <p>Click here to join: <a href="${invitationLink}">${invitationLink}</a></p>
    `;

  await queueEmail(
    email,
    "You have been invited to join a workspace",
    emailContent
  );

  res.status(200).json({
    message: "Invitation sent successfully",
  });
});

const acceptGenerateInvite = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;

  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    throw new AppError("Workspace not found", 404);
  }

  const isMember = workspace.members.some(
    (member) => member.user.toString() === req.user._id.toString()
  );

  if (isMember) {
    throw new AppError("You are already a member of this workspace", 400);
  }

  workspace.members.push({
    user: req.user._id,
    role: "member",
    joinedAt: new Date(),
  });

  await workspace.save();

  await recordActivity(
    req.user._id,
    "joined_workspace",
    "Workspace",
    workspaceId,
    {
      description: `Joined ${workspace.name} workspace`,
    }
  );

  res.status(200).json({
    message: "Invitation accepted successfully",
  });
});

const acceptInviteByToken = asyncHandler(async (req, res) => {
  const { token } = req.body;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const { user, workspaceId, role } = decoded;

  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    throw new AppError("Workspace not found", 404);
  }

  const isMember = workspace.members.some(
    (member) => member.user.toString() === user.toString()
  );

  if (isMember) {
    throw new AppError("User already a member of this workspace", 400);
  }

  const inviteInfo = await WorkspaceInvite.findOne({
    user: user,
    workspaceId: workspaceId,
  });

  if (!inviteInfo) {
    throw new AppError("Invitation not found", 404);
  }

  if (inviteInfo.expiresAt < new Date()) {
    throw new AppError("Invitation has expired", 400);
  }

  workspace.members.push({
    user: user,
    role: role || "member",
    joinedAt: new Date(),
  });

  await workspace.save();

  await Promise.all([
    WorkspaceInvite.deleteOne({ _id: inviteInfo._id }),
    recordActivity(user, "joined_workspace", "Workspace", workspaceId, {
      description: `Joined ${workspace.name} workspace`,
    }),
  ]);

  res.status(200).json({
    message: "Invitation accepted successfully",
  });
});

export {
  createWorkspace,
  getWorkspaces,
  getWorkspaceDetails,
  getWorkspaceInviteInfo,
  getWorkspaceProjects,
  getWorkspaceStats,
  inviteUserToWorkspace,
  acceptInviteByToken,
  acceptGenerateInvite,
};
