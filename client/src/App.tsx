import { useMemo, useState } from "react";
import type { MeetingAnalysis } from "@meeting-copilot/shared";
import { exportAnalysisMarkdown } from "@meeting-copilot/shared";

const sampleTranscript = `Maya: Decision: use a staged rollout for the launch.
Luis: Action: Luis to prepare the launch checklist by 2026-06-01.
Priya: Risk: finance approval may slip if the vendor review is late.`;

type ApiResponse = {
  source: "local" | "openai";
  analysis: MeetingAnalysis;
};

export function App() {
  const [title, setTitle] = useState("Launch Review");
  const [agenda, setAgenda] = useState("Launch readiness, risks, and owner assignments");
  const [context, setContext] = useState("Beta cohort is ready and finance approval is pending.");
  const [transcript, setTranscript] = useState(sampleTranscript);
  const [analysis, setAnalysis] = useState<ApiResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markdown = useMemo(() => {
    if (!analysis) {
      return "";
    }

    return exportAnalysisMarkdown(analysis.analysis, { title, agenda, context });
  }, [agenda, analysis, context, title]);

  async function analyzeMeeting() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, agenda, context, transcript })
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error?.message ?? "Analysis failed.");
      }

      setAnalysis(body as ApiResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="workspace">
      <section className="editor">
        <div>
          <p className="eyebrow">Meeting Copilot</p>
          <h1>Turn transcripts into decisions, owners, and follow-up.</h1>
        </div>

        <label>
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <label>
          Agenda
          <textarea value={agenda} onChange={(event) => setAgenda(event.target.value)} rows={3} />
        </label>

        <label>
          Context
          <textarea value={context} onChange={(event) => setContext(event.target.value)} rows={3} />
        </label>

        <label>
          Transcript
          <textarea
            className="transcript"
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            rows={12}
          />
        </label>

        <button onClick={analyzeMeeting} disabled={busy}>
          {busy ? "Analyzing..." : "Analyze meeting"}
        </button>

        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="results" aria-live="polite">
        {!analysis ? (
          <div className="empty">
            <h2>Ready for a transcript</h2>
            <p>The server will use OpenAI when configured and deterministic local extraction otherwise.</p>
          </div>
        ) : (
          <>
            <div className="resultHeader">
              <div>
                <p className="eyebrow">{analysis.source === "openai" ? "OpenAI" : "Local fallback"}</p>
                <h2>{analysis.analysis.summary}</h2>
              </div>
            </div>

            <div className="grid">
              <Panel title="Decisions" items={analysis.analysis.decisions} fallback="No explicit decisions captured." />
              <Panel
                title="Action Items"
                items={analysis.analysis.actionItems.map(
                  (item) => `${item.owner ?? "Unassigned"}: ${item.task}${item.dueDate ? ` by ${item.dueDate}` : ""}`
                )}
                fallback="No action items captured."
              />
              <Panel
                title="Risks"
                items={analysis.analysis.risks.map((item) => `[${item.severity}] ${item.risk}`)}
                fallback="No risks captured."
              />
            </div>

            <div className="email">
              <h3>{analysis.analysis.followUpEmail.subject}</h3>
              <pre>{analysis.analysis.followUpEmail.body}</pre>
            </div>

            <textarea className="markdown" readOnly value={markdown} rows={12} />
          </>
        )}
      </section>
    </main>
  );
}

function Panel({ title, items, fallback }: { title: string; items: string[]; fallback: string }) {
  return (
    <article className="panel">
      <h3>{title}</h3>
      <ul>
        {(items.length ? items : [fallback]).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}
