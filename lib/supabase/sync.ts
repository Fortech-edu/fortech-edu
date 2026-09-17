import type { SupabaseClient } from "@supabase/supabase-js";
import type { StudentProfile } from "../../types/admissions.ts";
import { applyJourneyState, loadJourneyState, parseJourneyState } from "../storage/journey.ts";
import type { JourneyState } from "../storage/journey.ts";
import { isStudentProfile, loadStoredProfile, saveStoredProfile } from "../storage/profile.ts";
import type { StoredProfile } from "../storage/profile.ts";
import { getSupabaseClient } from "./client.ts";
import type { Database, Json, PersistedStudentProfile } from "./types.ts";

const SYNC_TIMEOUT_MS = 5_000;

export interface PersistenceGateway {
  getUserId(): Promise<string>;
  loadProfile(userId: string): Promise<unknown | null>;
  loadJourney(userId: string): Promise<unknown | null>;
  saveProfile(userId: string, profile: StoredProfile): Promise<void>;
  saveJourney(userId: string, journey: JourneyState): Promise<void>;
}

export function chooseNewer<T extends { updatedAt: string }>(local: T | null, remote: T | null) {
  if (!local) return remote ? { source: "remote" as const, value: remote } : null;
  if (!remote) return { source: "local" as const, value: local };
  return Date.parse(remote.updatedAt) > Date.parse(local.updatedAt)
    ? { source: "remote" as const, value: remote }
    : { source: "local" as const, value: local };
}

export function serializeProfile(profile: StoredProfile): PersistedStudentProfile {
  const {
    currentStudyStage,
    targetDegree,
    intendedField,
    preferredCountries,
    targetIntake,
    gpa,
    ieltsScore,
    satScore,
    annualBudget,
    budgetCurrency,
  } = profile.profile;
  return {
    currentStudyStage,
    targetDegree,
    intendedField,
    preferredCountries,
    targetIntake,
    gpa,
    ieltsScore,
    satScore,
    annualBudget,
    budgetCurrency,
  };
}

export function serializeJourney(journey: JourneyState) {
  return {
    selected_program_id: journey.selectedProgramId,
    compare_program_ids: journey.compareProgramIds,
    completed_task_ids: journey.completedTaskIds,
    updated_at: journey.updatedAt,
  };
}

export function parseRemoteProfile(value: unknown, localProfile: StudentProfile | null = null): StoredProfile | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.step !== "number" ||
    !Number.isInteger(row.step) ||
    row.step < 1 ||
    row.step > 4 ||
    typeof row.completed !== "boolean" ||
    typeof row.updated_at !== "string" ||
    Number.isNaN(Date.parse(row.updated_at)) ||
    typeof row.profile !== "object" ||
    row.profile === null ||
    Array.isArray(row.profile)
  ) return null;

  const remote = row.profile as Record<string, unknown>;
  const profileKeys = [
    "currentStudyStage",
    "targetDegree",
    "intendedField",
    "preferredCountries",
    "targetIntake",
    "gpa",
    "ieltsScore",
    "satScore",
    "annualBudget",
    "budgetCurrency",
  ];
  if (Object.keys(remote).length !== profileKeys.length || !profileKeys.every((key) => key in remote)) return null;
  const candidate: StudentProfile = {
    fullName: localProfile?.fullName ?? null,
    nationality: localProfile?.nationality ?? null,
    countryOfResidence: localProfile?.countryOfResidence ?? null,
    currentStudyStage: remote.currentStudyStage as string | null,
    targetDegree: remote.targetDegree as string | null,
    intendedField: remote.intendedField as string | null,
    preferredCountries: remote.preferredCountries as string[],
    targetIntake: remote.targetIntake as string | null,
    gpa: remote.gpa as number | null,
    ieltsScore: remote.ieltsScore as number | null,
    satScore: remote.satScore as number | null,
    annualBudget: remote.annualBudget as number | null,
    budgetCurrency: remote.budgetCurrency as string | null,
  };
  if (!isStudentProfile(candidate)) return null;

  return {
    version: 1,
    profile: candidate,
    step: row.step,
    completed: row.completed,
    updatedAt: row.updated_at,
  };
}

