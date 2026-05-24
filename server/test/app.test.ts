import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";

describe("meeting API", () => {
  it("rejects invalid analysis payloads", async () => {
    const app = createApp({ openAIEnabled: false });

    const response = await request(app).post("/api/analyze").send({
      title: "Too short",
      transcript: "Hi"
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns deterministic fallback analysis without network calls", async () => {
    const app = createApp({ openAIEnabled: false });

    const response = await request(app)
      .post("/api/analyze")
      .send({
        title: "Launch Review",
        agenda: "Launch readiness",
        context: "Beta cohort",
        transcript:
          "Maya: Decision: use a staged rollout.\nLuis: Action: Luis to prepare launch checklist by 2026-06-01.\nPriya: Risk: finance approval may slip."
      });

    expect(response.status).toBe(200);
    expect(response.body.source).toBe("local");
    expect(response.body.analysis.decisions).toEqual(["use a staged rollout"]);
    expect(response.body.analysis.actionItems[0]).toMatchObject({
      owner: "Luis",
      dueDate: "2026-06-01"
    });
  });

  it("uses gpt-5.5 through an injected server-side OpenAI client", async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({
        summary: "The model summary is valid.",
        decisions: ["Approve staged rollout."],
        actionItems: [
          {
            task: "Send launch checklist",
            owner: "Luis",
            dueDate: "2026-06-01",
            source: "Luis owns the launch checklist."
          }
        ],
        risks: [],
        followUpEmail: {
          subject: "Launch review follow-up",
          body: "Thanks team. The staged rollout is approved."
        }
      })
    });
    const app = createApp({
      openAIEnabled: true,
      openAIClient: {
        responses: { create }
      }
    });

    const response = await request(app)
      .post("/api/analyze")
      .send({
        title: "Launch Review",
        agenda: "Launch readiness",
        context: "Beta cohort",
        transcript:
          "Maya: We need a launch plan that covers approvals.\nLuis: I will send the checklist by 2026-06-01."
      });

    expect(response.status).toBe(200);
    expect(response.body.source).toBe("openai");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5.5" }));
  });
});

describe("audio transcription API", () => {
  it("rejects missing audio uploads", async () => {
    const app = createApp({ openAIEnabled: false });

    const response = await request(app).post("/api/transcribe");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("AUDIO_REQUIRED");
  });

  it("transcribes uploaded audio through an injected server-side OpenAI client", async () => {
    const create = vi.fn().mockResolvedValue({ text: "Maya: Welcome to the meeting." });
    const app = createApp({
      openAIEnabled: true,
      openAIClient: {
        audio: {
          transcriptions: { create }
        }
      }
    });

    const response = await request(app)
      .post("/api/transcribe")
      .attach("audio", Buffer.from("fake audio"), {
        filename: "meeting.mp3",
        contentType: "audio/mpeg"
      });

    expect(response.status).toBe(200);
    expect(response.body.transcript).toBe("Maya: Welcome to the meeting.");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-4o-transcribe" }));
  });
});
