import type { TranscriptSegment } from "./schema.js";

const SPEAKER_PATTERN = /^([A-Za-z][A-Za-z0-9 ._'’-]{0,60}?)(?:\s*[:\-–]\s+)(.+)$/;
const TIMESTAMP_PATTERN = /^(?:\[(\d{1,2}:\d{2}(?::\d{2})?)\]|(\d{1,2}:\d{2}(?::\d{2})?))\s+/;

export function parseTimestamp(value: string): number {
  const parts = value.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) {
    return 0;
  }

  if (parts.length === 2) {
    return parts[0]! * 60 + parts[1]!;
  }

  return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
}

export function segmentTranscript(transcript: string): TranscriptSegment[] {
  const normalized = transcript.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const segments: TranscriptSegment[] = [];
  let sawSpeakerLabel = false;

  for (const line of lines) {
    const parsed = parseTranscriptLine(line);

    if (parsed) {
      sawSpeakerLabel = true;
      segments.push({
        id: `seg-${segments.length + 1}`,
        speaker: parsed.speaker,
        text: cleanText(parsed.text),
        startSeconds: parsed.startSeconds,
        endSeconds: null
      });
      continue;
    }

    const previous = segments.at(-1);
    if (previous) {
      previous.text = cleanText(`${previous.text} ${line}`);
    } else {
      segments.push({
        id: "seg-1",
        speaker: "Speaker",
        text: cleanText(line),
        startSeconds: null,
        endSeconds: null
      });
    }
  }

  if (!sawSpeakerLabel) {
    return normalized
      .split(/\n\s*\n/g)
      .map((paragraph) => cleanText(paragraph.replace(/\n/g, " ")))
      .filter(Boolean)
      .map((text, index) => ({
        id: `seg-${index + 1}`,
        speaker: "Speaker",
        text,
        startSeconds: null,
        endSeconds: null
      }));
  }

  return segments;
}

function parseTranscriptLine(line: string): { speaker: string; text: string; startSeconds: number | null } | null {
  const timestampMatch = line.match(TIMESTAMP_PATTERN);
  const startSeconds = timestampMatch ? parseTimestamp(timestampMatch[1] ?? timestampMatch[2] ?? "0:00") : null;
  const withoutTimestamp = timestampMatch ? line.slice(timestampMatch[0].length).trim() : line;
  const speakerMatch = withoutTimestamp.match(SPEAKER_PATTERN);

  if (!speakerMatch) {
    return null;
  }

  return {
    speaker: cleanSpeaker(speakerMatch[1] ?? "Speaker"),
    text: speakerMatch[2] ?? "",
    startSeconds
  };
}

function cleanSpeaker(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\s+([.,!?;:])/g, "$1").trim();
}
