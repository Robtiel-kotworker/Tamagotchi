// Prozedural erzeugte Pixel-Silhouetten der Kreatur, plus kleine
// handgezeichnete 5x5-Icons für die Buttons.

export const GRID = 13;
export const CENTER = 6;

function ellipseBody(rx, ry, cx, cy) {
  const cells = new Set();
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const dx = (c - cx) / rx;
      const dy = (r - cy) / ry;
      if (dx * dx + dy * dy <= 1) cells.add(`${r},${c}`);
    }
  }
  return cells;
}

/** Liefert Körper-Pixel plus Referenzmaße für eine Entwicklungsstufe. */
export function bodyFor(stage) {
  let rx, ry, cy;
  let extras = [];

  if (stage === "egg") {
    rx = 3.4;
    ry = 4.6;
    cy = CENTER;
  } else if (stage === "baby") {
    rx = 2.8;
    ry = 2.8;
    cy = CENTER + 1;
    extras = [`${cy - 3},${CENTER - 2}`, `${cy - 3},${CENTER + 2}`];
  } else if (stage === "child") {
    rx = 3.8;
    ry = 3.4;
    cy = CENTER + 1;
    extras = [
      `${cy - 4},${CENTER - 3}`,
      `${cy - 3},${CENTER - 4}`,
      `${cy - 4},${CENTER + 3}`,
      `${cy - 3},${CENTER + 4}`,
      `${cy + 4},${CENTER - 3}`,
      `${cy + 4},${CENTER + 3}`,
    ];
  } else {
    rx = 4.6;
    ry = 3.7;
    cy = CENTER + 1;
    extras = [
      `${cy - 4},${CENTER - 4}`,
      `${cy - 5},${CENTER - 3}`,
      `${cy - 4},${CENTER + 4}`,
      `${cy - 5},${CENTER + 3}`,
      `${cy + 4},${CENTER - 4}`,
      `${cy + 4},${CENTER + 4}`,
      `${cy + 4},${CENTER - 2}`,
      `${cy + 4},${CENTER + 2}`,
    ];
  }

  const cells = ellipseBody(rx, ry, CENTER, cy);
  extras.forEach((e) => cells.add(e));
  return { cells, rx, ry, cy };
}

// 5x5 Icons für die Bedienknöpfe.
export const BUTTON_ICONS = {
  food: ["01110", "11111", "11111", "11111", "01110"],
  play: ["01110", "11111", "10101", "11111", "01110"],
  clean: ["00100", "01110", "11111", "01110", "00100"],
  sleep: ["00110", "01100", "11000", "01100", "00110"],
};
