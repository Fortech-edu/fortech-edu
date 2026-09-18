import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hollandCode,
  interestItems,
  riasecTypes,
  scoreInterests,
  suggestDirection,
  type Answer,
  type Answers,
  type RiasecType,
} from "./riasec.ts";

function answerAll(value: Answer): Answers {
  return Object.fromEntries(interestItems.map(({ id }) => [id, value]));
}

function answerTypes(strong: RiasecType[]): Answers {
  return Object.fromEntries(
    interestItems.map(({ id, type }) => [id, strong.includes(type) ? 2 : 0] as const),
  );
}

test("every RIASEC type has the same number of statements", () => {
  const counts = {} as Record<RiasecType, number>;
  for (const type of Object.keys(riasecTypes) as RiasecType[]) counts[type] = 0;
  for (const item of interestItems) counts[item.type] += 1;

  assert.deepEqual(new Set(Object.values(counts)), new Set([5]));
  assert.equal(interestItems.length, 30);
});

test("statement ids are unique", () => {
  const ids = new Set(interestItems.map(({ id }) => id));
  assert.equal(ids.size, interestItems.length);
});

test("unanswered statements count as zero and never exceed the maximum", () => {
  const scores = scoreInterests({});
  for (const entry of scores) {
    assert.equal(entry.score, 0);
    assert.equal(entry.max, 10);
  }

  for (const entry of scoreInterests(answerAll(2))) {
    assert.equal(entry.score, entry.max);
  }
});

test("scores are sorted and the code is the three highest types", () => {
  const scores = scoreInterests(answerTypes(["I", "R", "C"]));
  assert.equal(scores[0].score, 10);
  for (let index = 1; index < scores.length; index += 1) {
    assert.ok(scores[index - 1].score >= scores[index].score);
  }
  assert.equal(hollandCode(scores).length, 3);
});

test("the same answers always produce the same code", () => {
  const answers = answerTypes(["E", "C", "S"]);
  assert.equal(hollandCode(scoreInterests(answers)), hollandCode(scoreInterests(answers)));
});

test("investigative and realistic answers point to Computer Science", () => {
  const suggestion = suggestDirection(scoreInterests(answerTypes(["I", "R"])));
  assert.equal(suggestion.direction, "Computer Science");
});

test("enterprising and conventional answers point to Business", () => {
  const suggestion = suggestDirection(scoreInterests(answerTypes(["E", "C"])));
  assert.equal(suggestion.direction, "Business");
});

test("artistic and social answers are not pushed into a direction we do not cover", () => {
  const suggestion = suggestDirection(scoreInterests(answerTypes(["A", "S"])));
  assert.equal(suggestion.direction, null);
  assert.match(suggestion.explanation, /Computer Science and Business/);
});

test("a tie refuses to choose instead of guessing", () => {
  const suggestion = suggestDirection(scoreInterests(answerTypes(["I", "R", "E", "C"])));
  assert.equal(suggestion.direction, null);
  assert.match(suggestion.headline, /between both directions/);
});
