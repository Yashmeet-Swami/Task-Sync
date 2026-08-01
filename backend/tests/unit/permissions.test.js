import { describe, it, expect } from "vitest";
import {
  hasWorkspacePermission,
  hasProjectPermission,
  WORKSPACE_ROLES,
  PROJECT_ROLES,
  WORKSPACE_PERMISSIONS,
  PROJECT_PERMISSIONS,
} from "../../libs/permissions.js";

describe("hasWorkspacePermission", () => {
  it("grants the owner every workspace permission", () => {
    for (const permission of Object.values(WORKSPACE_PERMISSIONS)) {
      expect(hasWorkspacePermission(WORKSPACE_ROLES.OWNER, permission)).toBe(true);
    }
  });

  it("only lets a viewer view the workspace", () => {
    expect(hasWorkspacePermission(WORKSPACE_ROLES.VIEWER, WORKSPACE_PERMISSIONS.VIEW_WORKSPACE)).toBe(true);
    expect(hasWorkspacePermission(WORKSPACE_ROLES.VIEWER, WORKSPACE_PERMISSIONS.EDIT_WORKSPACE)).toBe(false);
    expect(hasWorkspacePermission(WORKSPACE_ROLES.VIEWER, WORKSPACE_PERMISSIONS.INVITE_MEMBER)).toBe(false);
  });

  it("does not let a member invite other members (admin/owner only)", () => {
    expect(hasWorkspacePermission(WORKSPACE_ROLES.MEMBER, WORKSPACE_PERMISSIONS.INVITE_MEMBER)).toBe(false);
    expect(hasWorkspacePermission(WORKSPACE_ROLES.ADMIN, WORKSPACE_PERMISSIONS.INVITE_MEMBER)).toBe(true);
  });

  it("returns false for an unrecognized role rather than throwing", () => {
    expect(hasWorkspacePermission("not-a-real-role", WORKSPACE_PERMISSIONS.VIEW_WORKSPACE)).toBe(false);
  });
});

describe("hasProjectPermission", () => {
  it("lets a manager update any task, but a contributor only their assigned ones", () => {
    expect(hasProjectPermission(PROJECT_ROLES.MANAGER, PROJECT_PERMISSIONS.UPDATE_ANY_TASK)).toBe(true);
    expect(hasProjectPermission(PROJECT_ROLES.CONTRIBUTOR, PROJECT_PERMISSIONS.UPDATE_ANY_TASK)).toBe(false);
    expect(hasProjectPermission(PROJECT_ROLES.CONTRIBUTOR, PROJECT_PERMISSIONS.UPDATE_ASSIGNED_TASK)).toBe(true);
  });

  it("only lets a manager assign task members or archive/delete tasks", () => {
    expect(hasProjectPermission(PROJECT_ROLES.MANAGER, PROJECT_PERMISSIONS.ASSIGN_TASK_MEMBERS)).toBe(true);
    expect(hasProjectPermission(PROJECT_ROLES.CONTRIBUTOR, PROJECT_PERMISSIONS.ASSIGN_TASK_MEMBERS)).toBe(false);
    expect(hasProjectPermission(PROJECT_ROLES.VIEWER, PROJECT_PERMISSIONS.ASSIGN_TASK_MEMBERS)).toBe(false);

    expect(hasProjectPermission(PROJECT_ROLES.MANAGER, PROJECT_PERMISSIONS.ARCHIVE_TASK)).toBe(true);
    expect(hasProjectPermission(PROJECT_ROLES.CONTRIBUTOR, PROJECT_PERMISSIONS.ARCHIVE_TASK)).toBe(false);
  });

  it("gives every role (including viewer) read access to the project", () => {
    for (const role of Object.values(PROJECT_ROLES)) {
      expect(hasProjectPermission(role, PROJECT_PERMISSIONS.VIEW_PROJECT)).toBe(true);
    }
  });

  it("a viewer can neither create nor comment on tasks", () => {
    expect(hasProjectPermission(PROJECT_ROLES.VIEWER, PROJECT_PERMISSIONS.CREATE_TASK)).toBe(false);
    expect(hasProjectPermission(PROJECT_ROLES.VIEWER, PROJECT_PERMISSIONS.COMMENT_TASK)).toBe(false);
  });
});
