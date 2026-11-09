import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
const filename =
  process.env.DATABASE_PATH ||
  resolve(import.meta.dir, "../data/trello.sqlite");
mkdirSync(dirname(filename), { recursive: true });
const db = new Database(filename, { create: true });
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS boards (id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), data TEXT NOT NULL);`);
export type Card = {
  id: string;
  title: string;
  description: string;
  label: string;
  due: string;
  checklist: { id: string; text: string; done: boolean }[];
  comments: { id: string; text: string; date: string }[];
};
export type List = { id: string; title: string; cards: Card[] };
export type Board = {
  id: string;
  title: string;
  description: string;
  color: string;
  starred: boolean;
  lists: List[];
  updated: string;
  version: number;
};
const id = () => crypto.randomUUID();
const json = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) => Response.json(data, { status, headers });
function seed(): Board {
  const card = (title: string, label: string, description = ""): Card => ({
    id: id(),
    title,
    label,
    description,
    due: "",
    checklist: [],
    comments: [],
  });
  return {
    id: id(),
    title: "Product launch",
    description: "A little planning. A lot of possibility.",
    color: "ocean",
    starred: true,
    updated: new Date().toISOString(),
    version: 1,
    lists: [
      {
        id: id(),
        title: "Ideas",
        cards: [
          card(
            "Explore what our users really need",
            "Research",
            "Talk to five people and collect their biggest pain points.",
          ),
          card("Collect design inspiration", "Design"),
          card("Write our product story", "Marketing"),
        ],
      },
      {
        id: id(),
        title: "To do",
        cards: [
          card(
            "Design the onboarding experience",
            "Design",
            "Make the first five minutes feel effortless.",
          ),
          card("Build the landing page", "Engineering"),
        ],
      },
      {
        id: id(),
        title: "In progress",
        cards: [
          card(
            "Bring the board to life",
            "Engineering",
            "Try dragging this card into another list.",
          ),
          card("Create a launch checklist", "Marketing"),
        ],
      },
      {
        id: id(),
        title: "Done",
        cards: [
          card("Find a name we love", "Design"),
          card("Kick off the project", "Research"),
        ],
      },
    ],
  };
}
function validBoard(b: any): b is Board {
  return (
    b &&
    typeof b.title === "string" &&
    b.title.trim().length > 0 &&
    b.title.length <= 120 &&
    typeof b.description === "string" &&
    b.description.length <= 10000 &&
    ["ocean", "forest", "sunset", "violet"].includes(b.color) &&
    typeof b.starred === "boolean" &&
    Array.isArray(b.lists) &&
    b.lists.length <= 100 &&
    b.lists.every(
      (l: any) =>
        l &&
        typeof l.id === "string" &&
        typeof l.title === "string" &&
        l.title.trim() &&
        l.title.length <= 120 &&
        Array.isArray(l.cards) &&
        l.cards.length <= 1000 &&
        l.cards.every(
          (c: any) =>
            c &&
            typeof c.id === "string" &&
            typeof c.title === "string" &&
            c.title.trim() &&
            c.title.length <= 300 &&
            typeof c.description === "string" &&
            c.description.length <= 20000 &&
            typeof c.label === "string" &&
            typeof c.due === "string" &&
            Array.isArray(c.checklist) &&
            c.checklist.length <= 200 &&
            c.checklist.every(
              (t: any) =>
                t &&
                typeof t.id === "string" &&
                typeof t.text === "string" &&
                t.text.length <= 1000 &&
                typeof t.done === "boolean",
            ) &&
            Array.isArray(c.comments) &&
            c.comments.length <= 500 &&
            c.comments.every(
              (t: any) =>
                t &&
                typeof t.id === "string" &&
                typeof t.text === "string" &&
                t.text.length <= 5000 &&
                typeof t.date === "string",
            ),
        ),
    )
  );
}
export async function handleApi(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url),
      path = url.pathname;
    if (req.headers.get("origin") && req.headers.get("origin") !== url.origin)
      return json({ error: "Origin not allowed." }, 403);
    if (Number(req.headers.get("content-length") || 0) > 2_000_000)
      return json({ error: "Request too large." }, 413);
    const token = req.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)session=([^;]+)/)?.[1];
    const user = token
      ? (db
          .query(
            "SELECT users.id, users.username FROM sessions JOIN users ON users.id=sessions.userId WHERE token=? AND expires>?",
          )
          .get(token, Date.now()) as { id: string; username: string } | null)
      : null;
    if (path === "/api/auth/signup" || path === "/api/auth/signin") {
      if (req.method !== "POST")
        return json({ error: "Method not allowed." }, 405);
      const body = await req.json();
      const username =
        typeof body.username === "string"
          ? body.username.trim().toLowerCase()
          : "";
      if (
        !/^[a-z0-9_.-]{3,40}$/.test(username) ||
        typeof body.password !== "string" ||
        body.password.length < 8 ||
        body.password.length > 128
      )
        return json(
          {
            error:
              "Use a 3–40 character username and an 8–128 character password.",
          },
          400,
        );
      let account = db
        .query("SELECT * FROM users WHERE username=?")
        .get(username) as {
        id: string;
        username: string;
        password: string;
      } | null;
      if (path.endsWith("signup")) {
        if (account)
          return json({ error: "That username is already taken." }, 409);
        const hash = await Bun.password.hash(body.password);
        account = { id: id(), username, password: hash };
        const board = seed();
        db.transaction(() => {
          db.query("INSERT INTO users VALUES (?,?,?)").run(
            account!.id,
            username,
            hash,
          );
          db.query("INSERT INTO boards VALUES (?,?,?)").run(
            board.id,
            account!.id,
            JSON.stringify(board),
          );
        })();
      } else if (
        !account ||
        !(await Bun.password.verify(body.password, account.password))
      )
        return json({ error: "Invalid username or password." }, 401);
      const session = crypto.randomUUID() + crypto.randomUUID();
      db.query("DELETE FROM sessions WHERE expires<?").run(Date.now());
      db.query("INSERT INTO sessions VALUES (?,?,?)").run(
        session,
        account.id,
        Date.now() + 604800000,
      );
      return json({ user: { id: account.id, username } }, 200, {
        "Set-Cookie": `session=${session}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${url.protocol === "https:" ? "; Secure" : ""}`,
      });
    }
    if (!user) return json({ error: "Please sign in." }, 401);
    if (path === "/api/auth/me") return json({ user });
    if (path === "/api/auth/signout" && req.method === "POST") {
      db.query("DELETE FROM sessions WHERE token=?").run(token!);
      return json({ ok: true }, 200, {
        "Set-Cookie": "session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
      });
    }
    if (path === "/api/boards" && req.method === "GET")
      return json({
        boards: (
          db.query("SELECT data FROM boards WHERE userId=?").all(user.id) as {
            data: string;
          }[]
        ).map((row) => JSON.parse(row.data)),
      });
    if (path === "/api/boards" && req.method === "POST") {
      const body = await req.json();
      if (
        typeof body.title !== "string" ||
        !body.title.trim() ||
        body.title.length > 120
      )
        return json(
          { error: "Board title is required (120 characters maximum)." },
          400,
        );
      const board: Board = {
        id: id(),
        title: body.title.trim(),
        description: "",
        color: ["ocean", "forest", "sunset", "violet"].includes(body.color)
          ? body.color
          : "ocean",
        starred: false,
        lists: ["To do", "In progress", "Done"].map((title) => ({
          id: id(),
          title,
          cards: [],
        })),
        updated: new Date().toISOString(),
        version: 1,
      };
      db.query("INSERT INTO boards VALUES (?,?,?)").run(
        board.id,
        user.id,
        JSON.stringify(board),
      );
      return json({ board }, 201);
    }
    const match = path.match(/^\/api\/boards\/([^/]+)$/);
    if (match) {
      const row = db
        .query("SELECT data FROM boards WHERE id=? AND userId=?")
        .get(match[1]!, user.id) as { data: string } | null;
      if (!row) return json({ error: "Board not found." }, 404);
      if (req.method === "DELETE") {
        db.query("DELETE FROM boards WHERE id=? AND userId=?").run(
          match[1]!,
          user.id,
        );
        return json({ ok: true });
      }
      if (req.method === "PUT") {
        const board = await req.json();
        if (!validBoard(board))
          return json({ error: "Invalid board data." }, 400);
        const current = JSON.parse(row.data) as Board;
        const conflict = () =>
          json(
            {
              error:
                "This board changed in another tab. Reload boards to try again.",
            },
            409,
          );
        if (board.version !== current.version) return conflict();
        board.id = match[1]!;
        board.version = current.version + 1;
        board.updated = new Date().toISOString();
        const result = db
          .query("UPDATE boards SET data=? WHERE id=? AND userId=? AND data=?")
          .run(JSON.stringify(board), board.id, user.id, row.data);
        if (result.changes === 0) return conflict();
        return json({ board });
      }
    }
    return json({ error: "Endpoint not found." }, 404);
  } catch (error) {
    console.error(error);
    return json(
      {
        error:
          error instanceof SyntaxError
            ? "Invalid JSON."
            : "Unable to process request.",
      },
      error instanceof SyntaxError ? 400 : 500,
    );
  }
}
