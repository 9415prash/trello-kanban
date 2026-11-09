import { test, expect } from "@playwright/test";
test("sign up, create a board, edit and move a card, refresh, search, delete", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("pageerror", error => browserErrors.push(error.message));
  const username = "demo_" + Date.now();
  await page.goto("/");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill("portfolio-test-123");
  await page.getByRole("button", { name: "Create your workspace" }).click();
  await expect(
    page.getByRole("heading", { name: `Good to see you, ${username}.` }),
  ).toBeVisible();
  const avatar = page.getByRole("img", { name: `Signed in as ${username}` });
  await avatar.hover();
  await expect.poll(() => avatar.evaluate((node) =>
    getComputedStyle(node, "::after").visibility,
  )).toBe("visible");
  await page
    .getByRole("button", { name: "Create board", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Board name")
    .fill("Internship project");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create board", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Internship project", exact: true }),
  ).toBeVisible();
  const todo = page
    .locator(".list")
    .filter({ has: page.getByLabel("List title: To do", { exact: true }) });
  await todo.getByRole("button", { name: "Add a card", exact: true }).click();
  await todo.getByLabel("New card title").fill("Prepare my portfolio");
  await todo.getByRole("button", { name: "Add card", exact: true }).click();
  await page
    .getByRole("button")
    .filter({ has: page.getByText("Prepare my portfolio", { exact: true }) })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("A project I can explain in interviews.");
  await dialog
    .getByRole("combobox", { name: "Label", exact: true })
    .selectOption("Engineering");
  await dialog.getByLabel("Due date").fill("2026-12-01");
  await dialog.getByLabel("Checklist item").fill("Write README");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await dialog.getByRole("checkbox").check();
  await dialog.getByLabel("New comment").fill("First working version");
  await dialog.getByRole("button", { name: "Post", exact: true }).click();
  await dialog.getByLabel("In list").selectOption({ label: "In progress" });
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await page.screenshot({
    path: "test-results/board-preview.png",
    fullPage: true,
  });
  const progress = page.locator(".list").filter({
    has: page.getByLabel("List title: In progress", { exact: true }),
  });
  await expect(
    progress.getByText("Prepare my portfolio", { exact: true }),
  ).toBeVisible();
  const card = progress.locator(".task-card").first();
  const done = page
    .locator(".list")
    .filter({ has: page.getByLabel("List title: Done", { exact: true }) });
  await card.dragTo(done);
  await expect(
    done.getByText("Prepare my portfolio", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Search cards", { exact: true }).fill("does not exist");
  await expect(page.locator(".task-card")).toHaveCount(0);
  await expect(page.getByText("No cards match these filters.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(done.getByText("Prepare my portfolio", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Board settings", exact: true })
    .click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete board", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: `Good to see you, ${username}.` }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});
test("mobile sign-in layout stays within the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
