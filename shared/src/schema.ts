import { z } from "zod";

export const TranscriptSegmentSchema = z.object({
  id: z.string().min(1),
  speaker: z.string().min(1),
  text: z.string().min(1),
  startSeconds: z.number().nonnegative().nullable(),
  endSeconds: z.number().nonnegative().nullable()
});

export const MeetingInputSchema = z.object({
  title: z.string().trim().min(1).max(160).default("Untitled meeting"),
  agenda: z.string().trim().max(4000).default(""),
  context: z.string().trim().max(6000).default(""),
  transcript: z.string().trim().min(20).max(150000)
});

export const ActionItemSchema = z.object({
  task: z.string().trim().min(1),
  owner: z.string().trim().min(1).nullable(),
  dueDate: z.string().trim().min(1).nullable(),
  source: z.string().trim().min(1).nullable()
});

export const RiskSchema = z.object({
  risk: z.string().trim().min(1),
  mitigation: z.string().trim().min(1).nullable(),
  severity: z.enum(["low", "medium", "high"])
});

export const FollowUpEmailSchema = z.object({
  subject: z.string().trim().min(1),
  body: z.string().trim().min(1)
});

export const MeetingAnalysisSchema = z.object({
  summary: z.string().trim().min(1),
  decisions: z.array(z.string().trim().min(1)),
  actionItems: z.array(ActionItemSchema),
  risks: z.array(RiskSchema),
  followUpEmail: FollowUpEmailSchema
});

export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;
export type MeetingInput = z.infer<typeof MeetingInputSchema>;
export type ActionItem = z.infer<typeof ActionItemSchema>;
export type Risk = z.infer<typeof RiskSchema>;
export type FollowUpEmail = z.infer<typeof FollowUpEmailSchema>;
export type MeetingAnalysis = z.infer<typeof MeetingAnalysisSchema>;

export function validateMeetingAnalysis(value: unknown): MeetingAnalysis {
  return MeetingAnalysisSchema.parse(value);
}

export const meetingAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "decisions", "actionItems", "risks", "followUpEmail"],
  properties: {
    summary: { type: "string" },
    decisions: {
      type: "array",
      items: { type: "string" }
    },
    actionItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["task", "owner", "dueDate", "source"],
        properties: {
          task: { type: "string" },
          owner: { type: ["string", "null"] },
          dueDate: { type: ["string", "null"] },
          source: { type: ["string", "null"] }
        }
      }
    },
    risks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["risk", "mitigation", "severity"],
        properties: {
          risk: { type: "string" },
          mitigation: { type: ["string", "null"] },
          severity: { type: "string", enum: ["low", "medium", "high"] }
        }
      }
    },
    followUpEmail: {
      type: "object",
      additionalProperties: false,
      required: ["subject", "body"],
      properties: {
        subject: { type: "string" },
        body: { type: "string" }
      }
    }
  }
} as const;