export function parseRemoteJourney(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  return parseJourneyState({
    selectedProgramId: row.selected_program_id,
    compareProgramIds: row.compare_program_ids,
    completedTaskIds: row.completed_task_ids,
    updatedAt: row.updated_at,
  });
}

export async function synchronizePersistence(gateway: PersistenceGateway) {
  const userId = await gateway.getUserId();
  const [rawProfile, rawJourney] = await Promise.all([
    gateway.loadProfile(userId),
    gateway.loadJourney(userId),
  ]);

  const localProfile = loadStoredProfile();
  const remoteProfile = parseRemoteProfile(rawProfile, localProfile?.profile ?? null);
  const profileWinner = chooseNewer(localProfile, remoteProfile);
  if (profileWinner?.source === "remote") {
    const { profile, step, completed, updatedAt } = profileWinner.value;
    saveStoredProfile(profile, step, completed, { source: "remote", updatedAt });
  } else if (profileWinner?.source === "local" && (!remoteProfile || profileWinner.value.updatedAt !== remoteProfile.updatedAt)) {
    await gateway.saveProfile(userId, profileWinner.value);
  }

  const localJourney = loadJourneyState();
  const remoteJourney = parseRemoteJourney(rawJourney);
  const journeyWinner = chooseNewer(localJourney, remoteJourney);
  if (journeyWinner?.source === "remote") {
    applyJourneyState(journeyWinner.value);
  } else if (journeyWinner?.source === "local" && (!remoteJourney || journeyWinner.value.updatedAt !== remoteJourney.updatedAt)) {
    await gateway.saveJourney(userId, journeyWinner.value);
  }
}

export function createSupabaseGateway(client: SupabaseClient<Database>): PersistenceGateway {
  return {
    async getUserId() {
      const session = await withTimeout(client.auth.getSession());
      if (session.error) throw new Error("SupabaseSessionUnavailable");
      if (session.data.session?.user.id) return session.data.session.user.id;

      const signedIn = await withTimeout(client.auth.signInAnonymously());
      if (signedIn.error || !signedIn.data.user) throw new Error("SupabaseAnonymousSignInUnavailable");
      return signedIn.data.user.id;
    },
    async loadProfile(userId) {
      const result = await withTimeout(client.from("profiles").select("profile, step, completed, updated_at").eq("user_id", userId).maybeSingle());
      if (result.error) throw new Error("SupabaseProfileReadFailed");
      return result.data;
    },
    async loadJourney(userId) {
      const result = await withTimeout(client.from("journey_state").select("selected_program_id, compare_program_ids, completed_task_ids, updated_at").eq("user_id", userId).maybeSingle());
      if (result.error) throw new Error("SupabaseJourneyReadFailed");
      return result.data;
    },
    async saveProfile(userId, profile) {
      const result = await withTimeout(client.from("profiles").upsert({
        user_id: userId,
        profile: serializeProfile(profile) as Json,
        step: profile.step,
        completed: profile.completed,
        updated_at: profile.updatedAt,
      }, { onConflict: "user_id" }));
      if (result.error) throw new Error("SupabaseProfileWriteFailed");
    },
    async saveJourney(userId, journey) {
      const value = serializeJourney(journey);
      const result = await withTimeout(client.from("journey_state").upsert({
        user_id: userId,
        ...value,
        compare_program_ids: value.compare_program_ids as Json,
        completed_task_ids: value.completed_task_ids as Json,
      }, { onConflict: "user_id" }));
      if (result.error) throw new Error("SupabaseJourneyWriteFailed");
    },
  };
}

let running: Promise<void> | null = null;
let queued = false;

export function requestPersistenceSync() {
  if (running) {
    queued = true;
    return running;
  }

  running = (async () => {
    do {
      queued = false;
      const client = getSupabaseClient();
      if (!client) return;
      try {
        await synchronizePersistence(createSupabaseGateway(client));
      } catch {
        console.info("Cloud sync is unavailable; local progress remains saved.");
      }
    } while (queued);
  })().finally(() => {
    running = null;
  });

  return running;
}

function withTimeout<T>(operation: PromiseLike<T>) {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    Promise.resolve(operation),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("SupabaseTimeout")), SYNC_TIMEOUT_MS);
    }),
  ]).finally(() => clearTimeout(timer));
}
