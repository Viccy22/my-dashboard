"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ToothDiagram from "./ToothDiagram";
import {
  ABSENT_TEETH,
  COVERED_SERVICES,
  FILLINGS_SERVICE_ID,
  PLAN_RULES,
  buildTeeth,
  computeBenefitUsage,
  countServiceUsage,
  displayCdtCode,
  estimateCoverage,
  filterByTooth,
  fmtDate,
  fmtMoney,
  getPatientAge,
  isFrequencyExceeded,
  nextAvailableDate,
  servicesByCategory,
  toothName,
  toothType,
  type Appointment,
  type AppointmentStatus,
  type ClaimStatus,
  type CompletedWork,
  type CoveredService,
  type DentalData,
  type DentalDocument,
  type InsuranceClaim,
  type Payment,
  type PaymentMethod,
  type ToothStatus,
  type TreatmentPlan,
  type TreatmentPlanItem,
  type TreatmentPlanStatus,
} from "@/lib/dental";

// ============================================================================
// Local UI types
// ============================================================================

type SaveStatus = "idle" | "saving" | "saved" | "error";
type DashboardData = { dental?: DentalData; [key: string]: unknown };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function uid() {
  return crypto.randomUUID();
}

// ============================================================================
// Seed data — Victoria's real dental history, reconstructed from her
// uploaded invoices, Humana EOBs, and signed treatment plans (2022).
//
// This is real historical data, not placeholders. Anything that was
// handwritten, unclear, or couldn't be confirmed from a matching EOB is
// flagged directly in that record's `notes` field rather than guessed —
// look for "verify", "unclear", "not confirmed", or "reconcile" in the notes.
//
// Like `teeth`, these seed arrays are only used as the INITIAL value the
// first time the page loads with no saved dental data — once you edit
// anything, your saved version always wins on reload (see the load effect
// below).
// ============================================================================

const SEED_APPOINTMENTS: Appointment[] = [
  {
    id: "seed-appt-1",
    date: "2022-08-31",
    provider: "Laila Rizvi, DMD",
    location: "My DentalCare Center, Orlando FL",
    reason: "Initial exam, full x-ray series, and treatment plan consultation",
    status: "completed",
    notes:
      "Treatment Plans #1, #2, and #3 were proposed and signed this visit. A $50 deposit was paid toward the 9/13 appointment.",
    toothNumbers: [],
    documentIds: [],
  },
  {
    id: "seed-appt-2",
    date: "2022-09-13",
    provider: "Laila Rizvi, DMD",
    location: "My DentalCare Center, Orlando FL",
    reason: "Full-mouth scaling (D4346), desensitizing medicament, and localized antibiotic site therapy (D4381, 11 sites)",
    status: "completed",
    notes:
      "1:00pm appointment — Treatment Plan #1 Phase 1 (scaling) and Treatment Plan #3 (antibiotic placement) both done this visit. The D4346 scaling and D9910 desensitizing medicament were later denied by Humana (claim processed 9/27/22) — see Completed Work.",
    toothNumbers: [3, 14, 18, 19, 30, 31],
    documentIds: [],
  },
  {
    id: "seed-appt-3",
    date: "2022-09-27",
    provider: "My DentalCare Center (LKO)",
    location: "My DentalCare Center, Orlando FL",
    reason: "Prophylaxis (cleaning), oral hygiene instruction, topical fluoride varnish",
    status: "completed",
    notes:
      "3:00pm appointment — Treatment Plan #1 Phase 2. Topical fluoride (D1206) is not a covered benefit past age 18 (Victoria was 28), and oral hygiene instruction (D1330) is an excluded service — verify the $69 patient portion shown on the original plan actually reflects these exclusions.",
    toothNumbers: [],
    documentIds: [],
  },
  {
    id: "seed-appt-4",
    date: "2022-11-28",
    provider: "Laila Rizvi, DMD",
    location: "My DentalCare Center, Orlando FL",
    reason: "Resin composite fillings — teeth #12, #13, #14, #18, #19, #20",
    status: "completed",
    notes: "Billed per the Nov 28, 2022 statement. Matches Treatment Plan #2 Phase 2 (teeth 12,13,14) and Phase 3 (teeth 18,19,20).",
    toothNumbers: [12, 13, 14, 18, 19, 20],
    documentIds: [],
  },
  {
    id: "seed-appt-5",
    date: "2022-12-13",
    provider: "Laila Rizvi, DMD",
    location: "My DentalCare Center, Orlando FL",
    reason: "Unknown — visit inferred from a $287.00 Visa payment made this date",
    status: "completed",
    notes:
      "The reason/procedures for this visit weren't captured in the uploaded documents. A payment receipt confirms a visit or transaction happened this day — verify details with My DentalCare Center.",
    toothNumbers: [],
    documentIds: [],
  },
  {
    id: "seed-appt-6",
    date: "2023-04-05",
    provider: "Laila Rizvi, DMD",
    location: "My DentalCare Center, Orlando FL",
    reason: "Unknown — scheduled per the Nov 28, 2022 statement",
    status: "completed",
    notes:
      'This appointment was noted as upcoming on the Nov 28, 2022 statement ("Victoria Henze 4/5/2023 @ 3:00pm"). No invoice, payment, or claim record was found to confirm it happened or what was done — verify with My DentalCare Center / Humana records.',
    toothNumbers: [],
    documentIds: [],
  },
];

