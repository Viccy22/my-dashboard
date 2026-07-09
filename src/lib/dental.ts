// ============================================================================
// Dental Health Tracker — shared types, static plan reference data, and pure
// calculation functions.
//
// This file has NO React and NO state — it's just types, constants, and
// functions that take data in and return an answer. The stateful page that
// uses all of this lives at src/app/dental/page.tsx.
//
// IMPORTANT — data integrity: every dollar figure, percentage, frequency
// limit, and age rule in PLAN_RULES / COVERED_SERVICES below is copied
// directly from Victoria's real 2026 Humana PPO Dental plan (Plan 923382).
// Nothing here is invented or guessed. If you ever need to add a service
// that isn't listed, set cdtCode/frequency to null rather than guessing —
// the UI will show "unknown / verify with Humana" wherever a value is null.
// ============================================================================

// ---------------------------------------------------------------------------
// Teeth
// ---------------------------------------------------------------------------

export type ToothQuadrant = "UR" | "UL" | "LR" | "LL"; // upper-right, upper-left, lower-right, lower-left
export type ToothType = "incisor" | "canine" | "premolar" | "molar";
export type ToothStatus = "healthy" | "treated" | "needs_work" | "watch" | "absent";

export type Tooth = {
  number: number; // 1-32, Universal Numbering System
  name: string;
  quadrant: ToothQuadrant;
  type: ToothType;
  present: boolean; // false for #1, 16, 17, 32 — Victoria doesn't have wisdom teeth
  status: ToothStatus; // user-editable; "absent" is set automatically for missing teeth
};

// Victoria's wisdom teeth (#1, 16, 17, 32 in the Universal Numbering System)
// were removed / never present. These render greyed-out and non-clickable
// in the tooth diagram.
export const ABSENT_TEETH = [1, 16, 17, 32];

// Standard Universal Numbering System layout (1-32). This is a fixed dental
// charting convention, not plan-specific data, so it's safe to hardcode.
// Numbering runs clockwise starting at the upper-right wisdom tooth:
// upper-right (1-8) -> upper-left (9-16) -> lower-left (17-24) -> lower-right (25-32).
type ToothDef = { name: string; quadrant: ToothQuadrant; type: ToothType };

const TOOTH_DEFS: Record<number, ToothDef> = {
  1: { name: "Upper Right Third Molar (Wisdom)", quadrant: "UR", type: "molar" },
  2: { name: "Upper Right Second Molar", quadrant: "UR", type: "molar" },
  3: { name: "Upper Right First Molar", quadrant: "UR", type: "molar" },
  4: { name: "Upper Right Second Premolar", quadrant: "UR", type: "premolar" },
  5: { name: "Upper Right First Premolar", quadrant: "UR", type: "premolar" },
  6: { name: "Upper Right Canine", quadrant: "UR", type: "canine" },
  7: { name: "Upper Right Lateral Incisor", quadrant: "UR", type: "incisor" },
  8: { name: "Upper Right Central Incisor", quadrant: "UR", type: "incisor" },
  9: { name: "Upper Left Central Incisor", quadrant: "UL", type: "incisor" },
  10: { name: "Upper Left Lateral Incisor", quadrant: "UL", type: "incisor" },
  11: { name: "Upper Left Canine", quadrant: "UL", type: "canine" },
  12: { name: "Upper Left First Premolar", quadrant: "UL", type: "premolar" },
  13: { name: "Upper Left Second Premolar", quadrant: "UL", type: "premolar" },
  14: { name: "Upper Left First Molar", quadrant: "UL", type: "molar" },
  15: { name: "Upper Left Second Molar", quadrant: "UL", type: "molar" },
  16: { name: "Upper Left Third Molar (Wisdom)", quadrant: "UL", type: "molar" },
  17: { name: "Lower Left Third Molar (Wisdom)", quadrant: "LL", type: "molar" },
  18: { name: "Lower Left Second Molar", quadrant: "LL", type: "molar" },
  19: { name: "Lower Left First Molar", quadrant: "LL", type: "molar" },
  20: { name: "Lower Left Second Premolar", quadrant: "LL", type: "premolar" },
  21: { name: "Lower Left First Premolar", quadrant: "LL", type: "premolar" },
  22: { name: "Lower Left Canine", quadrant: "LL", type: "canine" },
  23: { name: "Lower Left Lateral Incisor", quadrant: "LL", type: "incisor" },
  24: { name: "Lower Left Central Incisor", quadrant: "LL", type: "incisor" },
  25: { name: "Lower Right Central Incisor", quadrant: "LR", type: "incisor" },
  26: { name: "Lower Right Lateral Incisor", quadrant: "LR", type: "incisor" },
  27: { name: "Lower Right Canine", quadrant: "LR", type: "canine" },
  28: { name: "Lower Right First Premolar", quadrant: "LR", type: "premolar" },
  29: { name: "Lower Right Second Premolar", quadrant: "LR", type: "premolar" },
  30: { name: "Lower Right First Molar", quadrant: "LR", type: "molar" },
  31: { name: "Lower Right Second Molar", quadrant: "LR", type: "molar" },
  32: { name: "Lower Right Third Molar (Wisdom)", quadrant: "LR", type: "molar" },
};

export function toothName(n: number): string {
  return TOOTH_DEFS[n]?.name ?? `Tooth #${n}`;
}
export function toothQuadrant(n: number): ToothQuadrant {
  return TOOTH_DEFS[n]?.quadrant ?? "UR";
}
export function toothType(n: number): ToothType {
  return TOOTH_DEFS[n]?.type ?? "molar";
}

