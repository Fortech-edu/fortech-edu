/**
 * A short interest questionnaire based on Holland's RIASEC model.
 *
 * Holland's theory describes interests with six types and suggests people do
 * better in environments that match the types they score highest on. Scoring is
 * plain arithmetic: every statement belongs to one type, answers are summed, and
 * the three highest types form a code such as IRC.
 *
 * This is NOT a psychometric assessment. It is not validated, it does not
 * predict success, and it never changes deterministic program matching — the
 * result only suggests which study direction to start from. The user chooses.
 */

export const riasecTypes = {
  R: { label: "Realistic", blurb: "Building, fixing and working with real objects and machines." },
  I: { label: "Investigative", blurb: "Analysing, researching and understanding how things work." },
  A: { label: "Artistic", blurb: "Creating, designing and expressing ideas in your own form." },
  S: { label: "Social", blurb: "Teaching, helping and working closely with people." },
  E: { label: "Enterprising", blurb: "Persuading, leading and starting things that involve others." },
  C: { label: "Conventional", blurb: "Organising, keeping records and working to clear procedures." },
} as const;

export type RiasecType = keyof typeof riasecTypes;

export type InterestItem = { id: string; type: RiasecType; text: string };

/** Five statements per type, in mixed order so the pattern is not obvious. */
export const interestItems: InterestItem[] = [
  { id: "q01", type: "I", text: "Work out why a system behaves the way it does" },
  { id: "q02", type: "E", text: "Convince a group to back an idea you believe in" },
  { id: "q03", type: "A", text: "Design how something looks and feels" },
  { id: "q04", type: "C", text: "Keep records accurate and in order" },
  { id: "q05", type: "R", text: "Assemble or repair a device with your own hands" },
  { id: "q06", type: "S", text: "Explain a difficult subject to someone who is struggling" },

  { id: "q07", type: "I", text: "Test an idea by collecting data rather than guessing" },
  { id: "q08", type: "R", text: "Work with tools, equipment or physical materials" },
  { id: "q09", type: "E", text: "Take responsibility for a team reaching a target" },
  { id: "q10", type: "S", text: "Support someone through a decision that matters to them" },
  { id: "q11", type: "C", text: "Follow a clear procedure and get every detail right" },
  { id: "q12", type: "A", text: "Invent a story, an image or a piece of music" },

  { id: "q13", type: "I", text: "Take a complicated problem apart into smaller parts" },
  { id: "q14", type: "C", text: "Organise messy information into a structure others can use" },
  { id: "q15", type: "A", text: "Try an unusual approach instead of the standard one" },
  { id: "q16", type: "R", text: "Solve a problem by physically testing what happens" },
  { id: "q17", type: "S", text: "Run a session where people learn something together" },
  { id: "q18", type: "E", text: "Present your work and answer hard questions about it" },

  { id: "q19", type: "I", text: "Read about a subject far beyond what is required" },
  { id: "q20", type: "A", text: "Care about how an idea is presented, not only what it says" },
  { id: "q21", type: "R", text: "Prefer results you can see and touch over abstract ones" },
  { id: "q22", type: "C", text: "Plan a schedule and keep it on track" },
  { id: "q23", type: "E", text: "Start something new and get other people involved" },
  { id: "q24", type: "S", text: "Notice when someone needs help before they ask" },

  { id: "q25", type: "I", text: "Keep working on a problem until the explanation is exact" },
  { id: "q26", type: "C", text: "Check work for errors before it goes further" },
  { id: "q27", type: "R", text: "Understand how a machine is put together" },
  { id: "q28", type: "A", text: "Make something that did not exist before" },
  { id: "q29", type: "E", text: "Negotiate so that both sides can agree" },
  { id: "q30", type: "S", text: "Work in a team rather than alone" },
];

/** 0 = not for me, 1 = maybe, 2 = yes. */
export type Answer = 0 | 1 | 2;
export type Answers = Record<string, Answer>;

export const answerOptions: { value: Answer; label: string }[] = [
  { value: 0, label: "Not for me" },
  { value: 1, label: "Maybe" },
  { value: 2, label: "Yes" },
];

export type TypeScore = { type: RiasecType; score: number; max: number };

export function scoreInterests(answers: Answers): TypeScore[] {
  const totals = {} as Record<RiasecType, { score: number; max: number }>;
  for (const type of Object.keys(riasecTypes) as RiasecType[]) {
    totals[type] = { score: 0, max: 0 };
  }

  for (const item of interestItems) {
    totals[item.type].max += 2;
    const answer = answers[item.id];
    if (answer !== undefined) totals[item.type].score += answer;
  }

  return (Object.keys(riasecTypes) as RiasecType[])
    .map((type) => ({ type, score: totals[type].score, max: totals[type].max }))
    // ties keep the fixed RIASEC order, so the same answers always give the same code
    .sort((a, b) => b.score - a.score);
}

export function hollandCode(scores: TypeScore[]) {
  return scores.slice(0, 3).map(({ type }) => type).join("");
}

export type DirectionSuggestion = {
  /** A supported study direction, or null when the result points outside our catalogue. */
  direction: "Computer Science" | "Business" | null;
  headline: string;
  explanation: string;
};

/**
 * Computer Science sits closest to Investigative and Realistic interests,
 * Business to Enterprising and Conventional ones. Artistic and Social profiles
 * have no matching direction in the current catalogue, and we say so instead of
 * pushing the nearest available option.
 */
export function suggestDirection(scores: TypeScore[]): DirectionSuggestion {
  const value = (type: RiasecType) => scores.find((entry) => entry.type === type)?.score ?? 0;
  const technical = value("I") + value("R");
  const business = value("E") + value("C");
  const outside = value("A") + value("S");
  const top = scores[0]?.type;

  if (outside > technical && outside > business) {
    return {
      direction: null,
      headline: `Your strongest interests are ${riasecTypes[top].label.toLowerCase()}`,
      explanation:
        "Fortech currently covers Computer Science and Business only, and neither is the closest fit for this result. You can still continue and explore what we have, but treat this as a signal to look wider than our catalogue.",
    };
  }

  if (technical === business) {
    return {
      direction: null,
      headline: "Your result sits between both directions",
      explanation:
        "Technical and business interests scored the same, so we will not choose for you. Pick the direction that feels closer and change it later — recommendations update whenever you do.",
    };
  }

  const direction = technical > business ? "Computer Science" : "Business";
  return {
    direction,
    headline: `Your result points toward ${direction}`,
    explanation:
      direction === "Computer Science"
        ? "Investigative and realistic interests scored highest. Those sit closest to software, data and IT programs."
        : "Enterprising and conventional interests scored highest. Those sit closest to management, finance and analytics programs.",
  };
}
