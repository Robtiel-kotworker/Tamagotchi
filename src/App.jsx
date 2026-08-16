import React, { useState, useEffect, useRef } from "react";
import { Creature, Bar } from "./Creature.jsx";
import Login from "./Login.jsx";
import {
  MIN,
  TICK_MS,
  HATCH_DELAY,
  createNewPet,
  advancePet,
  moodOf,
  withNickname,
  loadPet,
  savePet,
  getSession,
  clearSession,
  now,
} from "./game.js";

const STAGE_LABEL = { egg: "Ei", baby: "Baby", child: "Kind", adult: "Erwachsen" };

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = noch nicht geprüft, null = ausgeloggt
  const [pet, setPet] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [flash, setFlash] = useState(null);
  const [message, setMessage] = useState("");
  const [editingNick, setEditingNick] = useState(false);
  const [nickDraft, setNickDraft] = useState("");
  const flashTimeout = useRef(null);
  const msgTimeout = useRef(null);

  // Beim Start prüfen, ob eine Session existiert.
  useEffect(() => {
    setUser(getSession() || null);
  }, []);

  // Kreatur für den eingeloggten Nutzer aus Supabase laden + Offline-Zeit nachholen.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const stored = await loadPet(user);
        if (cancelled) return;
        if (!stored) {
          // Nutzer existiert lokal (Session), aber nicht mehr in der Datenbank.
          clearSession();
          setUser(null);
          return;
        }
        const caught = advancePet(stored, now());
        setPet(caught);
        savePet(caught, user);
      } catch (err) {
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Spiel-Tick.
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      setPet((prev) => {
        if (!prev) return prev;
        const next = advancePet(prev, now());
        savePet(next, user);
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [user]);

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
      savePet(next, user);
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
        showMessage("Zu müde für ein Set …");
        savePet(synced, user);
        return synced;
      }
      const next = {
        ...synced,
        happiness: Math.min(100, synced.happiness + 25),
        energy: Math.max(0, synced.energy - 20),
        hunger: Math.max(0, synced.hunger - 8),
        asleep: false,
      };
      savePet(next, user);
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
    showMessage("Sauber sortiert!");
  };

  const toggleSleep = () => {
    withSyncedPet((p) => ({ ...p, asleep: !p.asleep }));
  };

  const restart = () => {
    const fresh = createNewPet();
    setPet(fresh);
    savePet(fresh, user);
    showMessage("Ein neues Ei wartet auf dich!");
  };

  const logout = () => {
    clearSession();
    setPet(null);
    setUser(null);
  };

  const startEditNick = () => {
    setNickDraft(pet?.nickname || "");
    setEditingNick(true);
  };

  const saveNick = (e) => {
    e.preventDefault();
    setPet((prev) => {
      if (!prev) return prev;
      const next = withNickname(prev, nickDraft);
      savePet(next, user);
      return next;
    });
    setEditingNick(false);
  };

  // Noch nicht geprüft, ob eine Session existiert.
  if (user === undefined) {
    return <div className="loading">Wird geladen …</div>;
  }

  // Nicht eingeloggt -> Login-Screen zeigen.
  if (!user) {
    return <Login onLoggedIn={(name) => setUser(name)} />;
  }

  if (loadError) {
    return <div className="loading">Verbindung fehlgeschlagen. Bitte Seite neu laden.</div>;
  }

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

  const stageLabel = STAGE_LABEL[pet.stage];

  return (
    <div className="tg-app">
      <div className="device">
        <div className="device-label">
          WAY TO BRETTANIEN
          <button className="logout-link" onClick={logout} aria-label="Ausloggen">
            {user} · Logout
          </button>
        </div>
        <div className="screen">
          <div className="screen-scanlines" />
          <div className="screen-top">
            <span className="stage-tag">{isDead ? "✝ RUHE" : stageLabel}</span>
            {pet.hatchedAt && !isEgg && <span className="age-tag">{ageLabel}</span>}
          </div>

          {!isEgg && pet.species && (
            <div className="species-row">
              <div className="species-name">{pet.species}</div>
              {editingNick ? (
                <form onSubmit={saveNick} className="nickname-form">
                  <input
                    type="text"
                    className="nickname-input"
                    value={nickDraft}
                    onChange={(e) => setNickDraft(e.target.value)}
                    placeholder="Spitzname"
                    maxLength={18}
                    autoFocus
                  />
                  <button type="submit" className="nickname-save" aria-label="Speichern">
                    ✓
                  </button>
                </form>
              ) : (
                !isDead && (
                  <button className="nickname-btn" onClick={startEditNick}>
                    {pet.nickname ? pet.nickname : "+ Spitzname vergeben"}
                  </button>
                )
              )}
              {isDead && pet.nickname && <div className="nickname-static">{pet.nickname}</div>}
            </div>
          )}

          <div className="creature-wrap">
            <Creature stage={isEgg ? "egg" : pet.stage} mood={mood} species={pet.species} />
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
              <Bar value={pet.hunger} icon="🎹" />
              <Bar value={pet.happiness} icon="💿" />
              <Bar value={pet.hygiene} icon="😮‍💨" />
              <Bar value={pet.energy} icon="🔄" />
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
              <button className="btn" onClick={feed} disabled={isEgg} aria-label="FL Studio Session">
                <span style={{ fontSize: "18px" }}>🎹</span>
                <span>FL Studio Session</span>
              </button>
              <button className="btn" onClick={play} disabled={isEgg} aria-label="Set auflegen">
                <span style={{ fontSize: "18px" }}>💿</span>
                <span>Set auflegen</span>
              </button>
              <button className="btn" onClick={clean} disabled={isEgg} aria-label="Tracklist sortieren">
                <span style={{ fontSize: "18px" }}>🔄</span>
                <span>Tracklist sortieren</span>
              </button>
              <button className="btn" onClick={toggleSleep} disabled={isEgg} aria-label="Losten">
                <span style={{ fontSize: "18px" }}>😮‍💨</span>
                <span>{pet.asleep ? "Wecken" : "Losten"}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