// Builds the initial set of 32 teeth. Called once as a fallback when no
// saved tooth data exists yet (see page.tsx's load logic) — after that,
// whatever the user has edited (status changes) is what gets saved/reloaded.
export function buildTeeth(): Tooth[] {
  return Object.keys(TOOTH_DEFS)
    .map(Number)
    .sort((a, b) => a - b)
    .map((number) => {
      const def = TOOTH_DEFS[number];
      const absent = ABSENT_TEETH.includes(number);
      return {
        number,
        name: def.name,
        quadrant: def.quadrant,
        type: def.type,
        present: !absent,
        status: absent ? ("absent" as ToothStatus) : ("healthy" as ToothStatus),
      };
    });
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

export type AppointmentStatus = "upcoming" | "completed" | "cancelled";

export type Appointment = {
  id: string;
  date: string; // YYYY-MM-DD
  provider: string;
  location: string;
  reason: string;
  status: AppointmentStatus;
  notes: string;
  toothNumbers: number[];
  documentIds: string[];
};

// ---------------------------------------------------------------------------
// Treatment plans
// ---------------------------------------------------------------------------

export type TreatmentPlanStatus = "proposed" | "accepted" | "completed" | "declined";

export type TreatmentPlanItem = {
  id: string;
  serviceId: string | null; // links to CoveredService.id, used for frequency/coverage lookups
  cdtCode: string | null; // null -> UI shows "unknown / verify with Humana"
  procedureName: string;
  toothNumber: number | null; // null = not tooth-specific (e.g. a cleaning)
  surface: string; // e.g. "MOD" — free text, "" if not applicable
  fee: number;
  estInsurance: number;
  estPatient: number;
  phase: string; // free text, e.g. "Phase 1"
};

export type TreatmentPlan = {
  id: string;
  dateProposed: string;
  provider: string;
  status: TreatmentPlanStatus;
  notes: string;
  items: TreatmentPlanItem[];
  documentIds: string[];
};

// ---------------------------------------------------------------------------
// Completed work
//
// Note on `date`: Humana's SPD defines a precise "expense incurred date" per
// procedure type for claims purposes (e.g. crowns = date teeth are prepared,
// dentures = date of final impression, root canals = date the pulp chamber
// is opened, periodontal surgery = date of surgery, everything else = date
// performed). We don't reproduce that distinction here — `date` is simply
// "date of service" as you'd naturally record it. This can matter for which
// calendar year/claim a borderline procedure gets attributed to, but tracking
// it separately would add real complexity for a case that's rarely material
// day-to-day. Flagging it here in case it ever needs reconciling against a
// real EOB.
// ---------------------------------------------------------------------------

export type CompletedWork = {
  id: string;
  date: string;
  serviceId: string | null; // links to CoveredService.id — needed for frequency-limit tracking
  cdtCode: string | null;
  procedureName: string;
  toothNumber: number | null;
  surface: string;
  provider: string;
  network: "in" | "out"; // which deductible/coinsurance bucket this counts toward — defaults to "in" since Dr. Rizvi is in-network (PAR)
  billedAmount: number;
  insurancePaid: number;
  patientPaid: number;
  // Amount of THIS claim that Humana's EOB says was applied toward the
  // deductible. We don't calculate this — dental EOBs split billed amounts
  // into "deductible" and "coinsurance" portions in a way we can't reliably
  // reproduce from billedAmount/insurancePaid alone, so this is copied
  // directly from the real EOB when you have one. Defaults to 0 (not entered).
  deductibleApplied: number;
  linkedAppointmentId: string | null;
  notes: string;
  documentIds: string[];
};

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export type PaymentMethod = "card" | "check" | "cash" | "hsa_fsa" | "care_credit" | "other";

export type PaymentAppliesTo =
  | { kind: "treatment_plan"; id: string }
  | { kind: "completed_work"; id: string }
  | { kind: "other"; label: string };

export type Payment = {
  id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  appliesTo: PaymentAppliesTo;
  notes: string;
};

// ---------------------------------------------------------------------------
// Insurance claims
// ---------------------------------------------------------------------------

export type ClaimStatus = "submitted" | "processing" | "paid" | "denied" | "appealed";

export type InsuranceClaim = {
  id: string;
  claimNumber: string;
  serviceDateStart: string;
  serviceDateEnd: string;
  provider: string;
  processedOn: string;
  totalBilled: number;
  planDiscount: number;
  allowedAmount: number;
  planPaid: number;
  patientShare: number;
  status: ClaimStatus;
  toothNumbers: number[];
  documentIds: string[];
  notes: string;
};

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export type DocumentType = "invoice" | "eob" | "treatment_plan" | "verification" | "other";

export type DentalDocument = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  documentType: DocumentType;
  date: string;
  description: string;
  toothNumbers: number[]; // many-to-many — one X-ray can cover several teeth
  linkedAppointmentId: string | null;
  linkedClaimId: string | null;
  linkedTreatmentPlanId: string | null;
  uploadedAt: string;
};

// ---------------------------------------------------------------------------
// Full data shape — one "dental" key inside the dashboard's shared JSON blob
// ---------------------------------------------------------------------------

export type DentalData = {
  teeth: Tooth[];
  appointments: Appointment[];
  treatmentPlans: TreatmentPlan[];
  completedWork: CompletedWork[];
  payments: Payment[];
  claims: InsuranceClaim[];
  documents: DentalDocument[];
};

