import { extractActionItems } from "./actions.js";
import type { MeetingAnalysis, MeetingInput, Risk, TranscriptSegment } from "./schema.js";
import { validateMeetingAnalysis } from "./schema.js";
import { segmentTranscript } from "./transcript.js";

export function buildFallbackAnalysis(input: MeetingInput): MeetingAnalysis {
  const segments = segmentTranscript(input.transcript);
  const actionItems = extractActionItems(segments);
  const decisions = extractDecisions(segments);
  const risks = extractRisks(segments);
  const summary = buildSummary(input, segments, decisions, actionItems);
  const followUpEmail = buildFollowUpEmail(input, decisions, actionItems, risks);

  return validateMeetingAnalysis({
    summary,
    decisions,
    actionItems,
    risks,
    followUpEmail
  });
}

export function extractDecisions(segments: TranscriptSegment[]): string[] {
  const decisions: string[] = [];
  const seen = new Set<string>();

  for (const segment of segments) {
    const explicit = segment.text.match(/\bdecision\s*[:\-]\s*(.+)$/i);
    const implicit = segment.text.match(/\b(?:decided|agreed)\s+(?:to|that)?\s*(.+)$/i);
    const decision = explicit?.[1] ?? implicit?.[1];
    if (!decision) {
      continue;
    }

    const cleaned = cleanSentence(decision);
    const key = cleaned.toLowerCase();
    if (cleaned && !seen.has(key)) {
      seen.add(key);
      decisions.push(cleaned);
    }
  }

  return decisions;
}

export function extractRisks(segments: TranscriptSegment[]): Risk[] {
  const risks: Risk[] = [];
  const seen = new Set<string>();

  for (const segment of segments) {
    const explicit = segment.text.match(/\brisk\s*[:\-]\s*(.+)$/i);
    const text = explicit?.[1] ?? (/\b(risk|blocked|blocker|concern|slip|delay)\b/i.test(segment.text) ? segment.text : "");
    const risk = cleanSentence(text);
    if (!risk) {
      continue;
    }

    const key = risk.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    risks.push({
      risk,
      mitigation: null,
      severity: inferSeverity(risk)
    });
  }

  return risks;
}

function buildSummary(
  input: MeetingInput,
  segments: TranscriptSegment[],
  decisions: string[],
  actionItems: MeetingAnalysis["actionItems"]
): string {
  const firstSentences = segments
    .flatMap((segment) => segment.text.split(/(?<=[.!?])\s+/))
    .map(cleanSentence)
    .filter((sentence) => sentence.length > 24)
    .slice(0, 2);
  const basis = firstSentences.length > 0 ? firstSentences.join(" ") : `The meeting covered ${input.title}.`;
  const decisionText = decisions.length ? ` ${decisions.length} decision${decisions.length === 1 ? "" : "s"} captured.` : "";
  const actionText = actionItems.length ? ` ${actionItems.length} action item${actionItems.length === 1 ? "" : "s"} assigned.` : "";

  return `${basis}${decisionText}${actionText}`.trim();
}

function buildFollowUpEmail(
  input: MeetingInput,
  decisions: string[],
  actionItems: MeetingAnalysis["actionItems"],
  risks: Risk[]
): MeetingAnalysis["followUpEmail"] {
  const lines = [
    `Thanks for the discussion on ${input.title}.`,
    "",
    decisions.length ? `Decisions: ${decisions.join("; ")}.` : "No explicit decisions were captured.",
    actionItems.length
      ? `Action items: ${actionItems
          .map((item) => `${item.owner ?? "Unassigned"} - ${item.task}${item.dueDate ? ` by ${item.dueDate}` : ""}`)
          .join("; ")}.`
      : "No explicit action items were captured.",
    risks.length ? `Risks to watch: ${risks.map((item) => item.risk).join("; ")}.` : "No explicit risks were captured."
  ];

  return {
    subject: `${input.title} follow-up`,
    body: lines.join("\n")
  };
}

function inferSeverity(text: string): Risk["severity"] {
  if (/\b(blocked|blocker|critical|cannot|security|legal)\b/i.test(text)) {
    return "high";
  }
  if (/\b(risk|slip|delay|approval|concern|may|might)\b/i.test(text)) {
    return "medium";
  }
  return "low";
}

function cleanSentence(value: string): string {
  return value.replace(/\s+/g, " ").replace(/[.。]+$/g, "").trim();
}
