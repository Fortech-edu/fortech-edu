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
  field: string;
  country: string | null;
  degreeLevel: string | null;
  tuition: number | null;
  tuitionCurrency: string | null;
  tuitionPeriod: "semester" | "year" | "program" | null;
  academicRequirement: Requirement | null;
  ieltsRequirement: Requirement | null;
  satRequirement: Requirement | null;
  deadline: string | null;
  sourceUrl: string | null;
  isDemo: boolean;
};

export type ScoreBreakdown = {
  fieldFit: number | null;
  academicFit: number | null;
  budgetFit: number | null;
  languageFit: number | null;
  countryPreference: number | null;
  timelineFit: number | null;
};

export type Recommendation = {
  program: UniversityProgram;
  /** Profile match score, not an admission probability. */
  fitScore: number;
  /** Percentage of weighted Fit Score inputs backed by known, comparable data. */
  dataCoverage: number;
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
