// ============================================================================
// The Rebrand — seed data (spec §18, plus §8/§10/§12/§13 reference content)
//
// This is the DEFAULT plan. It's applied idempotently (see queries.ts →
// mergeSeed): re-running only fills in seed rows that are missing by id, and
// never clobbers anything you've since edited or checked off. Bump
// SEED_VERSION when you add new seed rows you want pushed to existing data.
//
// Days of week: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
// ============================================================================

import type {
  BrandCoreItem,
  RebrandSettings,
  ReferenceItem,
  RoadmapItem,
  TaskDefinition,
} from "./types";

export const SEED_VERSION = 1;

// The one date the whole dental section counts down to (spec §11).
export const DENTIST_DATE = "2026-08-10";

// ---------------------------------------------------------------------------
// Settings (spec §8 inputs). Everything else is derived in engine.ts.
// ---------------------------------------------------------------------------
export const SEED_SETTINGS: RebrandSettings = {
  heightIn: 69,
  age: 32, // deliberately 32 though 31 until Sept — barely moves BMR (§8)
  startWeightLb: 210,
  goalWeightLb: 145,
  activityMultiplier: 1.4,
  dailyCalorieTarget: 1700,
  adherenceFactor: 0.85,
  wakeTime: "05:00",
  workStart: "06:00",
  workEndMonThu: "15:30",
  workEndFri: "10:00",
  lightsOut: "21:15",
};

// ---------------------------------------------------------------------------
// Task definitions. `def` fills in sensible defaults so each row stays short.
// ---------------------------------------------------------------------------
let order = 0;
function def(t: Partial<TaskDefinition> & Pick<TaskDefinition, "id" | "title" | "category" | "recurrence" | "timeBlock">): TaskDefinition {
  return {
    detail: "",
    zone: null,
    daysOfWeek: [],
    estMinutes: 5,
    isNonNegotiable: false,
    active: true,
    sortOrder: order++,
    onceDate: null,
    ...t,
  };
}

