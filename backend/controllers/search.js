import asyncHandler from "../libs/async-handler.js";
import Project from "../models/project.js";
import Task from "../models/task.js";

// Global search, scoped to only the projects the requesting user is actually a member
// of - the same visibility boundary enforced everywhere else (see task-permission.js /
// project-permission.js), so search can't be used to peek at tasks/projects a user
// wouldn't otherwise be authorized to view.
const search = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || !q.trim()) {
    return res.status(200).json({ projects: [], tasks: [] });
  }

  const memberProjects = await Project.find({
    members: { $elemMatch: { user: req.user._id } },
  }).select("_id");

  const projectIds = memberProjects.map((project) => project._id);

  const [projects, tasks] = await Promise.all([
    Project.find({
      _id: { $in: projectIds },
      $text: { $search: q },
    })
      .select("title description workspace status")
      .limit(10),
    Task.find({
      project: { $in: projectIds },
      $text: { $search: q },
    })
      .select("title status priority project")
      .populate("project", "title workspace")
      .limit(10),
  ]);

  res.status(200).json({ projects, tasks });
});

export { search };
