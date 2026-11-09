import { test, expect } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.DATABASE_PATH = join(
  mkdtempSync(join(tmpdir(), "trello-test-")),
  "test.sqlite",
);
const { handleApi } = await import("./server");
const call = (
  path: string,
  method = "GET",
  body?: unknown,
  cookie = "",
  origin?: string,
) =>
  handleApi(
    new Request("http://localhost/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        cookie,
        ...(origin ? { origin } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
test("account sessions, board lifecycle, persistence, validation and ownership", async () => {
  expect((await call("/boards")).status).toBe(401);
  expect(
    (await call("/auth/signup", "POST", { username: "x", password: "short" }))
      .status,
  ).toBe(400);
  const signup = await call("/auth/signup", "POST", {
    username: "alice",
    password: "test-pass-123",
  });
  expect(signup.status).toBe(200);
  const cookie = signup.headers.get("set-cookie")!.split(";")[0]!;
  expect(signup.headers.get("set-cookie")).toContain("HttpOnly");
  expect(
    (
      await call("/auth/signup", "POST", {
        username: "alice",
        password: "test-pass-123",
      })
    ).status,
  ).toBe(409);
  expect(
    (
      await call("/auth/signin", "POST", {
        username: "alice",
        password: "incorrect",
      })
    ).status,
  ).toBe(401);
  const login = await call("/auth/signin", "POST", {
    username: "alice",
    password: "test-pass-123",
  });
  expect(login.status).toBe(200);
  expect(
    (await (await call("/boards", "GET", undefined, cookie)).json()).boards,
  ).toHaveLength(1);
  expect((await call("/boards", "POST", { title: "" }, cookie)).status).toBe(
    400,
  );
  const created = await call(
    "/boards",
    "POST",
    { title: "Internship", color: "forest" },
    cookie,
  );
  expect(created.status).toBe(201);
  const { board } = await created.json();
  board.lists[0].cards.push({
    id: "card-1",
    title: "Build portfolio",
    description: "Ship a working demo",
    label: "Engineering",
    due: "2026-11-20",
    checklist: [{ id: "check-1", text: "Test it", done: true }],
    comments: [
      {
        id: "comment-1",
        text: "Ready to show",
        date: new Date().toISOString(),
      },
    ],
  });
  const competingSaves = await Promise.all([
    call("/boards/" + board.id, "PUT", board, cookie),
    call("/boards/" + board.id, "PUT", board, cookie),
  ]);
  expect(competingSaves.map((response) => response.status).sort()).toEqual([
    200, 409,
  ]);
  expect((await call("/boards/" + board.id, "PUT", board, cookie)).status).toBe(
    409,
  );
  const persisted = (
    await (await call("/boards", "GET", undefined, cookie)).json()
  ).boards.find((b: any) => b.id === board.id);
  expect(persisted.lists[0].cards[0].checklist[0].done).toBe(true);
  expect(persisted.version).toBe(2);
  expect(
    (
      await call(
        "/boards/" + board.id,
        "PUT",
        { ...persisted, lists: "invalid" },
        cookie,
      )
    ).status,
  ).toBe(400);
  const other = await call("/auth/signup", "POST", {
    username: "bob",
    password: "test-pass-123",
  });
  const otherCookie = other.headers.get("set-cookie")!.split(";")[0]!;
  expect(
    (await call("/boards/" + board.id, "DELETE", undefined, otherCookie))
      .status,
  ).toBe(404);
  expect(
    (await call("/boards/" + board.id, "PUT", persisted, otherCookie)).status,
  ).toBe(404);
  expect(
    (
      await call(
        "/boards",
        "POST",
        { title: "CSRF" },
        cookie,
        "http://evil.test",
      )
    ).status,
  ).toBe(403);
  expect(
    (await call("/boards/" + board.id, "DELETE", undefined, cookie)).status,
  ).toBe(200);
  expect(
    (await call("/boards/" + board.id, "DELETE", undefined, cookie)).status,
  ).toBe(404);
  expect((await call("/auth/signout", "POST", undefined, cookie)).status).toBe(
    200,
  );
  expect((await call("/boards", "GET", undefined, cookie)).status).toBe(401);
});
