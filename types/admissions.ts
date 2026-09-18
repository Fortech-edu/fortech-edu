export type EligibilityStatus =
  | "eligible_now"
  | "with_actions"
  | "not_eligible"
  | "requires_verification";

export type StudentProfile = {
  fullName: string | null;
  nationality: string | null;
  countryOfResidence: string | null;
  currentStudyStage: string | null;
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

export type ApplicationDocumentRequirements = {
  motivationLetter: boolean | null;
  recommendationLetters: boolean | null;
};

export type ProgramSource = {
  type: "program" | "admissions" | "tuition" | "deadline";
  title: string;
  url: string;
};

export type UniversityProgram = {
  id: string;
  universityName: string;
  programName: string;
  field: string;
  country: string | null;
  city: string | null;
  degreeLevel: string | null;
  tuition: number | null;
  tuitionCurrency: string | null;
  tuitionPeriod: "semester" | "year" | "program" | null;
  tuitionNotes: string | null;
  academicRequirement: Requirement | null;
  ieltsRequirement: Requirement | null;
  satRequirement: Requirement | null;
  /** Null or absent means the official document requirement is not yet verified. */
  applicationDocuments?: ApplicationDocumentRequirements | null;
  deadline: string | null;
  sources: ProgramSource[];
  verificationDate: string | null;
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

export type RoadmapPhase = "now" | "prepare" | "apply";

export type RoadmapItem = {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  status: "not_started" | "in_progress" | "completed";
  phase: RoadmapPhase;
  type: "requirement" | "verification" | "preparation" | "application";
  officialSourceLabel: string | null;
  officialSourceUrl: string | null;
};
