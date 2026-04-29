# Hood Hound 🐕

A 3D browser game for the [2026 Vibe Jam](https://x.com/levelsio/status/...). Biscuit, an O.G. hood dog, must complete missions on his block to win the heart of Cookie, the lady poodle of his dreams.

**Stack:** Single HTML file + Three.js r128 + embedded MP3 soundtrack.

---

## File Structure

```
hoodhound/
├── index.html       # The entire game (172KB)
├── soundtrack.mp3   # "Block Game Hustle" by juicedstreetwear (2MB)
└── README.md        # This file
```

To run locally: serve the folder over HTTP (Python `python3 -m http.server`, Node `npx serve`, etc.). Opening `index.html` directly with `file://` will fail because `fetch()` blocks local file access.

---

## Architecture Overview

The game is one giant `<script>` block wrapped in `try{...}catch{...}` with a red error overlay. Variable names are minified throughout (e.g. `S` for state, `ia` for interactables, `mBs` for mission boards) to keep file size down. Avoid `Object.assign()` on Three.js objects — it breaks their internal matrix system. Always use `.position.set(x,y,z)` and `.rotation.x = a` directly.

### Key Globals

| Variable | Purpose |
|----------|---------|
| `S` | Game state object (see below) |
| `dog`, `cookie` | Three.js groups for main characters |
| `ia[]` | Interactables (hydrants, trees, mission boards, trash cans, dumpsters, Cookie) |
| `bones[]` | Collectible bone meshes |
| `cats[]`, `npcs[]` | Animated NPCs |
| `mBs[]` | Mission board groups (5 total) |
| `M` | Material library |
| `aC`, `mG`, `muG`, `sG` | Audio context + master/music/SFX gain nodes |
| `particles[]` | Active particle meshes (auto-cleaned) |

### State Object (`S`)

```js
{
  bones, rep, heat,             // Player stats
  isSniffing, isJumping,         // Boolean flags
  speed, maxSpeed: 0.4,          // Movement
  accel: 0.02,
  dogAngle, cameraAngleH/V,      // Rotations
  velocityY, jumpY,              // Jump physics
  peeTimer,                      // Triggers leg-lift animation
  missionsCompleted, missionsRequired: 3,
  cookieWooed, gameWon,
  shakeAmount, shakeTime,        // Screen shake
  slowMo, slowMoTime,            // Slow motion factor
  tutorialShown, tutorialIdleTime,
  cookieReadyShown               // One-shot overlay flag
}
```

---

## Core Systems

### Audio (mobile-first)

The soundtrack uses **Web Audio API**, not HTML `<audio>` element. This is critical for mobile autoplay reliability — bark SFX unlocks the AudioContext, and the music piggybacks on the same unlock.

Flow:
1. On page load, `preWarm()` creates the AudioContext (suspended on iOS) and starts decoding the MP3 in the background via `fetch() → arrayBuffer → decodeAudioData → AudioBuffer`
2. On first user touch (`touchend`/`click`/`keydown`), `startGame()` runs which calls `iA()` to resume the context, then `startMusic()` → `playMusicBuffer()`
3. `playMusicBuffer()` calls `aC.resume()` and creates a looping `BufferSource`. iOS schedules `start(0)` to fire the moment the context becomes "running"

⚠️ Don't change the music handlers to `touchstart` — iOS doesn't accept `touchstart` as an audio-unlocking gesture.

### Mission Boards

5 mission boards, each with a unique color:
- 🔴 Trash Heist (`0xff3366`) at `(-30, 8)`
- 🟡 Bone Rush (`0xffcc22`) at `(35, -8)`
- 🔵 Cat Burglar (`0x44ddff`) at `(-60, -50)`
- 🟢 Turf War (`0x00ff66`) at `(-55, -8)`
- 🟣 Dumpster Dive (`0xff66ff`) at `(22, -42)`

Each has a 30m tall transparent light pillar, a billboarded text sign (canvas-rendered), an orb, a rotating ring, and a point light.

### Cookie (Win Condition)

Located at `(-60, 42)` on a heart-shaped pink platform. After completing 3 missions, walk up and press E. Triggers:
- 5 staggered particle bursts (totaling 270 particles)
- 1.2s slow-mo at 0.25× speed
- 5 escalating screen shakes
- Triple mission-complete sound effect
- Full-screen "YOU WIN" overlay with stats

### Particles

Single global function: `burst(x, y, z, colors[], count, spread, speed)`. Particles are icosahedrons with gravity + ground bounce. They self-remove after their `life` (0.8-1.3s) expires. `updateParticles(dt)` runs every frame.

### Screen Shake & Slow Motion

```js
shake(0.3, 0.4);          // amount, duration in seconds
slowMo(0.25, 1.2);        // factor (1=normal), duration
```

Shake is applied as random offset to camera position after the lerp. Slow-mo multiplies `dt` before everything (physics, animations, particles) so the whole world slows down.

### Camera

Two modes blend automatically:
- **Auto-follow**: When moving and not dragging, camera lerps to align behind dog (`dogAngle`) at 2% per frame
- **Manual drag**: Mouse drag (desktop) or right-half-screen touch drag (mobile, identifier-tracked so joystick works simultaneously). UI elements are excluded by `isUIElement()` check

Vertical tilt clamped `[0.1, 1.2]`. Distance is `7.5` units.

### Tutorial

After 8 seconds without completing a mission, shows a centered "FIND A MISSION!" toast for 6 seconds. A glowing arrow continuously points to the nearest mission board until the first mission is completed (visible whether the board is on-screen or off-screen).

---

## Controls

| Input | Action |
|-------|--------|
| WASD / Joystick | Move |
| SPACE | Jump |
| B / F | Bark (scares cats, +1 to cat mission) |
| Q | Sniff (bones glow) |
| E | Interact (mission boards, hydrants, trees, trash, dumpsters, Cookie) |
| G | Fart |
| H | Poop |
| Shift | Sprint |
| Mouse drag / Touch right side | Camera rotate |

---

## Vibe Jam Compliance

- ✅ Vibe Jam widget at bottom of `<body>`: `<script async src="https://vibej.am/2026/widget.js"></script>`
- ✅ No login required
- ✅ Web accessible (single HTML)
- ⏳ Needs to be deployed to its own domain — recommend [Bolt.new](https://bolt.new) deployment for `hoodhound.bolt.new`-style URL
- ⏳ Confirm 90%+ AI-generated code claim

---

## Deployment Steps

1. Create new project on [Bolt.new](https://bolt.new) or [Fly.io](https://fly.io) or your hosting
2. Upload both `index.html` and `soundtrack.mp3` to the same directory
3. Test on mobile + desktop
4. Submit URL to vibejam2026.com (or wherever submissions are accepted)

---

## Polish Wishlist (Cursor work)

✅ Done in this version:
- Screen shake on bark / trash / dumpster / jump landing
- Particle bursts on cat scare / bone collect / mission complete
- Camera shake + slow-mo on Cookie win
- First-mission tutorial with on-screen arrow
- "Cookie is Ready!" overlay when 3/3 missions completed

🎯 Ideas for further polish:
- Speech bubbles above NPCs ("Get off my lawn!")
- Day/night cycle (very slow sun rotation)
- Wet paw prints behind Biscuit after peeing
- Trail of hearts behind Cookie when she's ready
- Better dog model (current one is functional but boxy)
- Mission timer urgency: faster heartbeat sound when timer < 5s
- Save/load high score to localStorage (`bones`, `rep`, `missions`)
- Photo mode (press P to hide UI for screenshots)
- Konami code easter egg

---

## Performance Notes

- ~60 trees + 30 bushes + 6 cars + 5 mission boards + 16 palms + ~200 ground props = roughly 350 meshes
- All materials use flat shading where possible to avoid expensive smooth shading
- Shadows enabled only on important objects (dog, cars, palms, trees)
- On low-end mobile, consider: reducing tree count, disabling shadows, lowering fog density
- Web Audio buffer source for music = ~12MB RAM (decoded from 2MB MP3)

---

## Credits

- **Concept & Direction:** [Your name]
- **Code:** Claude (Anthropic) + [Your name] in Cursor
- **Soundtrack:** "Block Game Hustle" — juicedstreetwear
- **Engine:** Three.js r128
- **Studio:** JUICED 🧃
