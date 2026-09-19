import { describe, expect, it } from "vitest";
import { extractDecisions, extractRisks, segmentTranscript } from "../src/index";
import type { TranscriptSegment } from "../src/index";

function segments(...texts: string[]): TranscriptSegment[] {
  return texts.map((text, index) => ({
    id: `seg-${index + 1}`,
    speaker: "Speaker",
    text,
    startSeconds: null,
    endSeconds: null
  }));
}

function expectFast(run: () => unknown): void {
  const started = performance.now();
  run();
  expect(performance.now() - started).toBeLessThan(1000);
}

describe("extractDecisions", () => {
  it("reads explicit and implicit decisions from a transcript", () => {
    const decisions = extractDecisions(
      segmentTranscript(`
        Maya: Decision: launch the beta on Monday...
        Luis: We agreed that the pilot stays in Sydney.
        Priya: The team decided to   pause the CRM migration。
        Sam: We decided tomorrow is too early.
      `)
    );

    expect(decisions).toEqual([
      "launch the beta on Monday",
      "the pilot stays in Sydney",
      "pause the CRM migration",
      "morrow is too early"
    ]);
  });

  it("keeps the regex edge cases for labels without text and line breaks", () => {
    expect(extractDecisions(segments("decision:   ", "we agreed  ", "decided to"))).toEqual(["to"]);
    expect(extractDecisions(segments("decision:\nfirst\nsecond decision - final"))).toEqual(["final"]);
    expect(extractDecisions(segments("decision:  \n", "agreed\n that\n ship"))).toEqual(["ship"]);
  });

  it("handles long runs of spaces and periods quickly", () => {
    const spaces = " ".repeat(100_000);

    expectFast(() => expect(extractDecisions(segments(`decision:${spaces}\n`))).toEqual([]));
    expectFast(() => expect(extractDecisions(segments(`agreed${spaces}\n`))).toEqual([]));
    expectFast(() => expect(extractDecisions(segments(`decided to${spaces}\n`))).toEqual([]));
    expectFast(() => expect(extractDecisions(segments("decision:\n".repeat(50_000)))).toEqual([]));
    expectFast(() =>
      expect(extractDecisions(segments(`decision: ship${".".repeat(100_000)}x`))).toEqual([
        `ship${".".repeat(100_000)}x`
      ])
    );
  });
});

describe("extractRisks", () => {
  it("reads explicit risks and risk keywords", () => {
    const risks = extractRisks(segments("Risk: vendor approval may slip.", "We are blocked on legal review."));

    expect(risks).toEqual([
      { risk: "vendor approval may slip", mitigation: null, severity: "medium" },
      { risk: "We are blocked on legal review", mitigation: null, severity: "high" }
    ]);
  });

  it("handles long runs of spaces and periods quickly", () => {
    expectFast(() =>
      expect(extractRisks(segments(`risk -${" ".repeat(100_000)}\n`))).toEqual([
        { risk: "risk -", mitigation: null, severity: "medium" }
      ])
    );
    expectFast(() =>
      expect(extractRisks(segments(`delay${".".repeat(100_000)}`))).toEqual([
        { risk: "delay", mitigation: null, severity: "medium" }
      ])
    );
  });
});
