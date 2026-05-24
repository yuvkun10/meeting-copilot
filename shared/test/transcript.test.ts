import { describe, expect, it } from "vitest";
import { segmentTranscript } from "../src/index";

describe("segmentTranscript", () => {
  it("groups speaker-labelled lines with timestamps and continuations", () => {
    const transcript = `
      [00:00] Maya: Welcome to the launch review.
      The first paragraph continues on this line.
      [00:14] Luis: I can send the pilot brief by 2026-06-01.
      00:42 Priya - Decision: use a staged rollout for the beta cohort.
    `;

    const segments = segmentTranscript(transcript);

    expect(segments).toHaveLength(3);
    expect(segments[0]).toMatchObject({
      id: "seg-1",
      speaker: "Maya",
      startSeconds: 0
    });
    expect(segments[0]?.text).toContain("continues on this line");
    expect(segments[1]).toMatchObject({
      speaker: "Luis",
      startSeconds: 14
    });
    expect(segments[2]).toMatchObject({
      speaker: "Priya",
      startSeconds: 42
    });
  });

  it("creates stable paragraph segments when speaker labels are absent", () => {
    const segments = segmentTranscript("First topic.\n\nSecond topic with more detail.");

    expect(segments).toEqual([
      {
        id: "seg-1",
        speaker: "Speaker",
        text: "First topic.",
        startSeconds: null,
        endSeconds: null
      },
      {
        id: "seg-2",
        speaker: "Speaker",
        text: "Second topic with more detail.",
        startSeconds: null,
        endSeconds: null
      }
    ]);
  });
});
