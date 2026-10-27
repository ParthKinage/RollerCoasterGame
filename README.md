# Roller Coaster Rush

A 3D roller coaster game for the browser: ride four themed parks, build and test your own coasters, and customise your train.

Built with React, Vite, TypeScript, Three.js (React Three Fiber and Drei), Tailwind CSS and Zustand. All scenery, sounds and music are procedural, so the game runs offline with no asset downloads.

## Run

```bash
npm install
npm run dev
```

Then open http://localhost:5173. `npm run build` makes a production bundle in `dist/`. `npm run sim` simulates every level and prints its speed, G-force and validation results.

## Controls (ride)

| Action | Keyboard | Touch |
| --- | --- | --- |
| Hands up (earn thrill points) | Space (hold) | Hands Up button |
| Boost | W / ↑ / Shift | Boost button |
| Brake | S / ↓ | Brake button |
| Look around | Drag mouse | Drag |
| Switch camera | C | Camera button |
| Pause / resume | Esc / P | Pause button |

**Scoring:** you get 1 star for finishing a ride. Hold your hands up on fast sections and during airtime (worth double) to earn up to 2 more stars, but keep them down when the G-force passes about 4.2 G, or you lose points. Finishing a level unlocks the next one.

## Code map

- `src/track`: segment-to-spline generator (`generator.ts`), arc-length sampled `TrackPath` and the builder's validation (`validate.ts`)
- `src/physics`: gravity, friction, drag, chain lift, booster and brake physics, plus G-force estimation
- `src/game`: level definitions, segment presets and `RideSession` (countdown, scoring, stats)
- `src/scene`: track mesh (rails, spine, instanced ties and supports), train, camera rig, effects, and procedural environments in `environments/`
- `src/screens`, `src/ui`: menus, HUD, level select, builder, customisation and settings
- `src/audio`: Web Audio synthesis for wheels, the lift chain, wind, crowd, UI sounds and music
- `src/store`: game state; settings, progress, train colour and custom track are saved to localStorage
