import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../app.js";
import User from "../../models/user.js";
import Workspace from "../../models/workspace.js";
import Project from "../../models/project.js";
import { generateAccessToken } from "../../libs/token.js";

let manager, managerToken, project;
let taskId;

beforeAll(async () => {
  manager = await User.create({ name: "CRUD Manager", email: "crud-manager@example.com", password: "hashed", isEmailVerified: true });
  managerToken = generateAccessToken(manager._id);

  const workspace = await Workspace.create({
    name: "CRUD Test Workspace",
    owner: manager._id,
    members: [{ user: manager._id, role: "owner" }],
  });

  project = await Project.create({
    title: "CRUD Test Project",
    workspace: workspace._id,
    status: "Planning",
    startDate: new Date(),
    createdBy: manager._id,
    members: [{ user: manager._id, role: "manager" }],
  });
});

describe("Task CRUD lifecycle", () => {
  it("creates a task", async () => {
    const res = await request(app)
      .post(`/api-v1/tasks/${project._id}/create-task`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        title: "Write onboarding docs",
        description: "Initial draft",
        status: "To Do",
        priority: "Medium",
        dueDate: "2026-12-01",
        assignees: [manager._id.toString()],
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Write onboarding docs");
    taskId = res.body._id;
  });

  it("fetches the created task with its project", async () => {
    const res = await request(app)
      .get(`/api-v1/tasks/${taskId}`)
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.task._id).toBe(taskId);
    expect(res.body.project._id).toBe(project._id.toString());
  });

  it("updates the task title", async () => {
    const res = await request(app)
      .put(`/api-v1/tasks/${taskId}/title`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ title: "Write onboarding docs (v2)" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Write onboarding docs (v2)");
  });

  it("updates the task status", async () => {
    const res = await request(app)
      .put(`/api-v1/tasks/${taskId}/status`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ status: "In Progress" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("In Progress");
  });

  it("adds a subtask", async () => {
    const res = await request(app)
      .post(`/api-v1/tasks/${taskId}/add-subtask`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ title: "Draft outline" });

    expect(res.status).toBe(201);
    expect(res.body.subtasks).toHaveLength(1);
    expect(res.body.subtasks[0].title).toBe("Draft outline");
    expect(res.body.subtasks[0].completed).toBe(false);
  });

  it("adds a comment", async () => {
    const res = await request(app)
      .post(`/api-v1/tasks/${taskId}/add-comment`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ text: "Looks good so far" });

    expect(res.status).toBe(201);
    expect(res.body.text).toBe("Looks good so far");

    const commentsRes = await request(app)
      .get(`/api-v1/tasks/${taskId}/comments`)
      .set("Authorization", `Bearer ${managerToken}`);

    expect(commentsRes.status).toBe(200);
    expect(commentsRes.body).toHaveLength(1);
  });

  it("archives the task", async () => {
    const res = await request(app)
      .post(`/api-v1/tasks/${taskId}/archived`)
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.isArchived).toBe(true);
  });

  it("un-archives the task on a second toggle", async () => {
    const res = await request(app)
      .post(`/api-v1/tasks/${taskId}/archived`)
      .set("Authorization", `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.isArchived).toBe(false);
  });
});
