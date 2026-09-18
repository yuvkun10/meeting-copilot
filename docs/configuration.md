# Configuration

Use `.env.example` as the public template. Keep real values in `.env.local` or your deployment secret store.

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Optional server side key for OpenAI analysis and transcription. Leave blank for local fallback analysis. |
| `OPENAI_SUMMARY_MODEL` | Model used by `/api/analyze` when OpenAI is enabled. |
| `OPENAI_TRANSCRIBE_MODEL` | Model used by `/api/transcribe` when OpenAI is enabled. |
| `PORT` | API port. Defaults to `8787`. |
| `CLIENT_ORIGIN` | Allowed browser origin for CORS. Defaults to the Vite dev origin. |

Set `OPENAI_API_KEY` in `.env.local` only when you want live OpenAI analysis or audio transcription. Without a key, transcript analysis still works through the local fallback.

Do not expose OpenAI keys to the browser, commit `.env.local`, or place real meeting transcripts in tracked fixtures.
