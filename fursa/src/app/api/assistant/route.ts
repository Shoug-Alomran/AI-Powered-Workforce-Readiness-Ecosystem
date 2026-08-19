import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  buildEmployerContext,
  buildStudentContext,
  buildUniversityContext,
  type AssistantContext,
} from "@/lib/assistant/context";
import {
  askAssistant,
  assistantConfigured,
  AssistantQuotaError,
  AssistantUnavailableError,
  ASSISTANT_VERSION,
  MAX_HISTORY_TURNS,
  type AssistantTurn,
} from "@/lib/assistant/llm";

// Context is assembled per request from live data and a response is never
// cached. Under Cache Components that is the default for a route handler —
// caching is opt-in via "use cache" — so the old `runtime`/`dynamic` segment
// exports are both redundant and rejected by the compiler.

const MAX_QUESTION_LENGTH = 1000;

/**
 * Rate limits, in place so a demo cannot exhaust the Cloudflare Workers AI
 * free allocation (10,000 neurons/day, roughly 280 answers at this model and
 * these caps).
 *
 * Counted from the ASSISTANT_QUERY audit rows the route already writes, so the
 * limit is durable and shared across serverless instances rather than living
 * in per-process memory. The audit rows hold no chat content.
 */
const PER_USER_HOURLY_LIMIT = 15;
const PLATFORM_DAILY_LIMIT = 200;

async function rateLimit(userId: string) {
  const now = Date.now();

  const [userCount, platformCount] = await Promise.all([
    prisma.auditEvent.count({
      where: {
        actorUserId: userId,
        action: "ASSISTANT_QUERY",
        createdAt: { gte: new Date(now - 60 * 60 * 1000) },
      },
    }),
    prisma.auditEvent.count({
      where: {
        action: "ASSISTANT_QUERY",
        createdAt: { gte: new Date(now - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  if (userCount >= PER_USER_HOURLY_LIMIT) {
    return "You have reached this hour's assistant limit. Please try again later.";
  }

  if (platformCount >= PLATFORM_DAILY_LIMIT) {
    return "The assistant has reached its daily limit for this environment. It resets in 24 hours.";
  }

  return null;
}

function parseHistory(value: unknown): AssistantTurn[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (entry): entry is AssistantTurn =>
        Boolean(entry) &&
        typeof entry === "object" &&
        (entry as AssistantTurn).role !== undefined &&
        ((entry as AssistantTurn).role === "user" || (entry as AssistantTurn).role === "assistant") &&
        typeof (entry as AssistantTurn).content === "string",
    )
    .map((entry) => ({ role: entry.role, content: entry.content.slice(0, MAX_QUESTION_LENGTH) }))
    .slice(-MAX_HISTORY_TURNS);
}

export async function POST(request: Request) {
  // 1. Authenticate. The assistant is never available anonymously.
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to use the Fursah assistant." }, { status: 401 });
  }

  if (!assistantConfigured()) {
    return NextResponse.json(
      {
        error:
          "The assistant is not configured on this environment. ASSISTANT_AI_URL is required (the secret is reused from EVIDENCE_AI_SECRET unless ASSISTANT_AI_SECRET is set).",
      },
      { status: 503 },
    );
  }

  const limited = await rateLimit(user.id);
  if (limited) {
    return NextResponse.json({ error: limited }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const payload = (body ?? {}) as { question?: unknown; history?: unknown };
  const question = typeof payload.question === "string" ? payload.question.trim() : "";

  if (!question) {
    return NextResponse.json({ error: "Ask a question to get started." }, { status: 400 });
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json({ error: "That question is too long. Please shorten it." }, { status: 400 });
  }

  // 2. Assemble ONLY the context this role is authorized to see. The role is
  //    taken from the server-side session, never from the request body, so a
  //    client cannot ask for another role's grounding pack.
  let context: AssistantContext;

  try {
    if (user.role === "STUDENT" && user.student) {
      context = await buildStudentContext(user.student.id);
    } else if (user.role === "EMPLOYER" && user.employer) {
      context = await buildEmployerContext(user.employer.id);
    } else if (user.role === "UNIVERSITY" && user.university) {
      context = await buildUniversityContext(user.university.id);
    } else {
      return NextResponse.json(
        { error: "The assistant is available to student, employer, and university accounts." },
        { status: 403 },
      );
    }
  } catch (error) {
    console.error("Assistant context assembly failed", error);
    return NextResponse.json({ error: "Could not load your Fursah data. Please try again." }, { status: 500 });
  }

  // 3. Ask the model, grounded in that context.
  try {
    const result = await askAssistant({
      context,
      question,
      history: parseHistory(payload.history),
    });

    // 4. Audit the interaction. Mode, role, and model version are recorded so
    //    an answer is traceable; the question and answer text are deliberately
    //    NOT stored, to avoid retaining conversational content unnecessarily.
    await prisma.auditEvent.create({
      data: {
        actorUserId: user.id,
        action: "ASSISTANT_QUERY",
        entityType: "ASSISTANT",
        entityId: context.role,
        modelVersion: `${result.assistantVersion}+${result.model}`,
        explanation: `Role-scoped assistant answered a ${context.role.toLowerCase()} question grounded in ${context.modelVersions.join(", ")}. Content not retained.`,
      },
    }).catch((error) => {
      // An audit failure must not cost the user their answer.
      console.error("Assistant audit write failed", error);
    });

    return NextResponse.json({
      answer: result.answer,
      role: context.role,
      model: result.model,
      assistantVersion: ASSISTANT_VERSION,
      groundedIn: context.modelVersions,
    });
  } catch (error) {
    if (error instanceof AssistantQuotaError) {
      return NextResponse.json(
        {
          error:
            "Today's free Cloudflare Workers AI allocation is used up. The assistant will work again after the daily reset — everything else on this page still works.",
        },
        { status: 429 },
      );
    }

    if (error instanceof AssistantUnavailableError) {
      console.error("Assistant unavailable", error.message);
      return NextResponse.json(
        { error: "The assistant service could not be reached just now. Please try again." },
        { status: 502 },
      );
    }

    console.error("Assistant request failed", error);
    return NextResponse.json({ error: "The assistant could not answer just now. Please try again." }, { status: 502 });
  }
}
