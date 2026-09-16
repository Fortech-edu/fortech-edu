import { diagnoseProfile } from "../../../../lib/admissions/diagnosis.ts";
import { getConfiguredProvider } from "../../../../lib/ai/provider.ts";
import { isAIProfile, toStudentProfile } from "../../../../lib/ai/schemas.ts";
import { createAIService } from "../../../../lib/ai/service.ts";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!isRequest(body) || !isAIProfile(body.profile)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const profile = toStudentProfile(body.profile);
    const result = await createAIService(getConfiguredProvider()).generateDiagnosis({
      profile: body.profile,
      deterministicDiagnosis: diagnoseProfile(profile),
    });
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}

function isRequest(value: unknown): value is { profile: unknown } {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length === 1 && "profile" in value;
}
