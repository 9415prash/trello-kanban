import "./index.css";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { Board, Card, List } from "./server";
const uid = () => crypto.randomUUID();
const labels = ["Design", "Engineering", "Research", "Marketing"];
async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch("/api" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    board: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="M8 7v10M16 7v6" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    star: (
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    arrow: <path d="m9 5 7 7-7 7" />,
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    text: <path d="M4 6h16M4 10h16M4 14h10M4 18h7" />,
    trash: (
      <>
        <path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    chat: (
      <path d="M21 11a8 8 0 0 1-8 8H7l-4 3V7a4 4 0 0 1 4-4h6a8 8 0 0 1 8 8Z" />
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.board}
    </svg>
  );
}
function Modal({
  title,
  children,
  close,
  error,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  error?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button hint hint-list"
          aria-label="Close dialog"
          data-hint="Close dialog"
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </div>
      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}
      {children}
    </dialog>
  );
}
export function App() {
  const [user, setUser] = useState<{ id: string; username: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardId, setBoardId] = useState<string | null>(
    location.pathname.match(/^\/board\/([^/]+)/)?.[1] || null,
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const writeInProgress = useRef(false);
  const [failedBoardId, setFailedBoardId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [create, setCreate] = useState(false);
  const [settings, setSettings] = useState(false);
  const [selected, setSelected] = useState<{
    listId: string;
    card: Card;
  } | null>(null);
  const [drag, setDrag] = useState<{ listId: string; cardId: string } | null>(
    null,
  );
  const [over, setOver] = useState<string | null>(null);
  const [newList, setNewList] = useState(false);
  const [tab, setTab] = useState("all");
  const board = boards.find((b) => b.id === boardId);
  useEffect(() => {
    setQuery("");
    setFilter("");
    setSelected(null);
    setSettings(false);
    setNewList(false);
    setDrag(null);
    setOver(null);
  }, [boardId]);
  const navigate = (id: string | null) => {
    const path = id ? "/board/" + id : "/";
    if (location.pathname !== path) history.pushState(null, "", path);
    setBoardId(id);
    setQuery("");
    setFilter("");
  };
  useEffect(() => {
    const pop = () =>
      setBoardId(location.pathname.match(/^\/board\/([^/]+)/)?.[1] || null);
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  const load = async () => {
    const data = await api("/boards");
    setBoards(data.boards);
  };
  useEffect(() => {
    api("/auth/me")
      .then(async (data) => {
        setUser(data.user);
        await load();
      })
      .catch((e) => {
        if (e.message !== "Please sign in.") setError(e.message);
      })
      .finally(() => setLoading(false));
  }, []);
  async function save(next: Board) {
    if (writeInProgress.current) return false;
    writeInProgress.current = true;
    setSaving(true);
    setError("");
    try {
      const data = await api("/boards/" + next.id, "PUT", next);
      setBoards((prev) => prev.map((b) => (b.id === next.id ? data.board : b)));
      setFailedBoardId(null);
      return true;
    } catch (e) {
      setFailedBoardId(next.id);
      setError((e as Error).message);
      return false;
    } finally {
      writeInProgress.current = false;
      setSaving(false);
    }
  }
  async function move(
    cardId: string,
    fromId: string,
    toId: string,
    beforeId?: string,
  ) {
    if (!board || saving || cardId === beforeId) return;
    const next = structuredClone(board),
      from = next.lists.find((l) => l.id === fromId),
      to = next.lists.find((l) => l.id === toId);
    const card = from?.cards.find((c) => c.id === cardId);
    if (!card || !from || !to) return;
    from.cards = from.cards.filter((c) => c.id !== cardId);
    const index = beforeId ? to.cards.findIndex((c) => c.id === beforeId) : -1;
    to.cards.splice(index < 0 ? to.cards.length : index, 0, card);
    await save(next);
  }
  if (loading)
    return (
      <div className="loading">
        <Icon name="board" size={36} /> Opening your workspace…
      </div>
    );
  if (!user)
    return (
      <Auth
        error={error}
        onAuth={async (u) => {
          setUser(u);
          setError("");
          await load();
        }}
      />
    );
  const count = board?.lists.reduce((n, l) => n + l.cards.length, 0) || 0;
  const search = query.trim().toLowerCase();
  const filtering = Boolean(search || filter);
  const matchesCard = (card: Card) =>
    (!filter || card.label === filter) &&
    (card.title + " " + card.description).toLowerCase().includes(search);
  const matchingCount =
    board?.lists.reduce(
      (total, list) => total + list.cards.filter(matchesCard).length,
      0,
    ) ?? 0;
  const displayBoards = boards.filter(
    (b) =>
      (tab !== "starred" || b.starred) &&
      b.title.toLowerCase().includes(search),
  );
  return (
    <div className="shell">
      <header className="topbar">
        <button className="brand" onClick={() => navigate(null)}>
          <span className="brand-icon">
            <Icon name="board" size={23} />
          </span>
          trello<span className="project-badge">PORTFOLIO</span>
        </button>
        <div className="top-right">
          <span className="workspace-label">Your personal workspace</span>
          <span
            className="avatar hint hint-account"
            tabIndex={0}
            role="img"
            aria-label={`Signed in as ${user.username}`}
            data-hint={`Signed in as ${user.username}`}
          >
            {user.username.slice(0, 2).toUpperCase()}
          </span>
          <button
            className="signout"
            onClick={async () => {
              try {
                await api("/auth/signout", "POST");
                setUser(null);
                setBoards([]);
                navigate(null);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <aside className="sidebar">
        <div className="workspace">
          <span className="workspace-symbol">
            {user.username[0]?.toUpperCase()}
          </span>
          <div>
            <strong>{user.username}'s workspace</strong>
            <small>Personal · Free plan</small>
          </div>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <button
          className={!boardId && tab === "all" ? "nav active" : "nav"}
          aria-label="All boards"
          onClick={() => {
            setTab("all");
            navigate(null);
          }}
        >
          <Icon name="grid" />
          All boards<span>{boards.length}</span>
        </button>
        <button
          className={!boardId && tab === "starred" ? "nav active" : "nav"}
          aria-label="Starred boards"
          onClick={() => {
            setTab("starred");
            navigate(null);
          }}
        >
          <Icon name="star" />
          Starred boards
        </button>
        <div className="sidebar-divider" />
        <div className="nav-caption board-caption">
          YOUR BOARDS
          <button
            className="icon-button"
            aria-label="Create board"
            onClick={() => setCreate(true)}
          >
            <Icon name="plus" size={16} />
          </button>
        </div>
        {boards.map((b) => (
          <button
            key={b.id}
            className={"nav board-nav " + (boardId === b.id ? "active" : "")}
            onClick={() => navigate(b.id)}
          >
            <span className={"mini-cover " + b.color} />
            <span className="board-name">{b.title}</span>
            {b.starred && <Icon name="star" size={13} />}
          </button>
        ))}
        <div className="sidebar-note">
          <span>MAKE ROOM FOR GREAT IDEAS</span>
          <p>
            Big things start with
            <br />
            one small card.
          </p>
          <div className="note-art">
            ✦ <span>✧</span>
          </div>
        </div>
        <div className="sidebar-foot">Built with React + TypeScript</div>
      </aside>
      <main className={board ? "main board-main " + board.color : "main"}>
        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button
              onClick={() => {
                load()
                  .then(() => {
                    setError("");
                    setFailedBoardId(null);
                  })
                  .catch((e) => setError(e.message));
              }}
            >
              Reload boards
            </button>
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}
        {board ? (
          <>
            <div className="board-heading">
              <div>
                <div className="breadcrumb">
                  <button onClick={() => navigate(null)}>Workspace</button>
                  <Icon name="arrow" size={12} />
                  <span>{board.title}</span>
                </div>
                <div className="board-title">
                  <h1>{board.title}</h1>
                  <button
                    className={
                      "icon-button hint " + (board.starred ? "starred" : "")
                    }
                    aria-label={board.starred ? "Unstar board" : "Star board"}
                    data-hint={board.starred ? "Unstar board" : "Star board"}
                    disabled={saving}
                    onClick={() => save({ ...board, starred: !board.starred })}
                  >
                    <Icon name="star" size={20} />
                  </button>
                </div>
                <p>
                  {board.description || "Organize the work. Make it happen."}
                </p>
              </div>
              <div className="board-actions">
                <span className="save-state" role="status">
                  <span
                    className={
                      saving || failedBoardId === board.id ? "dot busy" : "dot"
                    }
                  />
                  {saving
                    ? "Saving…"
                    : failedBoardId === board.id
                      ? "Last change failed to save"
                      : "All changes saved"}
                </span>
                <button
                  className="button light"
                  onClick={() => setSettings(true)}
                >
                  Board settings
                </button>
              </div>
            </div>
            <div className="board-toolbar">
              <span className="view-tab">
                <Icon name="board" />
                Board
                <span>{filtering ? `${matchingCount}/${count}` : count}</span>
              </span>
              <div className="toolbar-controls">
                <label className="search compact">
                  <Icon name="search" />
                  <input
                    aria-label="Search cards"
                    placeholder="Search cards…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <select
                  aria-label="Filter by label"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="">All labels</option>
                  {labels.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            {filtering && (
              <div className="filter-status">
                <span role="status">
                  {matchingCount === 0
                    ? "No cards match these filters."
                    : `Showing ${matchingCount} of ${count} cards`}
                </span>
                <button
                  onClick={() => {
                    setQuery("");
                    setFilter("");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
            <div className="kanban" aria-busy={saving}>
              {board.lists.map((list, index) => (
                <section
                  key={list.id}
                  className={"list " + (over === list.id ? "drop-active" : "")}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOver(list.id);
                  }}
                  onDragLeave={(e) => {
                    if (
                      !(e.relatedTarget instanceof Node) ||
                      !e.currentTarget.contains(e.relatedTarget)
                    )
                      setOver(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setOver(null);
                    if (drag) void move(drag.cardId, drag.listId, list.id);
                    setDrag(null);
                  }}
                >
                  <div className="list-head">
                    <span className={"list-dot list-dot-" + (index % 4)} />
                    <input
                      aria-label={"List title: " + list.title}
                      key={list.title}
                      defaultValue={list.title}
                      maxLength={120}
                      disabled={saving}
                      onBlur={async (e) => {
                        const input = e.currentTarget;
                        const title = input.value.trim();
                        if (title && title !== list.title) {
                          const saved = await save({
                            ...board,
                            lists: board.lists.map((l) =>
                              l.id === list.id ? { ...l, title } : l,
                            ),
                          });
                          if (!saved) input.value = list.title;
                        } else input.value = list.title;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") {
                          e.currentTarget.value = list.title;
                          e.currentTarget.blur();
                        }
                      }}
                    />
                    <span className="list-count">{list.cards.length}</span>
                    <button
                      className="icon-button subtle hint hint-list"
                      data-hint="Delete list"
                      aria-label={"Delete list " + list.title}
                      disabled={saving}
                      onClick={() => {
                        if (
                          confirm(
                            `Delete “${list.title}” and its ${list.cards.length} cards?`,
                          )
                        )
                          void save({
                            ...board,
                            lists: board.lists.filter((l) => l.id !== list.id),
                          });
                      }}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                  <div className="cards">
                    {list.cards.filter(matchesCard).map((card) => (
                      <button
                        key={card.id}
                        className={
                          "task-card " +
                          (drag?.cardId === card.id ? "dragging" : "")
                        }
                        draggable={!saving}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", card.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDrag({ listId: list.id, cardId: card.id });
                        }}
                        onDragEnd={() => {
                          setDrag(null);
                          setOver(null);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (drag)
                            void move(
                              drag.cardId,
                              drag.listId,
                              list.id,
                              card.id,
                            );
                          setDrag(null);
                          setOver(null);
                        }}
                        onClick={() =>
                          setSelected({
                            listId: list.id,
                            card: structuredClone(card),
                          })
                        }
                      >
                        {card.label && (
                          <span className={"label " + card.label.toLowerCase()}>
                            {card.label}
                          </span>
                        )}
                        <span className="card-title">{card.title}</span>
                        {card.description && (
                          <span className="card-preview">
                            {card.description}
                          </span>
                        )}
                        <span className="card-footer">
                          {card.due && (
                            <span
                              className={
                                "due " +
                                (card.due <
                                new Date().toISOString().slice(0, 10)
                                  ? "overdue"
                                  : "")
                              }
                            >
                              <Icon name="clock" size={12} />
                              {new Date(
                                card.due + "T12:00:00",
                              ).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                          {card.checklist.length > 0 && (
                            <span>
                              <Icon name="check" size={13} />
                              {card.checklist.filter((t) => t.done).length}/
                              {card.checklist.length}
                            </span>
                          )}
                          {card.comments.length > 0 && (
                            <span>
                              <Icon name="chat" size={12} />
                              {card.comments.length}
                            </span>
                          )}
                          <span className="card-avatar">
                            {user.username[0]?.toUpperCase()}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <AddCard
                    disabled={saving}
                    onAdd={(title) =>
                      save({
                        ...board,
                        lists: board.lists.map((l) =>
                          l.id === list.id
                            ? {
                                ...l,
                                cards: [
                                  ...l.cards,
                                  {
                                    id: uid(),
                                    title,
                                    description: "",
                                    label: "",
                                    due: "",
                                    checklist: [],
                                    comments: [],
                                  },
                                ],
                              }
                            : l,
                        ),
                      })
                    }
                  />
                </section>
              ))}
              <div className="add-list">
                {newList ? (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const title = String(
                        new FormData(form).get("title"),
                      ).trim();
                      if (
                        title &&
                        (await save({
                          ...board,
                          lists: [
                            ...board.lists,
                            { id: uid(), title, cards: [] },
                          ],
                        }))
                      )
                        setNewList(false);
                    }}
                  >
                    <input
                      name="title"
                      placeholder="Enter list title…"
                      aria-label="New list title"
                      required
                      maxLength={120}
                      autoFocus
                    />
                    <div className="inline-actions">
                      <button className="button primary" disabled={saving}>
                        Add list
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Cancel add list"
                        onClick={() => setNewList(false)}
                      >
                        <Icon name="close" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    className="add-list-button"
                    onClick={() => setNewList(true)}
                  >
                    <Icon name="plus" />
                    Add another list
                  </button>
                )}
              </div>
            </div>
            <div className="board-tip">
              Drag cards to organize your work · Click any card for details
            </div>
          </>
        ) : (
          <div className="dashboard">
            {boardId && (
              <p className="missing-board" role="status">
                This board is unavailable. Choose a board below to continue.
              </p>
            )}
            <div className="breadcrumb">YOUR WORK, A LITTLE MORE ORGANIZED</div>
            <div className="dashboard-heading">
              <div>
                <h1>
                  {tab === "starred"
                    ? "Your favorites."
                    : `Good to see you, ${user.username}.`}
                </h1>
                <p>Turn your next big idea into something real.</p>
              </div>
              <button
                className="button primary"
                onClick={() => setCreate(true)}
              >
                <Icon name="plus" />
                Create board
              </button>
            </div>
            <div className="overview">
              <div>
                <span className="overview-icon">
                  <Icon name="board" size={24} />
                </span>
                <div>
                  <strong>{boards.length}</strong>
                  <span>Active boards</span>
                </div>
              </div>
              <div>
                <span className="overview-icon mint">
                  <Icon name="text" size={24} />
                </span>
                <div>
                  <strong>
                    {boards.reduce(
                      (n, b) =>
                        n + b.lists.reduce((m, l) => m + l.cards.length, 0),
                      0,
                    )}
                  </strong>
                  <span>Ideas in motion</span>
                </div>
              </div>
              <div>
                <span className="overview-icon peach">
                  <Icon name="star" size={24} />
                </span>
                <div>
                  <strong>{boards.filter((b) => b.starred).length}</strong>
                  <span>Starred boards</span>
                </div>
              </div>
            </div>
            <div className="section-heading">
              <h2>
                <Icon name={tab === "starred" ? "star" : "grid"} />
                {tab === "starred" ? "Starred boards" : "Your boards"}
                <span>{displayBoards.length}</span>
              </h2>
              <label className="search">
                <Icon name="search" />
                <input
                  aria-label="Search boards"
                  placeholder="Find a board…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
            <div className="board-grid">
              {displayBoards.map((b) => (
                <article className="board-tile" key={b.id}>
                  <button
                    className={"board-cover " + b.color}
                    onClick={() => navigate(b.id)}
                    aria-label={"Open " + b.title}
                  >
                    <div className="cover-shape shape-one" />
                    <div className="cover-shape shape-two" />
                    <span>
                      <Icon name="board" size={27} />
                    </span>
                    <div className="cover-mini">
                      <i />
                      <i />
                      <i />
                    </div>
                  </button>
                  <div className="tile-info">
                    <button
                      className="tile-title"
                      onClick={() => navigate(b.id)}
                    >
                      {b.title}
                    </button>
                    <button
                      className={"icon-button " + (b.starred ? "starred" : "")}
                      aria-label={
                        b.starred ? "Unstar " + b.title : "Star " + b.title
                      }
                      disabled={saving}
                      onClick={() => save({ ...b, starred: !b.starred })}
                    >
                      <Icon name="star" size={17} />
                    </button>
                    <p>
                      {b.lists.length} lists <span>·</span>{" "}
                      {b.lists.reduce((n, l) => n + l.cards.length, 0)} cards
                    </p>
                  </div>
                </article>
              ))}
              <button
                className="new-board-tile"
                onClick={() => setCreate(true)}
              >
                <span>
                  <Icon name="plus" size={24} />
                </span>
                <strong>Create a new board</strong>
                <small>A fresh space for your next idea</small>
              </button>
            </div>
            {displayBoards.length === 0 && (
              <p className="empty">
                {search
                  ? "No boards match your search."
                  : tab === "starred"
                    ? "Star a board to keep it close."
                    : "Your next project starts here. Create your first board."}
              </p>
            )}
            <div className="dashboard-bottom">
              <span>✦</span>
              <div>
                <strong>A clear board. A clearer mind.</strong>
                <p>Break big goals into small steps. You’ve got this.</p>
              </div>
            </div>
          </div>
        )}
      </main>
      {create && (
        <Modal
          title="A new beginning"
          error={error}
          close={() => setCreate(false)}
        >
          <p className="modal-subtitle">
            Give your next project a place to grow.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              setSaving(true);
              try {
                const data = await api("/boards", "POST", {
                  title: form.get("title"),
                  color: form.get("color"),
                });
                setBoards((prev) => [...prev, data.board]);
                setCreate(false);
                navigate(data.board.id);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            <label>
              Board name
              <input
                name="title"
                placeholder="e.g. My internship journey"
                autoFocus
                required
                maxLength={120}
              />
            </label>
            <label>
              Make it yours
              <select name="color">
                <option value="ocean">Ocean blue</option>
                <option value="forest">Forest green</option>
                <option value="sunset">Warm sunset</option>
                <option value="violet">Soft violet</option>
              </select>
            </label>
            <button className="button primary full" disabled={saving}>
              {saving ? "Creating…" : "Create board"}
            </button>
          </form>
        </Modal>
      )}
      {settings && board && (
        <Modal
          title="Board settings"
          error={error}
          close={() => setSettings(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              if (
                await save({
                  ...board,
                  title: String(form.get("title")).trim(),
                  description: String(form.get("description")),
                  color: String(form.get("color")),
                })
              )
                setSettings(false);
            }}
          >
            <label>
              Board name
              <input
                name="title"
                defaultValue={board.title}
                required
                maxLength={120}
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                defaultValue={board.description}
                maxLength={10000}
              />
            </label>
            <label>
              Background
              <select name="color" defaultValue={board.color}>
                <option value="ocean">Ocean blue</option>
                <option value="forest">Forest green</option>
                <option value="sunset">Warm sunset</option>
                <option value="violet">Soft violet</option>
              </select>
            </label>
            <button className="button primary full" disabled={saving}>
              Save changes
            </button>
          </form>
          <div className="danger-zone">
            <p>Deleting a board removes all its lists and cards.</p>
            <button
              className="button danger"
              disabled={saving}
              onClick={async () => {
                if (!confirm(`Permanently delete “${board.title}”?`)) return;
                try {
                  await api("/boards/" + board.id, "DELETE");
                  setBoards((prev) => prev.filter((b) => b.id !== board.id));
                  setSettings(false);
                  navigate(null);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Delete board
            </button>
          </div>
        </Modal>
      )}
      {selected && board && (
        <CardEditor
          error={error}
          key={selected.card.id}
          card={selected.card}
          listId={selected.listId}
          lists={board.lists}
          busy={saving}
          close={() => setSelected(null)}
          save={async (card, target) => {
            const next = structuredClone(board);
            next.lists.forEach((l) => {
              l.cards = l.cards.filter((c) => c.id !== card.id);
            });
            const list = next.lists.find((l) => l.id === target);
            if (!list) return;
            const originalIndex =
              board.lists
                .find((l) => l.id === target)
                ?.cards.findIndex((c) => c.id === card.id) ?? -1;
            list.cards.splice(
              originalIndex < 0 ? list.cards.length : originalIndex,
              0,
              card,
            );
            if (await save(next)) setSelected(null);
          }}
          remove={async () => {
            if (!confirm("Permanently delete this card?")) return;
            if (
              await save({
                ...board,
                lists: board.lists.map((l) => ({
                  ...l,
                  cards: l.cards.filter((c) => c.id !== selected.card.id),
                })),
              })
            )
              setSelected(null);
          }}
        />
      )}
    </div>
  );
}
function AddCard({
  onAdd,
  disabled,
}: {
  onAdd: (title: string) => Promise<boolean | undefined>;
  disabled: boolean;
}) {
  const [adding, setAdding] = useState(false),
    [title, setTitle] = useState("");
  return adding ? (
    <form
      className="add-card-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (title.trim() && (await onAdd(title.trim()))) {
          setTitle("");
          setAdding(false);
        }
      }}
    >
      <textarea
        autoFocus
        aria-label="New card title"
        placeholder="What needs to get done?"
        maxLength={300}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <div className="inline-actions">
        <button className="button primary" disabled={disabled || !title.trim()}>
          Add card
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Cancel add card"
          onClick={() => setAdding(false)}
        >
          <Icon name="close" />
        </button>
      </div>
    </form>
  ) : (
    <button
      className="add-card"
      disabled={disabled}
      onClick={() => setAdding(true)}
    >
      <Icon name="plus" size={17} />
      Add a card
    </button>
  );
}
function CardEditor({
  error,
  card: initial,
  listId,
  lists,
  busy,
  close,
  save,
  remove,
}: {
  error: string;
  card: Card;
  listId: string;
  lists: List[];
  busy: boolean;
  close: () => void;
  save: (card: Card, target: string) => void;
  remove: () => void;
}) {
  const [card, setCard] = useState(initial),
    [target, setTarget] = useState(listId),
    [task, setTask] = useState(""),
    [comment, setComment] = useState("");
  const [dirty, setDirty] = useState(false);
  const update = (patch: Partial<Card>) => {
    setCard((c) => ({ ...c, ...patch }));
    setDirty(true);
  };
  const dismiss = () => {
    if (
      !busy &&
      (!(dirty || task.trim() || comment.trim()) ||
        confirm("Discard unsaved card changes?"))
    )
      close();
  };
  return (
    <Modal title="Card details" error={error} close={dismiss}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const next = { ...card, title: card.title.trim() };
          if (task.trim()) {
            next.checklist = [
              ...card.checklist,
              { id: uid(), text: task.trim(), done: false },
            ];
          }
          if (comment.trim()) {
            next.comments = [
              ...card.comments,
              {
                id: uid(),
                text: comment.trim(),
                date: new Date().toISOString(),
              },
            ];
          }
          save(next, target);
        }}
      >
        <label>
          Title
          <input
            value={card.title}
            required
            maxLength={300}
            onChange={(e) => update({ title: e.target.value })}
          />
        </label>
        <div className="form-row">
          <label>
            In list
            <select
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                setDirty(true);
              }}
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Label
            <select
              value={card.label}
              onChange={(e) => update({ label: e.target.value })}
            >
              <option value="">No label</option>
              {labels.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Due date
            <input
              type="date"
              value={card.due}
              onChange={(e) => update({ due: e.target.value })}
            />
          </label>
        </div>
        <label>
          Description
          <textarea
            placeholder="Add a little more detail…"
            value={card.description}
            maxLength={20000}
            onChange={(e) => update({ description: e.target.value })}
          />
        </label>
        <div className="editor-section">
          <h3>
            <Icon name="check" />
            Checklist{" "}
            <small>
              {card.checklist.filter((t) => t.done).length}/
              {card.checklist.length}
            </small>
          </h3>
          {card.checklist.length > 0 && (
            <progress
              max={card.checklist.length}
              value={card.checklist.filter((t) => t.done).length}
            />
          )}{" "}
          {card.checklist.map((t) => (
            <div className="check-row" key={t.id}>
              <label>
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() =>
                    update({
                      checklist: card.checklist.map((x) =>
                        x.id === t.id ? { ...x, done: !x.done } : x,
                      ),
                    })
                  }
                />
                <span className={t.done ? "checked" : ""}>{t.text}</span>
              </label>
              <button
                type="button"
                className="icon-button"
                aria-label={"Remove " + t.text}
                onClick={() =>
                  update({
                    checklist: card.checklist.filter((x) => x.id !== t.id),
                  })
                }
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
          <div className="inline-input">
            <input
              placeholder="Add a checklist item…"
              aria-label="Checklist item"
              maxLength={1000}
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (task.trim()) {
                    update({
                      checklist: [
                        ...card.checklist,
                        { id: uid(), text: task.trim(), done: false },
                      ],
                    });
                    setTask("");
                  }
                }
              }}
            />
            <button
              type="button"
              className="button secondary"
              disabled={!task.trim()}
              onClick={() => {
                update({
                  checklist: [
                    ...card.checklist,
                    { id: uid(), text: task.trim(), done: false },
                  ],
                });
                setTask("");
              }}
            >
              Add
            </button>
          </div>
        </div>
        <div className="editor-section">
          <h3>
            <Icon name="chat" />
            Activity
          </h3>
          {card.comments.map((c) => (
            <div className="comment" key={c.id}>
              <p>{c.text}</p>
              <small>{new Date(c.date).toLocaleString()}</small>
              <button
                type="button"
                className="icon-button"
                aria-label="Delete comment"
                onClick={() =>
                  update({
                    comments: card.comments.filter((x) => x.id !== c.id),
                  })
                }
              >
                <Icon name="close" size={13} />
              </button>
            </div>
          ))}
          <div className="inline-input">
            <input
              aria-label="New comment"
              placeholder="Leave a note…"
              maxLength={5000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (comment.trim()) {
                    update({
                      comments: [
                        ...card.comments,
                        {
                          id: uid(),
                          text: comment.trim(),
                          date: new Date().toISOString(),
                        },
                      ],
                    });
                    setComment("");
                  }
                }
              }}
            />
            <button
              type="button"
              className="button secondary"
              disabled={!comment.trim()}
              onClick={() => {
                update({
                  comments: [
                    ...card.comments,
                    {
                      id: uid(),
                      text: comment.trim(),
                      date: new Date().toISOString(),
                    },
                  ],
                });
                setComment("");
              }}
            >
              Post
            </button>
          </div>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="button danger-text"
            disabled={busy}
            onClick={remove}
          >
            <Icon name="trash" size={16} />
            Delete card
          </button>
          <button
            className="button primary"
            disabled={busy || !card.title.trim()}
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function Auth({
  onAuth,
  error: initialError,
}: {
  onAuth: (user: { id: string; username: string }) => void;
  error: string;
}) {
  const [signup, setSignup] = useState(false),
    [error, setError] = useState(initialError),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const data = await api(
        "/auth/" + (signup ? "signup" : "signin"),
        "POST",
        Object.fromEntries(form),
      );
      await onAuth(data.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story">
        <div className="brand">
          <span className="brand-icon">
            <Icon name="board" size={24} />
          </span>
          trello<span className="project-badge">PORTFOLIO</span>
        </div>
        <div className="auth-pitch">
          <div className="eyebrow">LESS CHAOS. MORE POSSIBILITY.</div>
          <h1>
            Good ideas
            <br />
            deserve a<br />
            <em>great start.</em>
          </h1>
          <p>
            A little space to plan, organize, and bring
            <br />
            your next big thing to life.
          </p>
          <div className="auth-board">
            <div>
              <span>
                To do <b>2</b>
              </span>
              <article>
                <i className="pink" />
                Dream up something new
                <small>✦ The beginning of a good idea</small>
              </article>
              <article>
                <i />
                Make a little progress
              </article>
            </div>
            <div>
              <span>
                In progress <b>1</b>
              </span>
              <article>
                <i className="green" />
                Build something that matters<small>✓ One step at a time</small>
              </article>
              <div className="ghost-card" />
            </div>
          </div>
        </div>
        <small className="auth-credit">
          A Trello-inspired project · Made for getting things done
        </small>
      </section>
      <section className="auth-form-side">
        <div className="auth-form">
          <span className="welcome-icon">✦</span>
          <h2>{signup ? "Make room for your ideas." : "Welcome back."}</h2>
          <p>
            {signup
              ? "Your next project starts right here."
              : "Your ideas are right where you left them."}
          </p>
          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={submit}>
            <label>
              Username
              <input
                name="username"
                autoComplete="username"
                pattern="[a-zA-Z0-9_.\-]{3,40}"
                minLength={3}
                maxLength={40}
                placeholder="Your username"
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={signup ? "new-password" : "current-password"}
                minLength={8}
                maxLength={128}
                placeholder="At least 8 characters"
                required
              />
            </label>
            <button className="button primary full" disabled={busy}>
              {busy
                ? "One moment…"
                : signup
                  ? "Create your workspace"
                  : "Sign in"}
              <Icon name="arrow" size={17} />
            </button>
          </form>
          <p className="auth-switch">
            {signup ? "Already have an account?" : "First time here?"}{" "}
            <button
              onClick={() => {
                setSignup(!signup);
                setError("");
              }}
            >
              {signup ? "Sign in" : "Create an account"}
            </button>
          </p>
          <div className="auth-footnote">
            <Icon name="check" size={14} />
            Your boards are private. Your progress is saved.
          </div>
        </div>
      </section>
    </div>
  );
}
export default App;
