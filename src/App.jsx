import React, { useState, useEffect, useRef } from "react";
import { Creature, MiniIcon, Bar } from "./Creature.jsx";
import {
  MIN,
  TICK_MS,
  HATCH_DELAY,
  createNewPet,
  advancePet,
  moodOf,
  loadPet,
  savePet,
  now,
} from "./game.js";

export default function App() {
  const [pet, setPet] = useState(null);
  const [flash, setFlash] = useState(null);
  const [message, setMessage] = useState("");
  const flashTimeout = useRef(null);
  const msgTimeout = useRef(null);

  // Initial laden + Offline-Zeit nachholen.
  useEffect(() => {
    const stored = loadPet() || createNewPet();
    const caught = advancePet(stored, now());
    setPet(caught);
    savePet(caught);
  }, []);

  // Spiel-Tick.
  useEffect(() => {
    const id = setInterval(() => {
      setPet((prev) => {
        if (!prev) return prev;
        const next = advancePet(prev, now());
        savePet(next);
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const showFlash = (kind, ms = 1300) => {
    setFlash(kind);
    if (flashTimeout.current) clearTimeout(flashTimeout.current);
    flashTimeout.current = setTimeout(() => setFlash(null), ms);
  };

  const showMessage = (text, ms = 2000) => {
    setMessage(text);
    if (msgTimeout.current) clearTimeout(msgTimeout.current);
    msgTimeout.current = setTimeout(() => setMessage(""), ms);
  };

  const withSyncedPet = (mutator) => {
    setPet((prev) => {
      if (!prev || !prev.alive || prev.stage === "egg") return prev;
      const synced = advancePet(prev, now());
      const next = mutator(synced);
      savePet(next);
      return next;
    });
  };

  const feed = () => {
    withSyncedPet((p) => ({
      ...p,
      hunger: Math.min(100, p.hunger + 35),
      happiness: Math.min(100, p.happiness + 5),
      asleep: false,
    }));
    showFlash("eating");
    showMessage("Lecker!");
  };

  const play = () => {
    setPet((prev) => {
      if (!prev || !prev.alive || prev.stage === "egg") return prev;
      const synced = advancePet(prev, now());
      if (synced.energy < 10) {
        showMessage("Zu müde zum Spielen …");
        savePet(synced);
        return synced;
      }
      const next = {
        ...synced,
        happiness: Math.min(100, synced.happiness + 25),
        energy: Math.max(0, synced.energy - 20),
        hunger: Math.max(0, synced.hunger - 8),
        asleep: false,
      };
      savePet(next);
      showFlash("playing");
      showMessage("Das macht Spaß!");
      return next;
    });
  };

  const clean = () => {
    withSyncedPet((p) => ({
      ...p,
      poopCount: 0,
      hygiene: Math.min(100, p.hygiene + 35),
    }));
    showFlash("cleaning");
    showMessage("Sauber!");
  };

  const toggleSleep = () => {
    withSyncedPet((p) => ({ ...p, asleep: !p.asleep }));
  };

  const restart = () => {
    const fresh = createNewPet();
    setPet(fresh);
    savePet(fresh);
    showMessage("Ein neues Ei wartet auf dich!");
  };

  if (!pet) {
    return <div className="loading">Wird geladen …</div>;
  }

  const mood = moodOf(pet, flash);
  const isEgg = pet.stage === "egg";
  const isDead = !pet.alive;

  const hatchRemaining = isEgg ? Math.max(0, HATCH_DELAY - (now() - pet.bornAt)) : 0;
  const ageMs = pet.hatchedAt ? (pet.deathAt || now()) - pet.hatchedAt : 0;
  const ageMinutes = Math.floor(ageMs / MIN);
  const ageH = Math.floor(ageMinutes / 60);
  const ageM = ageMinutes % 60;
  const ageLabel = ageH > 0 ? `${ageH}h ${ageM}m` : `${ageM}m`;

  const stageLabel = { egg: "Ei", baby: "Baby", child: "Kind", adult: "Erwachsen" }[pet.stage];

  return (
    <div className="tg-app">
      <div className="device">
        <div className="device-label">TAMA・PET</div>
        <div className="screen">
          <div className="screen-scanlines" />
          <div className="screen-top">
            <span className="stage-tag">{isDead ? "✝ RUHE" : stageLabel}</span>
            {pet.hatchedAt && !isEgg && <span className="age-tag">{ageLabel}</span>}
          </div>

          <div className="creature-wrap">
            <Creature stage={isEgg ? "egg" : pet.stage} mood={mood} />
            {pet.poopCount > 0 && !isDead && (
              <div className="poop-row">
                {Array.from({ length: pet.poopCount }).map((_, i) => (
                  <span key={i} className="poop" />
                ))}
              </div>
            )}
            {mood === "sleeping" && <div className="zzz">z z z</div>}
          </div>

          {isEgg && (
            <div className="hatch-hint">Brütet noch {Math.ceil(hatchRemaining / MIN)} Min …</div>
          )}

          {isDead && (
            <div className="death-panel">
              <div>Dein Wesen ist eingeschlafen für immer.</div>
              <div className="death-age">Gelebt: {ageLabel}</div>
            </div>
          )}

          {!isEgg && !isDead && (
            <div className="stats">
              <Bar value={pet.hunger} icon="🍖" />
              <Bar value={pet.happiness} icon="♥" />
              <Bar value={pet.energy} icon="⚡" />
              <Bar value={pet.hygiene} icon="✦" />
            </div>
          )}

          <div className="msg-line">{message}</div>
        </div>

        <div className="controls">
          {isDead ? (
            <button className="btn btn-wide" onClick={restart}>
              Neues Ei
            </button>
          ) : (
            <>
              <button className="btn" onClick={feed} disabled={isEgg} aria-label="Füttern">
                <MiniIcon kind="food" />
                <span>Futter</span>
              </button>
              <button className="btn" onClick={play} disabled={isEgg} aria-label="Spielen">
                <MiniIcon kind="play" />
                <span>Spiel</span>
              </button>
              <button className="btn" onClick={clean} disabled={isEgg} aria-label="Reinigen">
                <MiniIcon kind="clean" />
                <span>Putzen</span>
              </button>
              <button className="btn" onClick={toggleSleep} disabled={isEgg} aria-label="Schlafen">
                <MiniIcon kind="sleep" />
                <span>{pet.asleep ? "Wecken" : "Schlaf"}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}