export const SEED_TASKS: TaskDefinition[] = [
  // ── EARLY AM — the 5:00–5:50 block ──────────────────────────────────────
  def({
    id: "rb-wake",
    title: "Up at 5:00 — no snooze",
    detail:
      "5-4-3-2-1 countdown, feet on the floor before you reach 1. Then bathroom, wash face, brush teeth. Snoozing teaches you your own commitments are negotiable — that's the damage, not the lost sleep.",
    category: "morning",
    recurrence: "weekdays",
    timeBlock: "early_am",
    estMinutes: 5,
    isNonNegotiable: true,
  }),
  def({
    id: "rb-wake-weekend",
    title: "Up by 7:00 max",
    detail: "Weekend wake — sleep to 7:00 at the latest. Not 5:00, not 10:00.",
    category: "morning",
    recurrence: "specific_days",
    daysOfWeek: [0, 6],
    timeBlock: "early_am",
    estMinutes: 2,
  }),
  def({
    id: "rb-highfive",
    title: "Mirror high-five — one second",
    detail:
      "High-five yourself in the mirror once, after brushing teeth. It feels stupid, that's fine — it's a pattern interrupt against the automatic critical mirror scan (Mel Robbins, High 5 Habit).",
    category: "mindset",
    recurrence: "weekdays",
    timeBlock: "early_am",
    estMinutes: 1,
  }),
  def({
    id: "rb-kitchen-am",
    title: "Kitchen reset — dishes away, counters, coffee",
    detail: "Dishes from the rack into cupboards, wipe counters, sink empty, start coffee.",
    category: "home",
    zone: "kitchen",
    recurrence: "daily",
    timeBlock: "early_am",
    estMinutes: 6,
  }),
  def({
    id: "rb-breakfast",
    title: "Breakfast prep for Nicholas",
    detail: "Whatever the day needs — yogurt to the front of the fridge, bar on the counter, water bottle filled.",
    category: "morning",
    recurrence: "daily",
    timeBlock: "early_am",
    estMinutes: 5,
  }),
  def({
    id: "rb-dogs-am",
    title: "Dogs — water, food, pad swap",
    detail: "Zorro & Cody out or pad-checked, fresh water, food. Swap the pee-pad liner.",
    category: "dog",
    recurrence: "daily",
    timeBlock: "early_am",
    estMinutes: 5,
  }),
  def({
    id: "rb-ac-am",
    title: "Empty the AC bucket (morning)",
    detail: "The living-room AC drains into a bucket. Check and empty it.",
    category: "home",
    zone: "living_room",
    recurrence: "daily",
    timeBlock: "early_am",
    estMinutes: 1,
  }),
  def({
    id: "rb-morning-skincare",
    title: "Morning skincare — through SPF",
    detail:
      "1) Gentle cleanser or just water. 2) Vitamin C OR niacinamide (pick one). 3) Moisturiser. 4) SPF 30+ — THE anti-aging intervention, indoors included; UVA passes through window glass and you sit at a desk all day. 5) Lip balm with SPF.",
    category: "beauty",
    recurrence: "daily",
    timeBlock: "early_am",
    estMinutes: 4,
  }),
  def({
    id: "rb-arm-circuit",
    title: "Arm circuit — Gabby George bridal arms",
    detail: "6–12 min, light weights (2–3 lb). This is the arms series — Izzy's Pilates is separate. Mon–Thu only; Friday is arm rest day.",
    category: "body",
    recurrence: "specific_days",
    daysOfWeek: [1, 2, 3, 4],
    timeBlock: "early_am",
    estMinutes: 10,
  }),
  def({
    id: "rb-toilet-wand",
    title: "Toilet wand — 45 sec",
    detail: "Disposable-head wand parked next to the toilet. Scrub, click the head into the bin. Your hand never goes near the bowl and nothing needs rinsing. Mon/Wed/Fri.",
    category: "home",
    zone: "bathroom",
    recurrence: "specific_days",
    daysOfWeek: [1, 3, 5],
    timeBlock: "early_am",
    estMinutes: 1,
  }),
  def({
    id: "rb-getready",
    title: "Get ready + desk set",
    detail: "Dressed in real clothes, hair done, water filled, desk cleared. Clothes that fit the body you have today.",
    category: "morning",
    recurrence: "weekdays",
    timeBlock: "early_am",
    estMinutes: 10,
  }),

  // ── WORKDAY — 6:00–15:30 ────────────────────────────────────────────────
  def({
    id: "rb-walking-pad",
    title: "Walking-pad blocks (low-focus work only)",
    detail: "Mon–Thu: 6:30, 9:30, 13:00 — 45 min each at ~2.5 mph. Fri: 6:30 and 8:30 (~6,000 steps). Only during low-focus work.",
    category: "body",
    recurrence: "weekdays",
    timeBlock: "workday",
    estMinutes: 135,
  }),
  def({
    id: "rb-lunch",
    title: "Lunch — away from the desk, protein first",
    detail: "20 min, away from the desk, protein first.",
    category: "body",
    recurrence: "weekdays",
    timeBlock: "workday",
    estMinutes: 20,
  }),
  def({
    id: "rb-steps",
    title: "10,000 steps by 15:30",
    detail:
      "Every day, including Friday. Friday's shorter shift doesn't move the deadline — the balance comes across the reset block and the afternoon. The walking-pad blocks are the main engine.",
    category: "body",
    recurrence: "daily",
    timeBlock: "workday",
    estMinutes: 0,
  }),
  def({
    id: "rb-protein",
    title: "Hit protein target — 145 g",
    detail: "1 g per lb of goal weight. Protein first at every meal. This is one of the five non-negotiables.",
    category: "body",
    recurrence: "daily",
    timeBlock: "workday",
    estMinutes: 0,
    isNonNegotiable: true,
  }),

  // ── FRIDAY RESET BLOCK — replaces the zone task entirely (§7) ────────────
  def({
    id: "rb-fri-pad-rinse",
    title: "Rinse Zorro's pads in the tub",
    detail: "Shower-head rinse until the water runs clear, wring, seal in a bag. Dog-only gloves. Clean the pad spot down. (10:00–10:30)",
    category: "dog",
    zone: "bathroom",
    recurrence: "specific_days",
    daysOfWeek: [5],
    timeBlock: "workday",
    estMinutes: 30,
  }),
  def({
    id: "rb-fri-sort",
    title: "Sort the week's laundry",
    detail: "Sheets and towels go in this load (strip the bed Friday morning). Bag the pee-pads separately. (10:30–11:15)",
    category: "laundry",
    recurrence: "specific_days",
    daysOfWeek: [5],
    timeBlock: "workday",
    estMinutes: 45,
  }),
  def({
    id: "rb-fri-haul",
    title: "Laundry run to friend's house",
    detail:
      "The one outing of the week. (11:15–14:00) If Friday fails, it moves to SATURDAY 09:00 and nowhere else — never 'sometime this weekend'. This is a non-negotiable.",
    category: "laundry",
    recurrence: "specific_days",
    daysOfWeek: [5],
    timeBlock: "workday",
    estMinutes: 165,
    isNonNegotiable: true,
  }),
  def({
    id: "rb-fri-putaway",
    title: "Put everything away immediately",
    detail: "Everything away same-day — remake the bed the moment sheets are dry. (14:00–14:45)",
    category: "laundry",
    recurrence: "specific_days",
    daysOfWeek: [5],
    timeBlock: "after_work",
    estMinutes: 45,
  }),
  def({
    id: "rb-fri-closet",
    title: "Closet 10-minute pass",
    detail: "While you're in there putting laundry away. Closet floor clear.",
    category: "home",
    zone: "closet",
    recurrence: "specific_days",
    daysOfWeek: [5],
    timeBlock: "after_work",
    estMinutes: 10,
  }),

  // ── AFTER WORK — 15:35–16:50 ────────────────────────────────────────────
  def({
    id: "rb-hardstop",
    title: "Hard stop — laptop closed & moved",
    detail: "15:30. Laptop closed and physically moved. Set the Pilates mat, weights and shoes out at 15:25, BEFORE the laptop closes.",
    category: "morning",
    recurrence: "weekdays",
    timeBlock: "after_work",
    estMinutes: 1,
  }),
  def({
    id: "rb-pilates",
    title: "One workout — Pilates by Izzy",
    detail:
      "25–40 min. Mat, light weights, band. Mon–Thu 15:35; Fri 14:45. Izzy uses 5 lb — start at 3. This is the promise you're most likely to break, at the exact moment sitting down is most reasonable. If 15:35 passes, fallback is 10 min at 16:30 — ten minutes counts as a yes. One of the five non-negotiables.",
    category: "body",
    recurrence: "weekdays",
    timeBlock: "after_work",
    estMinutes: 35,
    isNonNegotiable: true,
  }),
  def({
    id: "rb-shower-lotion",
    title: "Shower + body lotion on DAMP skin",
    detail:
      "Body lotion goes on damp skin HERE (16:15), not at bedtime. By 21:15 there's nothing sticky on the surface. Feet lotion stays at night.",
    category: "beauty",
    recurrence: "weekdays",
    timeBlock: "after_work",
    estMinutes: 20,
  }),

  // ── ZONE ROTATION — one per day, 15-min timer (§6). Each is non-negotiable.
  def({
    id: "rb-zone-mon",
    title: "Zone: Bedroom",
    detail: "15-minute timer. Bed made, floor clear. Timer ends, you stop.",
    category: "home",
    zone: "bedroom",
    recurrence: "specific_days",
    daysOfWeek: [1],
    timeBlock: "after_work",
    estMinutes: 15,
    isNonNegotiable: true,
  }),
  def({
    id: "rb-zone-tue",
    title: "Zone: Entryway + floors",
    detail: "15-minute timer. Vacuum done.",
    category: "home",
    zone: "entryway",
    recurrence: "specific_days",
    daysOfWeek: [2],
    timeBlock: "after_work",
    estMinutes: 15,
    isNonNegotiable: true,
  }),
  def({
    id: "rb-zone-wed",
    title: "Zone: Walk-in closet",
    detail: "15-minute timer. Closet floor clear. One item leaves permanently.",
    category: "home",
    zone: "closet",
    recurrence: "specific_days",
    daysOfWeek: [3],
    timeBlock: "after_work",
    estMinutes: 15,
    isNonNegotiable: true,
  }),
  def({
    id: "rb-zone-thu",
    title: "Zone: Kitchen deep pass",
    detail: "15-minute timer. Fridge purged, trash out.",
    category: "home",
    zone: "kitchen",
    recurrence: "specific_days",
    daysOfWeek: [4],
    timeBlock: "after_work",
    estMinutes: 15,
    isNonNegotiable: true,
  }),
  def({
    id: "rb-zone-sat",
    title: "Bathroom Reset — 12 min",
    detail:
      "Gloves ON before entering. Podcast or music playing. Order: toilet exterior & base → sink & mirror → tub → floor → trash out → restock. Gloves handle the disgust, the timer handles the dread, the audio handles the boredom. First Saturday of the month: +10 min (curtain liner into the haul, cabinet interior, bin scrubbed).",
    category: "home",
    zone: "bathroom",
    recurrence: "specific_days",
    daysOfWeek: [6],
    timeBlock: "early_am",
    estMinutes: 12,
    isNonNegotiable: true,
  }),
  def({
    id: "rb-sat-workout",
    title: "One workout — arm circuit + easy walking pad",
    detail: "Saturday's movement. Arm circuit plus an easy 20 min on the walking pad.",
    category: "body",
    recurrence: "specific_days",
    daysOfWeek: [6],
    timeBlock: "early_am",
    estMinutes: 20,
    isNonNegotiable: true,
  }),

  // ── SPECIFIC-DAY BEAUTY / LAUNDRY ───────────────────────────────────────
  def({
    id: "rb-handwash",
    title: "Hand-wash — start the 20:25 soak",
    detail:
      "Underwear, boxers, bras, socks. Basin in the tub, warm water, one squirt of detergent (baby shampoo for bras). Agitate 60s, leave to soak while you do the night routine, come back ~21:00. Two rinses. Press water out — NEVER wring bras. Roll in a towel, stand on it, hang. Tue + Sat.",
    category: "laundry",
    recurrence: "specific_days",
    daysOfWeek: [2, 6],
    timeBlock: "evening",
    estMinutes: 10,
  }),
  def({
    id: "rb-hair-wash",
    title: "Wash hair + fingertip scalp scrub",
    detail: "Sun + Wed. A real fingertip scalp scrub, not just shampoo sitting on top. Sunday also gets the deep conditioner, during the weekly review.",
    category: "beauty",
    recurrence: "specific_days",
    daysOfWeek: [0, 3],
    timeBlock: "after_work",
    estMinutes: 15,
  }),
  def({
    id: "rb-nails",
    title: "Press-on nail set",
    detail:
      "Sunday evening while watching something. Reusable soft-gel press-ons with gel glue + mini UV lamp (lasts 1–2 weeks). PREP determines success: push cuticles back, buff the shine off, wipe with alcohol, size every nail before gluing any. Skipping the alcohol wipe is the #1 reason they lift.",
    category: "beauty",
    recurrence: "specific_days",
    daysOfWeek: [0],
    timeBlock: "evening",
    estMinutes: 45,
  }),
  def({
    id: "rb-weekly-review",
    title: "Weekly review — 15 min",
    detail: "Fill in the weekly review on the Body page, including the self-trust score. Then prep the week. In bed by 21:15 — especially Sunday.",
    category: "mindset",
    recurrence: "specific_days",
    daysOfWeek: [0],
    timeBlock: "evening",
    estMinutes: 15,
  }),

  // ── EVENING — the anchors + night routine (§6, §9) ──────────────────────
  def({
    id: "rb-livingroom-pm",
    title: "Living room — 5-minute pickup",
    detail: "Blankets folded, cups to the kitchen, remotes home.",
    category: "home",
    zone: "living_room",
    recurrence: "daily",
    timeBlock: "evening",
    estMinutes: 5,
  }),
  def({
    id: "rb-sink-pm",
    title: "Sink empty before sitting down",
    detail: "Kitchen evening anchor — sink empty before you sit down after dinner.",
    category: "home",
    zone: "kitchen",
    recurrence: "daily",
    timeBlock: "evening",
    estMinutes: 4,
  }),
  def({
    id: "rb-ac-pm",
    title: "Empty the AC bucket (evening)",
    detail: "Second AC bucket check of the day.",
    category: "home",
    zone: "living_room",
    recurrence: "daily",
    timeBlock: "evening",
    estMinutes: 1,
  }),
  def({
    id: "rb-trash",
    title: "Trash — any bin over 3/4 goes out",
    detail: "Any bin over three-quarters full goes out that night.",
    category: "home",
    recurrence: "daily",
    timeBlock: "evening",
    estMinutes: 2,
  }),
  def({
    id: "rb-retinoid",
    title: "Retinoid — buffered",
    detail:
      "Tue + Sat to start. Buffered: moisturiser FIRST, retinoid on top. Only increase frequency after 6 weeks with no irritation. Going straight to daily is what causes the irritation that makes people quit.",
    category: "beauty",
    recurrence: "specific_days",
    daysOfWeek: [2, 6],
    timeBlock: "evening",
    estMinutes: 2,
  }),
  def({
    id: "rb-night-routine",
    title: "Night routine — all 7 steps",
    detail:
      "Same order every night, 20:45:\n1. Birth control (anchored first so it survives a bad night)\n2. Brush 2 min + floss (permanent — night matters more than morning)\n3. Cleanse, twice if you wore makeup or SPF\n4. Retinoid — only Tue + Sat, buffered (tracked separately)\n5. Moisturiser, then occlusive on dry patches\n6. Feet: urea cream + cotton socks\n7. Sleep vitamins\nOne of the five non-negotiables.",
    category: "evening",
    recurrence: "daily",
    timeBlock: "evening",
    estMinutes: 15,
    isNonNegotiable: true,
  }),
  def({
    id: "rb-phone-down",
    title: "Phone down — across the room",
    detail: "21:00. Phone on the charger, across the room, out of arm's reach. Lights out 21:15 — 7h45m to a 5:00 alarm.",
    category: "mindset",
    recurrence: "daily",
    timeBlock: "evening",
    estMinutes: 1,
  }),

  // ── DENTAL PREP — one-off, dated tasks before 10 Aug (§11) ──────────────
  def({
    id: "rb-dental-call",
    title: "Call the dentist office",
    detail:
      "Say, in these words: \"This is my first visit in a long time and I have dental anxiety.\" The whole team then knows before you arrive. Same call: ask what happens at the first visit, whether there'll be a cleaning that day, and whether you can get a cost estimate before any treatment. Confirm a MORNING slot. This one call does more than anything else on the list.",
    category: "dental",
    recurrence: "once",
    timeBlock: "workday",
    estMinutes: 15,
    onceDate: "2026-07-20",
  }),
  def({
    id: "rb-dental-write-q",
    title: "Write your dentist questions in your phone",
    detail: "You won't remember them in the chair. Write them the day before.",
    category: "dental",
    recurrence: "once",
    timeBlock: "evening",
    estMinutes: 10,
    onceDate: "2026-08-09",
  }),
  def({
    id: "rb-dental-hand-signal",
    title: "Agree a hand signal with the hygienist",
    detail: "Before they start: raised left hand = stop. Having a stop button you control is the biggest single difference between tolerable and intolerable. Before leaving, book the next appointment.",
    category: "dental",
    recurrence: "once",
    timeBlock: "early_am",
    estMinutes: 2,
    onceDate: "2026-08-10",
  }),
];

