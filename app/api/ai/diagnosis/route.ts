import { programs } from "../../../../data/programs.ts";
import { diagnoseTarget } from "../../../../lib/admissions/diagnosis.ts";
import { getConfiguredProvider } from "../../../../lib/ai/provider.ts";
import { isAIProfile, toDiagnosisAIInput, toStudentProfile } from "../../../../lib/ai/schemas.ts";
import { createAIService } from "../../../../lib/ai/service.ts";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!isRequest(body) || !isAIProfile(body.profile)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const program = programs.find(({ id }) => id === body.programId);
    if (!program) return Response.json({ error: "Program not found" }, { status: 404 });

    const profile = toStudentProfile(body.profile);
    const diagnosis = diagnoseTarget(profile, program);
    if (!diagnosis) return Response.json({ error: "Program not found" }, { status: 404 });

    const result = await createAIService(getConfiguredProvider()).generateDiagnosis(
      toDiagnosisAIInput(profile, program, diagnosis),
    );
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
