# Pete Scorecard (trial)

A side build of Punk Head Pete’s group golf scorecard. It is **not** the live app at [scores.punkheadpete.com](https://scores.punkheadpete.com) and does not share data with it.

Hosted trial: [https://stevecampbell23.github.io/pete-scorecard-trial/](https://stevecampbell23.github.io/pete-scorecard-trial/)

This GitHub repo is **`stevecampbell23/pete-scorecard-trial`**. It is not `stevecampbell23/pete-scorecard` (the live scores.punkheadpete.com app). Do not merge or deploy this onto that repo.

## Run

```bash
npm install
npm test
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

## What is different on purpose

- Scores stay empty until you tap **+/−** or **Next hole**. Jumping holes does not write par, so **Thru N** matches holes you actually recorded.
- The current player’s season is **Your 2026**, never “You’s”.
- Skins, Nassau (3–3–3 on nine holes), stroke play, and snowman pays live in `src/engine/games.ts` with tests.
- Handicap is labeled as an estimate, not an official World Handicap System index.
- Data is stored in this browser only (`peteScorecard.trial.v1`). Backup/restore will not write to the production site.

## Brand

Uses the Punk Head Pete script font and portrait that already live on this Mac. The trial badge in the header is there so nobody confuses it with the live scorecard.
