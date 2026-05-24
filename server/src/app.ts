import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import OpenAI from "openai";
import {
  buildFallbackAnalysis,
  MeetingAnalysisSchema,
  MeetingInputSchema,
  meetingAnalysisJsonSchema
} from "@meeting-copilot/shared";

type OpenAIClient = {
  responses?: {
    create(request: unknown): Promise<unknown>;
  };
  audio?: {
    transcriptions?: {
      create(request: unknown): Promise<unknown>;
    };
  };
};

type AppOptions = {
  openAIEnabled?: boolean;
  openAIClient?: OpenAIClient;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

export function createApp(options: AppOptions = {}) {
  const app = express();
  const openAIEnabled = options.openAIEnabled ?? Boolean(process.env.OPENAI_API_KEY);
  const openAIClient = options.openAIClient ?? createOpenAIClient();

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5173"
    })
  );
  app.use(express.json({ limit: "4mb" }));

  app.get("/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.post("/api/analyze", async (request, response, next) => {
    try {
      const parsed = MeetingInputSchema.safeParse(request.body);

      if (!parsed.success) {
        response.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues.map((issue) => issue.message).join("; ")
          }
        });
        return;
      }

      const responsesClient = openAIClient?.responses;

      if (!openAIEnabled || !responsesClient) {
        response.json({
          source: "local",
          analysis: buildFallbackAnalysis(parsed.data)
        });
        return;
      }

      const result = await responsesClient.create({
        model: process.env.OPENAI_SUMMARY_MODEL || "gpt-5.5",
        input: [
          {
            role: "system",
            content:
              "Analyze meeting transcripts into concise summaries, decisions, action items, risks, and a practical follow-up email. Return strict JSON only."
          },
          {
            role: "user",
            content: JSON.stringify(parsed.data)
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "meeting_analysis",
            schema: meetingAnalysisJsonSchema,
            strict: true
          }
        }
      });

      const outputText = readOutputText(result);
      const analysis = MeetingAnalysisSchema.parse(JSON.parse(outputText));
      response.json({ source: "openai", analysis });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/transcribe", upload.single("audio"), async (request, response, next) => {
    try {
      if (!request.file) {
        response.status(400).json({
          error: {
            code: "AUDIO_REQUIRED",
            message: "Upload an audio file in the audio form field."
          }
        });
        return;
      }

      const transcriptionClient = openAIClient?.audio?.transcriptions;

      if (!openAIEnabled || !transcriptionClient) {
        response.status(503).json({
          error: {
            code: "TRANSCRIPTION_UNAVAILABLE",
            message: "Audio transcription requires OPENAI_API_KEY on the server."
          }
        });
        return;
      }

      const audioBuffer = request.file.buffer.buffer.slice(
        request.file.buffer.byteOffset,
        request.file.buffer.byteOffset + request.file.buffer.byteLength
      ) as ArrayBuffer;
      const file = new File([audioBuffer], request.file.originalname, {
        type: request.file.mimetype || "application/octet-stream"
      });
      const transcript = await transcriptionClient.create({
        model: process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-transcribe",
        file
      });

      response.json({ transcript: readTranscriptText(transcript) });
    } catch (error) {
      next(error);
    }
  });

  app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
    response.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: error.message || "Unexpected server error."
      }
    });
  });

  return app;
}

function createOpenAIClient(): OpenAIClient | undefined {
  if (!process.env.OPENAI_API_KEY) {
    return undefined;
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) as unknown as OpenAIClient;
}

function readOutputText(result: unknown): string {
  if (typeof result === "object" && result && "output_text" in result) {
    const outputText = (result as { output_text?: unknown }).output_text;
    if (typeof outputText === "string") {
      return outputText;
    }
  }

  throw new Error("OpenAI response did not include output_text.");
}

function readTranscriptText(result: unknown): string {
  if (typeof result === "object" && result && "text" in result) {
    const text = (result as { text?: unknown }).text;
    if (typeof text === "string") {
      return text;
    }
  }

  throw new Error("OpenAI transcription did not include text.");
}