// ---------------------------------------------------------------------------
// Reference content (spec §14 rebrand_reference_content) — static teaching
// copy, stored so it's editable without a redeploy.
// ---------------------------------------------------------------------------
let refOrder = 0;
function ref(section: string, subsection: string, heading: string, body: string): ReferenceItem {
  return { id: `ref-${section}-${subsection || "main"}`, section, subsection, heading, body, sortOrder: refOrder++ };
}

export const SEED_REFERENCE: ReferenceItem[] = [
  // Bathroom protocol (§6)
  ref(
    "bathroom_protocol",
    "why",
    "Built around the disgust, not around willpower",
    "The reason it slides isn't discipline. A bathroom left a week becomes genuinely disgusting and then avoiding it is rational. The fix is to never let it get there, and to never touch anything wet."
  ),
  ref(
    "bathroom_protocol",
    "layer_1",
    "Layer 1 — so it never gets gross",
    "• Every shower, 30 sec: squeegee the walls and door with the squeegee that lives inside the shower.\n• Every morning, 20 sec: one disposable wipe from the canister on the counter (visible, not under the sink) — sink, tap, counter, mirror.\n• Mon/Wed/Fri, 45 sec: disposable-head toilet wand. Scrub, click the head into the bin. Your hand never goes near the bowl."
  ),
  ref(
    "bathroom_protocol",
    "layer_2",
    "Layer 2 — Saturday Reset, 12 minutes",
    "Gloves on BEFORE entering. Podcast or music playing. Order: toilet exterior & base → sink & mirror → tub → floor → trash out → restock. Gloves handle the disgust, the timer handles the dread, the audio handles the boredom.\n\nMonthly, first Saturday, +10 min: shower curtain liner into the Friday haul, cabinet interior, bin scrubbed."
  ),
  ref(
    "bathroom_protocol",
    "supplies",
    "Supplies that make this possible (~$45, buy once)",
    "Disposable-head toilet wand + refills ($12) · disinfecting wipes canister ($6) · shower squeegee with hook ($8) · two pairs of rubber gloves, one bathroom-only and one dog-only, never the same pair ($7) · hooks for the closet floor ($12)."
  ),

  // Hand-wash + dog (§7)
  ref(
    "laundry",
    "handwash",
    "Hand-wash — the 10-minute version",
    "1. Basin in the tub, warm water, one squirt of detergent (baby shampoo for bras).\n2. Everything in, agitate 60 seconds, leave to soak.\n3. Start at 20:25, then go do the night routine and come back ~21:00 — the soak is dead time, which is the whole reason this works.\n4. Drain, refill, agitate, drain. Repeat once — two rinses, one leaves residue.\n5. Press water out against the basin. Never wring bras.\n6. Roll in a dry towel, stand on it, then hang on the rack."
  ),
  ref(
    "laundry",
    "pads",
    "Zorro's pad rotation — the single change that fixes this",
    "Owning three washable pads converts a daily problem into a weekly one.\n• 3 pads (~$40): one in use, one clean and waiting, one in the dirty bag. Daily you just swap.\n• Soiled pad straight into a LIDDED bin with a bag liner ($15) — it's the smell, not the pad, that creates the avoidance.\n• Friday: all soiled pads into the tub, shower-head rinse until clear, wring, sealed bag. Dog-only gloves.\n• Wash hot, NO fabric softener — softener kills absorbency and is the #1 reason washable pads stop working.\n• Keep a sleeve of disposables in the closet as a pressure valve."
  ),
  ref(
    "laundry",
    "inventory",
    "Inventory a weekly haul requires",
    "8 tops · 5 bottoms · 4 pyjama sets · 2 bath towels · 2 sheet sets (non-negotiable — you need to remake the bed same-day) · 3 washable pee pads · 3 mesh laundry bags for sorting as you go · 1 collapsible duffel · 1 drying rack for the hand-wash."
  ),

  // Beauty honesty (§9)
  ref(
    "beauty",
    "zendaya",
    "On the Zendaya target — honestly",
    "What a routine can actually deliver: clear even skin, healthy hair, groomed brows, good posture, clothes that fit, and a face with more definition at 145 lb. What it can't deliver is someone else's bone structure. The part that reads as 'her' is grooming consistency plus styling plus lighting plus a professional team — and the grooming-consistency half is fully yours to take. 'Pilates shredded' is real, but it's a 12–18 month outcome, arriving alongside the weight, not before it."
  ),
  ref(
    "beauty",
    "polished_checklist",
    "The polished checklist — what reads as put-together on camera",
    "Skin clean and even, SPF on · brows shaped within the last 6 weeks · hair intentional, not defaulted (a claw clip done well beats unstyled length) · nails done, any length · posture: shoulders back, chin level, screen at eye height (Pilates fixes this — fastest visual change available) · clothes that fit the body you have today · makeup floor of three things: brows, mascara, one lip."
  ),
  ref(
    "beauty",
    "lotion_fix",
    "The sticky-lotion fix",
    "Body lotion at bedtime is always sticky because it hasn't absorbed. Move it, don't change it — apply at 16:15 straight out of the shower onto DAMP skin. By 21:15 there's nothing on the surface. Feet stay at night, with socks straight over the top."
  ),

  // Dental (§11)
  ref(
    "dental",
    "expect",
    "What to expect on the day — so nothing is a surprise",
    "Paperwork 10–15 min, arrive early · X-rays — a small sensor, a few seconds per shot, awkward not painful; tell them if you have a strong gag reflex and they'll adjust · Exam — they'll call out pocket-depth numbers, which sounds alarming and is just measurement; ask what they mean after · Cleaning may not happen the same day — if there's significant buildup they'll schedule a deeper cleaning separately, which is normal after a gap and not a judgement · Treatment plan — you do not have to agree to anything that day; \"I'd like to take this home and look at it\" is a complete sentence · Before leaving, book the next appointment. That 30 seconds is the most important part of the visit."
  ),
  ref(
    "dental",
    "goal",
    "The goal",
    "The goal is walking back in for the second appointment — not what they find. This is you starting."
  ),
  ref(
    "dental",
    "ongoing",
    "Ongoing from 11 Aug",
    "Brush 2×2 min, soft bristles, 45° at the gumline — pressure causes recession, it doesn't clean better · water after anything sweet or acidic, and wait 30 min before brushing after acidic drinks (brushing immediately scrubs softened enamel) · new brush head every 3 months · cleaning and exam every 6 months, booked before leaving the previous one · ask about a night guard if you clench."
  ),

  // Mindset (§12)
  ref(
    "mindset",
    "never_miss_twice",
    "Never miss twice",
    "One missed session is a missed session. Two in a row is the beginning of not doing it. There is no catching up, no punishment day, and no starting over on Monday. You do the next scheduled thing on the next scheduled day."
  ),
  ref(
    "mindset",
    "five_second",
    "5 Second Rule",
    "Count 5-4-3-2-1 and move before you reach 1. Use it at the 5:00 alarm, before Pilates at 15:35, before the bathroom on Saturday, before dialling the dentist. The countdown occupies the part of the brain that would otherwise build a case against. A circuit breaker, not motivation."
  ),
  ref(
    "mindset",
    "let_them",
    "Let Them Theory",
    "\"Let them,\" then \"let me.\" Let them think it's weird you don't go out. Let me build a life indoors that works. The second half is the important half — 'let them' without 'let me' is just resignation."
  ),
  ref(
    "mindset",
    "mia_steps",
    "Mia McGrath (Frugal Chic) — the 5 rebrand steps",
    "1. Define your Brand Core — three words: Polished. Chic. Steady.\n2. Audit your online presence — one hour, one sitting. Ruthless unfollow. Your feed is your social environment.\n3. Curate visual identity — one profile picture, 2 fonts, 2–3 colours. Cohesion over chaos.\n4. Sharpen communication — say less, drop the disclaimers ('I think', 'maybe'), be intentional.\n5. Build self-trust — keep small promises. Weight loss is a by-product of self-trust, not the other way round."
  ),
];

