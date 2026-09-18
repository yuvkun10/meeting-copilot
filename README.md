# Meeting Copilot

Meeting Copilot turns a meeting transcript into a brief: summary, decisions, action items, risks and a follow up email draft. A React client sends the transcript to a Node/Express API, which uses OpenAI when a key is configured and a deterministic local parser when it is not. It is aimed at team leads, product managers, sales and customer success teams. The app works locally and has no authentication or durable storage yet.

## Installation

Prerequisites:

- Node.js 24.x
- npm 11.x

```bash
npm install
cp .env.example .env.local
```

Environment variable names: `OPENAI_API_KEY` (optional), `OPENAI_SUMMARY_MODEL`, `OPENAI_TRANSCRIBE_MODEL`, `PORT`, `CLIENT_ORIGIN`. See [docs/configuration.md](docs/configuration.md).

## Usage

```bash
npm run dev      # Start the API and the Vite client together
npm run build    # Build shared types, server output, and the Vite client
npm start        # Run the built server
```

The API defaults to `http://localhost:8787` and the Vite client proxies `/api` to it during development. Without `OPENAI_API_KEY`, transcript analysis uses the local fallback and audio transcription is unavailable.

This repository has no deployment configuration. Read [docs/privacy-and-security.md](docs/privacy-and-security.md) before hosting it anywhere.

## Project structure

```text
├── .github
│   ├── dependabot.yml
│   └── workflows
│       └── ci.yml
├── client
│   ├── src
│   ├── index.html
│   └── vite.config.ts
├── server
│   ├── src
│   │   ├── app.ts
│   │   └── index.ts
│   └── test
├── shared
│   ├── src
│   └── test
├── docs
│   ├── architecture.md
│   └── archive
├── .env.example
└── package.json
```

Details are in [docs/architecture.md](docs/architecture.md).

## Coding style

TypeScript runs in `strict` mode in all three workspaces and `npm run build` performs the type check. No linter, formatter or commit convention is configured.

## Test

```bash
npm test         # Run shared and server tests with Vitest
```

The shared tests cover action extraction, export formatting, schemas and transcript parsing. The server tests cover the Express app through supertest. The client has no tests. CI also runs `npm run audit` and `npm run outdated`.

## Documentation

- [Documentation index](docs/README.md)
- [Overview and use cases](docs/overview.md)
- [Architecture](docs/architecture.md)
- [Configuration](docs/configuration.md)
- [Privacy and security notes](docs/privacy-and-security.md)
- [Dependency readiness](docs/maintenance.md)

## License

MIT. See [LICENSE](LICENSE).
