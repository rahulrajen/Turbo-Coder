# Turbo Coder 🏁

A car-themed coding adventure for beginners (age ~9): 250 levels across 10 story worlds (30 each in worlds 1-5, 20 each in worlds 6-10), in blocks or real JavaScript.

## Run it

Node is portable in `.tools/` (no admin install). From this folder in PowerShell:

```powershell
$env:Path = "$PWD\.tools\node-v24.11.0-win-x64;$env:Path"
npm run dev
```

Open the printed URL. `--host` is on, so a tablet or phone on the same Wi-Fi can open the `Network:` address.

- `npm run verify` proves all 250 levels are solvable (as blocks and as generated code) and that the bug-fix levels start broken.
- `npm run build` makes a static `dist/` folder.

Progress (XP, coins, stars, badges, garage) and unfinished programs are saved in the browser's localStorage. Reset it under "Me".

## Deploy (Vercel)

It's a static Vite app, so Vercel needs no config. Import the GitHub repo in Vercel and keep the detected defaults:

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`

Every push to the main branch redeploys. Progress is per browser and per device, because it lives in localStorage.

## How it plays

- **Switch any time:** every level has a Blocks / Code toggle. Blocks turn into real JavaScript ("See my blocks as real code"). The preference is saved.
- **All levels open:** jump anywhere from the map or the 🗂️ Levels button. The glowing bubble is the suggested next stop.
- **Stars:** 1 = finished. 2 = decent solution. 3 = at or under par AND used the idea the level teaches.
- **Perfect Run:** win on your first try with 3 stars for bonus XP and coins plus a 👑 on the level.
- **Hints** unlock after 5 failed tries. The 📘 Code Corner (the world's lesson card) is always available.

## The 10 worlds

| # | World | Teaches |
|---|-------|---------|
| 1 | Garage Town | commands, order |
| 2 | Loop City | loops, nested loops |
| 3 | Sandy Desert | if / else, while, sensors |
| 4 | Cone Jungle | and / or / not, comparisons |
| 5 | Number Mountain | variables, math |
| 6 | Function Factory | functions |
| 7 | Parameter Port | parameters |
| 8 | List Lagoon | lists, objects, for…of |
| 9 | Gate Galaxy | strings, say(), events |
| 10 | Glitch's Castle | debugging, recursion |

## Add or change a level

Levels live in `src/game/levels.ts`. Each one is a route (`[3, 'R', 2]` = drive 3, turn right, drive 2), a story line, a hint and a reference solution written with the helpers in `src/game/dsl.ts`. Par and the generated code come from the reference solution. Run `npm run verify` after editing.

- `lv(...)` are the original 100 levels, keyed by their old numbers so older saves can follow them.
- `nl(world, after, ...)` adds a level to a world, right after original level `after` (0 = start of the world). Level numbers are assigned automatically in order.

## Rules that keep levels fair

In `src/game/rules.ts`:

- **Must use:** each level lists the idea it teaches (`use` in `levels.ts`). Reaching the flag without really using it (an empty Repeat, a box nobody reads, a function nobody calls) doesn't finish the level.
- **Block limit:** a limit on blocks (`blockLimit`) and typed lines (`lineLimit`), so a long chain of Drive blocks can't replace a loop. Fun blocks (Horn, Spin, Jump, Dance, Party lights, Sing) are free and never count. There are two modes, switched on any level or in My profile:
  - **🏎️ Normal** (default): par + about half (at least 3 extra).
  - **🐣 Easy**: double par (at least 6 extra).

`npm run verify` also proves every solution uses only the blocks its level offers and fits under the limit.

## Help screens

`src/components/Guide.tsx` has the per-level **📖 Block Help** and the **📚 How to Play** guide on the Map. Each block's description and moving example live in `BLOCK_GUIDE`.

## Rewards

All reward numbers live in `REWARDS` in `src/game/progress.ts`: first win, stars, track coins, Perfect Run, boss, daily first win (grows with the streak), finishing a world, and coins for each new badge. Driver levels need a little more XP each time (`xpToNext`).

## Code map

- `src/game/ast.ts`: block program format, JavaScript generator, par counting
- `src/game/interpret.ts`: runs block programs
- `src/game/engine.ts`: the car, sensors, signs, gates
- `src/game/textRunner.worker.ts`: runs typed code in a worker (infinite loops are stopped)
- `src/game/progress.ts`: XP, coins, badges, shop, perfect-run rules, moving old saves to the 250-level layout
- `src/game/cars.ts` + `src/components/CarSvg.tsx`: the 16 cars and everything you can put on them
- `src/game/drafts.ts`: unfinished programs and failed-try counts per level