// ---------------------------------------------------------------------------
// Brand Core worksheet (spec §12) — seeded, editable.
// ---------------------------------------------------------------------------
let bcOrder = 0;
function bc(prompt: string, answer: string): BrandCoreItem {
  return { id: `bc-${bcOrder}`, prompt, answer, sortOrder: bcOrder++ };
}

export const SEED_BRAND_CORE: BrandCoreItem[] = [
  bc(
    "Three words I want associated with me",
    "Polished. Chic. Steady. Polished = maintained and intentional. Chic = the flavour — restrained, feminine, not fussy. Steady = how I land with people; the one new hires go to because I know the answer and don't flap."
  ),
  bc(
    "Three words I'd be described with today, from outside my head",
    "Direct. Capable. Homebody. I say what I mean with no hedging, I build things most people would pay someone to build, and my life is deliberately centred at home."
  ),
  bc(
    "Where they overlap — my real brand today",
    "Steady / Capable. I'm not starting from zero. I built a dashboard as a beginner, I mentor new hires, I keep two rooms running with no system telling me to. Reliability I already own."
  ),
  bc(
    "Where they don't — the gap",
    "Polished and Chic — two of three, both presentation. Nobody's unprompted description of me leads with how I look. That's exactly what's changing, and it's the easiest category to change: it responds to consistency, not talent."
  ),
  bc(
    "Who am I at 145 that I'm not at 210?",
    "I stop treating how I look as something I'll deal with later and start treating it as maintained — the same way I already maintain my kitchen. 145 is a number, not a personality. What I'm buying is upkeep becoming normal, and that starts at 210."
  ),
  bc(
    "One thing I stop entirely, this week",
    "Calling myself lazy. Out loud, in my head, in writing. I said it twice while describing someone who wakes at 5, works a full shift, keeps two rooms permanently clean and builds her own software. It's high friction on two categories, and this whole plan is engineered around exactly those. 'Lazy' is a verdict, and a verdict is a permission slip."
  ),
  bc(
    "The promise I'm most likely to break",
    "The after-work Pilates session — 5 chances a week to break it, at the exact moment sitting down is the most reasonable thing in the world. Runner-up: the Friday laundry haul, the only thing requiring me to leave the house."
  ),
  bc(
    "What I'll DO when I break it",
    "Pilates: mat, weights and shoes out at 15:25, before the laptop closes. If 15:35 passes, fallback is 10 minutes at 16:30 — ten minutes counts as a yes. Laundry: if Friday fails it moves to Saturday 09:00 and nowhere else."
  ),
];

