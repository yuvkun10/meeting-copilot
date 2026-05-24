import { describe, expect, it } from "vitest";
import { exportAnalysisJson, exportAnalysisMarkdown, validateMeetingAnalysis } from "../src/index";

describe("meeting export formatting", () => {
  const analysis = validateMeetingAnalysis({
    summary: "A short launch review summary.",
    decisions: ["Use a staged rollout."],
    actionItems: [
      {
        task: "Prepare launch checklist",
        owner: "Luis",
        dueDate: "2026-06-01",
        source: "Luis: I will prepare the launch checklist by 2026-06-01."
      }
    ],
    risks: [
      {
        risk: "Approval could slip.",
        mitigation: "Escalate early.",
        severity: "medium"
      }
    ],
    followUpEmail: {
      subject: "Launch review follow-up",
      body: "Thanks for the useful launch review."
    }
  });

  it("exports markdown with stable sections and no null placeholders", () => {
    const markdown = exportAnalysisMarkdown(analysis, {
      title: "Launch Review",
      agenda: "Launch readiness",
      context: "Beta cohort"
    });

    expect(markdown).toContain("# Launch Review");
    expect(markdown).toContain("## Action Items");
    expect(markdown).toContain("- [ ] Prepare launch checklist - Owner: Luis - Due: 2026-06-01");
    expect(markdown).not.toContain("undefined");
    expect(markdown).not.toContain("null");
  });

  it("exports pretty JSON that round-trips", () => {
    const json = exportAnalysisJson(analysis);

    expect(JSON.parse(json)).toMatchObject({
      summary: "A short launch review summary.",
      decisions: ["Use a staged rollout."]
    });
    expect(json).toContain("\n  ");
  });
});
