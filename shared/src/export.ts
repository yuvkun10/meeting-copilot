import type { MeetingAnalysis, MeetingInput } from "./schema.js";

type ExportMeetingMeta = Pick<MeetingInput, "title" | "agenda" | "context">;

export function exportAnalysisJson(analysis: MeetingAnalysis): string {
  return JSON.stringify(analysis, null, 2);
}

export function exportAnalysisMarkdown(analysis: MeetingAnalysis, meta: ExportMeetingMeta): string {
  const lines = [
    `# ${meta.title}`,
    "",
    "## Agenda",
    meta.agenda || "Not provided.",
    "",
    "## Context",
    meta.context || "Not provided.",
    "",
    "## Summary",
    analysis.summary,
    "",
    "## Decisions",
    ...formatList(analysis.decisions),
    "",
    "## Action Items",
    ...formatActions(analysis.actionItems),
    "",
    "## Risks",
    ...formatRisks(analysis.risks),
    "",
    "## Follow-up Email",
    `Subject: ${analysis.followUpEmail.subject}`,
    "",
    analysis.followUpEmail.body
  ];

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function formatList(items: string[]): string[] {
  return items.length ? items.map((item) => `- ${item}`) : ["- None captured."];
}

function formatActions(items: MeetingAnalysis["actionItems"]): string[] {
  if (!items.length) {
    return ["- [ ] None captured."];
  }

  return items.map((item) => {
    const owner = item.owner ? ` - Owner: ${item.owner}` : "";
    const due = item.dueDate ? ` - Due: ${item.dueDate}` : "";
    return `- [ ] ${item.task}${owner}${due}`;
  });
}

function formatRisks(items: MeetingAnalysis["risks"]): string[] {
  if (!items.length) {
    return ["- None captured."];
  }

  return items.map((item) => {
    const mitigation = item.mitigation ? ` Mitigation: ${item.mitigation}` : "";
    return `- [${item.severity}] ${item.risk}${mitigation}`;
  });
}