// ---------------------------------------------------------------------------
// Roadmap (spec §10). Everything Phase 1+ is gated until 1 Oct 2026.
// ---------------------------------------------------------------------------
const OCT_GATE = "2026-10-01";
let rmOrder = 0;
function rm(phase: number, targetMonth: string, title: string, detail: string, cost: string, gate: string | null): RoadmapItem {
  return {
    id: `rm-${rmOrder}`,
    phase,
    targetMonth,
    title,
    detail,
    costEstimate: cost,
    status: "not_started",
    gatedUntil: gate,
    sortOrder: rmOrder++,
  };
}

export const SEED_ROADMAP: RoadmapItem[] = [
  rm(1, "Oct 2026", "Professional facial + esthetician consult", "After 10 weeks of consistent SPF and retinoid they can tell you what's left, not just to do the basics.", "$120–180", OCT_GATE),
  rm(1, "Oct 2026", "Upgrade to prescription tretinoin (if OTC tolerated)", "Going straight to tretinoin causes the irritation that makes people quit. Earn it with 10 weeks of OTC first.", "$30–90", OCT_GATE),
  rm(2, "Nov 2026", "Real haircut + colour consultation", "A cut on hair that's had 3 months of care actually holds.", "$100–250", OCT_GATE),
  rm(2, "Nov 2026", "Lash lift + brow lamination (not extensions)", "Low commitment, 6–8 weeks, no daily upkeep.", "$150–200", OCT_GATE),
  rm(3, "Dec 2026 / Jan 2027", "Peel series or microneedling — only if recommended", "Needs a baseline first. Orlando sun means post-treatment SPF discipline is mandatory.", "$150–400/session", OCT_GATE),
  rm(
    4,
    "2027",
    "Facial balancing consult — the honest version",
    "What it is: HA fillers across chin, jaw, cheeks, temples to change proportion. Non-surgical but NOT non-invasive — needles, swelling, bruising, a recovery week. Cost: realistically $2,500–6,000+, staged across 2–4 appointments. Not permanent: HA lasts ~9–18 months; maintaining it is an ongoing annual cost. Why wait: losing 65 lb genuinely changes facial structure — filler at 210 lb followed by a 65 lb loss can leave a result that no longer fits your face. Recommendation: revisit at or near goal weight. If you go ahead: board-certified dermatologist or plastic surgeon, not a medspa injector; HA filler can be dissolved with hyaluronidase.",
    "$2,500–6,000+",
    OCT_GATE
  ),
];