// ---------------------------------------------------------------------------
// Plan rules — static reference data, never user-editable
// ---------------------------------------------------------------------------

export type ServiceCategory = "preventive" | "basic" | "major" | "prosthodontic" | "orthodontic";

export type PlanRules = {
  deductible: {
    individualInNetwork: number;
    individualOutNetwork: number;
    familyInNetwork: number; // not used by any UI in this single-patient dashboard — kept for completeness
    familyOutNetwork: number;
    crossAccumulates: boolean;
  };
  annualMax: {
    amount: number; // shared across Preventive + Basic + Major Restorative + Prosthodontic
    crossAccumulates: boolean; // in- and out-of-network spending both count toward the same $2,000
    postMaxCoinsurance: { in: number; out: number }; // rate the plan pays once the annual max is hit
  };
  orthodonticLifetimeMax: number; // separate pool, not part of the annual max
  coinsuranceByCategory: Record<
    ServiceCategory,
    { in: number; out: number; subjectToDeductible: boolean }
  >;
  predeterminationThreshold: number; // services at/above this fee should be submitted for predetermination first
  downgrades: {
    resinPosteriorToAmalgam: boolean;
    porcelainCeramicResinAnteriorBicuspidOnly: boolean;
  };
  patientInfo: {
    name: string;
    address: string;
    birthYear: number;
    memberId: string;
    medicalId: string;
    localPatientId: string; // patient ID at the primary provider's office
    groupNumber: string;
    planName: string;
    network: string;
    medicalNetwork: string;
    planYear: "calendar";
    primaryProvider: string;
    primaryProviderLocation: string;
    primaryProviderPhone: string;
    primaryProviderInNetwork: boolean;
    customerServicePhone: string;
  };
};

export const PLAN_RULES: PlanRules = {
  deductible: {
    individualInNetwork: 50,
    individualOutNetwork: 150,
    familyInNetwork: 150,
    familyOutNetwork: 450,
    crossAccumulates: true,
  },
  annualMax: {
    amount: 2000,
    crossAccumulates: true,
    postMaxCoinsurance: { in: 0.3, out: 0.3 },
  },
  orthodonticLifetimeMax: 2000,
  coinsuranceByCategory: {
    preventive: { in: 1.0, out: 1.0, subjectToDeductible: false },
    basic: { in: 0.8, out: 0.7, subjectToDeductible: true },
    major: { in: 0.6, out: 0.4, subjectToDeductible: true },
    prosthodontic: { in: 0.6, out: 0.4, subjectToDeductible: true },
    orthodontic: { in: 0.5, out: 0.5, subjectToDeductible: false },
  },
  predeterminationThreshold: 300,
  downgrades: {
    resinPosteriorToAmalgam: true,
    porcelainCeramicResinAnteriorBicuspidOnly: true,
  },
  patientInfo: {
    name: "Victoria K. Henze",
    address: "4833 Cypress Woods Dr, Unit 4310, Orlando, FL 32811",
    birthYear: 1994,
    memberId: "116637116 01",
    medicalId: "116637115 01",
    localPatientId: "16822",
    groupNumber: "923382",
    planName: "HumanaDental PPO",
    network: "HumanaDental PPO / Traditional Preferred",
    medicalNetwork: "National POS-Open Access Plus",
    planYear: "calendar",
    primaryProvider: "Laila Rizvi, DMD — My DentalCare Center",
    primaryProviderLocation: "3708 Town Center Blvd, Suite B, Orlando, FL 32837",
    primaryProviderPhone: "(407) 240-3372",
    primaryProviderInNetwork: true,
    customerServicePhone: "1-800-626-1690",
  },
};

// ---------------------------------------------------------------------------
// Covered services — static reference data, never user-editable
// ---------------------------------------------------------------------------

export type FrequencyLimit =
  | { kind: "per_calendar_year"; count: number }
  | { kind: "per_years"; count: number; years: number } // e.g. crowns: 1 per 5 years
  | { kind: "per_months"; count: number; months: number }
  | { kind: "per_lifetime"; count: number }
  | { kind: "per_lifetime_per_tooth"; count: number } // e.g. root canals
  | { kind: "as_needed" }
  | { kind: "unserviceable_and_years"; years: number }; // crowns/bridges/dentures: 1 per N years AND the old one must be unserviceable (that part can't be checked in code — see notes)

export type AgeGate = { minAge?: number; maxAge?: number } | null;

export type ToothTypeRestriction =
  | "anterior_bicuspid_only"
  | "permanent_molars_only"
  | "primary_teeth_only"
  | null;

export type CoveredService = {
  id: string; // stable slug, used to link CompletedWork/TreatmentPlanItem records back here
  cdtCode: string | null; // null when the plan document didn't give one — never guess a code
  name: string;
  category: ServiceCategory;
  frequency: FrequencyLimit | null;
  ageGate: AgeGate;
  toothTypeRestriction: ToothTypeRestriction;
  notCovered: boolean; // true for the plan's explicit exclusions list
  notes: string; // verbatim caveats from the plan that aren't mechanically enforced (see estimateCoverage below)
};

// The one service the resin->amalgam downgrade rule applies to (see estimateCoverage).
export const FILLINGS_SERVICE_ID = "fillings-amalgam-resin";

