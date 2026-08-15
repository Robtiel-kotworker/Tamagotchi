// Reine Spiellogik der Kreatur. Kein DOM-/React-Bezug, damit sie
// isoliert getestet werden kann.

export const MIN = 60 * 1000;
export const HOUR = 60 * MIN;

export const STORAGE_PREFIX = "tamagotchi-pet-v1:";
export const USERS_KEY = "tamagotchi-users-v1";
export const SESSION_KEY = "tamagotchi-session-v1";
export const TICK_MS = 3000;
export const MAX_CATCHUP_MS = 48 * HOUR;

export const HATCH_DELAY = 2 * MIN;
export const CHILD_AGE = 30 * MIN;
export const ADULT_AGE = 120 * MIN;

/** Die vier möglichen Kreaturen, die beim Schlüpfen entstehen können. */
export const SPECIES = [
  "Hardtekk Kreatur",
  "Industrial Techno Kreatur",
  "Psy-Trance Kreatur",
  "Gabber Kreatur",
];

export const clamp = (v, min = 0, max = 100) => Math.min(max, Math.max(min, v));
export const now = () => Date.now();
const rand = (a, b) => a + Math.random() * (b - a);
const randomSpecies = () => SPECIES[Math.floor(Math.random() * SPECIES.length)];

/** Erstellt ein frisches Ei als Startzustand. */
export function createNewPet() {
  const t = now();
  return {
    stage: "egg", // egg | baby | child | adult
    species: null, // wird beim Schlüpfen zufällig festgelegt
    nickname: "",
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
      if (!p.species) p.species = randomSpecies();
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

/** Setzt (oder ändert) den Spitznamen einer Kreatur. */
export function withNickname(pet, nickname) {
  return { ...pet, nickname: String(nickname || "").trim().slice(0, 18) };
}

// --- Nutzerverwaltung -------------------------------------------------

/** Normalisiert einen Nutzernamen für den internen Vergleich/Storage-Key. */
function normalizeUsername(username) {
  return String(username || "").trim();
}

/** Liefert die Liste aller registrierten Nutzernamen. */
export function getUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Nutzerliste laden fehlgeschlagen", e);
    return [];
  }
}

/** Prüft, ob ein Nutzername bereits existiert (case-insensitiv). */
export function userExists(username) {
  const name = normalizeUsername(username);
  if (!name) return false;
  return getUsers().some((u) => u.toLowerCase() === name.toLowerCase());
}

/** Findet die exakt gespeicherte Schreibweise eines Nutzernamens. */
function findStoredUsername(username) {
  const name = normalizeUsername(username);
  return getUsers().find((u) => u.toLowerCase() === name.toLowerCase()) || name;
}

/** Registriert einen neuen Nutzer und legt für ihn ein frisches Ei an. */
export function registerUser(username) {
  const name = normalizeUsername(username);
  if (!name) throw new Error("Ungültiger Nutzername");
  const users = getUsers();
  if (!users.some((u) => u.toLowerCase() === name.toLowerCase())) {
    users.push(name);
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.error("Nutzer registrieren fehlgeschlagen", e);
    }
  }
  const pet = createNewPet();
  savePet(pet, name);
  return pet;
}

/** Lädt den gespeicherten Pet-Zustand eines Nutzers (oder null). */
export function loadPet(username) {
  const name = findStoredUsername(username);
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + name);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Laden fehlgeschlagen", e);
    return null;
  }
}

/** Speichert den Pet-Zustand eines Nutzers. */
export function savePet(pet, username) {
  const name = normalizeUsername(username);
  try {
    localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(pet));
  } catch (e) {
    console.error("Speichern fehlgeschlagen", e);
  }
}

/** Merkt sich den eingeloggten Nutzer für den nächsten App-Start. */
export function setSession(username) {
  try {
    localStorage.setItem(SESSION_KEY, normalizeUsername(username));
  } catch (e) {
    console.error("Session speichern fehlgeschlagen", e);
  }
}

/** Liefert den zuletzt eingeloggten Nutzer (oder null). */
export function getSession() {
  try {
    const name = localStorage.getItem(SESSION_KEY);
    return name && userExists(name) ? findStoredUsername(name) : null;
  } catch (e) {
    console.error("Session laden fehlgeschlagen", e);
    return null;
  }
}

/** Loggt den aktuellen Nutzer aus. */
export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.error("Session löschen fehlgeschlagen", e);
  }
}