const SEED_TREATMENT_PLANS: TreatmentPlan[] = [
  {
    id: "seed-plan-1",
    dateProposed: "2022-08-31",
    provider: "Laila Rizvi, DMD",
    status: "completed",
    notes:
      "As printed on the original signed treatment plan: Subtotal $559.30 / Total Proposed $559.30 / Total Accepted $393.30 / Proposed Insurance $146.00. Item fees below are reconstructed from the plan document and don't all sum cleanly to these totals since several fees were bundled per-phase rather than itemized — see each item's notes. Signed by patient 8/31/2022.",
    items: [
      { id: "seed-p1-i1", serviceId: "panoramic-xrays", cdtCode: "D0210", procedureName: "Intraoral — Complete Series (incl. bitewings)", toothNumber: null, surface: "", fee: 97, estInsurance: 97, estPatient: 0, phase: "Phase 0" },
      { id: "seed-p1-i2", serviceId: "oral-evaluation", cdtCode: "D0150", procedureName: "Comprehensive Oral Evaluation", toothNumber: null, surface: "", fee: 0, estInsurance: 0, estPatient: 0, phase: "Phase 0 — included in the D0210 subtotal above" },
      { id: "seed-p1-i3", serviceId: "desensitizing-medicament", cdtCode: "D9910", procedureName: "Application of Desensitizing Medicament", toothNumber: null, surface: "", fee: 0, estInsurance: 0, estPatient: 0, phase: "Phase 1 — fee bundled into the $280.79 phase subtotal, not itemized separately" },
      { id: "seed-p1-i4", serviceId: "chlorhexidine-take-home", cdtCode: null, procedureName: "Chlorhexidine Gluconate (rinse)", toothNumber: null, surface: "", fee: 0, estInsurance: 0, estPatient: 0, phase: "Phase 1 — bundled, excluded service" },
      { id: "seed-p1-i5", serviceId: null, cdtCode: "ORQ", procedureName: "Needle-Free Local Anesthesia", toothNumber: null, surface: "", fee: 0, estInsurance: 0, estPatient: 0, phase: "Phase 1 — local anesthesia is typically bundled per plan rules, not separately billable" },
      { id: "seed-p1-i6", serviceId: null, cdtCode: "04997", procedureName: "Antibacterial Irrigation — Full Mouth", toothNumber: null, surface: "", fee: 0, estInsurance: 0, estPatient: 0, phase: "Phase 1 — bundled" },
      { id: "seed-p1-i7", serviceId: "full-mouth-scaling", cdtCode: "D4346", procedureName: "Scaling for Generalized Moderate/Severe Gingival Inflammation", toothNumber: null, surface: "", fee: 280.79, estInsurance: 0, estPatient: 280.79, phase: "Phase 1 — HANDWRITTEN annotations on the original ($0.00 / $49.00 / $33.00) are unclear which line they apply to. Actual claim (processed 9/27/22) shows this fully denied." },
      { id: "seed-p1-i8", serviceId: "routine-cleaning", cdtCode: "D1110", procedureName: "Prophylaxis — Adult (cleaning)", toothNumber: null, surface: "", fee: 0, estInsurance: 0, estPatient: 0, phase: "Phase 2 — part of the $82.00 phase subtotal (Ins $30.51 / Pat $69.00 as printed), not broken out per line" },
      { id: "seed-p1-i9", serviceId: "oral-hygiene-instruction", cdtCode: "D1330", procedureName: "Oral Hygiene Instruction", toothNumber: null, surface: "", fee: 0, estInsurance: 0, estPatient: 0, phase: "Phase 2 — excluded service, bundled into subtotal above" },
      { id: "seed-p1-i10", serviceId: "topical-fluoride", cdtCode: "D1206", procedureName: "Topical Fluoride Varnish", toothNumber: null, surface: "", fee: 0, estInsurance: 0, estPatient: 0, phase: "Phase 2 — NOT a covered benefit past age 18 (Victoria was 28); reconcile the $69 patient amount shown on the phase subtotal" },
      { id: "seed-p1-i11", serviceId: "chlorhexidine-take-home", cdtCode: "CLINP", procedureName: "Tri-Calcium Phosphate / Sodium Fluoride (take-home)", toothNumber: null, surface: "", fee: 0, estInsurance: 0, estPatient: 0, phase: "Phase 4 — take-home item, excluded, $0 fee as printed" },
      { id: "seed-p1-i12", serviceId: "oral-cancer-screening", cdtCode: "D0431", procedureName: "ViziLite Oral Cancer Screening", toothNumber: null, surface: "", fee: 0, estInsurance: 0, estPatient: 0, phase: "Phase 10 — not covered until age 40 (Victoria was 28); $0 fee as printed, may not have actually been performed" },
    ],
    documentIds: [],
  },
  {
    id: "seed-plan-2",
    dateProposed: "2022-08-31",
    provider: "Laila Rizvi, DMD",
    status: "completed",
    notes:
      'As printed: Subtotal $2,777.00 / Total Proposed $2,777.00 / Total Accepted $884.00 / Proposed Insurance $884.00. Signed by patient 8/31/2022. Marginal handwritten note: "9/13 scaling", initials "K. Zazchik". The Nov 28, 2022 statement is the more reliable record of what was actually billed — see items marked "actual billed amount confirmed."',
    items: [
      { id: "seed-p2-i1", serviceId: FILLINGS_SERVICE_ID, cdtCode: "D2393", procedureName: "Resin-Based Composite — 3 Surfaces", toothNumber: 2, surface: "DOB5", fee: 503, estInsurance: 216, estPatient: 287, phase: "Phase 0" },
      { id: "seed-p2-i2", serviceId: FILLINGS_SERVICE_ID, cdtCode: "D2393", procedureName: "Resin-Based Composite — 3 Surfaces", toothNumber: 3, surface: "MOD", fee: 0, estInsurance: 0, estPatient: 0, phase: "Phase 0 — fee not broken out separately on the plan (Phase 0 subtotal printed as Fee $132.00/Ins $72.80/Pat $59.20)" },
      { id: "seed-p2-i3", serviceId: FILLINGS_SERVICE_ID, cdtCode: "D2393", procedureName: "Resin-Based Composite — 3 Surfaces", toothNumber: 4, surface: "MOD", fee: 0, estInsurance: 0, estPatient: 0, phase: "Phase 0 — see note on item above" },
      { id: "seed-p2-i4", serviceId: FILLINGS_SERVICE_ID, cdtCode: "D2392", procedureName: "Resin-Based Composite — 2 Surfaces", toothNumber: 5, surface: "DO", fee: 0, estInsurance: 0, estPatient: 0, phase: "Phase 0 — see note above" },
      { id: "seed-p2-i5", serviceId: FILLINGS_SERVICE_ID, cdtCode: "D2393", procedureName: "Resin-Based Composite — 3 Surfaces", toothNumber: 31, surface: "DOB5", fee: 1152, estInsurance: 322.4, estPatient: 829.6, phase: "Phase 1" },
      { id: "seed-p2-i6", serviceId: FILLINGS_SERVICE_ID, cdtCode: "D2393", procedureName: "Resin-Based Composite — 3 Surfaces", toothNumber: 12, surface: "MOD", fee: 132, estInsurance: 72.8, estPatient: 59.2, phase: "Phase 2 — actual billed amount confirmed on the Nov 28, 2022 statement" },
      { id: "seed-p2-i7", serviceId: FILLINGS_SERVICE_ID, cdtCode: "D2393", procedureName: "Resin-Based Composite — 3 Surfaces", toothNumber: 13, surface: "MOD", fee: 132, estInsurance: 72.8, estPatient: 59.2, phase: "Phase 2 — actual billed amount confirmed on the Nov 28, 2022 statement" },
      { id: "seed-p2-i8", serviceId: FILLINGS_SERVICE_ID, cdtCode: "D2393", procedureName: "Resin-Based Composite — 3 Surfaces", toothNumber: 14, surface: "MOD", fee: 132, estInsurance: 72.8, estPatient: 59.2, phase: "Phase 2 — actual billed amount confirmed on the Nov 28, 2022 statement" },
      { id: "seed-p2-i9", serviceId: "oral-surgery", cdtCode: "D7210", procedureName: "Surgical Removal of Erupted Tooth", toothNumber: 15, surface: "", fee: 0, estInsurance: 0, estPatient: 0, phase: "Phase 2 — fee not broken out; part of $990.00 phase subtotal (Ins $272.80 / Pat $717.20 as printed)" },
      { id: "seed-p2-i10", serviceId: "bone-graft-biologics", cdtCode: "D7953", procedureName: "Bone Replacement Graft", toothNumber: 15, surface: "", fee: 0, estInsurance: 0, estPatient: 0, phase: "Phase 2 — excluded service, bundled into subtotal above" },
      { id: "seed-p2-i11", serviceId: FILLINGS_SERVICE_ID, cdtCode: "D2394", procedureName: "Resin-Based Composite — 4+ Surfaces", toothNumber: 18, surface: "MODB5", fee: 429, estInsurance: 100, estPatient: 329, phase: "Phase 3 — actual billed amount confirmed on the Nov 28, 2022 statement (molar — resin downgraded to amalgam pricing)" },
      { id: "seed-p2-i12", serviceId: FILLINGS_SERVICE_ID, cdtCode: "D2394", procedureName: "Resin-Based Composite — 4+ Surfaces", toothNumber: 19, surface: "MODB5", fee: 429, estInsurance: 100, estPatient: 329, phase: "Phase 3 — actual billed amount confirmed on the Nov 28, 2022 statement (molar — resin downgraded to amalgam pricing)" },
      { id: "seed-p2-i13", serviceId: FILLINGS_SERVICE_ID, cdtCode: "D2393", procedureName: "Resin-Based Composite — 3 Surfaces", toothNumber: 20, surface: "MOD", fee: 132, estInsurance: 72.8, estPatient: 59.2, phase: "Phase 3 — actual billed amount confirmed on the Nov 28, 2022 statement" },
    ],
    documentIds: [],
  },
  {
    id: "seed-plan-3",
    dateProposed: "2022-09-13",
    provider: "My DentalCare Center",
    status: "completed",
    notes:
      "As printed: Subtotal $935.00 / Total Proposed $935.00. Signed by patient 9/13/2022. 11 antibiotic (D4381) sites proposed across 6 teeth. A $935.00 CareCredit payment was made 9/13/2022 matching this plan's total exactly. Only 4 of the 11 sites (teeth #3 and #14) appear on an insurance claim (#202209146240999, processed 9/15/22) — all 4 denied for exceeding the frequency limit. The remaining 7 sites (teeth 18, 19, 30, 31) don't appear on any uploaded claim — verify whether they were billed separately or self-paid.",
    items: [
      { id: "seed-p3-i1", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 3, surface: "DB", fee: 85, estInsurance: 0, estPatient: 85, phase: "Denied — frequency limit exceeded (claim #202209146240999)" },
      { id: "seed-p3-i2", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 3, surface: "MB", fee: 85, estInsurance: 0, estPatient: 85, phase: "Denied — frequency limit exceeded (claim #202209146240999)" },
      { id: "seed-p3-i3", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 14, surface: "DB", fee: 85, estInsurance: 0, estPatient: 85, phase: "Denied — frequency limit exceeded (claim #202209146240999)" },
      { id: "seed-p3-i4", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 14, surface: "DL", fee: 85, estInsurance: 0, estPatient: 85, phase: "Denied — frequency limit exceeded (claim #202209146240999)" },
      { id: "seed-p3-i5", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 18, surface: "ML", fee: 85, estInsurance: 0, estPatient: 85, phase: "Not found on any uploaded claim — likely self-paid via the $935 CareCredit payment" },
      { id: "seed-p3-i6", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 18, surface: "MB", fee: 85, estInsurance: 0, estPatient: 85, phase: "Not found on any uploaded claim — likely self-paid" },
      { id: "seed-p3-i7", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 19, surface: "DL", fee: 85, estInsurance: 0, estPatient: 85, phase: "Not found on any uploaded claim — likely self-paid" },
      { id: "seed-p3-i8", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 30, surface: "DL", fee: 85, estInsurance: 0, estPatient: 85, phase: "Not found on any uploaded claim — likely self-paid" },
      { id: "seed-p3-i9", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 30, surface: "ML", fee: 85, estInsurance: 0, estPatient: 85, phase: "Not found on any uploaded claim — likely self-paid" },
      { id: "seed-p3-i10", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 31, surface: "ML", fee: 85, estInsurance: 0, estPatient: 85, phase: "Not found on any uploaded claim — likely self-paid" },
      { id: "seed-p3-i11", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 31, surface: "DB", fee: 85, estInsurance: 0, estPatient: 85, phase: "Not found on any uploaded claim — likely self-paid" },
    ],
    documentIds: [],
  },
];