// ---------------------------------------------------------------------------
// Milestones (spec §13) — static projected reference. Actual weight is read
// from the weight log. Not editable, so kept as a plain constant.
// ---------------------------------------------------------------------------
export type Milestone = { date: string; title: string; projectedWeight: number };

export const MILESTONES: Milestone[] = [
  { date: "2026-07-20", title: "Day 1. Three pee pads, toilet wand, wipes ordered. Dentist called.", projectedWeight: 210.0 },
  { date: "2026-08-10", title: "DENTIST — first visit. Next appointment booked before leaving.", projectedWeight: 208.3 },
  { date: "2026-08-31", title: "Six weeks in. Fiber at 32 g. Six consecutive Saturday bathroom resets.", projectedWeight: 204.7 },
  { date: "2026-09-30", title: "I turn 32. Habits should feel boring rather than hard by here.", projectedWeight: 199.7 },
  { date: "2026-10-01", title: "Budget unlocks. Roadmap Phase 1 begins.", projectedWeight: 199.7 },
  { date: "2026-12-31", title: "Five months. ~24 lb down. Do NOT replace the whole wardrobe yet.", projectedWeight: 185.9 },
  { date: "2027-02-28", title: "The slog. Nothing feels like it's working; the log is the only evidence it is.", projectedWeight: 177.7 },
  { date: "2027-07-31", title: "One year. ~50 lb down. Facial structure has already changed — photograph yourself.", projectedWeight: 160.5 },
  { date: "2027-08-10", title: "Dentist, one year on. Fourth visit. Fear a memory rather than a factor.", projectedWeight: 159.6 },
  { date: "2027-12-31", title: "Eighteen months. Under 150. The last 5 lb are the slowest — expect it.", projectedWeight: 146.9 },
  { date: "2028-01-31", title: "GOAL WEIGHT 145. Facial balancing decision revisited HERE, not before.", projectedWeight: 145.0 },
];
