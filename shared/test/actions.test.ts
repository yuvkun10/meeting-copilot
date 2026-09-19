import { describe, expect, it } from "vitest";
import { extractActionItems, segmentTranscript } from "../src/index";

describe("extractActionItems", () => {
  it("extracts owners and due dates from explicit action language", () => {
    const segments = segmentTranscript(`
      Maya: Action: Luis to prepare the legal checklist by Friday.
      Priya: Noah will update the CRM rollout notes by 2026-06-01.
      Sam: TODO: Sam - confirm finance approval due next Tuesday.
    `);

    const actions = extractActionItems(segments);

    expect(actions).toEqual([
      expect.objectContaining({
        owner: "Luis",
        task: "prepare the legal checklist",
        dueDate: "Friday"
      }),
      expect.objectContaining({
        owner: "Noah",
        task: "update the CRM rollout notes",
        dueDate: "2026-06-01"
      }),
      expect.objectContaining({
        owner: "Sam",
        task: "confirm finance approval",
        dueDate: "next Tuesday"
      })
    ]);
  });

  it("strips trailing periods from long tasks quickly", () => {
    const segments = segmentTranscript(`Maya: Action: Luis to review ${".".repeat(100_000)}x...`);

    const started = performance.now();
    const actions = extractActionItems(segments);

    expect(performance.now() - started).toBeLessThan(1000);
    expect(actions).toEqual([
      expect.objectContaining({ owner: "Luis", task: `review${".".repeat(100_000)}x` })
    ]);
  });
});