const SEED_COMPLETED_WORK: CompletedWork[] = [
  { id: "seed-cw-1", date: "2022-08-31", serviceId: "panoramic-xrays", cdtCode: "D0210", procedureName: "Intraoral — Complete Series (incl. bitewings)", toothNumber: null, surface: "", provider: "Laila Rizvi, DMD", network: "in", billedAmount: 153, insurancePaid: 104, patientPaid: 0, deductibleApplied: 0, linkedAppointmentId: "seed-appt-1", notes: "Claim #202209016355680, processed 9/4/22. Fully covered under Preventive.", documentIds: [] },
  { id: "seed-cw-2", date: "2022-08-31", serviceId: "oral-evaluation", cdtCode: "D0150", procedureName: "Comprehensive Oral Evaluation", toothNumber: null, surface: "", provider: "Laila Rizvi, DMD", network: "in", billedAmount: 118, insurancePaid: 62, patientPaid: 0, deductibleApplied: 0, linkedAppointmentId: "seed-appt-1", notes: "Claim #202209016355680, processed 9/4/22. Fully covered under Preventive.", documentIds: [] },
  { id: "seed-cw-3", date: "2022-09-13", serviceId: "desensitizing-medicament", cdtCode: "D9910", procedureName: "Application of Desensitizing Medicament", toothNumber: null, surface: "", provider: "Laila Rizvi, DMD", network: "in", billedAmount: 27, insurancePaid: 0, patientPaid: 27, deductibleApplied: 0, linkedAppointmentId: "seed-appt-2", notes: "Excluded service — confirmed denied on EOB (claim #202209146293588, processed 9/27/22).", documentIds: [] },
  { id: "seed-cw-4", date: "2022-09-13", serviceId: "full-mouth-scaling", cdtCode: "D4346", procedureName: "Scaling for Generalized Moderate/Severe Gingival Inflammation", toothNumber: null, surface: "", provider: "Laila Rizvi, DMD", network: "in", billedAmount: 192, insurancePaid: 0, patientPaid: 192, deductibleApplied: 0, linkedAppointmentId: "seed-appt-2", notes: "Denied — claim #202209146293588, processed 9/27/22, reason codes 252/9ED, 9EH, 9PQ (not fully defined in available documents — verify with Humana). Original treatment plan estimated this fee at $280.79; actual billed charge was $192.00.", documentIds: [] },
  { id: "seed-cw-5", date: "2022-09-13", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 3, surface: "DB", provider: "Laila Rizvi, DMD", network: "in", billedAmount: 85, insurancePaid: 0, patientPaid: 85, deductibleApplied: 0, linkedAppointmentId: "seed-appt-2", notes: "Denied — claim #202209146240999, processed 9/15/22, reason 273/FNG: frequency limitation exceeded.", documentIds: [] },
  { id: "seed-cw-6", date: "2022-09-13", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 3, surface: "MB", provider: "Laila Rizvi, DMD", network: "in", billedAmount: 85, insurancePaid: 0, patientPaid: 85, deductibleApplied: 0, linkedAppointmentId: "seed-appt-2", notes: "Denied — claim #202209146240999, processed 9/15/22, reason 273/FNG: frequency limitation exceeded.", documentIds: [] },
  { id: "seed-cw-7", date: "2022-09-13", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 14, surface: "DB", provider: "Laila Rizvi, DMD", network: "in", billedAmount: 85, insurancePaid: 0, patientPaid: 85, deductibleApplied: 0, linkedAppointmentId: "seed-appt-2", notes: "Denied — claim #202209146240999, processed 9/15/22, reason 273/FNG: frequency limitation exceeded.", documentIds: [] },
  { id: "seed-cw-8", date: "2022-09-13", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 14, surface: "DL", provider: "Laila Rizvi, DMD", network: "in", billedAmount: 85, insurancePaid: 0, patientPaid: 85, deductibleApplied: 0, linkedAppointmentId: "seed-appt-2", notes: "Denied — claim #202209146240999, processed 9/15/22, reason 273/FNG: frequency limitation exceeded.", documentIds: [] },
  { id: "seed-cw-9", date: "2022-09-13", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 18, surface: "ML", provider: "Laila Rizvi, DMD", network: "in", billedAmount: 85, insurancePaid: 0, patientPaid: 85, deductibleApplied: 0, linkedAppointmentId: "seed-appt-2", notes: "Not found on any uploaded insurance claim — appears self-paid via the $935 CareCredit payment on 9/13/22 rather than billed to Humana. Verify.", documentIds: [] },
  { id: "seed-cw-10", date: "2022-09-13", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 18, surface: "MB", provider: "Laila Rizvi, DMD", network: "in", billedAmount: 85, insurancePaid: 0, patientPaid: 85, deductibleApplied: 0, linkedAppointmentId: "seed-appt-2", notes: "Not found on any uploaded insurance claim — appears self-paid via CareCredit. Verify.", documentIds: [] },
  { id: "seed-cw-11", date: "2022-09-13", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 19, surface: "DL", provider: "Laila Rizvi, DMD", network: "in", billedAmount: 85, insurancePaid: 0, patientPaid: 85, deductibleApplied: 0, linkedAppointmentId: "seed-appt-2", notes: "Not found on any uploaded insurance claim — appears self-paid via CareCredit. Verify.", documentIds: [] },
  { id: "seed-cw-12", date: "2022-09-13", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 30, surface: "DL", provider: "Laila Rizvi, DMD", network: "in", billedAmount: 85, insurancePaid: 0, patientPaid: 85, deductibleApplied: 0, linkedAppointmentId: "seed-appt-2", notes: "Not found on any uploaded insurance claim — appears self-paid via CareCredit. Verify.", documentIds: [] },
  { id: "seed-cw-13", date: "2022-09-13", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 30, surface: "ML", provider: "Laila Rizvi, DMD", network: "in", billedAmount: 85, insurancePaid: 0, patientPaid: 85, deductibleApplied: 0, linkedAppointmentId: "seed-appt-2", notes: "Not found on any uploaded insurance claim — appears self-paid via CareCredit. Verify.", documentIds: [] },
  { id: "seed-cw-14", date: "2022-09-13", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 31, surface: "ML", provider: "Laila Rizvi, DMD", network: "in", billedAmount: 85, insurancePaid: 0, patientPaid: 85, deductibleApplied: 0, linkedAppointmentId: "seed-appt-2", notes: "Not found on any uploaded insurance claim — appears self-paid via CareCredit. Verify.", documentIds: [] },
  { id: "seed-cw-15", date: "2022-09-13", serviceId: "site-therapy", cdtCode: "D4381", procedureName: "Local Delivery of Antimicrobial Agent (Minocycline)", toothNumber: 31, surface: "DB", provider: "Laila Rizvi, DMD", network: "in", billedAmount: 85, insurancePaid: 0, patientPaid: 85, deductibleApplied: 0, linkedAppointmentId: "seed-appt-2", notes: "Not found on any uploaded insurance claim — appears self-paid via CareCredit. Verify.", documentIds: [] },
  { id: "seed-cw-16", date: "2022-11-28", serviceId: FILLINGS_SERVICE_ID, cdtCode: "D2393", procedureName: "Resin-Based Composite — 3 Surfaces", toothNumber: 12, surface: "MOD", provider: "Laila Rizvi, DMD", network: "in", billedAmount: 132, insurancePaid: 72.8, patientPaid: 59.2, deductibleApplied: 0, linkedAppointmentId: "seed-appt-4", notes: "Billed amount confirmed via the Nov 28, 2022 statement. Insurance-paid is the statement's 'Est. Insurance' figure — no Humana EOB for this batch was found in the uploaded documents, so this is not yet confirmed. Payments were made in bulk on 11/28/22 and 12/13/22 — see Payments.", documentIds: [] },
  { id: "seed-cw-17", date: "2022-11-28", serviceId: FILLINGS_SERVICE_ID, cdtCode: "D2393", procedureName: "Resin-Based Composite — 3 Surfaces", toothNumber: 13, surface: "MOD", provider: "Laila Rizvi, DMD", network: "in", billedAmount: 132, insurancePaid: 72.8, patientPaid: 59.2, deductibleApplied: 0, linkedAppointmentId: "seed-appt-4", notes: "Billed amount confirmed via the Nov 28, 2022 statement. Insurance-paid is an unconfirmed pre-claim estimate — see item above for full note.", documentIds: [] },
  { id: "seed-cw-18", date: "2022-11-28", serviceId: FILLINGS_SERVICE_ID, cdtCode: "D2393", procedureName: "Resin-Based Composite — 3 Surfaces", toothNumber: 14, surface: "MOD", provider: "Laila Rizvi, DMD", network: "in", billedAmount: 132, insurancePaid: 72.8, patientPaid: 59.2, deductibleApplied: 0, linkedAppointmentId: "seed-appt-4", notes: "Billed amount confirmed via the Nov 28, 2022 statement. Insurance-paid is an unconfirmed pre-claim estimate — see item above for full note.", documentIds: [] },
  { id: "seed-cw-19", date: "2022-11-28", serviceId: FILLINGS_SERVICE_ID, cdtCode: "D2394", procedureName: "Resin-Based Composite — 4+ Surfaces", toothNumber: 18, surface: "MODB5", provider: "Laila Rizvi, DMD", network: "in", billedAmount: 429, insurancePaid: 100, patientPaid: 329, deductibleApplied: 0, linkedAppointmentId: "seed-appt-4", notes: "Billed amount confirmed via the Nov 28, 2022 statement (molar — resin downgraded to amalgam pricing). Insurance-paid is an unconfirmed pre-claim estimate.", documentIds: [] },
  { id: "seed-cw-20", date: "2022-11-28", serviceId: FILLINGS_SERVICE_ID, cdtCode: "D2394", procedureName: "Resin-Based Composite — 4+ Surfaces", toothNumber: 19, surface: "MODB5", provider: "Laila Rizvi, DMD", network: "in", billedAmount: 429, insurancePaid: 100, patientPaid: 329, deductibleApplied: 0, linkedAppointmentId: "seed-appt-4", notes: "Billed amount confirmed via the Nov 28, 2022 statement (molar — resin downgraded to amalgam pricing). Insurance-paid is an unconfirmed pre-claim estimate.", documentIds: [] },
  { id: "seed-cw-21", date: "2022-11-28", serviceId: FILLINGS_SERVICE_ID, cdtCode: "D2393", procedureName: "Resin-Based Composite — 3 Surfaces", toothNumber: 20, surface: "MOD", provider: "Laila Rizvi, DMD", network: "in", billedAmount: 132, insurancePaid: 72.8, patientPaid: 59.2, deductibleApplied: 0, linkedAppointmentId: "seed-appt-4", notes: "Billed amount confirmed via the Nov 28, 2022 statement. Insurance-paid is an unconfirmed pre-claim estimate — see first fillings item for full note.", documentIds: [] },
];

const SEED_PAYMENTS: Payment[] = [
  { id: "seed-pay-1", date: "2022-08-31", amount: 50, method: "card", appliesTo: { kind: "other", label: "Deposit for 9/13 appointment" }, notes: "Visa, Approval Code 010619, TRN REF# 462243635545088. Handwritten note on receipt: \"Chlo $20.79 / Clin Pro $30.51\"." },
  { id: "seed-pay-2", date: "2022-09-13", amount: 320.38, method: "care_credit", appliesTo: { kind: "other", label: "Scaling / mouthwash / toothpaste" }, notes: "CareCredit account ending ...0592. Handwritten note: \"Scaling / mouthwash / toothpaste\"." },
  { id: "seed-pay-3", date: "2022-09-13", amount: 935, method: "care_credit", appliesTo: { kind: "treatment_plan", id: "seed-plan-3" }, notes: "CareCredit, same account as above. Matches Treatment Plan #3 (D4381 antibiotic placement, 11 sites) total exactly." },
  { id: "seed-pay-4", date: "2022-10-20", amount: 59.2, method: "card", appliesTo: { kind: "other", label: "Balance payment" }, notes: "Visa, Approval Code 018142, TRN REF# 462293600733073." },
  { id: "seed-pay-5", date: "2022-11-28", amount: 750, method: "card", appliesTo: { kind: "other", label: "Payment toward fillings balance" }, notes: "Visa, Approval Code 023605, TRN REF# 462332695145986." },
  { id: "seed-pay-6", date: "2022-11-28", amount: 144.8, method: "card", appliesTo: { kind: "other", label: "Payment toward fillings balance" }, notes: "Mastercard, Approval Code 287446, TRN REF# MDJY9OOXR1128." },
  { id: "seed-pay-7", date: "2022-12-13", amount: 287, method: "card", appliesTo: { kind: "other", label: "Balance payment" }, notes: "Visa, Approval Code 057482, TRN REF# 462347621503848." },
];

const SEED_CLAIMS: InsuranceClaim[] = [
  { id: "seed-claim-1", claimNumber: "202209016355680", serviceDateStart: "2022-08-31", serviceDateEnd: "2022-08-31", provider: "Laila Rizvi, DMD", processedOn: "2022-09-04", totalBilled: 271, planDiscount: 105, allowedAmount: 166, planPaid: 166, patientShare: 0, status: "paid", toothNumbers: [], documentIds: [], notes: "Covers D0210 (full x-ray series, $104 allowed) and D0150 (comprehensive exam, $62 allowed), both fully covered under Preventive (100%). Reason code 45/6EZ. This EOB confirms the annual max used as of this claim: $166.00 of $2,000.00." },
  { id: "seed-claim-2", claimNumber: "202209146293588", serviceDateStart: "2022-09-13", serviceDateEnd: "2022-09-13", provider: "Laila Rizvi, DMD", processedOn: "2022-09-27", totalBilled: 219, planDiscount: 0, allowedAmount: 0, planPaid: 0, patientShare: 219, status: "denied", toothNumbers: [], documentIds: [], notes: "Covers D9910 ($27, excluded service) and D4346 scaling ($192, denied — reason codes 252/9ED, 9EH, 9PQ not fully defined in available documents, verify with Humana). Both fully patient-responsibility." },
  { id: "seed-claim-3", claimNumber: "202209146240999", serviceDateStart: "2022-09-13", serviceDateEnd: "2022-09-13", provider: "Laila Rizvi, DMD", processedOn: "2022-09-15", totalBilled: 340, planDiscount: 0, allowedAmount: 0, planPaid: 0, patientShare: 340, status: "denied", toothNumbers: [3, 14], documentIds: [], notes: "Covers 4 of the 11 D4381 antibiotic sites proposed on Treatment Plan #3 (tooth 3 x2 sites, tooth 14 x2 sites). Reason code 273/FNG: frequency limitation exceeded. The remaining 7 sites (teeth 18,19,30,31) don't appear on this or any other uploaded claim." },
];

// ============================================================================
// Small shared icons
// ============================================================================

const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 2l9 9M11 2l-9 9" strokeLinecap="round" />
  </svg>
);
const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M6.5 2v9M2 6.5h9" />
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M2 3.5h9M5 3.5V2h3v1.5M4 3.5l.5 7h4l.5-7" strokeLinejoin="round" />
  </svg>
);

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-3)", marginBottom: "5px", letterSpacing: "0.04em" }}>
      {children}
    </div>
  );
}

// ============================================================================
// Status metadata
// ============================================================================

const TOOTH_STATUS_OPTIONS: { value: ToothStatus; label: string }[] = [
  { value: "healthy", label: "Healthy" },
  { value: "watch", label: "Watching" },
  { value: "needs_work", label: "Needs Work" },
  { value: "treated", label: "Treated" },
];

const APPT_STATUS_META: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
  upcoming: { label: "Upcoming", color: "var(--accent-text)", bg: "var(--accent-dim)" },
  completed: { label: "Completed", color: "var(--green)", bg: "var(--green-dim)" },
  cancelled: { label: "Cancelled", color: "var(--text-3)", bg: "var(--surface-raised)" },
};

const PLAN_STATUS_META: Record<TreatmentPlanStatus, { label: string; color: string; bg: string }> = {
  proposed: { label: "Proposed", color: "var(--text-3)", bg: "var(--surface-raised)" },
  accepted: { label: "Accepted", color: "var(--yellow)", bg: "var(--yellow-dim)" },
  completed: { label: "Completed", color: "var(--green)", bg: "var(--green-dim)" },
  declined: { label: "Declined", color: "var(--red)", bg: "var(--red-dim)" },
};

