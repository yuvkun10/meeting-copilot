import { extractActionItems } from "./actions.js";
import type { MeetingAnalysis, MeetingInput, Risk, TranscriptSegment } from "./schema.js";
import { validateMeetingAnalysis } from "./schema.js";
import { trimTrailingPeriods } from "./text.js";
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
    const explicit = textAfterLabel(segment.text, /\bdecision\s*[:\-]/gi);
    const implicit = textAfterDecisionVerb(segment.text);
    const decision = explicit ?? implicit;
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
    const explicit = textAfterLabel(segment.text, /\brisk\s*[:\-]/gi);
    const text = explicit ?? (/\b(risk|blocked|blocker|concern|slip|delay)\b/i.test(segment.text) ? segment.text : "");
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
  return trimTrailingPeriods(value.replace(/\s+/g, " ")).trim();
}

// The helpers below return the same capture group as the regular expressions
// they replace, but find it with plain string scans instead of backtracking.

// Same as `text.slice(start).match(/^\s*(.+)$/)?.[1]`, where `lastBreak` is
// the index of the last line break in `text`.
function restOfLine(text: string, start: number, lastBreak: number): string | undefined {
  const rest = text.slice(start);
  const value = rest.trimStart() || rest.slice(-1);
  return value && lastBreak < text.length - value.length ? value : undefined;
}

// Same as `text.match(/\b<label>\s*[:\-]\s*(.+)$/i)?.[1]` for a global `label` regex.
function textAfterLabel(text: string, label: RegExp): string | undefined {
  const lastBreak = lastLineBreak(text);
  for (const match of text.matchAll(label)) {
    const value = restOfLine(text, match.index + match[0].length, lastBreak);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

// Same as `text.match(/\b(?:decided|agreed)\s+(?:to|that)?\s*(.+)$/i)?.[1]`.
function textAfterDecisionVerb(text: string): string | undefined {
  const lastBreak = lastLineBreak(text);
  for (const match of text.matchAll(/\b(?:decided|agreed)/gi)) {
    const end = match.index + match[0].length;
    const tailStart = text.length - text.slice(end).trimStart().length;
    if (tailStart === end) {
      continue;
    }
    const tail = text.slice(tailStart, tailStart + 4);
    const value =
      (/^to/i.test(tail) ? restOfLine(text, tailStart + 2, lastBreak) : undefined) ??
      (/^that/i.test(tail) ? restOfLine(text, tailStart + 4, lastBreak) : undefined) ??
      restOfLine(text, tailStart, lastBreak) ??
      restOfLine(text, end + 1, lastBreak);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

function lastLineBreak(text: string): number {
  return Math.max(...["\n", "\r", "\u2028", "\u2029"].map((mark) => text.lastIndexOf(mark)));
}
