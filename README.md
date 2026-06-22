<div align="center">

# 🦆 Quack

### Your codebase remembers.

A memory layer for your codebase. Quack remembers why your code is the way it is, how past bugs were fixed, and which dependency upgrades broke things, then surfaces that history at the exact moment you need it.

**[Live app](https://quack-git-main-subman1246-s-projects.vercel.app/)** · Built for the Quackathon, Track 01: The Sentient Workspace

</div>

---

## The problem

Every codebase holds hard won knowledge. Why a thing was built a certain way, how a nasty bug was finally fixed, which version bump quietly broke everything. That knowledge lives in people's heads, and it disappears the moment someone forgets or moves on.

AI coding agents make it worse, not better. They are stateless. They start from zero on every call, so they repeat the same mistakes a team already learned from, over and over.

Quack fixes this by giving the codebase a memory of its own.

## What Quack does

As you work, Quack records short **episodes** into a persistent memory store. Every episode is one of three types:

- **Decision** — why something was built a certain way, and the alternatives that were rejected.
- **Bug** — the symptom, the root cause, and the fix.
- **Dependency** — which upgrade hurt, and how it was resolved.

Then it gives that memory back to you three ways:

- **Recall** — paste an error or describe what you are seeing, and Quack returns a synthesized answer with citations pointing to the exact past episode it came from.
- **Remember** — log a fix, a decision, or a bad upgrade in a few seconds.
- **Memory** — browse, filter, search, and edit the full record of episodes.

The hook: Quack recognizes when you have solved a problem before. You hit a bug, and instead of starting over, it tells you that you have seen this shape before, how you fixed it, and why the code is built this way. It behaves like a teammate who never forgets.

> The name is rubber duck debugging, but the duck remembers everything.

## How it works

```
  Browser (Vercel)                 Bridge (Hugging Face)              Parcle
 ┌────────────────┐   HTTPS JSON   ┌──────────────────────┐         ┌──────────────┐
 │  Quack UI      │ ─────────────▶ │  FastAPI service     │ ──SDK─▶ │  Memory API  │
 │  React + Vite  │                │  holds the API key   │         │  ingest +    │
 │  Recall /      │ ◀───────────── │  /health /remember   │ ◀────── │  cited search│
 │  Remember /    │  answer +      │  /recall /seed       │         └──────────────┘
 │  Memory        │  confidence +  └──────────────────────┘
 └────────────────┘  citations
```

Three pieces:

1. **Frontend** (this repo). A single page React app built with Vite, TypeScript, and Tailwind, deployed on Vercel. It never talks to Parcle directly. It calls a small bridge over HTTPS.

2. **Bridge** (kept private, see below). A thin FastAPI service that wraps the Parcle Python SDK and exposes four endpoints. It holds the Parcle API key server side and is the only thing that touches Parcle.

3. **Parcle**. The persistent memory layer. It stores every episode and answers natural language questions over them with cited results.

### Why the bridge is private

Parcle ships a Python SDK, and its API requires a secret bearer key (`pmem_...`). That key must never reach the browser or sit in a public repository. So the bridge lives as a separate, private service, and the key is stored only as a server side secret on the host, never committed anywhere. The public frontend only ever knows the bridge URL, never the key. This keeps the memory store credentials fully private and means a leaked frontend can never expose the backend.

### The endpoint contract

The frontend depends on exactly four endpoints, all JSON:

| Method | Path        | Body                                                        | Returns                                          |
| ------ | ----------- | ----------------------------------------------------------- | ------------------------------------------------ |
| GET    | `/health`   | none                                                        | `{ "ok": true }`                                 |
| POST   | `/remember` | `{ project, type, title, details, files[], packages[] }`    | `{ "ok": true, "session_id": "..." }`            |
| POST   | `/recall`   | `{ project, query }`                                        | `{ "answer", "confidence", "citations": [...] }` |
| POST   | `/seed`     | none                                                        | `{ "ok": true, "seeded": 6, "titles": [...] }`   |

## Tool integration

### Parcle (the memory layer)

Parcle is the brain of the entire product. Quack does not run its own vector database or matching logic. Parcle does the storing and the retrieval, and Quack is the experience built around it.

- **Per project scoping.** Every episode is written under a `user_id` that we use as the project namespace (for the demo, `quack-demo`). All of a project's memory lives in one place.
- **Writing memory.** Each episode is formatted as a typed text blob and written with `client.ingest_dialog(user_id=project, messages=[...])`. The three episode types (decision, bug, dependency) are all encoded in the content so search can discriminate between them.
- **User creation.** The hosted API requires a user to exist before ingest or search, so the bridge calls the idempotent `client.create_user(user_id=project)` before any write or read.
- **Cited recall.** Recall calls `client.search(user_id=project, query=...)`, which returns a synthesized `answer`, a `confidence` score, and `citations` that point back to the source episodes. This is what powers the whole "you have seen this before" moment, semantically, without the user ever typing the exact words that were stored.

### Enter (the build platform)

The entire frontend was built using **Enter (Enter Pro)**.

- The app was scaffolded and built with the **Enter Code** agentic CLI, which created the Vite + React + TypeScript + Tailwind project, the design system, the boot splash, and all three tabs from natural language prompts.
- Model selection was deliberate: the design defining passes ran on a top tier model for UI quality, and the mechanical edits and wiring ran on a cheaper model to conserve credits.
- The bridge was generated separately so its secret stays out of the build platform and the public repo.

## Features

- Recall with a synthesized, cited answer from Parcle
- An animated confidence gauge, color graded by certainty
- Rich citation chips that map to their source
- One tap suggested queries that tell the demo story
- Remember form that writes new episodes straight to Parcle
- Memory feed you can filter by type, search, open, edit, and delete
- A boot splash, a live connection indicator, keyboard shortcuts, and toasts
- A dark, command palette inspired interface with a deliberate type system

## Tech stack

**Frontend:** React, Vite, TypeScript, Tailwind CSS, lucide-react
**Backend (bridge):** FastAPI, Uvicorn, Python, Docker
**Memory:** Parcle Memory API and Python SDK
**Hosting:** Vercel (frontend), Hugging Face Docker Space (bridge)

## Run it locally

### Frontend

```bash
git clone https://github.com/subman1246/Quack.git
cd Quack
npm install
npm run dev
```

The app reads its bridge URL in this order: a local override saved in the browser, then a `VITE_BRIDGE_URL` environment variable, then a built in default. To point it at your own bridge, add a `.env` file:

```
VITE_BRIDGE_URL=https://your-bridge-url
```

Build for production with `npm run build`.

### Bridge

The bridge is a small FastAPI service that wraps the Parcle SDK and is kept private so the API key stays secret. To stand up your own, you need a Parcle key from the hackathon dashboard, then a service that:

1. Reads `PARCLE_API_KEY` from the environment, never hardcoded.
2. Exposes the four endpoints in the contract above.
3. Ensures the project user exists before any ingest or search.
4. Loads demo episodes once via `POST /seed`.

Deploy it anywhere that runs Python (we used a Hugging Face Docker Space), set the key as a secret, and put the resulting URL into the frontend.

## What is live and what is local

Being honest about the data boundary, because it is a clean part of the design:

- **Recall is live.** It queries Parcle and returns real, cited semantic results.
- **Remember is live.** It writes new episodes to Parcle through the bridge.
- **The Memory feed is local.** It is a browsable record kept in the browser, seeded so it is never empty. Editing a Memory card changes the local record, not Parcle. Parcle is the live brain, Memory is the visual ledger.

## Roadmap

Quack was designed around three ways into one shared memory. The next surfaces deepen that idea:

- **File history (why-blame).** Click any file and see every decision and bug that ever touched it, with Quack's summary of why the code is the way it is.
- **Upgrade check (the dependency veteran).** Type a package before bumping it and get warned about every past breakage.
- **Scar tissue.** Paste a code change and get warned about related past incidents before you ship.
- **Linked citations.** Open the exact stored episode a citation came from.
- **Smart capture.** Paste a raw error and let Quack draft the episode for you.
- **A browser extension** that turns any highlighted error into a recall with one shortcut.

## License

MIT

<div align="center">

Built with 🦆 for the Quackathon.

</div>