const CLAIM_STATUS_META: Record<ClaimStatus, { label: string; color: string; bg: string }> = {
  submitted: { label: "Submitted", color: "var(--text-3)", bg: "var(--surface-raised)" },
  processing: { label: "Processing", color: "var(--accent-text)", bg: "var(--accent-dim)" },
  paid: { label: "Paid", color: "var(--green)", bg: "var(--green-dim)" },
  denied: { label: "Denied", color: "var(--red)", bg: "var(--red-dim)" },
  appealed: { label: "Appealed", color: "var(--yellow)", bg: "var(--yellow-dim)" },
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: "Card",
  check: "Check",
  cash: "Cash",
  hsa_fsa: "HSA/FSA",
  care_credit: "CareCredit",
  other: "Other",
};

// ============================================================================
// Main page
// ============================================================================

export default function DentalPage() {
  const rawDataRef = useRef<DashboardData>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [dental, setDental] = useState<DentalData>({
    teeth: buildTeeth(),
    appointments: [],
    treatmentPlans: [],
    completedWork: [],
    payments: [],
    claims: [],
    documents: [],
  });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

  // ---- Load / save (mirrors the pattern used by every other dashboard page) ----

  useEffect(() => {
    fetch("/api/data")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((res) => {
        const d: DashboardData = res.data ?? {};
        rawDataRef.current = d;
        const saved = d.dental;
        const merged: DentalData = {
          teeth: saved?.teeth?.length ? saved.teeth : buildTeeth(),
          appointments: saved?.appointments?.length ? saved.appointments : SEED_APPOINTMENTS,
          treatmentPlans: saved?.treatmentPlans?.length ? saved.treatmentPlans : SEED_TREATMENT_PLANS,
          completedWork: saved?.completedWork?.length ? saved.completedWork : SEED_COMPLETED_WORK,
          payments: saved?.payments?.length ? saved.payments : SEED_PAYMENTS,
          claims: saved?.claims?.length ? saved.claims : SEED_CLAIMS,
          documents: saved?.documents ?? [],
        };
        setDental(merged);
      })
      .catch(() => setStatus("error"))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (next: DentalData) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    try {
      const newData = { ...rawDataRef.current, dental: next };
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: newData }),
      });
      if (!res.ok) throw new Error();
      rawDataRef.current = newData;
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      timer.current = setTimeout(() => setStatus("idle"), 2000);
    }
  }, []);

  function updateDental(next: DentalData) {
    setDental(next);
    save(next);
  }

  // ---- Derived values ----

  const currentYear = new Date().getFullYear();
  const benefitUsage = useMemo(() => computeBenefitUsage(currentYear, dental.completedWork), [dental.completedWork, currentYear]);
  const patientAge = getPatientAge();

  const totalPaidYTD = useMemo(
    () => dental.payments.filter((p) => p.date.slice(0, 4) === String(currentYear)).reduce((s, p) => s + p.amount, 0),
    [dental.payments, currentYear]
  );

  const estimatedFutureOOP = useMemo(
    () =>
      dental.treatmentPlans
        .filter((p) => p.status === "accepted" || p.status === "proposed")
        .reduce((s, p) => s + p.items.reduce((si, i) => si + i.estPatient, 0), 0),
    [dental.treatmentPlans]
  );

  // Outstanding balance = billed minus what insurance paid, minus payments made.
  // See the plan's "Assumptions" note — this is a transparent default, not a
  // claims-reconciled figure.
  const outstandingBalance = useMemo(() => {
    const billedMinusInsurance = dental.completedWork.reduce((s, w) => s + (w.billedAmount - w.insurancePaid), 0);
    const totalPayments = dental.payments.reduce((s, p) => s + p.amount, 0);
    return Math.max(0, billedMinusInsurance - totalPayments);
  }, [dental.completedWork, dental.payments]);

  // ---- Generic add/update/delete helpers per entity ----

  function addAppointment(a: Appointment) {
    updateDental({ ...dental, appointments: [...dental.appointments, a] });
  }
  function updateAppointment(id: string, patch: Partial<Appointment>) {
    updateDental({ ...dental, appointments: dental.appointments.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  }
  function deleteAppointment(id: string) {
    updateDental({ ...dental, appointments: dental.appointments.filter((a) => a.id !== id) });
  }

  function addCompletedWork(w: CompletedWork) {
    updateDental({ ...dental, completedWork: [...dental.completedWork, w] });
  }
  function updateCompletedWork(id: string, patch: Partial<CompletedWork>) {
    updateDental({ ...dental, completedWork: dental.completedWork.map((w) => (w.id === id ? { ...w, ...patch } : w)) });
  }
  function deleteCompletedWork(id: string) {
    updateDental({ ...dental, completedWork: dental.completedWork.filter((w) => w.id !== id) });
  }

  function addPayment(p: Payment) {
    updateDental({ ...dental, payments: [...dental.payments, p] });
  }
  function deletePayment(id: string) {
    updateDental({ ...dental, payments: dental.payments.filter((p) => p.id !== id) });
  }

  function addClaim(c: InsuranceClaim) {
    updateDental({ ...dental, claims: [...dental.claims, c] });
  }
  function deleteClaim(id: string) {
    updateDental({ ...dental, claims: dental.claims.filter((c) => c.id !== id) });
  }

  function addTreatmentPlan(p: TreatmentPlan) {
    updateDental({ ...dental, treatmentPlans: [...dental.treatmentPlans, p] });
  }
  function updateTreatmentPlan(id: string, patch: Partial<TreatmentPlan>) {
    updateDental({ ...dental, treatmentPlans: dental.treatmentPlans.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  }
  function deleteTreatmentPlan(id: string) {
    updateDental({ ...dental, treatmentPlans: dental.treatmentPlans.filter((p) => p.id !== id) });
  }

  function addDocument(d: DentalDocument) {
    updateDental({ ...dental, documents: [...dental.documents, d] });
  }
  function deleteDocument(id: string) {
    updateDental({ ...dental, documents: dental.documents.filter((d) => d.id !== id) });
  }

  function updateToothStatus(number: number, newStatus: ToothStatus) {
    updateDental({ ...dental, teeth: dental.teeth.map((t) => (t.number === number ? { ...t, status: newStatus } : t)) });
  }

  // ---- UI-only state ----

  const [showAddAppt, setShowAddAppt] = useState(false);
  const [editingApptId, setEditingApptId] = useState<string | null>(null);
  const [showAddWork, setShowAddWork] = useState(false);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAddClaim, setShowAddClaim] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TreatmentPlan | "new" | null>(null);
  const [timelineFilters, setTimelineFilters] = useState({ dateFrom: "", dateTo: "", tooth: "", provider: "", type: "" });
  const [uploading, setUploading] = useState(false);

  if (loading) return <p className="empty" style={{ padding: "32px 0" }}>Loading…</p>;

  return (
    <div style={{ maxWidth: "1000px" }}>
      {status !== "idle" && (
        <div className={`toast${status === "error" ? " error" : ""}`}>
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Could not save — check connection."}
        </div>
      )}

      {/* ── 1. Patient / plan reference ─────────────────────────────────── */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p className="card-title">Patient & Plan Reference</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
          {[
            { label: "Patient", value: `${PLAN_RULES.patientInfo.name} (b. ${PLAN_RULES.patientInfo.birthYear})` },
            { label: "Member ID", value: PLAN_RULES.patientInfo.memberId },
            { label: "Group / Plan Number", value: PLAN_RULES.patientInfo.groupNumber },
            { label: "Plan", value: `${PLAN_RULES.patientInfo.planName} — ${PLAN_RULES.patientInfo.network}` },
            { label: "Primary Provider", value: `${PLAN_RULES.patientInfo.primaryProvider}${PLAN_RULES.patientInfo.primaryProviderInNetwork ? " (in-network)" : ""}` },
            { label: "Provider Location", value: `${PLAN_RULES.patientInfo.primaryProviderLocation} · ${PLAN_RULES.patientInfo.primaryProviderPhone}` },
            { label: "Customer Service", value: PLAN_RULES.patientInfo.customerServicePhone },
            { label: "Local Patient ID", value: PLAN_RULES.patientInfo.localPatientId },
          ].map((item) => (
            <div key={item.label} style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "10px 12px" }}>
              <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: "4px" }}>{item.label}</div>
              <div style={{ fontSize: "13.5px", color: "var(--text)", fontWeight: 500 }}>{item.value}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "11.5px", color: "var(--text-3)", margin: "10px 0 0" }}>
          This reference data is read-only — it comes directly from your plan documents and isn&apos;t editable here.
        </p>
      </div>

      {/* ── 2. Financial summary ────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p className="card-title">Financial Summary — {currentYear}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "16px" }}>
          <SummaryStat label="Paid Year-to-Date" value={fmtMoney(totalPaidYTD)} />
          <SummaryStat label="Est. Future Out-of-Pocket" value={fmtMoney(estimatedFutureOOP)} sub="accepted/proposed plans" />
          <SummaryStat label="Outstanding Balance" value={fmtMoney(outstandingBalance)} />
        </div>
        <ProgressStat label="Annual Maximum" used={benefitUsage.annualMaxUsed} limit={PLAN_RULES.annualMax.amount} />
        <ProgressStat label="Deductible (In-Network)" used={benefitUsage.deductibleInUsed} limit={PLAN_RULES.deductible.individualInNetwork} />
        <ProgressStat label="Orthodontic Lifetime Max" used={benefitUsage.orthoLifetimeUsed} limit={PLAN_RULES.orthodonticLifetimeMax} />
      </div>

      {/* ── 3. Tooth diagram ─────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p className="card-title">Tooth Chart</p>
        <ToothDiagram teeth={dental.teeth} selectedTooth={selectedTooth} onSelectTooth={setSelectedTooth} />
      </div>

      {/* ── 4. Per-tooth panel ───────────────────────────────────────────── */}
      {selectedTooth != null && (
        <PerToothPanel
          toothNumber={selectedTooth}
          dental={dental}
          onClose={() => setSelectedTooth(null)}
          onStatusChange={(s) => updateToothStatus(selectedTooth, s)}
        />
      )}

      {/* ── 5. Upcoming appointments ─────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <p className="card-title" style={{ margin: 0 }}>Upcoming Appointments</p>
          <button className="btn btn-secondary" onClick={() => setShowAddAppt((v) => !v)} style={{ fontSize: "12px", padding: "5px 12px" }}>
            {showAddAppt ? "Cancel" : "+ Add"}
          </button>
        </div>
        {showAddAppt && (
          <AppointmentForm
            onSave={(a) => {
              addAppointment({ ...a, id: uid() });
              setShowAddAppt(false);
            }}
            onCancel={() => setShowAddAppt(false)}
          />
        )}
        {(() => {
          const upcoming = dental.appointments.filter((a) => a.status === "upcoming").sort((a, b) => a.date.localeCompare(b.date));
          if (upcoming.length === 0) return <p className="empty">No upcoming appointments — add one above.</p>;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {upcoming.map((a) =>
                editingApptId === a.id ? (
                  <AppointmentForm key={a.id} initial={a} onSave={(patch) => { updateAppointment(a.id, patch); setEditingApptId(null); }} onCancel={() => setEditingApptId(null)} />
                ) : (
                  <AppointmentRow key={a.id} appt={a} onEdit={() => setEditingApptId(a.id)} onDelete={() => deleteAppointment(a.id)} />
                )
              )}
            </div>
          );
        })()}
      </div>

      {/* ── 6. Timeline ──────────────────────────────────────────────────── */}
      <TimelineSection dental={dental} filters={timelineFilters} setFilters={setTimelineFilters} />

      {/* ── 7. Treatment plans ───────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <p className="card-title" style={{ margin: 0 }}>Treatment Plans</p>
          <button className="btn btn-secondary" onClick={() => setEditingPlan("new")} style={{ fontSize: "12px", padding: "5px 12px" }}>+ New Plan</button>
        </div>
        {dental.treatmentPlans.length === 0 ? (
          <p className="empty">No treatment plans yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {dental.treatmentPlans
              .slice()
              .sort((a, b) => b.dateProposed.localeCompare(a.dateProposed))
              .map((p) => (
                <TreatmentPlanCard key={p.id} plan={p} onEdit={() => setEditingPlan(p)} onDelete={() => deleteTreatmentPlan(p.id)} />
              ))}
          </div>
        )}
      </div>
      {editingPlan && (
        <TreatmentPlanDrawer
          plan={editingPlan === "new" ? null : editingPlan}
          onSave={(p) => {
            if (editingPlan === "new") addTreatmentPlan({ ...p, id: uid() });
            else updateTreatmentPlan(editingPlan.id, p);
            setEditingPlan(null);
          }}
          onClose={() => setEditingPlan(null)}
        />
      )}

      {/* ── 8. Completed work ────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <p className="card-title" style={{ margin: 0 }}>Completed Work</p>
          <button className="btn btn-secondary" onClick={() => setShowAddWork((v) => !v)} style={{ fontSize: "12px", padding: "5px 12px" }}>
            {showAddWork ? "Cancel" : "+ Add"}
          </button>
        </div>
        {showAddWork && (
          <CompletedWorkForm
            appointments={dental.appointments}
            onSave={(w) => {
              addCompletedWork({ ...w, id: uid() });
              setShowAddWork(false);
            }}
            onCancel={() => setShowAddWork(false)}
          />
        )}
        {dental.completedWork.length === 0 ? (
          <p className="empty">No completed work logged yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {dental.completedWork
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((w) =>
                editingWorkId === w.id ? (
                  <CompletedWorkForm key={w.id} initial={w} appointments={dental.appointments} onSave={(patch) => { updateCompletedWork(w.id, patch); setEditingWorkId(null); }} onCancel={() => setEditingWorkId(null)} />
                ) : (
                  <CompletedWorkRow key={w.id} work={w} appointments={dental.appointments} onEdit={() => setEditingWorkId(w.id)} onDelete={() => deleteCompletedWork(w.id)} />
                )
              )}
          </div>
        )}
      </div>

      {/* ── 9. Payments ──────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <p className="card-title" style={{ margin: 0 }}>Payments</p>
          <button className="btn btn-secondary" onClick={() => setShowAddPayment((v) => !v)} style={{ fontSize: "12px", padding: "5px 12px" }}>
            {showAddPayment ? "Cancel" : "+ Add"}
          </button>
        </div>
        {showAddPayment && (
          <PaymentForm
            onSave={(p) => {
              addPayment({ ...p, id: uid() });
              setShowAddPayment(false);
            }}
            onCancel={() => setShowAddPayment(false)}
          />
        )}
        {dental.payments.length === 0 ? (
          <p className="empty">No payments logged yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {dental.payments
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((p) => (
                <div key={p.id} className="row" style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13.5px", color: "var(--text)", fontWeight: 500 }}>
                      {fmtMoney(p.amount)} <span style={{ color: "var(--text-3)", fontWeight: 400 }}>· {PAYMENT_METHOD_LABELS[p.method]} · {fmtDate(p.date)}</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>
                      {p.appliesTo.kind === "other" ? p.appliesTo.label : p.appliesTo.kind === "treatment_plan" ? "Applied to a treatment plan" : "Applied to completed work"}
                      {p.notes ? ` — ${p.notes}` : ""}
                    </div>
                  </div>
                  <button className="btn-icon" onClick={() => deletePayment(p.id)}><TrashIcon /></button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ── 10. Insurance claims ─────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <p className="card-title" style={{ margin: 0 }}>Insurance Claims</p>
          <button className="btn btn-secondary" onClick={() => setShowAddClaim((v) => !v)} style={{ fontSize: "12px", padding: "5px 12px" }}>
            {showAddClaim ? "Cancel" : "+ Add"}
          </button>
        </div>
        {showAddClaim && (
          <ClaimForm
            onSave={(c) => {
              addClaim({ ...c, id: uid() });
              setShowAddClaim(false);
            }}
            onCancel={() => setShowAddClaim(false)}
          />
        )}
        {dental.claims.length === 0 ? (
          <p className="empty">No insurance claims logged yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {dental.claims
              .slice()
              .sort((a, b) => b.processedOn.localeCompare(a.processedOn))
              .map((c) => {
                const meta = CLAIM_STATUS_META[c.status];
                return (
                  <div key={c.id} className="row" style={{ alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "13.5px", color: "var(--text)", fontWeight: 500 }}>Claim #{c.claimNumber}</span>
                        <span style={{ fontSize: "11px", color: meta.color, background: meta.bg, borderRadius: "99px", padding: "2px 9px" }}>{meta.label}</span>
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>
                        Service {fmtDate(c.serviceDateStart)} · Processed {fmtDate(c.processedOn)} · Billed {fmtMoney(c.totalBilled)} · Plan Paid {fmtMoney(c.planPaid)} · Your Share {fmtMoney(c.patientShare)}
                      </div>
                      {c.notes && <div style={{ fontSize: "12px", color: "var(--text-2)", marginTop: "2px" }}>{c.notes}</div>}
                    </div>
                    <button className="btn-icon" onClick={() => deleteClaim(c.id)}><TrashIcon /></button>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* ── 11. Coverage estimator ───────────────────────────────────────── */}
      <CoverageEstimatorCard benefitUsage={benefitUsage} patientAge={patientAge} completedWork={dental.completedWork} />

      {/* ── 12. Documents ────────────────────────────────────────────────── */}
      <DocumentsSection
        dental={dental}
        uploading={uploading}
        setUploading={setUploading}
        onAdd={addDocument}
        onDelete={deleteDocument}
      />
    </div>
  );
}

