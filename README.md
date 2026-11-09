# Trello-inspired task manager

A full-stack Kanban app built with React, TypeScript, Bun and SQLite. Create a private workspace, break a project into lists, and move cards from idea to done.

This portfolio project began with a Trello tutorial by Harikant Singh and grew into a working Kanban app with authenticated boards, persistent data, and automated tests.

## Run locally

Requires Bun 1.3.14 or later. From this folder:

```powershell
bun install
bun run dev
```

Open http://127.0.0.1:3000 and click **Create an account**. Use a username of 3–40 letters, numbers, underscores, periods or hyphens, and a password of at least 8 characters. Each new account gets an example Product launch board. There are no shared demo credentials.

No database service or API key is required. SQLite creates `apps/frontend/my-app/data/trello.sqlite` automatically. Accounts and boards survive refreshes and server restarts. Keep that directory if you want to retain your data; it is excluded from Git.

If port 3000 is occupied:

```powershell
$env:PORT = '3005'
bun run dev
```

## Features

- Signup, login and logout with Argon2 password hashing and seven-day, server-side sessions in HttpOnly cookies.
- Private boards with ownership enforced by the API.
- Create, rename, star, recolor and delete boards.
- Create, rename and delete lists.
- Add, edit, delete, reorder and drag cards between lists.
- Card descriptions, labels, due dates, checklists and activity notes.
- Move cards through a list selector, including on touch devices and with a keyboard.
- Search boards or cards and filter cards by label.
- Responsive layouts, keyboard focus indicators and native modal dialogs.
- Server persistence, input validation, same-origin request checks and version checks to reject stale saves from another tab.

Card editor changes are saved with **Save changes**. Posting a note or adding a checklist item stages it in the editor until you save. Deleting a board or list requires confirmation. An API error keeps the original saved board and offers a reload action.

## Validate

```powershell
bun run check-types
bun run build
bun test
bun x playwright install chromium
bun run test:e2e
```

API tests use an isolated temporary SQLite database, never your working database. Browser tests run on port 3100 with an isolated database under `.test-data/`. They exercise signup, board creation, card details, checklist, notes, moving cards, drag-and-drop, persistence, search, deletion, logout and a mobile viewport.

To run without development hot reload:

```powershell
bun run start
```

`build` checks browser asset bundling; `start` runs the full Bun application, which serves the HTML entry and API together. A static-only host cannot run the API. A hosted demo needs a Bun-capable server and a persistent writable disk. Set `HOST=0.0.0.0` for container hosting, `PORT` for its assigned port and `DATABASE_PATH` to a persistent SQLite file. Use HTTPS for a public deployment; session cookies are marked Secure on HTTPS requests.

## Structure and architecture

```text
apps/frontend/my-app/src/
  App.tsx          Workspace, board UI, card editor and account screens
  index.css        Responsive interface styles
  frontend.tsx     React entry
  index.ts         Bun HTTP server (HTML + same-origin API)
  server.ts        Authentication, authorization, SQLite and board API
  server.test.ts   Isolated API integration tests
tests/app.spec.ts  End-to-end browser workflows
```

The runnable app deliberately uses the existing Bun/React frontend as a full-stack application. Serving the UI and API on the same origin avoids a separate CORS setup. Boards are stored as JSON documents in SQLite, so moving a card and updating list order are a single write. Each document has a version; a stale write returns HTTP 409 rather than silently replacing newer work.

The original `apps/backend`, `apps/websockets`, and `packages/db` directories remain as tutorial prototypes for reference. They are not used by the runnable app or the root development command. The original PostgreSQL/Prisma schema is not migrated to SQLite and existing PostgreSQL data is not imported. There were no working board endpoints in the original backend. React Router is not required for the completed UI; browser history handles the dashboard and `/board/:id` links.

## API

| Method | Endpoint            | Purpose                                     |
| ------ | ------------------- | ------------------------------------------- |
| POST   | `/api/auth/signup`  | Create an account and session               |
| POST   | `/api/auth/signin`  | Create a session                            |
| GET    | `/api/auth/me`      | Current user                                |
| POST   | `/api/auth/signout` | Revoke session                              |
| GET    | `/api/boards`       | List the current user's boards              |
| POST   | `/api/boards`       | Create a board                              |
| PUT    | `/api/boards/:id`   | Validate and save a complete board document |
| DELETE | `/api/boards/:id`   | Delete an owned board                       |

All board endpoints require a session. Save requests include the current document `version`; the server increments it. Errors use `{ "error": "..." }` and appropriate HTTP statuses.

## Portfolio and interview guide

Suggested resume bullet (use only once you can explain the code):

> Built a full-stack Kanban task manager using React, TypeScript, Bun and SQLite, implementing session authentication, private board CRUD, drag-and-drop cards, checklists and automated API/browser tests.

For a two-minute demo: create an account, open the example board, add a card, set a label and checklist, drag it into another list, then refresh to show persistence. Explain how ownership checks protect boards and how document versions prevent stale updates.

Useful tradeoffs to discuss: SQLite makes a local demo easy; PostgreSQL would suit multiple app instances. Document storage simplifies atomic board saves but rewrites the board for each edit. This version is a personal task manager: team invitations, shared workspaces, live collaboration, file attachments, email reset and production abuse controls are future work. The old WebSocket presence prototype is not connected to this version.

