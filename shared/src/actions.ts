import type { ActionItem, TranscriptSegment } from "./schema.js";
import { trimTrailingPeriods } from "./text.js";

const EXPLICIT_ACTION = /\b(?:action|todo|next step)\s*[:\-]\s*(.+)$/i;
const OWNER_ACTION = /^([A-Z][A-Za-z ._'’-]{1,50})(?:\s+(?:to|will|should|needs to|is going to)\s+|\s*[-:]\s*)(.+)$/i;
const SELF_ACTION = /^(?:i|we)\s+(?:will|should|need to|are going to|am going to)\s+(.+)$/i;
const DUE_PATTERN =
  /\b(?:by|due(?:\s+by)?|before|on)\s+((?:next\s+)?[A-Za-z]+(?:\s+\d{1,2})?(?:,\s*\d{4})?|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i;

export function extractActionItems(segments: TranscriptSegment[]): ActionItem[] {
  const actions: ActionItem[] = [];
  const seen = new Set<string>();

  for (const segment of segments) {
    for (const sentence of splitSentences(segment.text)) {
      const action = parseActionSentence(sentence, segment.speaker);
      if (!action) {
        continue;
      }

      const key = `${action.owner ?? ""}:${action.task}`.toLowerCase();
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      actions.push({
        ...action,
        source: sentence
      });
    }
  }

  return actions;
}

function parseActionSentence(sentence: string, speaker: string): Omit<ActionItem, "source"> | null {
  const explicit = sentence.match(EXPLICIT_ACTION);
  if (explicit) {
    return parseOwnerTaskDue(explicit[1] ?? "", speaker);
  }

  const self = sentence.match(SELF_ACTION);
  if (self) {
    return withDue(self[1] ?? "", speaker);
  }

  const owner = sentence.match(OWNER_ACTION);
  if (owner && /\b(?:will|to|should|needs to|going to)\b/i.test(sentence)) {
    return withDue(owner[2] ?? "", cleanOwner(owner[1] ?? speaker));
  }

  return null;
}

function parseOwnerTaskDue(payload: string, speaker: string): Omit<ActionItem, "source"> | null {
  const cleaned = stripTerminal(payload);
  const ownerMatch = cleaned.match(OWNER_ACTION);
  if (ownerMatch) {
    return withDue(ownerMatch[2] ?? "", cleanOwner(ownerMatch[1] ?? speaker));
  }

  return withDue(cleaned, speaker);
}

function withDue(rawTask: string, owner: string | null): Omit<ActionItem, "source"> | null {
  const dueMatch = rawTask.match(DUE_PATTERN);
  const dueDate = dueMatch ? stripTerminal(dueMatch[1] ?? "") : null;
  const task = stripTerminal(rawTask.replace(DUE_PATTERN, ""));

  if (!task) {
    return null;
  }

  return {
    task,
    owner: owner ? cleanOwner(owner) : null,
    dueDate
  };
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => stripTerminal(sentence))
    .filter(Boolean);
}

function cleanOwner(value: string): string {
  return value.replace(/\b(action|todo|next step)\b/gi, "").replace(/\s+/g, " ").trim();
}

function stripTerminal(value: string): string {
  return trimTrailingPeriods(value.replace(/\s+/g, " ")).trim();
}
