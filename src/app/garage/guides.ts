export type GuidePart = { name: string; partNumber?: string; cost?: string };

export type Guide = {
  id: string;
  title: string;
  verified: boolean; // false = "researched — verify before doing"
  tools: string[];
  parts: GuidePart[];
  note?: string;
  steps: string[];
};

export type CarPartId =
  | "frontBumper"
  | "headlights"
  | "engineBay"
  | "windshield"
  | "sideMirrors"
  | "doorHandles"
  | "tires";

// Guides keyed by the car part they belong to.
// All torque specs should be confirmed against your owner's manual before doing the work.
export const GUIDES: Record<CarPartId, Guide[]> = {
  frontBumper: [
    {
      id: "front-bumper-replace",
      title: "Front Bumper — Replace",
      verified: true,
      tools: ["Trim tool / screwdriver"],
      parts: [],
      steps: [
        'Open from the bottom — remove the "Christmas tree" clips underneath and the screws.',
        "Take the clips out from the fender liner on either side — there are no screws here.",
        "Unclip along the top.",
        "Pull the bumper off.",
        "Disconnect the bumper connector clips on both sides.",
        "To reinstall, follow these steps in reverse.",
      ],
    },
  ],

  headlights: [
    {
      id: "headlight-assembly-replace",
      title: "Headlight Assembly — Replace",
      verified: true,
      tools: ["10mm socket", "12mm socket", "Ratchet"],
      parts: [],
      note: "You have to take the bumper off first (see Front Bumper guide).",
      steps: [
        "Take off the bumper.",
        "Remove the two 10mm bolts above the light.",
        "Remove the one 12mm bolt toward the back, near the box on the back right.",
        "Unplug the headlight connection.",
        "Grab the light on either side, wiggle, and pull it out.",
        "REINSTALL — Line it up with the clips and push up on it.",
        "Check both clips are seated.",
        "Put the screws/bolts back on.",
        "Plug the connector back in.",
      ],
    },
    {
      id: "headlight-bulb-change",
      title: "Headlight Bulb Change",
      verified: false,
      tools: ["Clean gloves or a cloth (never touch the glass)"],
      parts: [
        { name: "Low beam", partNumber: "H11 — CONFIRM by reading your old bulb; listings disagree" },
        { name: "High beam", partNumber: "9005 (HB3) — CONFIRM by reading your old bulb" },
        { name: "Fog", partNumber: "H11 — CONFIRM by reading your old bulb" },
      ],
      note: "For just the bulb you usually do NOT need to remove the bumper — reach it from behind the headlight in the engine bay. You may need to move the air intake (passenger side) or the washer filler/fuse box (driver side) for room.",
      steps: [
        "Turn the lights off and let the engine bay cool.",
        "From behind the headlight, find the round cover on the back of the housing and twist it off.",
        "Unplug the electrical connector from the back of the bulb.",
        "Release the bulb — usually a wire spring clip you press and unhook, or a twist-lock holder turned counter-clockwise.",
        "Pull the old bulb straight out.",
        "Insert the new bulb holding it by the base only — NEVER touch the glass (skin oil shortens bulb life). Use gloves or a cloth.",
        "Refit the retaining clip/holder, plug the connector back in, and replace the rear cover.",
        "Test the light before closing up. Replace bulbs in pairs so both sides match.",
      ],
    },
  ],

  sideMirrors: [
    {
      id: "side-mirror-replace",
      title: "Side Mirror — Replace",
      verified: true,
      tools: ["Trim tool", "10mm socket", "Ratchet"],
      parts: [],
      steps: [
        "Open the door.",
        "Pull out the interior trim with a trim tool.",
        "Disconnect the connector.",
        "Remove the 10mm nuts using a ratchet.",
        "Pull the mirror out.",
        "On the new mirror, line the foam up to the gasket and form it.",
        "Put the mirror on.",
        "Start the nuts by hand.",
        "Snug the nuts down.",
        "Reconnect the connector.",
        "Push the cover on gently.",
      ],
    },
  ],

  doorHandles: [
    {
      id: "door-handle-replace",
      title: "Door Handle — Replace (Exterior)",
      verified: false,
      tools: ["Small flat trim tool", "Phillips screwdriver or small socket", "Torque wrench"],
      parts: [
        {
          name: "Handle assembly (front-left/driver) — match position, finish (painted Scarlet Red Pearl or chrome), and smart-key vs non-smart-key",
          partNumber: "82651-F2… — confirm exact suffix for your trim/color/smart-key setup",
        },
        {
          name: "Handle assembly (front-right/passenger)",
          partNumber: "82661-F2… — confirm exact suffix",
        },
      ],
      note: "You do NOT need to remove the interior door panel — about a 30-minute job. Handle is specific to position, finish, and smart-key setup. Confirm all three before ordering.",
      steps: [
        "Open the door.",
        "On the rear shut-face edge of the door, pop off the small plastic cap/plug behind the handle with a trim tool.",
        "Remove the screw/bolt now exposed.",
        "Slide the handle toward the rear of the car to unhook it, then pull the front of the handle out first.",
        "Swing the rear out and disconnect it from the latch rod/cable — and the smart-key connector if equipped.",
        "Transfer the key cylinder or end cap to the new handle if yours has one.",
        "Fit the new handle: hook the rear in first, seat the front, then slide it forward to lock.",
        "Reinstall the screw and torque the cap screw to about 6.6 lb-ft (7.8–10.8 Nm) — don't overtighten.",
        "Snap the cap back on and test the handle before fully buttoning up.",
      ],
    },
  ],

  tires: [
    {
      id: "fender-liner-replace",
      title: "Fender Liner — Replace",
      verified: true,
      tools: ["Trim tool", "Phillips screwdriver", "Jack + lug wrench (to remove tire)"],
      parts: [
        { name: "Fender liner", partNumber: "Hyundai OEM 86811-F2800", cost: "~$185.32" },
        { name: "Push clips", partNumber: "86595-2TS00" },
      ],
      steps: [
        "Remove the tire.",
        "Use a trim tool to remove the plastic retainer buttons: Front bottom side = 3 plastic push buttons. Follow the outer lip all the way around and remove the push pieces. On the back lower section, 3 Phillips-head screws.",
        "Move the retainer clips from the old liner to the new one (3 total).",
        "Line up the back portion with the screws first and put them in. Do not over-tighten.",
        "Tuck the liner up and in.",
        "Start putting the push pins in, working up and around.",
        "Put the tire back on.",
      ],
    },
    {
      id: "tire-rotation",
      title: "Tire Rotation",
      verified: false,
      tools: ["Jack", "Jack stands", "21mm lug socket", "Breaker bar or lug wrench", "Torque wrench"],
      parts: [],
      steps: [
        "With the tire still on the ground, slightly loosen (don't remove) the lug nuts — they're 21mm.",
        "Jack the car up and set it on jack stands. Never get under a car held by a jack alone.",
        "Remove the wheels.",
        "Rotate in the front-wheel-drive pattern for non-directional tires: both rear tires move straight to the front, and each front tire crosses to the opposite-side rear (front-left → rear-right, front-right → rear-left). If your tires are directional (an arrow on the sidewall), only swap front-to-back on the same side instead.",
        "Hand-thread each lug nut first to avoid cross-threading, then snug them in a star/criss-cross pattern.",
        "Lower the car until the tires are on the ground.",
        "Torque the lug nuts in a star pattern. Hyundai lists about 79–94 ft-lb for this Elantra — confirm the exact figure in your owner's manual.",
        "Re-check the torque after about 50 miles.",
      ],
    },
  ],

  engineBay: [
    {
      id: "engine-air-filter",
      title: "Engine Air Filter — Replace",
      verified: true,
      tools: ["None (by hand)"],
      parts: [],
      steps: [
        "Locate the air filter box on the driver's side of the engine compartment.",
        "Pull out the clip on the right side and the back right.",
        "Lift up the lid.",
        "Remove the old filter.",
        "Put in the new filter.",
        "Close the box.",
      ],
    },
    {
      id: "battery-replace",
      title: "Battery — Replace",
      verified: true,
      tools: ["10mm socket", "Ratchet"],
      parts: [],
      steps: [
        "Disconnect the ground (negative) terminal with the 10mm nut.",
        "Wiggle and pull up on the terminal.",
        "Open the positive terminal box.",
        "Undo the 10mm nut.",
        "Wiggle and pull the box up and to the side.",
        "Remove the brace with the 10mm nut.",
        "Lift the battery straight up.",
        "Swap over the insulator pad if present.",
        "Put the new battery in.",
        "Secure the bracket (if there is one).",
        "Slide the positive terminal back on.",
        "Tighten the nut, then close the lid.",
        "Push down the ground terminal and snug the nut.",
        "Done.",
      ],
    },
    {
      id: "spark-plugs",
      title: "Spark Plugs — Replace",
      verified: true,
      tools: [
        "Screwdriver",
        "10mm socket",
        "16mm spark plug socket + extension",
        "Torque wrench",
        "Silicone paste",
      ],
      parts: [
        { name: "Spark plugs — NGK Laser Iridium", partNumber: "SILZKR7B11", cost: "~$31.89" },
        { name: "Spark plugs — OEM", partNumber: "18849-08080" },
      ],
      steps: [
        "Remove the engine cover — lift it from the corners. Set it aside.",
        "Remove the wire harnesses off the ignition coils (4 — blocks back).",
        "Grey lock tabs — use a screwdriver to get into the notch and push back.",
        "Once the lock tab is back, pinch down and wiggle the connector off.",
        "Pull the harness to the side.",
        "There's a series of 10mm bolts — use a socket to remove.",
        "Twist and pull up on the coil. Remove the bolt and set aside.",
        "Pull the coil out. Repeat for all.",
        "Use the 16mm spark plug socket with an extension to feed down into the tube.",
        "Use the torque wrench to grab onto the spark plug.",
        "Lift up and out.",
        "Insert the new spark plug into the rubber boot; make sure it's secure.",
        "Lower into the cylinder slowly.",
        "Thread (screw) in by hand until it stops.",
        "Once seated, torque down to 18 ft-lbs.",
        "Repeat for the other 3.",
        "Apply a little silicone paste inside the end of the boot.",
        "Drop the coil back in — repeat. Get the bolts started — repeat. Screw / snug down.",
        "Reconnect the harness — listen for the click. Push the locking tabs down.",
        "Install the engine cover by setting it on the top ball studs. Press down.",
      ],
    },
    {
      id: "oil-change",
      title: "Oil Change",
      verified: true,
      tools: ["17mm socket wrench", "Oil collection bucket", "Rag", "Torque wrench"],
      parts: [
        { name: "Engine oil — 4.2 qts 5W-30" },
        { name: "New oil filter" },
        { name: "New drain plug washer (optional, prevents leaks)" },
      ],
      steps: [
        "On the underside there's a cutout that lets you access the drain plug.",
        "Use a 17mm socket wrench to loosen it.",
        "Unthread it but hold pressure so the oil doesn't shoot out.",
        "When ready, remove it to let the oil drain into the collection bucket.",
        "Check the washer on the plug — it can be reused a few times, but it's good to replace it to prevent leaks.",
        "There's another cutout to reach the oil filter (larger).",
        "Unscrew it — some oil will come out. Drain, then pull it out. Clean up with a rag.",
        "Pre-fill the new filter by putting some oil inside.",
        "Lubricate the rim with oil.",
        "Thread the filter on until it bottoms out. 3/4 turn after it bottoms out.",
        "Reinstall the oil drain plug. Wipe off.",
        "Torque the drain plug to 25 ft-lbs.",
        "Pull out the dipstick and set it to the side.",
        "Remove the oil cap in the engine bay.",
        "Add 4.2 qts of 5W-30 engine oil.",
        "Put the cap back. Check the level. Good to go.",
      ],
    },
  ],

  windshield: [
    {
      id: "wiper-blades",
      title: "Wiper Blades — Replace",
      verified: true,
      tools: ["Screwdriver (if needed)"],
      parts: [],
      steps: [
        "Swing the wiper arm up.",
        "If there's a release cap, use a screwdriver to lift it up.",
        "Fold the wiper down (top half not loose).",
        "Underneath, between the arm and the wiper, you'll feel a tab — flex it down.",
        "Pull the wiper blade down toward the arm.",
        "Gently rest the arm down.",
        "Identify where the hook will go; slide it into the hook.",
        "Pull the wiper up away from the arm.",
        "You'll hear it lock.",
        "Remove the protective sleeve.",
      ],
    },
    {
      id: "cabin-air-filter",
      title: "Cabin Air Filter — Replace",
      verified: true,
      tools: ["None (by hand)"],
      parts: [],
      note: "Accessed through the glovebox.",
      steps: [
        "Open and remove the glove box.",
        "Pull the rods off the pin.",
        "Turn the dials counter-clockwise on both sides.",
        "The glove box will drop down.",
        "Pinch the tabs on either side and remove the filter.",
        "Put the new filter in with the arrow pointed down.",
        "Put it back together.",
      ],
    },
  ],
};

export const PART_LABELS: Record<CarPartId, string> = {
  frontBumper: "Front Bumper",
  headlights: "Headlights",
  engineBay: "Hood / Engine Bay",
  windshield: "Windshield & Wipers",
  sideMirrors: "Side Mirrors",
  doorHandles: "Door Handles",
  tires: "Tires & Fender Liners",
};

export const REFERENCE_INFO = {
  paintColor: "Scarlet Red Pearl (confirm 3-char code from sticker in driver's-side door jamb)",
  fenderLiner: { name: "Fender liner", partNumber: "Hyundai OEM 86811-F2800", cost: "~$185.32" },
  fenderClips: { name: "Fender liner push clips", partNumber: "86595-2TS00" },
  sparkPlugs: [
    { name: "NGK Laser Iridium", partNumber: "SILZKR7B11", cost: "~$31.89" },
    { name: "OEM", partNumber: "18849-08080" },
  ],
  engineOil: "4.2 qts 5W-30",
};