// ============================================================================
// Small display components
// ============================================================================

function SummaryStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p style={{ fontSize: "11px", color: "var(--text-3)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
      <p style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)", margin: "0 0 2px" }}>{value}</p>
      {sub && <p style={{ fontSize: "11px", color: "var(--text-3)", margin: 0 }}>{sub}</p>}
    </div>
  );
}

function ProgressStat({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const color = pct >= 100 ? "var(--red)" : pct >= 70 ? "var(--yellow)" : "var(--green)";
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "12.5px", color: "var(--text-2)" }}>{label}</span>
        <span style={{ fontSize: "12px", color: "var(--text-3)" }}>{fmtMoney(used)} of {fmtMoney(limit)}</span>
      </div>
      <div style={{ height: "6px", borderRadius: "99px", background: "var(--surface-overlay)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "99px", transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

// ============================================================================
// Per-tooth panel
// ============================================================================

function PerToothPanel({
  toothNumber,
  dental,
  onClose,
  onStatusChange,
}: {
  toothNumber: number;
  dental: DentalData;
  onClose: () => void;
  onStatusChange: (s: ToothStatus) => void;
}) {
  const tooth = dental.teeth.find((t) => t.number === toothNumber);
  const absent = ABSENT_TEETH.includes(toothNumber);
  const filtered = filterByTooth(toothNumber, dental);

  // Frequency-limited services that have been used on this specific tooth —
  // used to show "next available date" reminders (e.g. root canals).
  const usedServicesOnTooth = useMemo(() => {
    const ids = new Set(filtered.completedWork.map((w) => w.serviceId).filter((s): s is string => !!s));
    return Array.from(ids)
      .map((id) => COVERED_SERVICES.find((s) => s.id === id))
      .filter((s): s is CoveredService => !!s && !!s.frequency);
  }, [filtered.completedWork]);

  return (
    <div className="card" style={{ marginBottom: "16px", border: "1px solid var(--accent)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
        <div>
          <p className="card-title" style={{ margin: "0 0 4px" }}>Tooth #{toothNumber}</p>
          <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)", margin: 0 }}>{toothName(toothNumber)}</p>
          <p style={{ fontSize: "12px", color: "var(--text-3)", margin: "2px 0 0" }}>{toothType(toothNumber)}</p>
        </div>
        <button className="btn-icon" onClick={onClose}><XIcon /></button>
      </div>

      {absent ? (
        <p className="empty">This tooth is absent (wisdom tooth, not present).</p>
      ) : (
        <>
          <div style={{ marginBottom: "14px" }}>
            <FieldLabel>Status</FieldLabel>
            <select className="input" value={tooth?.status ?? "healthy"} onChange={(e) => onStatusChange(e.target.value as ToothStatus)} style={{ maxWidth: "220px" }}>
              {TOOTH_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {usedServicesOnTooth.length > 0 && (
            <div style={{ marginBottom: "14px" }}>
              <FieldLabel>Frequency-Limited Services Used On This Tooth</FieldLabel>
              {usedServicesOnTooth.map((s) => {
                const count = countServiceUsage(s.id, toothNumber, "lifetime", dental.completedWork);
                const exceeded = isFrequencyExceeded(s, count);
                const lastUsed = filtered.completedWork.filter((w) => w.serviceId === s.id).sort((a, b) => b.date.localeCompare(a.date))[0];
                const next = exceeded && lastUsed ? nextAvailableDate(s, lastUsed.date) : null;
                return (
                  <div key={s.id} style={{ fontSize: "12.5px", color: "var(--text-2)", marginBottom: "3px" }}>
                    {s.name} — used {count}× {exceeded ? "(limit reached" : "(within limit"}
                    {next ? `, next available ${fmtDate(next)})` : ")"}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
            <div>
              <FieldLabel>Completed Work ({filtered.completedWork.length})</FieldLabel>
              {filtered.completedWork.length === 0 ? <p className="empty">None yet.</p> : filtered.completedWork.map((w) => (
                <div key={w.id} style={{ fontSize: "12.5px", color: "var(--text-2)", marginBottom: "4px" }}>
                  {fmtDate(w.date)} — {w.procedureName} ({displayCdtCode(w.cdtCode)})
                </div>
              ))}
            </div>
            <div>
              <FieldLabel>Proposed Treatment ({filtered.treatmentPlans.length} plans)</FieldLabel>
              {filtered.treatmentPlans.length === 0 ? <p className="empty">None.</p> : filtered.treatmentPlans.map((p) => (
                <div key={p.id} style={{ fontSize: "12.5px", color: "var(--text-2)", marginBottom: "4px" }}>
                  {fmtDate(p.dateProposed)} — {PLAN_STATUS_META[p.status].label}
                </div>
              ))}
            </div>
            <div>
              <FieldLabel>Appointments ({filtered.appointments.length})</FieldLabel>
              {filtered.appointments.length === 0 ? <p className="empty">None.</p> : filtered.appointments.map((a) => (
                <div key={a.id} style={{ fontSize: "12.5px", color: "var(--text-2)", marginBottom: "4px" }}>
                  {fmtDate(a.date)} — {a.reason}
                </div>
              ))}
            </div>
            <div>
              <FieldLabel>Documents ({filtered.documents.length})</FieldLabel>
              {filtered.documents.length === 0 ? <p className="empty">None.</p> : filtered.documents.map((d) => (
                <div key={d.id} style={{ fontSize: "12.5px", color: "var(--text-2)", marginBottom: "4px" }}>{d.name}</div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Appointments
// ============================================================================

function AppointmentRow({ appt, onEdit, onDelete }: { appt: Appointment; onEdit: () => void; onDelete: () => void }) {
  const meta = APPT_STATUS_META[appt.status];
  return (
    <div className="row" style={{ alignItems: "flex-start" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13.5px", color: "var(--text)", fontWeight: 500 }}>{fmtDate(appt.date)} — {appt.reason}</span>
          <span style={{ fontSize: "11px", color: meta.color, background: meta.bg, borderRadius: "99px", padding: "2px 9px" }}>{meta.label}</span>
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>
          {appt.provider} · {appt.location}
          {appt.toothNumbers.length > 0 && ` · Teeth: ${appt.toothNumbers.join(", ")}`}
        </div>
        {appt.notes && <div style={{ fontSize: "12px", color: "var(--text-2)", marginTop: "2px" }}>{appt.notes}</div>}
      </div>
      <button className="btn btn-secondary" onClick={onEdit} style={{ flexShrink: 0, fontSize: "12px", padding: "3px 10px" }}>Edit</button>
      <button className="btn-icon" onClick={onDelete}><TrashIcon /></button>
    </div>
  );
}

function AppointmentForm({ initial, onSave, onCancel }: { initial?: Appointment; onSave: (a: Omit<Appointment, "id">) => void; onCancel: () => void }) {
  const [v, setV] = useState({
    date: initial?.date ?? todayStr(),
    provider: initial?.provider ?? "",
    location: initial?.location ?? "",
    reason: initial?.reason ?? "",
    status: initial?.status ?? ("upcoming" as AppointmentStatus),
    notes: initial?.notes ?? "",
    toothNumbers: initial?.toothNumbers.join(", ") ?? "",
  });
  function save() {
    if (!v.reason.trim()) return;
    onSave({
      date: v.date,
      provider: v.provider,
      location: v.location,
      reason: v.reason,
      status: v.status,
      notes: v.notes,
      toothNumbers: v.toothNumbers.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n)),
      documentIds: initial?.documentIds ?? [],
    });
  }
  return (
    <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "14px", marginBottom: "14px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px", marginBottom: "10px" }}>
        <div><FieldLabel>Date</FieldLabel><input className="input" type="date" value={v.date} onChange={(e) => setV((p) => ({ ...p, date: e.target.value }))} /></div>
        <div><FieldLabel>Status</FieldLabel>
          <select className="input" value={v.status} onChange={(e) => setV((p) => ({ ...p, status: e.target.value as AppointmentStatus }))}>
            <option value="upcoming">Upcoming</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div><FieldLabel>Provider</FieldLabel><input className="input" value={v.provider} onChange={(e) => setV((p) => ({ ...p, provider: e.target.value }))} /></div>
        <div><FieldLabel>Location</FieldLabel><input className="input" value={v.location} onChange={(e) => setV((p) => ({ ...p, location: e.target.value }))} /></div>
        <div style={{ gridColumn: "1/-1" }}><FieldLabel>Reason *</FieldLabel><input className="input" value={v.reason} onChange={(e) => setV((p) => ({ ...p, reason: e.target.value }))} /></div>
        <div><FieldLabel>Teeth Involved (comma-separated)</FieldLabel><input className="input" placeholder="e.g. 3, 14" value={v.toothNumbers} onChange={(e) => setV((p) => ({ ...p, toothNumbers: e.target.value }))} /></div>
        <div style={{ gridColumn: "1/-1" }}><FieldLabel>Notes</FieldLabel><input className="input" value={v.notes} onChange={(e) => setV((p) => ({ ...p, notes: e.target.value }))} /></div>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button className="btn btn-primary" onClick={save}>Save</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ============================================================================
// Completed work
// ============================================================================

function CompletedWorkRow({ work, appointments, onEdit, onDelete }: { work: CompletedWork; appointments: Appointment[]; onEdit: () => void; onDelete: () => void }) {
  const linkedAppt = work.linkedAppointmentId ? appointments.find((a) => a.id === work.linkedAppointmentId) : null;
  return (
    <div className="row" style={{ alignItems: "flex-start" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13.5px", color: "var(--text)", fontWeight: 500 }}>
          {fmtDate(work.date)} — {work.procedureName} ({displayCdtCode(work.cdtCode)})
          {work.toothNumber != null && ` · Tooth #${work.toothNumber}${work.surface ? ` (${work.surface})` : ""}`}
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-3)", marginTop: "2px" }}>
          Billed {fmtMoney(work.billedAmount)} · Insurance {fmtMoney(work.insurancePaid)} · You Paid {fmtMoney(work.patientPaid)}
          {linkedAppt && ` · From appointment on ${fmtDate(linkedAppt.date)}`}
        </div>
        {work.notes && <div style={{ fontSize: "12px", color: "var(--text-2)", marginTop: "2px" }}>{work.notes}</div>}
      </div>
      <button className="btn btn-secondary" onClick={onEdit} style={{ flexShrink: 0, fontSize: "12px", padding: "3px 10px" }}>Edit</button>
      <button className="btn-icon" onClick={onDelete}><TrashIcon /></button>
    </div>
  );
}

function CompletedWorkForm({ initial, appointments, onSave, onCancel }: { initial?: CompletedWork; appointments: Appointment[]; onSave: (w: Omit<CompletedWork, "id">) => void; onCancel: () => void }) {
  const grouped = servicesByCategory();
  const [v, setV] = useState({
    date: initial?.date ?? todayStr(),
    serviceId: initial?.serviceId ?? "",
    cdtCode: initial?.cdtCode ?? "",
    procedureName: initial?.procedureName ?? "",
    toothNumber: initial?.toothNumber != null ? String(initial.toothNumber) : "",
    surface: initial?.surface ?? "",
    provider: initial?.provider ?? "",
    network: initial?.network ?? ("in" as "in" | "out"),
    billedAmount: initial?.billedAmount != null ? String(initial.billedAmount) : "",
    insurancePaid: initial?.insurancePaid != null ? String(initial.insurancePaid) : "",
    patientPaid: initial?.patientPaid != null ? String(initial.patientPaid) : "",
    deductibleApplied: initial?.deductibleApplied != null ? String(initial.deductibleApplied) : "",
    linkedAppointmentId: initial?.linkedAppointmentId ?? "",
    notes: initial?.notes ?? "",
  });
  function save() {
    if (!v.procedureName.trim()) return;
    onSave({
      date: v.date,
      serviceId: v.serviceId || null,
      cdtCode: v.cdtCode || null,
      procedureName: v.procedureName,
      toothNumber: v.toothNumber ? parseInt(v.toothNumber, 10) : null,
      surface: v.surface,
      provider: v.provider,
      network: v.network,
      billedAmount: parseFloat(v.billedAmount) || 0,
      insurancePaid: parseFloat(v.insurancePaid) || 0,
      patientPaid: parseFloat(v.patientPaid) || 0,
      deductibleApplied: parseFloat(v.deductibleApplied) || 0,
      linkedAppointmentId: v.linkedAppointmentId || null,
      notes: v.notes,
      documentIds: initial?.documentIds ?? [],
    });
  }
  return (
    <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "14px", marginBottom: "14px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px", marginBottom: "10px" }}>
        <div><FieldLabel>Date</FieldLabel><input className="input" type="date" value={v.date} onChange={(e) => setV((p) => ({ ...p, date: e.target.value }))} /></div>
        <div>
          <FieldLabel>Service (for coverage tracking)</FieldLabel>
          <select className="input" value={v.serviceId} onChange={(e) => {
            const svc = COVERED_SERVICES.find((s) => s.id === e.target.value);
            setV((p) => ({ ...p, serviceId: e.target.value, procedureName: svc ? svc.name : p.procedureName, cdtCode: svc?.cdtCode ?? p.cdtCode }));
          }}>
            <option value="">— none / custom —</option>
            {Object.entries(grouped).map(([cat, services]) => (
              <optgroup key={cat} label={cat}>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div><FieldLabel>Procedure Name *</FieldLabel><input className="input" value={v.procedureName} onChange={(e) => setV((p) => ({ ...p, procedureName: e.target.value }))} /></div>
        <div><FieldLabel>CDT Code</FieldLabel><input className="input" placeholder="leave blank if unknown" value={v.cdtCode} onChange={(e) => setV((p) => ({ ...p, cdtCode: e.target.value }))} /></div>
        <div><FieldLabel>Tooth #</FieldLabel><input className="input" type="number" min="1" max="32" value={v.toothNumber} onChange={(e) => setV((p) => ({ ...p, toothNumber: e.target.value }))} /></div>
        <div><FieldLabel>Surface</FieldLabel><input className="input" placeholder="e.g. MOD" value={v.surface} onChange={(e) => setV((p) => ({ ...p, surface: e.target.value }))} /></div>
        <div><FieldLabel>Provider</FieldLabel><input className="input" value={v.provider} onChange={(e) => setV((p) => ({ ...p, provider: e.target.value }))} /></div>
        <div><FieldLabel>Network</FieldLabel>
          <select className="input" value={v.network} onChange={(e) => setV((p) => ({ ...p, network: e.target.value as "in" | "out" }))}>
            <option value="in">In-Network</option><option value="out">Out-of-Network</option>
          </select>
        </div>
        <div><FieldLabel>Billed Amount</FieldLabel><input className="input" type="number" step="0.01" value={v.billedAmount} onChange={(e) => setV((p) => ({ ...p, billedAmount: e.target.value }))} /></div>
        <div><FieldLabel>Insurance Paid</FieldLabel><input className="input" type="number" step="0.01" value={v.insurancePaid} onChange={(e) => setV((p) => ({ ...p, insurancePaid: e.target.value }))} /></div>
        <div><FieldLabel>You Paid</FieldLabel><input className="input" type="number" step="0.01" value={v.patientPaid} onChange={(e) => setV((p) => ({ ...p, patientPaid: e.target.value }))} /></div>
        <div><FieldLabel>Deductible Applied (from EOB)</FieldLabel><input className="input" type="number" step="0.01" value={v.deductibleApplied} onChange={(e) => setV((p) => ({ ...p, deductibleApplied: e.target.value }))} /></div>
        <div>
          <FieldLabel>Linked Appointment</FieldLabel>
          <select className="input" value={v.linkedAppointmentId} onChange={(e) => setV((p) => ({ ...p, linkedAppointmentId: e.target.value }))}>
            <option value="">— none —</option>
            {appointments.map((a) => <option key={a.id} value={a.id}>{fmtDate(a.date)} — {a.reason}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "1/-1" }}><FieldLabel>Notes</FieldLabel><input className="input" value={v.notes} onChange={(e) => setV((p) => ({ ...p, notes: e.target.value }))} /></div>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button className="btn btn-primary" onClick={save}>Save</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ============================================================================
// Payments
// ============================================================================

function PaymentForm({ onSave, onCancel }: { onSave: (p: Omit<Payment, "id">) => void; onCancel: () => void }) {
  const [v, setV] = useState({ date: todayStr(), amount: "", method: "card" as PaymentMethod, label: "", notes: "" });
  function save() {
    if (!v.amount) return;
    onSave({ date: v.date, amount: parseFloat(v.amount) || 0, method: v.method, appliesTo: { kind: "other", label: v.label }, notes: v.notes });
  }
  return (
    <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "14px", marginBottom: "14px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px", marginBottom: "10px" }}>
        <div><FieldLabel>Date</FieldLabel><input className="input" type="date" value={v.date} onChange={(e) => setV((p) => ({ ...p, date: e.target.value }))} /></div>
        <div><FieldLabel>Amount *</FieldLabel><input className="input" type="number" step="0.01" value={v.amount} onChange={(e) => setV((p) => ({ ...p, amount: e.target.value }))} /></div>
        <div><FieldLabel>Method</FieldLabel>
          <select className="input" value={v.method} onChange={(e) => setV((p) => ({ ...p, method: e.target.value as PaymentMethod }))}>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div><FieldLabel>What was this for?</FieldLabel><input className="input" value={v.label} onChange={(e) => setV((p) => ({ ...p, label: e.target.value }))} /></div>
        <div style={{ gridColumn: "1/-1" }}><FieldLabel>Notes</FieldLabel><input className="input" value={v.notes} onChange={(e) => setV((p) => ({ ...p, notes: e.target.value }))} /></div>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button className="btn btn-primary" onClick={save}>Save</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ============================================================================
// Claims
// ============================================================================

function ClaimForm({ onSave, onCancel }: { onSave: (c: Omit<InsuranceClaim, "id">) => void; onCancel: () => void }) {
  const [v, setV] = useState({
    claimNumber: "", serviceDateStart: todayStr(), serviceDateEnd: todayStr(), provider: "", processedOn: todayStr(),
    totalBilled: "", planDiscount: "", allowedAmount: "", planPaid: "", patientShare: "", status: "submitted" as ClaimStatus, toothNumbers: "", notes: "",
  });
  function save() {
    if (!v.claimNumber.trim()) return;
    onSave({
      claimNumber: v.claimNumber, serviceDateStart: v.serviceDateStart, serviceDateEnd: v.serviceDateEnd, provider: v.provider, processedOn: v.processedOn,
      totalBilled: parseFloat(v.totalBilled) || 0, planDiscount: parseFloat(v.planDiscount) || 0, allowedAmount: parseFloat(v.allowedAmount) || 0,
      planPaid: parseFloat(v.planPaid) || 0, patientShare: parseFloat(v.patientShare) || 0, status: v.status,
      toothNumbers: v.toothNumbers.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n)),
      documentIds: [], notes: v.notes,
    });
  }
  return (
    <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "14px", marginBottom: "14px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px", marginBottom: "10px" }}>
        <div><FieldLabel>Claim Number *</FieldLabel><input className="input" value={v.claimNumber} onChange={(e) => setV((p) => ({ ...p, claimNumber: e.target.value }))} /></div>
        <div><FieldLabel>Provider</FieldLabel><input className="input" value={v.provider} onChange={(e) => setV((p) => ({ ...p, provider: e.target.value }))} /></div>
        <div><FieldLabel>Service Date Start</FieldLabel><input className="input" type="date" value={v.serviceDateStart} onChange={(e) => setV((p) => ({ ...p, serviceDateStart: e.target.value }))} /></div>
        <div><FieldLabel>Service Date End</FieldLabel><input className="input" type="date" value={v.serviceDateEnd} onChange={(e) => setV((p) => ({ ...p, serviceDateEnd: e.target.value }))} /></div>
        <div><FieldLabel>Processed On</FieldLabel><input className="input" type="date" value={v.processedOn} onChange={(e) => setV((p) => ({ ...p, processedOn: e.target.value }))} /></div>
        <div><FieldLabel>Status</FieldLabel>
          <select className="input" value={v.status} onChange={(e) => setV((p) => ({ ...p, status: e.target.value as ClaimStatus }))}>
            {(["submitted", "processing", "paid", "denied", "appealed"] as ClaimStatus[]).map((s) => <option key={s} value={s}>{CLAIM_STATUS_META[s].label}</option>)}
          </select>
        </div>
        <div><FieldLabel>Total Billed</FieldLabel><input className="input" type="number" step="0.01" value={v.totalBilled} onChange={(e) => setV((p) => ({ ...p, totalBilled: e.target.value }))} /></div>
        <div><FieldLabel>Plan Discount</FieldLabel><input className="input" type="number" step="0.01" value={v.planDiscount} onChange={(e) => setV((p) => ({ ...p, planDiscount: e.target.value }))} /></div>
        <div><FieldLabel>Allowed Amount</FieldLabel><input className="input" type="number" step="0.01" value={v.allowedAmount} onChange={(e) => setV((p) => ({ ...p, allowedAmount: e.target.value }))} /></div>
        <div><FieldLabel>Plan Paid</FieldLabel><input className="input" type="number" step="0.01" value={v.planPaid} onChange={(e) => setV((p) => ({ ...p, planPaid: e.target.value }))} /></div>
        <div><FieldLabel>Patient Share</FieldLabel><input className="input" type="number" step="0.01" value={v.patientShare} onChange={(e) => setV((p) => ({ ...p, patientShare: e.target.value }))} /></div>
        <div><FieldLabel>Teeth (comma-separated)</FieldLabel><input className="input" value={v.toothNumbers} onChange={(e) => setV((p) => ({ ...p, toothNumbers: e.target.value }))} /></div>
        <div style={{ gridColumn: "1/-1" }}><FieldLabel>Notes</FieldLabel><input className="input" value={v.notes} onChange={(e) => setV((p) => ({ ...p, notes: e.target.value }))} /></div>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button className="btn btn-primary" onClick={save}>Save</button>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ============================================================================
// Timeline
// ============================================================================

type TimelineEntry = { date: string; type: string; color: string; label: string; detail: string };

function TimelineSection({
  dental,
  filters,
  setFilters,
}: {
  dental: DentalData;
  filters: { dateFrom: string; dateTo: string; tooth: string; provider: string; type: string };
  setFilters: (f: { dateFrom: string; dateTo: string; tooth: string; provider: string; type: string }) => void;
}) {
  const entries: TimelineEntry[] = useMemo(() => {
    const list: TimelineEntry[] = [];
    for (const a of dental.appointments) list.push({ date: a.date, type: "appointment", color: "var(--accent)", label: a.reason, detail: `${a.provider} · ${APPT_STATUS_META[a.status].label}` });
    for (const w of dental.completedWork) list.push({ date: w.date, type: "completed_work", color: "var(--green)", label: w.procedureName, detail: `Tooth ${w.toothNumber ?? "—"} · Billed ${fmtMoney(w.billedAmount)}` });
    for (const p of dental.payments) list.push({ date: p.date, type: "payment", color: "var(--yellow)", label: `Payment — ${fmtMoney(p.amount)}`, detail: PAYMENT_METHOD_LABELS[p.method] });
    for (const c of dental.claims) list.push({ date: c.processedOn, type: "claim", color: "var(--red)", label: `Claim #${c.claimNumber}`, detail: `${CLAIM_STATUS_META[c.status].label} · Plan Paid ${fmtMoney(c.planPaid)}` });
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [dental]);

  const filtered = entries.filter((e) => {
    if (filters.dateFrom && e.date < filters.dateFrom) return false;
    if (filters.dateTo && e.date > filters.dateTo) return false;
    if (filters.type && e.type !== filters.type) return false;
    return true;
  });

  return (
    <div className="card" style={{ marginBottom: "16px" }}>
      <p className="card-title">Timeline</p>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
        <input className="input" type="date" style={{ width: "150px" }} value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} placeholder="From" />
        <input className="input" type="date" style={{ width: "150px" }} value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} placeholder="To" />
        <select className="input" style={{ width: "170px" }} value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
          <option value="">All types</option>
          <option value="appointment">Appointments</option>
          <option value="completed_work">Completed Work</option>
          <option value="payment">Payments</option>
          <option value="claim">Claims</option>
        </select>
      </div>
      {filtered.length === 0 ? (
        <p className="empty">Nothing matches these filters.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          {filtered.map((e, i) => (
            <div key={i} className="event-row">
              <span className="event-date">{fmtDate(e.date)}</span>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: e.color, marginTop: "5px", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="event-title">{e.label}</div>
                <div className="event-time">{e.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Treatment plans
// ============================================================================

function TreatmentPlanCard({ plan, onEdit, onDelete }: { plan: TreatmentPlan; onEdit: () => void; onDelete: () => void }) {
  const meta = PLAN_STATUS_META[plan.status];
  const total = plan.items.reduce((s, i) => s + i.fee, 0);
  const patientTotal = plan.items.reduce((s, i) => s + i.estPatient, 0);
  const needsPredetermination = total >= PLAN_RULES.predeterminationThreshold;

  return (
    <div className="card" style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{fmtDate(plan.dateProposed)}</span>
            <span style={{ fontSize: "11px", color: meta.color, background: meta.bg, borderRadius: "99px", padding: "2px 9px" }}>{meta.label}</span>
            {needsPredetermination && (
              <span style={{ fontSize: "11px", color: "var(--yellow)", background: "var(--yellow-dim)", borderRadius: "99px", padding: "2px 9px" }}>
                Predetermination recommended (${total.toFixed(0)}+)
              </span>
            )}
          </div>
          <p style={{ fontSize: "12.5px", color: "var(--text-3)", margin: "0 0 4px" }}>{plan.provider} · {plan.items.length} item{plan.items.length !== 1 ? "s" : ""} · Fee total {fmtMoney(total)} · Est. you owe {fmtMoney(patientTotal)}</p>
          {plan.notes && <p style={{ fontSize: "12px", color: "var(--text-2)", margin: 0 }}>{plan.notes}</p>}
        </div>
        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          <button className="btn btn-secondary" onClick={onEdit} style={{ fontSize: "12px", padding: "3px 10px" }}>Edit</button>
          <button className="btn-icon" onClick={onDelete}><TrashIcon /></button>
        </div>
      </div>
      <details style={{ marginTop: "10px" }}>
        <summary style={{ fontSize: "12px", color: "var(--text-3)", cursor: "pointer" }}>Show {plan.items.length} item{plan.items.length !== 1 ? "s" : ""}</summary>
        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {plan.items.map((item) => (
            <div key={item.id} style={{ fontSize: "12.5px", color: "var(--text-2)", paddingLeft: "8px", borderLeft: "2px solid var(--border)" }}>
              {item.procedureName} ({displayCdtCode(item.cdtCode)}){item.toothNumber != null && ` — Tooth #${item.toothNumber}${item.surface ? ` (${item.surface})` : ""}`}
              {" — "}Fee {fmtMoney(item.fee)}, Est. Insurance {fmtMoney(item.estInsurance)}, Est. You Owe {fmtMoney(item.estPatient)}
              {item.fee >= PLAN_RULES.predeterminationThreshold && <span style={{ color: "var(--yellow)" }}> · predetermination recommended</span>}
              {item.phase && <div style={{ color: "var(--text-3)", marginTop: "1px" }}>{item.phase}</div>}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function TreatmentPlanDrawer({ plan, onSave, onClose }: { plan: TreatmentPlan | null; onSave: (p: Omit<TreatmentPlan, "id">) => void; onClose: () => void }) {
  const [form, setForm] = useState<Omit<TreatmentPlan, "id">>(
    plan ?? { dateProposed: todayStr(), provider: "", status: "proposed", notes: "", items: [], documentIds: [] }
  );
  const [addingItem, setAddingItem] = useState(false);
  const grouped = servicesByCategory();

  function addItem(item: Omit<TreatmentPlanItem, "id">) {
    setForm((f) => ({ ...f, items: [...f.items, { ...item, id: uid() }] }));
    setAddingItem(false);
  }
  function removeItem(id: string) {
    setForm((f) => ({ ...f, items: f.items.filter((i) => i.id !== id) }));
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex" }}>
      <div style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div style={{ width: "min(560px, 100vw)", background: "var(--surface)", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600, flex: 1 }}>{plan ? "Edit Treatment Plan" : "New Treatment Plan"}</h2>
          <button className="btn-icon" onClick={onClose}><XIcon /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div><FieldLabel>Date Proposed</FieldLabel><input className="input" type="date" value={form.dateProposed} onChange={(e) => setForm((f) => ({ ...f, dateProposed: e.target.value }))} /></div>
            <div><FieldLabel>Status</FieldLabel>
              <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TreatmentPlanStatus }))}>
                {(["proposed", "accepted", "completed", "declined"] as TreatmentPlanStatus[]).map((s) => <option key={s} value={s}>{PLAN_STATUS_META[s].label}</option>)}
              </select>
            </div>
          </div>
          <div><FieldLabel>Provider</FieldLabel><input className="input" value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} /></div>
          <div><FieldLabel>Notes</FieldLabel><textarea className="input" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} style={{ minHeight: "70px" }} /></div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <FieldLabel>Line Items ({form.items.length})</FieldLabel>
            <button className="btn-icon" onClick={() => setAddingItem(true)}><PlusIcon /></button>
          </div>
          {form.items.map((item) => (
            <div key={item.id} style={{ background: "var(--surface-raised)", borderRadius: "6px", padding: "10px 12px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)" }}>{item.procedureName} ({displayCdtCode(item.cdtCode)})</div>
                <div style={{ fontSize: "11.5px", color: "var(--text-3)" }}>
                  {item.toothNumber != null && `Tooth #${item.toothNumber} `}{item.surface && `(${item.surface}) `}
                  Fee {fmtMoney(item.fee)} · Ins {fmtMoney(item.estInsurance)} · You {fmtMoney(item.estPatient)}
                </div>
                {item.phase && <div style={{ fontSize: "11px", color: "var(--text-3)" }}>{item.phase}</div>}
              </div>
              <button className="btn-icon" onClick={() => removeItem(item.id)}><TrashIcon /></button>
            </div>
          ))}
          {addingItem && (
            <TreatmentItemForm servicesByCat={grouped} onSave={addItem} onCancel={() => setAddingItem(false)} />
          )}
        </div>
        <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: "8px", flexShrink: 0 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onSave(form)}>Save Plan</button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function TreatmentItemForm({ servicesByCat, onSave, onCancel }: { servicesByCat: Record<string, CoveredService[]>; onSave: (i: Omit<TreatmentPlanItem, "id">) => void; onCancel: () => void }) {
  const [v, setV] = useState({ serviceId: "", cdtCode: "", procedureName: "", toothNumber: "", surface: "", fee: "", estInsurance: "", estPatient: "", phase: "" });
  function save() {
    if (!v.procedureName.trim()) return;
    onSave({
      serviceId: v.serviceId || null, cdtCode: v.cdtCode || null, procedureName: v.procedureName,
      toothNumber: v.toothNumber ? parseInt(v.toothNumber, 10) : null, surface: v.surface,
      fee: parseFloat(v.fee) || 0, estInsurance: parseFloat(v.estInsurance) || 0, estPatient: parseFloat(v.estPatient) || 0, phase: v.phase,
    });
  }
  return (
    <div style={{ background: "var(--surface-overlay)", borderRadius: "6px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <select className="input" value={v.serviceId} onChange={(e) => {
        const svc = Object.values(servicesByCat).flat().find((s) => s.id === e.target.value);
        setV((p) => ({ ...p, serviceId: e.target.value, procedureName: svc ? svc.name : p.procedureName, cdtCode: svc?.cdtCode ?? p.cdtCode }));
      }}>
        <option value="">— select a service —</option>
        {Object.entries(servicesByCat).map(([cat, services]) => (
          <optgroup key={cat} label={cat}>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
        ))}
      </select>
      <input className="input" placeholder="Procedure name *" value={v.procedureName} onChange={(e) => setV((p) => ({ ...p, procedureName: e.target.value }))} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <input className="input" placeholder="Tooth #" type="number" value={v.toothNumber} onChange={(e) => setV((p) => ({ ...p, toothNumber: e.target.value }))} />
        <input className="input" placeholder="Surface" value={v.surface} onChange={(e) => setV((p) => ({ ...p, surface: e.target.value }))} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        <input className="input" placeholder="Fee" type="number" step="0.01" value={v.fee} onChange={(e) => setV((p) => ({ ...p, fee: e.target.value }))} />
        <input className="input" placeholder="Est. Insurance" type="number" step="0.01" value={v.estInsurance} onChange={(e) => setV((p) => ({ ...p, estInsurance: e.target.value }))} />
        <input className="input" placeholder="Est. You Owe" type="number" step="0.01" value={v.estPatient} onChange={(e) => setV((p) => ({ ...p, estPatient: e.target.value }))} />
      </div>
      <input className="input" placeholder="Phase (e.g. Phase 1)" value={v.phase} onChange={(e) => setV((p) => ({ ...p, phase: e.target.value }))} />
      <div style={{ display: "flex", gap: "6px" }}>
        <button className="btn btn-primary" style={{ fontSize: "12px", padding: "6px 12px" }} onClick={save}>Add Item</button>
        <button className="btn btn-ghost" style={{ fontSize: "12px" }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ============================================================================
// Coverage estimator
// ============================================================================

function CoverageEstimatorCard({
  benefitUsage,
  patientAge,
  completedWork,
}: {
  benefitUsage: ReturnType<typeof computeBenefitUsage>;
  patientAge: number;
  completedWork: CompletedWork[];
}) {
  const grouped = servicesByCategory();
  const [serviceId, setServiceId] = useState("");
  const [fee, setFee] = useState("");
  const [toothNumber, setToothNumber] = useState("");
  const [amalgamFee, setAmalgamFee] = useState("");

  const service = COVERED_SERVICES.find((s) => s.id === serviceId) ?? null;
  const tooth = toothNumber ? parseInt(toothNumber, 10) : null;
  const isMolarFilling = service?.id === FILLINGS_SERVICE_ID && tooth != null && toothType(tooth) === "molar";

  const result = useMemo(() => {
    if (!service || !fee) return null;
    const usageCount = countServiceUsage(service.id, tooth, "lifetime", completedWork);
    return estimateCoverage(service, parseFloat(fee) || 0, tooth, patientAge, benefitUsage, usageCount, amalgamFee ? parseFloat(amalgamFee) : undefined);
  }, [service, fee, tooth, patientAge, benefitUsage, amalgamFee, completedWork]);

  return (
    <div className="card" style={{ marginBottom: "16px" }}>
      <p className="card-title">Insurance Coverage Estimator</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", marginBottom: "12px" }}>
        <div>
          <FieldLabel>Service</FieldLabel>
          <select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">— select —</option>
            {Object.entries(grouped).map(([cat, services]) => (
              <optgroup key={cat} label={cat}>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
            ))}
          </select>
        </div>
        <div><FieldLabel>Fee</FieldLabel><input className="input" type="number" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} /></div>
        <div><FieldLabel>Tooth # (optional)</FieldLabel><input className="input" type="number" min="1" max="32" value={toothNumber} onChange={(e) => setToothNumber(e.target.value)} /></div>
        {isMolarFilling && (
          <div><FieldLabel>Amalgam-Equivalent Fee</FieldLabel><input className="input" type="number" step="0.01" value={amalgamFee} onChange={(e) => setAmalgamFee(e.target.value)} /></div>
        )}
      </div>

      {result && (
        <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "14px" }}>
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", marginBottom: "8px" }}>
            <div><span style={{ fontSize: "11px", color: "var(--text-3)" }}>Plan Pays</span><div style={{ fontSize: "18px", fontWeight: 700, color: "var(--green)" }}>{fmtMoney(result.planPays)}</div></div>
            <div><span style={{ fontSize: "11px", color: "var(--text-3)" }}>You Owe</span><div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)" }}>{fmtMoney(result.patientOwes)}</div></div>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-2)", display: "flex", flexDirection: "column", gap: "2px" }}>
            {result.ageGateBlocked && <span style={{ color: "var(--red)" }}>Not covered — this service is age-restricted and Victoria doesn&apos;t qualify.</span>}
            {result.frequencyExceeded && <span style={{ color: "var(--red)" }}>Not covered — frequency limit already used up.</span>}
            {result.usedPostMaxRate && <span style={{ color: "var(--yellow)" }}>Annual max already reached — using the 30% post-max rate.</span>}
            {result.appliedDeductible > 0 && <span>{fmtMoney(result.appliedDeductible)} applied to your deductible.</span>}
            {result.downgradeApplied && <span style={{ color: "var(--yellow)" }}>Resin-on-molar downgrade applied — you pay {fmtMoney(result.downgradeDifference)} extra vs. amalgam pricing.</span>}
            {result.needsPredetermination && <span style={{ color: "var(--yellow)" }}>This fee is $300+ — consider submitting for predetermination first.</span>}
          </div>
        </div>
      )}

      <p style={{ fontSize: "11.5px", color: "var(--text-3)", background: "var(--yellow-dim)", border: "1px solid rgba(251,191,36,0.20)", borderRadius: "6px", padding: "8px 12px", marginTop: "12px", marginBottom: 0 }}>
        This is an ESTIMATE only, not a guarantee of coverage — predeterminations from Humana are estimates too, not guarantees of payment.
      </p>
    </div>
  );
}

// ============================================================================
// Documents
// ============================================================================

function DocumentsSection({
  dental,
  uploading,
  setUploading,
  onAdd,
  onDelete,
}: {
  dental: DentalData;
  uploading: boolean;
  setUploading: (v: boolean) => void;
  onAdd: (d: DentalDocument) => void;
  onDelete: (id: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await fetch(`/api/dental/upload?filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        body: file,
        headers: { "content-type": file.type },
      });
      const data = await res.json();
      onAdd({
        id: uid(),
        name: file.name,
        url: data.url,
        mimeType: file.type,
        documentType: "other",
        date: todayStr(),
        description: "",
        toothNumbers: [],
        linkedAppointmentId: null,
        linkedClaimId: null,
        linkedTreatmentPlanId: null,
        uploadedAt: new Date().toISOString(),
      });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="card" style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <p className="card-title" style={{ margin: 0 }}>Documents</p>
        <button className="btn btn-secondary" onClick={() => fileInput.current?.click()} disabled={uploading} style={{ fontSize: "12px", padding: "5px 12px" }}>
          {uploading ? "Uploading…" : "+ Upload"}
        </button>
        <input ref={fileInput} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={handleFile} />
      </div>
      {dental.documents.length === 0 ? (
        <p className="empty">No documents uploaded yet. Invoices, EOBs, and treatment plan scans go here.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
          {dental.documents.map((d) => {
            const isImage = d.mimeType.startsWith("image/");
            return (
              <div key={d.id} style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", position: "relative" }}>
                <button className="btn-icon" onClick={() => onDelete(d.id)} style={{ position: "absolute", top: "4px", right: "4px" }}><XIcon /></button>
                <a href={d.url} target="_blank" rel="noreferrer" style={{ display: "block" }}>
                  {isImage ? (
                    <img src={d.url} alt={d.name} style={{ width: "100%", height: "90px", objectFit: "cover", borderRadius: "4px" }} />
                  ) : (
                    <div style={{ height: "90px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>📄</div>
                  )}
                </a>
                <div style={{ fontSize: "11.5px", color: "var(--text-2)", marginTop: "6px", overflowWrap: "break-word" }}>{d.name}</div>
                <div style={{ fontSize: "10.5px", color: "var(--text-3)" }}>{fmtDate(d.date)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
