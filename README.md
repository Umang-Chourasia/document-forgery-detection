# Document Forgery Detection

A forensic tool for locating likely tampering in document images. It runs
CAT-Net v2 over an uploaded image to produce a pixel-level localization
heatmap, then has an LLM describe, in plain language, what that heatmap
shows.

The product is built around **evidence, not verdicts**: CAT-Net localizes
regions whose JPEG compression history is inconsistent with the rest of the
image, and the interface presents that as material for a human reviewer to
interpret. The application deliberately does **not** produce a fake/real
classification, a confidence score, or a tampering probability, because
CAT-Net does not provide one.

---

## Architecture

Three components, which run as separate processes and may run on separate
machines:

```
┌────────────────────────┐        ┌──────────────────────────┐
│  frontend (this repo)  │        │  CAT-Net v2 backend      │
│  React + TS + Tailwind │ ──────▶│  FastAPI, GPU machine    │
│  port 5173             │  HTTP  │  POST /predict           │
│                        │ ◀──────│  heatmap PNG             │
│                        │        └──────────────────────────┘
│                        │
│                        │        ┌──────────────────────────┐
│                        │ ──────▶│  narrative-service       │
│                        │  HTTP  │  Node/Express, port 4000 │
│                        │ ◀──────│  holds the LLM API key   │
└────────────────────────┘        └──────────────────────────┘
```

### `frontend/`

React + TypeScript + Vite + Tailwind CSS. Handles upload, processing state,
and the result views. Contains no ML inference — it only talks to the two
services over HTTP.

All backend access is funnelled through `src/api/`, so the rest of the app
never calls `fetch` directly:

| File | Responsibility |
| --- | --- |
| `api/client.ts` | Base URL, shared request headers, error type |
| `api/catnetServer.ts` | The real CAT-Net backend contract |
| `api/narrative.ts` | Calls `narrative-service` for the written interpretation |
| `api/history.ts` | Browser-local history (IndexedDB) |
| `api/mock.ts` | Mock backend for UI work with no services running |
| `api/analysis.ts` | Public surface used by pages; switches mock vs. real |

### CAT-Net v2 backend

Runs on a separate GPU machine and is **not** part of this repository — it is
a clone of [mjkwon2021/CAT-Net](https://github.com/mjkwon2021/CAT-Net) plus a
thin FastAPI wrapper. It is excluded here because it carries several GB of
model weights and a Python virtualenv.

See [`backend-reference/`](backend-reference/) for the wrapper source and the
setup fixes required to get CAT-Net running on a modern Python environment.

### `narrative-service/`

A small Node/Express service that holds the LLM API key **server-side** and
calls the LLM on the frontend's behalf. This exists specifically so the key is
never shipped to the browser — anything placed in a `VITE_`-prefixed variable
is embedded in the frontend bundle and readable by anyone.

It accepts the original image plus the heatmap and returns a short written
description of what the heatmap shows. It is instructed to describe the
localized evidence only, and never to declare a document authentic or forged.

---

## Current capabilities

- Upload a document image (JPEG / PNG / WebP)
- CAT-Net v2 inference producing a localization heatmap
- Result viewer with Original / Heatmap / Overlay toggle, zoom and reset
- LLM-written interpretation of the heatmap, shown alongside it
- Graceful degradation: if the narrative service or LLM is unavailable, the
  CAT-Net result still displays, with the reason for the missing narrative
  shown rather than hidden
- Browser-local analysis history (IndexedDB) with thumbnails, re-opening and
  deletion
- A mock mode that exercises the whole UI with no backend running

---

## Local development

### Prerequisites

- Node.js and npm
- A running CAT-Net backend reachable over HTTP (see `backend-reference/`)
- An API key for the LLM used by `narrative-service`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:5173
```

Environment variables (`frontend/.env.local`):

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL of the CAT-Net backend |
| `VITE_USE_MOCK_API` | `true` to use the in-browser mock instead of the real backend |
| `VITE_NARRATIVE_BASE_URL` | Base URL of `narrative-service`; leave blank to skip the narrative step |

> These are compiled into the browser bundle. Never put a secret in a
> `VITE_`-prefixed variable.

### narrative-service

```bash
cd narrative-service
npm install
cp .env.example .env         # then add your API key
npm start                    # http://localhost:4000
```

Environment variables (`narrative-service/.env`, git-ignored):

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | API key, server-side only |
| `PORT` | Port to listen on (default `4000`) |
| `GEMINI_MODEL` | Model identifier |

### Running the UI without any backend

```bash
cd frontend
echo "VITE_USE_MOCK_API=true" > .env.local
npm run dev
```

Mock mode generates placeholder heatmaps and narrative text so the interface
can be developed and demonstrated with no services running. Its output is
clearly labelled and is **not** a real forensic result.

---

## Security notes

- Secrets live only in git-ignored `.env` files. The committed `.env.example`
  files contain empty placeholders.
- The LLM API key is held by `narrative-service` and is never exposed to the
  browser.
- Uploaded and generated documents are git-ignored, as they may contain
  personal data.

---

## Not yet implemented

Tracked here so the list above is not mistaken for a roadmap:
authentication, a server-side database, multi-page/PDF support, and
per-user history.