export const COVERED_SERVICES: CoveredService[] = [
  // ---- Preventive (100% / 100%, not subject to deductible) ----
  {
    id: "oral-evaluation",
    cdtCode: null,
    name: "Oral Evaluation (Exam)",
    category: "preventive",
    frequency: { kind: "per_calendar_year", count: 2 },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "",
  },
  {
    id: "problem-focused-eval",
    cdtCode: null,
    name: "Problem-Focused / Emergency Evaluation",
    category: "preventive",
    frequency: { kind: "per_calendar_year", count: 1 },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "",
  },
  {
    id: "periodontal-evaluation",
    cdtCode: null,
    name: "Periodontal Evaluation",
    category: "preventive",
    frequency: { kind: "per_years", count: 1, years: 2 },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "",
  },
  {
    id: "routine-cleaning",
    cdtCode: "D1110",
    name: "Routine Cleaning (Prophylaxis)",
    category: "preventive",
    frequency: { kind: "per_calendar_year", count: 2 },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "",
  },
  {
    id: "periodontal-maintenance",
    cdtCode: null,
    name: "Periodontal Maintenance",
    category: "preventive",
    frequency: { kind: "per_calendar_year", count: 4 },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Not within 3 months of SRP or periodontal surgery — not checked automatically, verify timing manually.",
  },
  {
    id: "full-mouth-scaling",
    cdtCode: "D4346",
    name: "Full-Mouth Scaling",
    category: "preventive",
    frequency: { kind: "per_years", count: 1, years: 3 },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Only with moderate-severe gingival inflammation. Blocks a same-day cleaning, SRP, or debridement.",
  },
  {
    id: "bitewing-xrays",
    cdtCode: null,
    name: "Bitewing X-Rays",
    category: "preventive",
    frequency: { kind: "per_calendar_year", count: 1 },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "One set per calendar year.",
  },
  {
    id: "periapical-xrays",
    cdtCode: null,
    name: "Periapical / Miscellaneous X-Rays",
    category: "preventive",
    frequency: { kind: "as_needed" },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "",
  },
  {
    id: "panoramic-xrays",
    cdtCode: null,
    name: "Full-Mouth or Panoramic X-Rays",
    category: "preventive",
    frequency: { kind: "per_months", count: 1, months: 36 },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "",
  },
  {
    id: "topical-fluoride",
    cdtCode: "D1206",
    name: "Topical Fluoride",
    category: "preventive",
    frequency: { kind: "per_calendar_year", count: 2 },
    ageGate: { maxAge: 18 },
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Covered through age 18 only — not covered for Victoria (age 32).",
  },
  {
    id: "sealants",
    cdtCode: null,
    name: "Sealants",
    category: "preventive",
    frequency: { kind: "per_lifetime_per_tooth", count: 1 },
    ageGate: { maxAge: 18 },
    toothTypeRestriction: "permanent_molars_only",
    notCovered: false,
    notes: "Covered through age 18 only, permanent molars only — not covered for Victoria (age 32).",
  },
  {
    id: "diabetes-screening",
    cdtCode: null,
    name: "Diabetes Screening (In-Office)",
    category: "preventive",
    frequency: { kind: "per_calendar_year", count: 2 },
    ageGate: { minAge: 18 },
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Age 18+ WITH a diabetes diagnosis only — diagnosis status can't be checked automatically, verify manually.",
  },
  {
    id: "oral-cancer-screening",
    cdtCode: "D0431",
    name: "Pre-Diagnostic Oral Cancer / Abnormal Cell Detection (e.g. ViziLite)",
    category: "preventive",
    frequency: { kind: "per_calendar_year", count: 1 },
    ageGate: { minAge: 40 },
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Age 40+ only — not covered for Victoria yet (age 32).",
  },

  // ---- Basic (80% / 70%, subject to deductible) ----
  {
    id: "palliative-treatment",
    cdtCode: null,
    name: "Palliative (Emergency Pain) Treatment",
    category: "basic",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Only covered if no other service besides an x-ray or evaluation was done that visit.",
  },
  {
    id: FILLINGS_SERVICE_ID,
    cdtCode: "D2391–D2394",
    name: "Fillings (Amalgam & Resin Composite)",
    category: "basic",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes:
      "Multiple restorations on one surface count as one restoration. Resin/composite fillings on molars are downgraded to amalgam pricing — you pay the difference.",
  },
  {
    id: "stainless-steel-crowns",
    cdtCode: null,
    name: "Stainless Steel Crowns (Primary Teeth)",
    category: "basic",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: "primary_teeth_only",
    notCovered: false,
    notes: "Stainless steel crowns on permanent teeth are NOT covered.",
  },
  {
    id: "extractions",
    cdtCode: null,
    name: "Extractions",
    category: "basic",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "",
  },
  {
    id: "oral-surgery",
    cdtCode: null,
    name: "Oral Surgery (incl. Pre/Post-Op)",
    category: "basic",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "",
  },
  {
    id: "space-maintainers",
    cdtCode: null,
    name: "Space Maintainers",
    category: "basic",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "",
  },
  {
    id: "srp",
    cdtCode: "D4341",
    name: "Periodontal Scaling & Root Planing (SRP)",
    category: "basic",
    frequency: { kind: "per_years", count: 1, years: 3 },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Max 4 quadrants total; this plan allows 2 quadrants per visit.",
  },
  {
    id: "periodontal-surgery",
    cdtCode: null,
    name: "Periodontal Surgery",
    category: "basic",
    frequency: { kind: "per_years", count: 1, years: 3 },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Limit is per quadrant.",
  },
  {
    id: "site-therapy",
    cdtCode: "D4381",
    name: "Site Therapy / Localized Antimicrobials",
    category: "basic",
    frequency: { kind: "per_months", count: 1, months: 12 },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes:
      "Per tooth; max 3 tooth sites per quadrant. Requires prior perio therapy plus pockets ≥ 5mm, at least 4 weeks after active therapy. Applies to the deductible.",
  },
  {
    id: "pulp-tests",
    cdtCode: null,
    name: "Pulp Tests",
    category: "basic",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "",
  },
  {
    id: "root-canals",
    cdtCode: null,
    name: "Root Canals / Endodontics",
    category: "basic",
    frequency: { kind: "per_lifetime_per_tooth", count: 1 },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "One per tooth, for life.",
  },
  {
    id: "recementation",
    cdtCode: null,
    name: "Recementation (Crowns / Bridges / Veneers)",
    category: "basic",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "",
  },
  {
    id: "occlusal-guard-perio-surgery",
    cdtCode: null,
    name: "Occlusal Guards (with Periodontal Surgery)",
    category: "basic",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Covered only when done in conjunction with periodontal surgery — distinct from the bruxism-related occlusal guard under Prosthodontic.",
  },
  {
    id: "occlusal-adjustment-perio-surgery",
    cdtCode: null,
    name: "Occlusal Adjustments (with Periodontal Surgery)",
    category: "basic",
    frequency: { kind: "per_months", count: 1, months: 36 },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Covered only when done in conjunction with periodontal surgery. Limited to once per mouth per 36 months.",
  },
  {
    id: "harmful-habit-appliance",
    cdtCode: null,
    name: "Harmful Habit Appliance",
    category: "basic",
    frequency: { kind: "per_lifetime", count: 1 },
    ageGate: { maxAge: 18 },
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Covered through age 18 only, initial appliance only — not covered for Victoria (age 32).",
  },
  {
    id: "nitrous-oxide",
    cdtCode: null,
    name: "Nitrous Oxide",
    category: "basic",
    frequency: null,
    ageGate: { maxAge: 8 },
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Covered through age 8 only — not covered for Victoria (age 32).",
  },
  {
    id: "general-anesthesia",
    cdtCode: null,
    name: "General Anesthesia / IV Sedation",
    category: "basic",
    frequency: null,
    // No age gate modeled: covered for age <= 8 OR when medically necessary with
    // oral surgery. The "medically necessary" branch can't be auto-verified, so
    // hard-blocking this by age would incorrectly deny a case that could still
    // be covered. Shown as a note instead — verify manually.
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Only covered for age ≤ 8, or when medically necessary in conjunction with oral surgery — verify manually.",
  },

  // ---- Major Restorative (60% / 40%, subject to deductible) ----
  {
    id: "inlays-onlays",
    cdtCode: null,
    name: "Inlays / Onlays",
    category: "major",
    frequency: { kind: "unserviceable_and_years", years: 5 },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Once per 5 years, and only if the existing one is unserviceable (dentist's judgment — verify manually).",
  },
  {
    id: "crowns",
    cdtCode: null,
    name: "Crowns",
    category: "major",
    frequency: { kind: "unserviceable_and_years", years: 5 },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Once per 5 years, and only if the existing one is unserviceable (dentist's judgment — verify manually).",
  },
  {
    id: "post-core-buildups",
    cdtCode: null,
    name: "Post/Core Build-Ups (for Crowns)",
    category: "major",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "",
  },
  {
    id: "porcelain-ceramic-resin",
    cdtCode: null,
    name: "Porcelain / Ceramic / Resin Restorations",
    category: "major",
    frequency: { kind: "per_years", count: 1, years: 5 },
    ageGate: null,
    toothTypeRestriction: "anterior_bicuspid_only",
    notCovered: false,
    notes: "Anterior and bicuspid teeth only — treated as cosmetic and downgraded/excluded on molars.",
  },
  {
    id: "veneers",
    cdtCode: null,
    name: "Veneers",
    category: "major",
    frequency: { kind: "per_years", count: 1, years: 5 },
    ageGate: null,
    toothTypeRestriction: "anterior_bicuspid_only",
    notCovered: false,
    notes: "Anterior and bicuspid teeth only — NOT covered on molars.",
  },

  // ---- Prosthodontic (60% / 40%, subject to deductible) ----
  {
    id: "bridges",
    cdtCode: null,
    name: "Bridges",
    category: "prosthodontic",
    frequency: { kind: "unserviceable_and_years", years: 5 },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Once per 5 years, and only if the existing one is unserviceable (dentist's judgment — verify manually).",
  },
  {
    id: "dentures",
    cdtCode: null,
    name: "Partial / Complete Dentures",
    category: "prosthodontic",
    frequency: { kind: "unserviceable_and_years", years: 5 },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Once per 5 years, and only if the existing one is unserviceable (dentist's judgment — verify manually).",
  },
  {
    id: "implants",
    cdtCode: null,
    name: "Implants (+ Abutment, Prosthesis)",
    category: "prosthodontic",
    frequency: { kind: "unserviceable_and_years", years: 5 },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Once per 5 years, and only if the existing one is unserviceable (dentist's judgment — verify manually).",
  },
  {
    id: "occlusal-guard",
    cdtCode: null,
    name: "Occlusal Guard (Bruxism)",
    category: "prosthodontic",
    frequency: { kind: "unserviceable_and_years", years: 5 },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Once per 5 years, and only if the existing one is unserviceable (dentist's judgment — verify manually).",
  },
  {
    id: "reline-rebase",
    cdtCode: null,
    name: "Reline / Rebase / Tissue Conditioning",
    category: "prosthodontic",
    frequency: { kind: "per_months", count: 1, months: 36 },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Not within 6 months of the original placement.",
  },
  {
    id: "occlusal-guard-reline-repair",
    cdtCode: null,
    name: "Reline / Repair of Occlusal Guard (Bruxism)",
    category: "prosthodontic",
    frequency: { kind: "per_months", count: 1, months: 36 },
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Not within 6 months of the initial placement of the guard. Distinct from the initial occlusal guard itself.",
  },

  // ---- Orthodontic (50% / 50%, NOT subject to deductible, $2,000 lifetime max) ----
  {
    id: "orthodontic-treatment",
    cdtCode: null,
    name: "Braces & Adjustments (Orthodontic Treatment)",
    category: "orthodontic",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: false,
    notes: "Benefits are pro-rated over the course of treatment. A 25% down payment is allowed. Separate $2,000 lifetime max — not part of the annual max.",
  },

  // ---- NOT COVERED — plan pays $0, patient pays 100% ----
  // `category` is set to the bucket these would fall into if they WERE
  // covered, purely so the type checker is happy — it's never used for
  // math, because `notCovered: true` short-circuits estimateCoverage()
  // straight to "plan pays $0" before category/coinsurance are even looked at.
  {
    id: "oral-hygiene-instruction",
    cdtCode: "D1330",
    name: "Oral Hygiene Instruction",
    category: "basic",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: true,
    notes: "Preventive control program — excluded.",
  },
  {
    id: "lost-broken-replacement",
    cdtCode: null,
    name: "Replacement of Lost, Broken, Stolen, Damaged, Misplaced, or Duplicate Restoration/Prosthesis/Appliance",
    category: "basic",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: true,
    notes: "Excluded.",
  },
  {
    id: "congenitally-missing-teeth-replacement",
    cdtCode: null,
    name: "Replacement of Congenitally Missing Teeth",
    category: "prosthodontic",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: true,
    notes: "Excluded — cosmetic-adjacent per plan rules.",
  },
  {
    id: "desensitizing-medicament",
    cdtCode: "D9910",
    name: "Application of Desensitizing Medicament",
    category: "basic",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: true,
    notes: "Excluded — confirmed on a real EOB (Victoria paid $27 out of pocket for this).",
  },
  {
    id: "chlorhexidine-take-home",
    cdtCode: null,
    name: "Chlorhexidine / Antibacterial Irrigation / Take-Home Fluoride or Tri-Calcium Phosphate Products",
    category: "basic",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: true,
    notes: "Preventive control / take-home items — excluded.",
  },
  {
    id: "full-mouth-debridement",
    cdtCode: null,
    name: "Full-Mouth Debridement",
    category: "basic",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: true,
    notes: "Excluded.",
  },
  {
    id: "consultations",
    cdtCode: null,
    name: "Consultations",
    category: "basic",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: true,
    notes: "Excluded.",
  },
  {
    id: "bone-graft-biologics",
    cdtCode: "D7953",
    name: "Bone Replacement Graft Biologic Materials",
    category: "major",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: true,
    notes: "\"Biologic materials to aid in tissue regeneration\" — excluded.",
  },
  {
    id: "cosmetic-procedures",
    cdtCode: null,
    name: "Cosmetic Procedures",
    category: "major",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: true,
    notes: "Excluded.",
  },
  {
    id: "tmj-treatment",
    cdtCode: null,
    name: "TMJ Treatment",
    category: "basic",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: true,
    notes: "Excluded.",
  },
  {
    id: "athletic-mouthguards",
    cdtCode: null,
    name: "Athletic Mouthguards",
    category: "basic",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: true,
    notes: "Excluded.",
  },
  {
    id: "gold-foil-fillings",
    cdtCode: null,
    name: "Gold Foil Fillings",
    category: "basic",
    frequency: null,
    ageGate: null,
    toothTypeRestriction: null,
    notCovered: true,
    notes: "Excluded.",
  },
];

// Groups COVERED_SERVICES by category for building a <select><optgroup> list
// in the UI. Excludes the "not covered" services from this grouping — those
// are shown separately as a reference list.
export function servicesByCategory(): Record<ServiceCategory, CoveredService[]> {
  const result: Record<ServiceCategory, CoveredService[]> = {
    preventive: [],
    basic: [],
    major: [],
    prosthodontic: [],
    orthodontic: [],
  };
  for (const s of COVERED_SERVICES) {
    if (!s.notCovered) result[s.category].push(s);
  }
  return result;
}

export function displayCdtCode(code: string | null): string {
  return code ?? "unknown / verify with Humana";
}

// ---------------------------------------------------------------------------
// Patient age (derived from PLAN_RULES.patientInfo.birthYear)
// ---------------------------------------------------------------------------

export function getPatientAge(asOfYear?: number): number {
  const year = asOfYear ?? new Date().getFullYear();
  return year - PLAN_RULES.patientInfo.birthYear;
}

function checkAgeGate(gate: AgeGate, age: number): boolean {
  if (!gate) return false;
  if (gate.minAge != null && age < gate.minAge) return true;
  if (gate.maxAge != null && age > gate.maxAge) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Frequency / usage tracking
// ---------------------------------------------------------------------------

// Counts how many times a service was used, optionally scoped to one tooth
// (for per-tooth-lifetime limits like root canals) and to a date window.
// Pass window="lifetime" for lifetime limits, or {start, end} (inclusive,
// YYYY-MM-DD) for calendar-year / rolling-N-year limits.
export function countServiceUsage(
  serviceId: string,
  toothNumber: number | null,
  window: { start: string; end: string } | "lifetime",
  completedWork: CompletedWork[]
): number {
  return completedWork.filter((w) => {
    if (w.serviceId !== serviceId) return false;
    if (toothNumber !== null && w.toothNumber !== toothNumber) return false;
    if (window === "lifetime") return true;
    return w.date >= window.start && w.date <= window.end;
  }).length;
}

export function isFrequencyExceeded(service: CoveredService, usageCount: number): boolean {
  const f = service.frequency;
  if (!f) return false;
  if (f.kind === "as_needed") return false;
  if (f.kind === "unserviceable_and_years") return usageCount >= 1; // the "unserviceable" qualifier can't be checked in code
  return usageCount >= f.count;
}

// Given a service that's currently at its frequency limit, returns the ISO
// date it becomes available again (or null if it never resets, e.g. a
// lifetime limit). Only meaningful to call when isFrequencyExceeded() is true.
export function nextAvailableDate(service: CoveredService, lastUsedDate: string | null): string | null {
  const f = service.frequency;
  if (!f || !lastUsedDate) return null;
  const last = new Date(lastUsedDate + "T00:00:00");

  switch (f.kind) {
    case "per_calendar_year":
      // Resets on Jan 1 of the year after the last-used date.
      return `${last.getFullYear() + 1}-01-01`;
    case "per_years": {
      const d = new Date(last);
      d.setFullYear(d.getFullYear() + f.years);
      return d.toISOString().slice(0, 10);
    }
    case "per_months": {
      const d = new Date(last);
      d.setMonth(d.getMonth() + f.months);
      return d.toISOString().slice(0, 10);
    }
    case "unserviceable_and_years": {
      const d = new Date(last);
      d.setFullYear(d.getFullYear() + f.years);
      return d.toISOString().slice(0, 10); // date-eligible; still requires "unserviceable" — verify manually
    }
    case "per_lifetime":
    case "per_lifetime_per_tooth":
      return null; // never resets
    case "as_needed":
      return null; // no limit
  }
}

// ---------------------------------------------------------------------------
// Benefit usage — computed live from completedWork, never stored separately.
// This avoids the stored number ever drifting out of sync with the records
// it's supposed to summarize.
// ---------------------------------------------------------------------------

export type BenefitUsage = {
  year: number;
  annualMaxUsed: number;
  annualMaxRemaining: number;
  deductibleInUsed: number;
  deductibleInRemaining: number;
  deductibleOutUsed: number;
  deductibleOutRemaining: number;
  orthoLifetimeUsed: number;
  orthoLifetimeRemaining: number;
};

export function computeBenefitUsage(year: number, completedWork: CompletedWork[]): BenefitUsage {
  let annualMaxUsed = 0;
  let deductibleInUsed = 0;
  let deductibleOutUsed = 0;
  let orthoLifetimeUsed = 0;

  for (const w of completedWork) {
    const service = w.serviceId ? COVERED_SERVICES.find((s) => s.id === w.serviceId) : undefined;
    const isOrtho = service?.category === "orthodontic";

    if (isOrtho) {
      // Orthodontic has its own lifetime pool — not scoped to a calendar year.
      orthoLifetimeUsed += w.insurancePaid;
      continue;
    }

    if (w.date.slice(0, 4) !== String(year)) continue; // outside the requested calendar year

    annualMaxUsed += w.insurancePaid;
    if (w.network === "out") deductibleOutUsed += w.deductibleApplied;
    else deductibleInUsed += w.deductibleApplied;
  }

  const { individualInNetwork, individualOutNetwork } = PLAN_RULES.deductible;
  const annualMax = PLAN_RULES.annualMax.amount;
  const orthoMax = PLAN_RULES.orthodonticLifetimeMax;

  return {
    year,
    annualMaxUsed,
    annualMaxRemaining: Math.max(0, annualMax - annualMaxUsed),
    deductibleInUsed,
    deductibleInRemaining: Math.max(0, individualInNetwork - deductibleInUsed),
    deductibleOutUsed,
    deductibleOutRemaining: Math.max(0, individualOutNetwork - deductibleOutUsed),
    orthoLifetimeUsed,
    orthoLifetimeRemaining: Math.max(0, orthoMax - orthoLifetimeUsed),
  };
}

// ---------------------------------------------------------------------------
// Coverage estimator
// ---------------------------------------------------------------------------

export type CoverageEstimate = {
  planPays: number;
  patientOwes: number;
  appliedDeductible: number;
  usedPostMaxRate: boolean; // true if the annual max was already hit and the 30% rate applied instead
  frequencyExceeded: boolean;
  ageGateBlocked: boolean;
  downgradeApplied: boolean;
  downgradeDifference: number; // extra amount the patient pays because of the resin->amalgam downgrade
  needsPredetermination: boolean;
  isEstimateOnly: true; // always true — the UI must always show the "estimate, not a guarantee" disclaimer
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Implements the plan's 8-step coverage estimate algorithm:
 *  1/2. Look up the category's coinsurance + whether it's subject to the deductible.
 *  3.   Apply the coinsurance rate.
 *  4.   If the annual max is already used up, switch to the 30% post-max rate.
 *  5.   If the frequency limit is exceeded, the plan pays $0.
 *  6.   If an age gate blocks this service, the plan pays $0.
 *  7.   Apply the resin-on-molar -> amalgam downgrade if relevant.
 *  8.   Return plan-pays / patient-owes, always flagged as an estimate only.
 *
 * amalgamFeeForDowngrade is only needed when estimating a resin filling on a
 * molar — pass the amalgam-equivalent fee so the downgrade difference can be
 * calculated. Leave it undefined for anything else.
 */
export function estimateCoverage(
  service: CoveredService,
  fee: number,
  toothNumber: number | null,
  patientAge: number,
  benefitUsage: BenefitUsage,
  usageCountForService: number,
  amalgamFeeForDowngrade?: number
): CoverageEstimate {
  const needsPredetermination = fee >= PLAN_RULES.predeterminationThreshold;

  // Step 6 — age gate blocks the service entirely.
  if (checkAgeGate(service.ageGate, patientAge)) {
    return {
      planPays: 0,
      patientOwes: fee,
      appliedDeductible: 0,
      usedPostMaxRate: false,
      frequencyExceeded: false,
      ageGateBlocked: true,
      downgradeApplied: false,
      downgradeDifference: 0,
      needsPredetermination,
      isEstimateOnly: true,
    };
  }

  // Step 5 — frequency limit exceeded, or the service is a flat exclusion.
  const frequencyExceeded = isFrequencyExceeded(service, usageCountForService);
  if (frequencyExceeded || service.notCovered) {
    return {
      planPays: 0,
      patientOwes: fee,
      appliedDeductible: 0,
      usedPostMaxRate: false,
      frequencyExceeded,
      ageGateBlocked: false,
      downgradeApplied: false,
      downgradeDifference: 0,
      needsPredetermination,
      isEstimateOnly: true,
    };
  }

  // Step 7 — resin filling on a molar gets downgraded to amalgam pricing;
  // the plan only pays based on the cheaper amalgam fee.
  let downgradeApplied = false;
  let downgradeDifference = 0;
  let payableFee = fee;
  const isMolar = toothNumber !== null && toothType(toothNumber) === "molar";
  if (
    PLAN_RULES.downgrades.resinPosteriorToAmalgam &&
    service.id === FILLINGS_SERVICE_ID &&
    isMolar &&
    amalgamFeeForDowngrade != null &&
    amalgamFeeForDowngrade < fee
  ) {
    downgradeApplied = true;
    downgradeDifference = round2(fee - amalgamFeeForDowngrade);
    payableFee = amalgamFeeForDowngrade;
  }

  // Steps 1/2 — category coinsurance + deductible (in-network rates, since
  // the primary provider, Dr. Rizvi, is PAR/in-network).
  const catRules = PLAN_RULES.coinsuranceByCategory[service.category];
  let appliedDeductible = 0;
  let feeAfterDeductible = payableFee;
  if (catRules.subjectToDeductible && benefitUsage.deductibleInRemaining > 0) {
    appliedDeductible = Math.min(benefitUsage.deductibleInRemaining, payableFee);
    feeAfterDeductible = payableFee - appliedDeductible;
  }

  // Step 4 — annual max already exhausted this year -> 30% mode instead of
  // the normal category rate. (Orthodontic has its own lifetime pool and is
  // never affected by the annual max.)
  const usedPostMaxRate = service.category !== "orthodontic" && benefitUsage.annualMaxRemaining <= 0;
  const rate = usedPostMaxRate ? PLAN_RULES.annualMax.postMaxCoinsurance.in : catRules.in;

  // Step 3 — apply coinsurance to whatever's left after the deductible.
  let planPays = feeAfterDeductible * rate;

  // Don't let a single estimate claim to pay more than what's actually left
  // in the relevant pool (annual max, or orthodontic's separate lifetime max).
  if (service.category === "orthodontic") {
    planPays = Math.min(planPays, Math.max(0, benefitUsage.orthoLifetimeRemaining));
  } else if (!usedPostMaxRate) {
    planPays = Math.min(planPays, Math.max(0, benefitUsage.annualMaxRemaining));
  }

  return {
    planPays: round2(planPays),
    patientOwes: round2(fee - planPays), // downgrade difference is already baked in via payableFee
    appliedDeductible: round2(appliedDeductible),
    usedPostMaxRate,
    frequencyExceeded: false,
    ageGateBlocked: false,
    downgradeApplied,
    downgradeDifference,
    needsPredetermination,
    isEstimateOnly: true,
  };
}

// ---------------------------------------------------------------------------
// Per-tooth filtering — powers the "click a tooth" feature
// ---------------------------------------------------------------------------

export type ToothFilterResult = {
  appointments: Appointment[];
  treatmentPlans: TreatmentPlan[]; // plans containing at least one item for this tooth
  completedWork: CompletedWork[];
  documents: DentalDocument[];
  claims: InsuranceClaim[];
};

export function filterByTooth(toothNumber: number, data: DentalData): ToothFilterResult {
  return {
    appointments: data.appointments.filter((a) => a.toothNumbers.includes(toothNumber)),
    treatmentPlans: data.treatmentPlans.filter((p) => p.items.some((i) => i.toothNumber === toothNumber)),
    completedWork: data.completedWork.filter((w) => w.toothNumber === toothNumber),
    documents: data.documents.filter((d) => d.toothNumbers.includes(toothNumber)),
    claims: data.claims.filter((c) => c.toothNumbers.includes(toothNumber)),
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
