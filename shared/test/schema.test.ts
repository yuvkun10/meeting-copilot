import { describe, expect, it } from "vitest";
import { validateMeetingAnalysis } from "../src/index";

describe("validateMeetingAnalysis", () => {
  it("accepts a complete meeting analysis payload", () => {
    const analysis = validateMeetingAnalysis({
      summary: "The team agreed on a staged launch and clear readiness owners.",
      decisions: ["Use a staged rollout."],
      actionItems: [
        {
          task: "Prepare launch checklist",
          owner: "Luis",
          dueDate: "2026-06-01",
          source: "Luis confirmed ownership."
        }
      ],
      risks: [
        {
          risk: "Finance approval may slip.",
          mitigation: "Escalate by Tuesday.",
          severity: "medium"
        }
      ],
      followUpEmail: {
        subject: "Launch review follow-up",
        body: "Thanks everyone. Here are the decisions and next steps."
      }
    });

    expect(analysis.actionItems[0]?.owner).toBe("Luis");
  });

  it("rejects malformed analysis payloads before export or display", () => {
    expect(() =>
      validateMeetingAnalysis({
        summary: "Incomplete",
        actionItems: "not an array"
      })
    ).toThrow();
  });
});
