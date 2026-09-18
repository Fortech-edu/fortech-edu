import assert from "node:assert/strict";
import test from "node:test";
import { parseCompareSelection, toggleCompareSelection } from "./selection.ts";

test("comparison selection supports zero and one selected program", () => {
  assert.deepEqual(parseCompareSelection(null), []);
  assert.deepEqual(toggleCompareSelection([], "one"), ["one"]);
  assert.deepEqual(parseCompareSelection('["one"]'), ["one"]);
});

test("comparison selection restores two unique program IDs", () => {
  assert.deepEqual(parseCompareSelection('["one","two","one","three"]'), ["one", "two"]);
});

test("malformed comparison state restores safely", () => {
  assert.deepEqual(parseCompareSelection("not json"), []);
  assert.deepEqual(parseCompareSelection('{"program":"one"}'), []);
});

test("comparison selection cannot exceed two programs", () => {
  assert.deepEqual(toggleCompareSelection(["one", "two"], "three"), ["one", "two"]);
  assert.deepEqual(toggleCompareSelection(["one", "two"], "one"), ["two"]);
});
