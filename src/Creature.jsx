import React from "react";
import { GRID, CENTER, bodyFor, BUTTON_ICONS } from "./sprites.js";

const SPECIES_SLUG = {
  "Hardtekk-Mutant": "hardtekk",
  "Industrial-Zombie": "industrial",
  "Psy-Trance-Dämon": "psytrance",
  "Gabber-Bastard": "gabber",
};

export function MiniIcon({ kind, className }) {
  const grid = BUTTON_ICONS[kind];
  return (
    <div className={`mini-icon ${className || ""}`}>
      {grid.map((row, r) =>
        row
          .split("")
          .map((ch, c) => (
            <span key={`${r}-${c}`} className={ch === "1" ? "mi-on" : "mi-off"} />
          ))
      )}
    </div>
  );
}

export function Creature({ stage, mood, species }) {
  const { cells, rx, ry, cy, scoreline } = bodyFor(stage);
  const eyeRow = Math.round(cy - ry * 0.35);
  const eyeColL = Math.round(CENTER - rx * 0.42);
  const eyeColR = Math.round(CENTER + rx * 0.42);
  const mouthRow = Math.round(cy + ry * 0.35);
  const showFace = stage !== "egg";

  const cellClass = (r, c) => {
    const key = `${r},${c}`;
    if (!cells.has(key)) return "px off";
    if (scoreline && scoreline.has(key)) return "px on scoreline";

    if (showFace && mood !== "dead") {
      if (r === eyeRow && (c === eyeColL || c === eyeColR)) {
        if (mood === "sleeping") return "px eye eye-sleep";
        if (mood === "sad" || mood === "sick") return "px eye eye-sad";
        if (mood === "happy") return "px eye eye-happy";
        return "px eye eye-neutral";
      }
      if (r === mouthRow && c === CENTER) {
        if (mood === "happy" || mood === "eating") return "px mouth mouth-happy";
        if (mood === "sad" || mood === "sick") return "px mouth mouth-sad";
      }
    }
    if (mood === "dead" && r === eyeRow && (c === eyeColL || c === eyeColR)) {
      return "px eye eye-dead";
    }
    return "px on";
  };

  const speciesSlug = mood !== "dead" && species ? SPECIES_SLUG[species] : null;
  const speciesClass = speciesSlug ? `species-${speciesSlug}` : "";

  return (
    <div className={`creature-grid mood-${mood} ${speciesClass}`}>
      {Array.from({ length: GRID }).map((_, r) =>
        Array.from({ length: GRID }).map((_, c) => (
          <span key={`${r}-${c}`} className={cellClass(r, c)} />
        ))
      )}
    </div>
  );
}

export function Bar({ value, icon }) {
  const segments = 8;
  const filled = Math.round((value / 100) * segments);
  return (
    <div className="bar-row">
      <span className="bar-icon">{icon}</span>
      <div className="bar-track">
        {Array.from({ length: segments }).map((_, i) => (
          <span
            key={i}
            className={`bar-seg ${i < filled ? "filled" : ""} ${value < 25 ? "low" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
