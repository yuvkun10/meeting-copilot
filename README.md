# Meeting Copilot

AI meeting assistant with a React + Vite workspace and a Node/Express API. The browser never calls OpenAI directly; summary generation and audio transcription are routed through the server.

## Features

- Editable transcript workspace with agenda and context fields.
- Optional audio upload endpoint for server-side transcription.
- Meeting summary, decisions, action items with owners and dates, risks, and a follow-up email draft.
- Deterministic local parser and fallback when OpenAI is unavailable.
- JSON and Markdown export.
- Tests for transcript segmentation, action extraction, schema validation, export formatting, and server validation.

## Setup

```bash
npm install
npm run build
npm test
```

Copy `.env.example` to `.env.local` and set `OPENAI_API_KEY` for live OpenAI calls. Without a key, the API uses deterministic local fallback for analysis.

## Development

```bash
npm run dev
```

The API defaults to `http://localhost:8787`. The Vite client proxies `/api` to the API during development.
