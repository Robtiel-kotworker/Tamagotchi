// Reine Spiellogik des Tamagotchi. Kein DOM-/React-Bezug, damit sie
// isoliert getestet werden kann.

export const MIN = 60 * 1000;
export const HOUR = 60 * MIN;

export const STORAGE_KEY = "tamagotchi-pet-v1";
export const TICK_MS = 3000;
export const MAX_CATCHUP_MS = 48 * HOUR;

export const HATCH_DELAY = 2 * MIN;
export const CHILD_AGE = 30 * MIN;
export const ADULT_AGE = 120 * MIN;

export const clamp = (v, min = 0, max = 100) => Math.min(max, Math.max(min, v));
export const now = () => Date.now();
const rand = (a, b) => a + Math.random() * (b - a);

/** Erstellt ein frisches Ei als Startzustand. */
export function createNewPet() {
  const t = now();
  return {
    stage: "egg", // egg | baby | child | adult
    bornAt: t,
    hatchedAt: null,
    hunger: 80,
    happiness: 80,
    energy: 80,
    hygiene: 80,
    health: 100,
    poopCount: 0,
    nextPoopAt: t + rand(10, 25) * MIN,
    asleep: false,
    alive: true,
    deathAt: null,
    lastUpdate: t,
  };
}

/**
 * Berechnet den Zustand zum Zeitpunkt `toTs` fort (Zerfall, Schlüpfen,
 * Entwicklung, Kacke, Gesundheit/Tod). Reine Funktion – gleicher Input
 * liefert immer gleichen Output, wichtig für Offline-Nachholen und Tests.
 */
export function advancePet(pet, toTs) {
  if (!pet.alive) return pet;
  let elapsed = toTs - pet.lastUpdate;
  if (elapsed <= 0) return pet;
  if (elapsed > MAX_CATCHUP_MS) elapsed = MAX_CATCHUP_MS;
  const hours = elapsed / HOUR;

  const p = { ...pet };

  if (p.stage === "egg") {
    if (toTs - p.bornAt >= HATCH_DELAY) {
      p.stage = "baby";
      p.hatchedAt = toTs;
    } else {
      p.lastUpdate = toTs;
      return p;
    }
  }

  if (p.asleep) {
    p.hunger = clamp(p.hunger - 6 * hours);
    p.hygiene = clamp(p.hygiene - 5 * hours);
    p.energy = clamp(p.energy + 25 * hours);
    p.happiness = clamp(p.happiness - 3 * hours);
  } else {
    p.hunger = clamp(p.hunger - 12 * hours);
    p.hygiene = clamp(p.hygiene - 10 * hours - p.poopCount * 4 * hours);
    p.energy = clamp(p.energy - 8 * hours);
    let happinessDecay = 6 * hours + p.poopCount * 3 * hours;
    if (p.hunger < 20 || p.hygiene < 20 || p.energy < 15) {
      happinessDecay += 10 * hours;
    }
    p.happiness = clamp(p.happiness - happinessDecay);
  }

  const critical = p.hunger < 15 || p.hygiene < 15 || p.energy < 10;
  const thriving =
    p.hunger > 50 && p.hygiene > 50 && p.energy > 50 && p.happiness > 50;
  if (critical) p.health = clamp(p.health - 20 * hours);
  else if (thriving) p.health = clamp(p.health + 8 * hours);

  if (p.health <= 0) {
    p.alive = false;
    p.deathAt = toTs;
    p.lastUpdate = toTs;
    return p;
  }

  if (toTs >= p.nextPoopAt && p.poopCount < 3) {
    p.poopCount = p.poopCount + 1;
    p.nextPoopAt = toTs + rand(15, 35) * MIN;
  }

  if (p.hatchedAt) {
    const age = toTs - p.hatchedAt;
    if (age >= ADULT_AGE) p.stage = "adult";
    else if (age >= CHILD_AGE) p.stage = "child";
    else p.stage = "baby";
  }

  p.lastUpdate = toTs;
  return p;
}

/** Bestimmt die aktuelle Stimmung fürs Sprite-Rendering. */
export function moodOf(pet, flash) {
  if (!pet.alive) return "dead";
  if (flash) return flash;
  if (pet.asleep) return "sleeping";
  if (pet.health < 30) return "sick";
  if (pet.hunger < 25 || pet.hygiene < 25 || pet.energy < 15) return "sad";
  if (pet.happiness > 70) return "happy";
  return "neutral";
}

/** Lädt den gespeicherten Zustand aus localStorage (oder null). */
export function loadPet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Laden fehlgeschlagen", e);
    return null;
  }
}

/** Speichert den Zustand in localStorage. */
export function savePet(pet) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pet));
  } catch (e) {
    console.error("Speichern fehlgeschlagen", e);
  }
}
