import { test, expect, type APIRequestContext } from "@playwright/test";

// 127.0.0.1, not localhost: Node's resolver can try ::1 first and stall for
// several seconds before falling back to IPv4, where Docker's port mapping listens.
const MAILPIT_URL = "http://127.0.0.1:8025";

const findVerificationEmail = async (request: APIRequestContext, toEmail: string) => {
  for (let attempt = 0; attempt < 20; attempt++) {
    const res = await request.get(`${MAILPIT_URL}/api/v1/messages?limit=25`);
    const body = await res.json();
    const match = body.messages.find((m: any) => m.To[0]?.Address === toEmail);
    if (match) return match.ID;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No verification email arrived for ${toEmail} within timeout`);
};

const extractTokenFromEmail = async (request: APIRequestContext, messageId: string) => {
  const res = await request.get(`${MAILPIT_URL}/api/v1/message/${messageId}`);
  const body = await res.json();
  const html = body.HTML || body.Text;
  const match = html.match(/token=([^"&\s]+)/);
  if (!match) throw new Error("Could not find a token in the verification email");
  return match[1];
};

test("golden path: sign up, verify, log in, create workspace/project/task, log out", async ({
  page,
  request,
}) => {
  const stamp = Date.now();
  // A domain with real MX records - Arcjet's validateEmail rule denies domains
  // (like example.com) that have none, regardless of how "obviously a test" it looks.
  const email = `tasksync.e2e.${stamp}@gmail.com`;
  const password = "TestPass123!";
  const name = "E2E Test User";
  const workspaceName = `E2E Workspace ${stamp}`;
  const projectTitle = `E2E Project ${stamp}`;
  const taskTitle = `E2E Task ${stamp}`;
  // Computed inside the browser context, not Node's - react-day-picker sets the
  // `data-day` attribute via the browser's own toLocaleDateString(), which can format
  // differently than Node's default locale on the same machine.
  const todayDataDay = await page.evaluate(() => new Date().toLocaleDateString());

  await test.step("sign up", async () => {
    await page.goto("/sign-up");
    await page.getByPlaceholder("John Doe").fill(name);
    await page.getByPlaceholder("email@example.com").fill(email);
    await page.getByPlaceholder("••••••••").first().fill(password);
    await page.getByPlaceholder("••••••••").nth(1).fill(password);
    await page.getByRole("button", { name: "Sign Up" }).click();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  await test.step("verify email via Mailpit", async () => {
    const messageId = await findVerificationEmail(request, email);
    const token = await extractTokenFromEmail(request, messageId);

    await page.goto(`/verify-email?token=${token}`);
    await expect(page.getByText("Email Verified")).toBeVisible();
  });

  await test.step("log in", async () => {
    await page.goto("/sign-in");
    await page.getByPlaceholder("user@gmail.com").fill(email);
    await page.getByPlaceholder("••••••••").fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  await test.step("create a workspace", async () => {
    await page.goto("/workspaces");
    await page.getByRole("button", { name: "New Workspace" }).click();
    await page.getByPlaceholder("Workspace Name").fill(workspaceName);
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/\/workspaces\/[a-f0-9]+$/);
    await expect(page.getByText(workspaceName)).toBeVisible();
  });

  await test.step("create a project (and add myself as a manager)", async () => {
    // The empty-state "no projects yet" prompt renders its own "Create Project" CTA
    // in addition to the persistent header button - two matches before the dialog opens.
    await page.getByRole("button", { name: "Create Project" }).first().click();
    await page.getByPlaceholder("Project Title").fill(projectTitle);

    // Start date + due date - pick "today" on both calendar popovers. The popover
    // doesn't auto-close on day selection (no such handler wired in this component),
    // so it has to be dismissed explicitly before the next field can be interacted with.
    await page.getByRole("button", { name: "Pick a date" }).first().click();
    await page.locator(`[data-day="${todayDataDay}"]`).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Pick a date" }).first().click();
    await page.locator(`[data-day="${todayDataDay}"]`).click();
    await page.keyboard.press("Escape");

    // Add myself as a project member so I can create/manage tasks afterward.
    // The checkbox and name are sibling elements (not label-wrapped), so the
    // checkbox itself has to be the click target, scoped to its own row.
    await page.getByRole("button", { name: "Select Members" }).click();
    await page.locator("div.border.rounded", { hasText: name }).getByRole("checkbox").click();
    await page.getByRole("combobox").last().click();
    await page.getByRole("option", { name: "Manager" }).click();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Create Project" }).last().click();
    await expect(page.getByText(projectTitle)).toBeVisible();
  });

  await test.step("open the project and create a task", async () => {
    await page.getByText(projectTitle).click();
    await expect(page).toHaveURL(/\/projects\/[a-f0-9]+$/);

    await page.getByRole("button", { name: "Add Task" }).click();
    await page.getByPlaceholder("Enter task title").fill(taskTitle);

    await page.getByRole("button", { name: "Pick a date" }).click();
    await page.locator(`[data-day="${todayDataDay}"]`).click();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Select assignees" }).click();
    await page.locator("div.border.rounded", { hasText: name }).getByRole("checkbox").click();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Create Task" }).last().click();
    await expect(page.getByText(taskTitle)).toBeVisible();
  });

  await test.step("log out", async () => {
    // The project page also shows a member avatar with the same data-slot - the
    // header's own avatar is specifically the one wrapped in a clickable button.
    await page.getByRole("button", { name: "E", exact: true }).click();
    await page.getByRole("menuitem", { name: "Log Out" }).click();
    // dashboard-layout.tsx renders <Navigate to="/sign-in" /> once isAuthenticated flips false
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
