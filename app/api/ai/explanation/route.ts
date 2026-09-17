import { programs } from "../../../../data/programs.ts";
import { assessProgram } from "../../../../lib/admissions/recommend.ts";
import { getConfiguredProvider } from "../../../../lib/ai/provider.ts";
import { isAIProfile, toStudentProfile } from "../../../../lib/ai/schemas.ts";
import { createAIService } from "../../../../lib/ai/service.ts";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!isRequest(body) || !isAIProfile(body.profile)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const program = programs.find(({ id }) => id === body.programId);
    if (!program) return Response.json({ error: "Program not found" }, { status: 404 });

    const assessed = assessProgram(
      toStudentProfile(body.profile),
      program,
    );
    const result = await createAIService(getConfiguredProvider()).generateRecommendationExplanation({
      profile: body.profile,
      programFacts: program,
      recommendation: {
        fitScore: assessed.fitScore,
        dataCoverage: assessed.dataCoverage,
        breakdown: assessed.breakdown,
        eligibility: assessed.eligibility,
        reasons: assessed.reasons,
        gaps: assessed.gaps,
      },
    });
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}

function isRequest(value: unknown): value is { profile: unknown; programId: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return Object.keys(candidate).length === 2 && typeof candidate.programId === "string" && "profile" in candidate;
}
