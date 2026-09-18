import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { afterEach, beforeEach } from "node:test";
import type { StudentProfile } from "../../types/admissions.ts";
import { loadJourneyState } from "../storage/journey.ts";
import { loadStoredProfile, saveStoredProfile } from "../storage/profile.ts";
import { ROADMAP_PROGRESS_KEY } from "../storage/progress.ts";
import {
  COMPARE_STORAGE_KEY,
  SELECTED_PROGRAM_STORAGE_KEY,
} from "../storage/selection.ts";
import { JOURNEY_UPDATED_AT_KEY } from "../storage/sync-events.ts";
import { getSupabaseClient } from "./client.ts";
import {
  parseRemoteProfile,
  parseRemoteJourney,
  serializeJourney,
  serializeProfile,
  synchronizePersistence,
} from "./sync.ts";
import type { PersistenceGateway } from "./sync.ts";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

const storage = new MemoryStorage();
const profile: StudentProfile = {
  fullName: "Local only",
  nationality: "Local only",
  countryOfResidence: "Local only",
  currentStudyStage: "High school",
  targetDegree: "Bachelor's",
  intendedField: "Computer Science",
  preferredCountries: ["Canada"],
  preferredLanguage: null,
  activitiesAndAchievements: "Robotics project and volunteering",
  targetIntake: "2027",
  gpa: 3.5,
  ieltsScore: 6.5,
  satScore: null,
  annualBudget: 25_000,
  budgetCurrency: "USD",
};

beforeEach(() => {
  storage.clear();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage, dispatchEvent: () => true },
  });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
});

function gateway(overrides: Partial<PersistenceGateway> = {}): PersistenceGateway {
  return {
    getUserId: async () => "user-1",
    loadProfile: async () => null,
    loadJourney: async () => null,
    saveProfile: async () => undefined,
    saveJourney: async () => undefined,
    ...overrides,
  };
}

function remoteProfile(updatedAt: string, intendedField = "Computer Science") {
  return {
    profile: { ...serializeProfile({
      version: 1,
      profile: { ...profile, intendedField },
      step: 4,
      completed: true,
      updatedAt,
    }) },
    step: 4,
    completed: true,
    updated_at: updatedAt,
  };
}

function setLocalJourney(updatedAt: string) {
  storage.setItem(SELECTED_PROGRAM_STORAGE_KEY, "program-a");
  storage.setItem(COMPARE_STORAGE_KEY, '["program-a","program-b"]');
  storage.setItem(ROADMAP_PROGRESS_KEY, '{"version":1,"byProgram":{"program-a":["program-a:documents"]}}');
  storage.setItem(JOURNEY_UPDATED_AT_KEY, updatedAt);
}

