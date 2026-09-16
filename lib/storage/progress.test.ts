import assert from "node:assert/strict";
import test from "node:test";
import { parseProgress, toggleCompletedTask } from "./progress.ts";

test("completed task persistence restores safely", () => {
  assert.deepEqual(parseProgress("not json"), { version: 1, byProgram: {} });
  assert.deepEqual(
    parseProgress('{"version":1,"byProgram":{"program-a":["task-1","task-1",4]}}'),
    { version: 1, byProgram: { "program-a": ["task-1"] } },
  );
});

test("completion state remains isolated by selected program", () => {
  const restored = parseProgress('{"version":1,"byProgram":{"program-a":["a:one"],"program-b":["b:one"]}}');
  assert.deepEqual(restored.byProgram["program-a"], ["a:one"]);
  assert.deepEqual(restored.byProgram["program-b"], ["b:one"]);
});

test("completion can be toggled in either direction", () => {
  assert.deepEqual(toggleCompletedTask([], "task-1"), ["task-1"]);
  assert.deepEqual(toggleCompletedTask(["task-1"], "task-1"), []);
});
