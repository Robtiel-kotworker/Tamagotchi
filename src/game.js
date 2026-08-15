// Reine Spiellogik der Kreatur (synchron) + Nutzerverwaltung über
// Supabase (asynchron), damit dieselbe Kreatur auf jedem Gerät
// erreichbar ist.

import { supabase } from "./supabaseClient.js";

export const MIN = 60 * 1000;
export const HOUR = 60 * MIN;

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

// --- Nutzerverwaltung (Supabase) ---------------------------------------
// Tabelle "pets": username_key (Primary Key, lowercase), username
// (Original-Schreibweise), pet_data (jsonb), updated_at.

function normalizeUsername(username) {
  return String(username || "").trim();
}

function usernameKey(username) {
  return normalizeUsername(username).toLowerCase();
}

/** Prüft, ob ein Nutzername bereits existiert (case-insensitiv). */
export async function userExists(username) {
  const key = usernameKey(username);
  if (!key) return false;
  const { data, error } = await supabase
    .from("pets")
    .select("username_key")
    .eq("username_key", key)
    .maybeSingle();
  if (error) {
    console.error("Nutzerprüfung fehlgeschlagen", error);
    throw error;
  }
  return !!data;
}

/** Registriert einen neuen Nutzer und legt für ihn ein frisches Ei an. */
export async function registerUser(username) {
  const name = normalizeUsername(username);
  if (!name) throw new Error("Ungültiger Nutzername");
  const pet = createNewPet();
  const { error } = await supabase.from("pets").insert({
    username_key: name.toLowerCase(),
    username: name,
    pet_data: pet,
  });
  if (error) {
    if (error.code === "23505") {
      throw new Error("Dieser Nutzername wurde gerade eben schon vergeben.");
    }
    console.error("Registrierung fehlgeschlagen", error);
    throw error;
  }
  return pet;
}

/** Lädt den gespeicherten Pet-Zustand eines Nutzers (oder null). */
export async function loadPet(username) {
  const key = usernameKey(username);
  const { data, error } = await supabase
    .from("pets")
    .select("pet_data")
    .eq("username_key", key)
    .maybeSingle();
  if (error) {
    console.error("Laden fehlgeschlagen", error);
    throw error;
  }
  return data ? data.pet_data : null;
}

/** Speichert den Pet-Zustand eines Nutzers. */
export async function savePet(pet, username) {
  const name = normalizeUsername(username);
  const { error } = await supabase.from("pets").upsert({
    username_key: name.toLowerCase(),
    username: name,
    pet_data: pet,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("Speichern fehlgeschlagen", error);
  }
}

// --- Session (bleibt lokal – merkt sich nur, wer zuletzt eingeloggt war) --

/** Merkt sich den eingeloggten Nutzer für den nächsten App-Start. */
export function setSession(username) {
  try {
    localStorage.setItem(SESSION_KEY, normalizeUsername(username));
  } catch (e) {
    console.error("Session speichern fehlgeschlagen", e);
  }
}

/** Liefert den zuletzt eingeloggten Nutzer (oder null), ungeprüft. */
export function getSession() {
  try {
    return localStorage.getItem(SESSION_KEY) || null;
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
