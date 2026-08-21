# 🐣 Tama・Pet

Ein Tamagotchi-artiges virtuelles Haustier als Web-App. Ein Ei schlüpft, wächst über Baby → Kind → Erwachsen, und will gefüttert, bespielt , sauber gehalten und schlafen gelegt werden. Die Kreatur wird vollständig prozedural als Pixelgrafik gerendert, der Zustand bleibt über `localStorage` auch nach dem Schließen des Tabs erhalten — inklusive Fortschritt, der währenddessen "offline" vergangen ist. 

![Stack](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Stack](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)

## Features

- 🥚 **Entwicklung**: Ei → Baby → Kind → Erwachsen, zeitbasiert
- 🍖 **4 Bedürfnisse**: Hunger, Freude, Energie, Hygiene, die über Zeit sinken
- 💩 **Verschmutzung**: gelegentliche Häufchen, die geputzt werden müssen
- 💀 **Ableben**: bei anhaltender Vernachlässigung sinkt die Gesundheit auf 0 — danach kann ein neues Ei gestartet werden
- ⏳ **Offline-Fortschritt**: Zeit, die seit dem letzten Besuch vergangen ist, wird beim Laden nachgeholt
- 🎨 **Prozedurale Pixel-Kreatur**: Körperform wird pro Entwicklungsstufe berechnet (kein Sprite-Sheet nötig), Mimik wechselt je nach Stimmung
- 💾 **Persistenz**: automatisches Speichern in `localStorage`

## Schnellstart

Die App speichert die Kreaturen nutzernamenbasiert in Supabase (Tabelle `pets`). Damit der Login funktioniert, wird zuerst eine `.env`-Datei mit den Supabase-Zugangsdaten benötigt:

```bash
cp .env.example .env
# dann VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY in .env eintragen
```

Beide Werte findest du im Supabase-Dashboard des Projekts unter „Project Settings → API". Ohne diese Datei schlägt jeder Login-/Registrierungsversuch fehl, da der Supabase-Client sonst ohne gültige URL/Key erstellt wird.

```bash
npm install
npm run dev
```

Die App läuft danach unter `http://localhost:5173`.

Für einen Produktions-Build:

```bash
npm run build
npm run preview
```

## Projektstruktur

```
tamagotchi-app/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx        # React-Einstiegspunkt
    ├── App.jsx          # State-Management & Aktionen (füttern, spielen, putzen, schlafen)
    ├── game.js           # Reine Spiellogik (Zerfall, Entwicklung, Speichern/Laden) – UI-unabhängig
    ├── sprites.js        # Prozedurale Pixel-Silhouetten & Button-Icons
    ├── Creature.jsx      # Darstellung der Kreatur, Stat-Balken, Mini-Icons
    └── index.css         # Sämtliche Styles
```

`game.js` enthält bewusst keine React- oder DOM-Abhängigkeiten, damit die Spielregeln isoliert nachvollziehbar und testbar sind.

## Spielmechanik im Detail

| Wert | Verhalten |
|---|---|
| Hunger / Hygiene / Energie / Freude | sinken kontinuierlich, langsamer im Schlaf; Energie regeneriert sich im Schlaf |
| Gesundheit | sinkt, wenn ein Wert kritisch niedrig ist; erholt sich, wenn alle Werte gut sind |
| Ei → Baby | nach 2 Minuten |
| Baby → Kind | nach 30 Minuten Alter |
| Kind → Erwachsen | nach 2 Stunden Alter |

Diese Zeiten sind bewusst kurz gehalten, damit man den Kreislauf zügig miterlebt. Zum Anpassen: die Konstanten `HATCH_DELAY`, `CHILD_AGE`, `ADULT_AGE` sowie die Zerfallsraten in `src/game.js`.

## Lizenz

MIT
