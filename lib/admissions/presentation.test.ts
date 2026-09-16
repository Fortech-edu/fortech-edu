import assert from "node:assert/strict";
import test from "node:test";
import { demoPrograms } from "../../data/programs.ts";
import {
  formatRequirement,
  formatScoreComponent,
  getProgramSource,
} from "./presentation.ts";

test("unknown score components and requirements stay explicit", () => {
  assert.equal(formatScoreComponent(null), "Unknown");
  assert.equal(formatRequirement(null), "Unknown");
  assert.equal(formatScoreComponent(0), "0 points");
});

test("a missing source URL does not create a fake link", () => {
  assert.equal(getProgramSource(demoPrograms[0]), null);
});
