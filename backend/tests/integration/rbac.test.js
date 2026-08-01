import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app.js";
import User from "../../models/user.js";
import Workspace from "../../models/workspace.js";
import Project from "../../models/project.js";
import Task from "../../models/task.js";
import { generateAccessToken } from "../../libs/token.js";

let manager, contributor, viewer;
let managerToken, contributorToken, viewerToken;
let project;
let contributorTask; // assigned to the contributor
let unassignedTask; // assigned to the manager, not the contributor

beforeAll(async () => {
  manager = await User.create({ name: "Manager", email: "rbac-manager@example.com", password: "hashed", isEmailVerified: true });
  contributor = await User.create({ name: "Contributor", email: "rbac-contributor@example.com", password: "hashed", isEmailVerified: true });
  viewer = await User.create({ name: "Viewer", email: "rbac-viewer@example.com", password: "hashed", isEmailVerified: true });

  managerToken = generateAccessToken(manager._id);
  contributorToken = generateAccessToken(contributor._id);
  viewerToken = generateAccessToken(viewer._id);

  const workspace = await Workspace.create({
    name: "RBAC Test Workspace",
    owner: manager._id,
    members: [
      { user: manager._id, role: "owner" },
      { user: contributor._id, role: "member" },
      { user: viewer._id, role: "member" },
    ],
  });

  project = await Project.create({
    title: "RBAC Test Project",
    workspace: workspace._id,
    status: "Planning",
    startDate: new Date(),
    createdBy: manager._id,
    members: [
      { user: manager._id, role: "manager" },
      { user: contributor._id, role: "contributor" },
      { user: viewer._id, role: "viewer" },
    ],
  });

  contributorTask = await Task.create({
    title: "Assigned to contributor",
    project: project._id,
    createdBy: manager._id,
    assignees: [contributor._id],
  });

  unassignedTask = await Task.create({
    title: "Not assigned to contributor",
    project: project._id,
    createdBy: manager._id,
    assignees: [manager._id],
  });
});

describe("Project-level RBAC", () => {
  it("a viewer cannot create a task (403)", async () => {
    const res = await request(app)
      .post(`/api-v1/tasks/${project._id}/create-task`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ title: "Viewer attempt", status: "To Do", priority: "Medium", dueDate: "2026-12-01", assignees: [viewer._id.toString()] });

    expect(res.status).toBe(403);
  });

  it("a contributor can create a task", async () => {
    const res = await request(app)
      .post(`/api-v1/tasks/${project._id}/create-task`)
      .set("Authorization", `Bearer ${contributorToken}`)
      .send({ title: "Contributor attempt", status: "To Do", priority: "Medium", dueDate: "2026-12-01", assignees: [contributor._id.toString()] });

    expect(res.status).toBe(201);
  });

  it("a manager can create a task", async () => {
    const res = await request(app)
      .post(`/api-v1/tasks/${project._id}/create-task`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ title: "Manager attempt", status: "To Do", priority: "Medium", dueDate: "2026-12-01", assignees: [manager._id.toString()] });

    expect(res.status).toBe(201);
  });

  it("a contributor can update a task assigned to them", async () => {
    const res = await request(app)
      .put(`/api-v1/tasks/${contributorTask._id}/status`)
      .set("Authorization", `Bearer ${contributorToken}`)
      .send({ status: "In Progress" });

    expect(res.status).toBe(200);
  });

  it("a contributor CANNOT update a task not assigned to them (403)", async () => {
    const res = await request(app)
      .put(`/api-v1/tasks/${unassignedTask._id}/status`)
      .set("Authorization", `Bearer ${contributorToken}`)
      .send({ status: "In Progress" });

    expect(res.status).toBe(403);
  });

  it("a manager can update any task regardless of assignment", async () => {
    const res = await request(app)
      .put(`/api-v1/tasks/${unassignedTask._id}/status`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ status: "Done" });

    expect(res.status).toBe(200);
  });

  it("a viewer cannot update any task (403)", async () => {
    const res = await request(app)
      .put(`/api-v1/tasks/${unassignedTask._id}/status`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ status: "Done" });

    expect(res.status).toBe(403);
  });

  it("a viewer still has read-only access to view a task", async () => {
    const res = await request(app)
      .get(`/api-v1/tasks/${unassignedTask._id}`)
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
  });

  it("only a manager can archive a task, not a contributor", async () => {
    const contributorAttempt = await request(app)
      .post(`/api-v1/tasks/${contributorTask._id}/archived`)
      .set("Authorization", `Bearer ${contributorToken}`);
    expect(contributorAttempt.status).toBe(403);

    const managerAttempt = await request(app)
      .post(`/api-v1/tasks/${contributorTask._id}/archived`)
      .set("Authorization", `Bearer ${managerToken}`);
    expect(managerAttempt.status).toBe(200);
  });

  it("rejects anyone who isn't a project member at all", async () => {
    const outsider = await User.create({ name: "Outsider", email: "rbac-outsider@example.com", password: "hashed", isEmailVerified: true });
    const outsiderToken = generateAccessToken(outsider._id);

    const res = await request(app)
      .get(`/api-v1/tasks/${unassignedTask._id}`)
      .set("Authorization", `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
  });
});
