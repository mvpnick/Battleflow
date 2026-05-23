# Battleflow

**See only what matters for the phase you're in.**

Battleflow is a mobile-first companion for tabletop wargames. Pick your current game phase—Command, Movement, Shooting, Charge, Fight, or Battleshock—and get a scannable reference of every weapon profile, ability, stratagem, and reminder on your roster that applies *right now*, grouped by unit.

No hunting through PDFs or flipping pages mid-turn.

## What you get

- **Phase-first navigation** — Tap the phase you're playing; everything else stays out of the way.
- **Roster at a glance** — Units, weapons, rules, and stratagems for that phase in one dense, readable layout.
- **Quick details** — Tap any row to open a bottom sheet with full stats, timing, conditions, and modifiers without leaving the phase view.
- **Built for the table** — Dark UI, large tap targets, and sticky phase controls so you can use it one-handed between moves.

## What Battleflow is not

Battleflow is a **reference sheet**, not a game engine. It does not track model positions, wounds, movement, or dice. It helps you remember what your army *can do* in the current phase—not simulate the battle.

## How to use it

1. Open your roster (sample roster included for now).
2. Select the **active phase** along the top (CMD → MOV → SHO → CHG → FGT → BSK).
3. Scan the summary strip for counts, then scroll unit cards for everything relevant.
4. **Tap any item** to read full rules, keywords, CP cost, and conditions in the detail drawer.
5. Change phase anytime; the list updates to match.

## Try it

**Local development**

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then choose **View Sample Roster**.

## Status

Early preview: sample data and UI only. Importing your own army lists and live CP tracking are planned.

## Feedback

Issues and ideas welcome on [GitHub](https://github.com/mvpnick/Battleflow/issues).

---

*Developers: see [`design-reference/README.md`](design-reference/README.md) for UI specs and component handoff notes.*
