import assert from "node:assert/strict";
import test from "node:test";
import type { ChangeImpact, ProgramChange } from "./change-impact.ts";
import {
  impactCounts,
  presentChangedInput,
  programChangeDescription,
  recentChangeLabel,
} from "./change-impact-presentation.ts";

const change: ProgramChange = {
  programId: "program",
  universityName: "Test University",
  programName: "Test Program",
  previousRank: 4,
  nextRank: 2,
  previousFitScore: 70,
  nextFitScore: 75,
  previousEligibility: "with_actions",
  nextEligibility: "eligible_now",
  structuralChange: "moved_up",
  fitComponentChanges: [],
  reasonCodes: ["eligibility_changed"],
};

test("known and unknown IELTS changes use neutral factual wording", () => {
  assert.deepEqual(presentChangedInput({ input: "ieltsScore", previousValue: 5.5, nextValue: 6.5 }), {
    label: "IELTS",
    previous: "5.5",
    next: "6.5",
  });
  assert.deepEqual(presentChangedInput({ input: "ieltsScore", previousValue: null, nextValue: 6.5 }), {
    label: "IELTS",
    previous: "Not provided",
    next: "6.5",
  });
});

test("country additions and removals stay explicit", () => {
  assert.deepEqual(presentChangedInput({ input: "preferredCountries", addedCountries: ["Netherlands"], removedCountries: ["Finland"] }), {
    label: "Countries",
    previous: "Removed Finland",
    next: "Added Netherlands",
  });
});

test("each card receives at most one prioritized recent-change label", () => {
  assert.equal(recentChangeLabel({ ...change, structuralChange: "entered", previousRank: null }), "New match");
  assert.equal(recentChangeLabel(change), "Eligibility updated");
  assert.equal(recentChangeLabel({ ...change, previousEligibility: "eligible_now", structuralChange: "moved_up" }), "Moved up");
  assert.equal(recentChangeLabel({ ...change, previousEligibility: "eligible_now", structuralChange: "moved_down" }), "Moved down");
  assert.equal(recentChangeLabel({ ...change, previousEligibility: "eligible_now", structuralChange: "unchanged" }), "Updated fit");
  assert.equal(recentChangeLabel(undefined), null);
});

test("impact summary includes deterministic counts and fit updates", () => {
  const impact: ChangeImpact = {
    changedInputs: [],
    programChanges: [change],
    summary: { entered: 1, removed: 1, movedUp: 1, movedDown: 1, eligibilityChanged: 1 },
  };
  assert.deepEqual(impactCounts(impact), [
    "1 new match",
    "1 removed match",
    "1 moved up",
    "1 moved down",
    "1 eligibility updated",
    "1 fit updated",
  ]);
  assert.equal(programChangeDescription(change), "#4 → #2");
  assert.equal(programChangeDescription({ ...change, structuralChange: "removed", nextRank: null }), "No longer in your shortlist");
});