test("local persistence works when Supabase environment variables are absent", () => {
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oldPublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const oldKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  try {
    assert.equal(getSupabaseClient(), null);
    assert.equal(saveStoredProfile(profile, 4, true, { notify: false }), true);
    assert.deepEqual(loadStoredProfile()?.profile, profile);
  } finally {
    if (oldUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldPublishableKey) process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = oldPublishableKey;
    if (oldKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = oldKey;
  }
});

test("remote failure leaves the immediately saved local profile intact", async () => {
  saveStoredProfile(profile, 4, true, { updatedAt: "2026-01-02T00:00:00.000Z", notify: false });
  await assert.rejects(synchronizePersistence(gateway({
    loadProfile: async () => { throw new Error("offline"); },
  })));
  assert.deepEqual(loadStoredProfile()?.profile, profile);
});

test("newer local state wins and is sent to remote storage", async () => {
  const saved: string[] = [];
  saveStoredProfile(profile, 4, true, { updatedAt: "2026-02-02T00:00:00.000Z", notify: false });
  await synchronizePersistence(gateway({
    loadProfile: async () => remoteProfile("2026-02-01T00:00:00.000Z", "Business"),
    saveProfile: async (_userId, value) => { saved.push(value.profile.intendedField ?? ""); },
  }));
  assert.deepEqual(saved, ["Computer Science"]);
  assert.equal(loadStoredProfile()?.profile.intendedField, "Computer Science");
});

test("newer valid remote profile restores locally without remote-only personal data", async () => {
  saveStoredProfile(profile, 4, true, { updatedAt: "2026-02-01T00:00:00.000Z", notify: false });
  await synchronizePersistence(gateway({
    loadProfile: async () => remoteProfile("2026-02-02T00:00:00.000Z", "Business"),
  }));
  const restored = loadStoredProfile();
  assert.equal(restored?.profile.intendedField, "Business");
  assert.equal(restored?.profile.fullName, "Local only");
});

test("malformed remote profile is ignored safely", async () => {
  saveStoredProfile(profile, 4, true, { updatedAt: "2026-02-01T00:00:00.000Z", notify: false });
  await synchronizePersistence(gateway({
    loadProfile: async () => ({ ...remoteProfile("2026-02-02T00:00:00.000Z"), profile: { intendedField: 12 } }),
  }));
  assert.deepEqual(loadStoredProfile()?.profile, profile);
});

test("malformed remote journey state is ignored safely", async () => {
  setLocalJourney("2026-02-01T00:00:00.000Z");
  await synchronizePersistence(gateway({
    loadJourney: async () => ({
      selected_program_id: "program-x",
      compare_program_ids: ["a", "b", "c"],
      completed_task_ids: {},
      updated_at: "2026-02-02T00:00:00.000Z",
    }),
  }));
  assert.equal(loadJourneyState().selectedProgramId, "program-a");
});

test("remote comparison remains limited to two IDs", () => {
  assert.equal(parseRemoteJourney({
    selected_program_id: null,
    compare_program_ids: ["a", "b", "c"],
    completed_task_ids: {},
    updated_at: "2026-02-02T00:00:00.000Z",
  }), null);
});

test("selected program and per-program roadmap progress restore from remote", async () => {
  await synchronizePersistence(gateway({
    loadJourney: async () => ({
      selected_program_id: "program-b",
      compare_program_ids: ["program-b", "program-c"],
      completed_task_ids: {
        "program-b": ["program-b:documents"],
        "program-c": ["program-c:deadline"],
      },
      updated_at: "2026-02-02T00:00:00.000Z",
    }),
  }));
  const restored = loadJourneyState();
  assert.equal(restored.selectedProgramId, "program-b");
  assert.deepEqual(restored.compareProgramIds, ["program-b", "program-c"]);
  assert.deepEqual(restored.completedTaskIds, {
    "program-b": ["program-b:documents"],
    "program-c": ["program-c:deadline"],
  });
});

test("remote payloads contain source state only, never derived recommendations or roadmaps", () => {
  setLocalJourney("2026-02-02T00:00:00.000Z");
  const payload = serializeJourney(loadJourneyState());
  assert.deepEqual(Object.keys(payload).sort(), [
    "compare_program_ids",
    "completed_task_ids",
    "selected_program_id",
    "updated_at",
  ]);
  assert.equal("recommendations" in payload, false);
  assert.equal("roadmap" in payload, false);
});

test("profile payload excludes unused identifying fields", () => {
  const payload = serializeProfile({
    version: 1,
    profile,
    step: 4,
    completed: true,
    updatedAt: "2026-02-02T00:00:00.000Z",
  });
  assert.equal("fullName" in payload, false);
  assert.equal("nationality" in payload, false);
  assert.equal("countryOfResidence" in payload, false);
});

test("profile payload preserves an optional language preference", () => {
  const payload = serializeProfile({ version: 1, profile: { ...profile, preferredLanguage: "English" }, step: 4, completed: true, updatedAt: "2026-02-02T00:00:00.000Z" });
  assert.equal(payload.preferredLanguage, "English");
});

test("profile persistence preserves activities and accepts legacy remote profiles", () => {
  const payload = serializeProfile({ version: 1, profile, step: 4, completed: true, updatedAt: "2026-02-02T00:00:00.000Z" });
  assert.equal(payload.activitiesAndAchievements, "Robotics project and volunteering");
  assert.equal(parseRemoteProfile(remoteProfile("2026-02-02T00:00:00.000Z"))?.profile.activitiesAndAchievements, "Robotics project and volunteering");

  const legacy = remoteProfile("2026-02-02T00:00:00.000Z");
  delete legacy.profile.activitiesAndAchievements;
  assert.equal(parseRemoteProfile(legacy)?.profile.activitiesAndAchievements, null);
});

test("profile sync preserves instant flow stage and accepts legacy records without it", () => {
  const stored = {
    version: 1 as const,
    profile: { ...profile, gpa: 3.4 },
    step: 1,
    completed: false,
    flowStage: "diagnosis" as const,
    updatedAt: "2026-09-18T00:00:00.000Z",
  };
  const payload = serializeProfile(stored);
  const remote = {
    profile: payload,
    step: stored.step,
    completed: stored.completed,
    updated_at: stored.updatedAt,
  };

  assert.equal(payload.flowStage, "diagnosis");
  assert.equal(parseRemoteProfile(remote)?.flowStage, "diagnosis");

  delete remote.profile.flowStage;
  assert.equal(parseRemoteProfile(remote)?.flowStage, "onboarding");
});

test("client-side Supabase code never references privileged keys", () => {
  const source = [
    readFileSync(new URL("./client.ts", import.meta.url), "utf8"),
    readFileSync(new URL("./sync.ts", import.meta.url), "utf8"),
    readFileSync(new URL("../../components/persistence-sync.tsx", import.meta.url), "utf8"),
  ].join("\n");
  const privilegedKey = new RegExp(["service", "role"].join("[_-]?"), "i");
  assert.equal(privilegedKey.test(source), false);
  assert.equal(source.includes(["SUPABASE", "SECRET", "KEY"].join("_")), false);
});
