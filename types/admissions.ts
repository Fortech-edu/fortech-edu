export type EligibilityStatus =
  | "eligible_now"
  | "with_actions"
  | "not_eligible"
  | "requires_verification";

export type StudentProfile = {
  fullName: string | null;
  nationality: string | null;
  countryOfResidence: string | null;
  targetDegree: string | null;
  intendedField: string | null;
  preferredCountries: string[];
  targetIntake: string | null;
  gpa: number | null;
  ieltsScore: number | null;
  satScore: number | null;
  annualBudget: number | null;
  budgetCurrency: string | null;
};

export type Requirement = {
  label: string;
  minimumScore: number | null;
  isRequired: boolean | null;
  notes: string | null;
};

export type UniversityProgram = {
  id: string;
  universityName: string;
  programName: string;
  country: string | null;
  degreeLevel: string | null;
  tuition: number | null;
  tuitionCurrency: string | null;
  tuitionPeriod: "semester" | "year" | "program" | null;
  ieltsRequirement: Requirement | null;
  satRequirement: Requirement | null;
  deadline: string | null;
  sourceUrl: string | null;
  isDemo: boolean;
};

export type ScoreBreakdown = {
  academics: number;
  language: number;
  affordability: number;
  preferences: number;
};

export type Recommendation = {
  program: UniversityProgram;
  /** Profile match score, not an admission probability. */
  fitScore: number;
  breakdown: ScoreBreakdown;
  eligibility: EligibilityStatus;
  reasons: string[];
  gaps: string[];
};

export type Diagnosis = {
  strengths: string[];
  gaps: string[];
  missingInformation: string[];
};

export type RoadmapItem = {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  status: "not_started" | "in_progress" | "completed";
};
