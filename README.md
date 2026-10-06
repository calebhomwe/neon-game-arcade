# Neon Game Arcade

Browser games: the neon cabinets in `games/` (Neon Dash, Critter Rush, Critter Rush 2D, Dominion, Living World, Bridge Race, Tidebreak, ...) and the Skywalker sky-* playables in `games/skywalker-playables/`. They are also listed in [Caleb's Arcade](https://calebhomwe.github.io/arcade/).

## Play / Test

- **Play online:** https://calebhomwe.github.io/neon-game-arcade/ (deployed from `master` by the `Deploy to GitHub Pages` workflow; only `index.html` and `games/` are published)
- **Run locally:** `python3 -m http.server 8080`, then open http://localhost:8080/
- **Smoke test** (loads the hub and every game page in headless Chromium, fails on page errors or missing files; the `Smoke` workflow runs it on every push and PR):

  ```sh
  npm install --no-save --no-package-lock playwright@1.58.2 && npx playwright install chromium
  python3 -m http.server 8080 &
  node .github/smoke.mjs http://127.0.0.1:8080/ index.html games/*.html games/*/index.html games/skywalker-playables/*.html
  ```

`games.html`, `games-arcade.html`, `bridge-race.html` and `dashboard.html` are standalone pages that are not published; `skywalker-studio/`, `research/` and `WORKFLOW_GUIDE.md` are notes and a second, unlinked copy of the games.
