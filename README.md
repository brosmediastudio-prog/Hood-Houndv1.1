# Hood Hound

A single-page Three.js browser game. The playable app lives in `files/index.html`, with all game assets stored beside it in `files/`.

## Run Locally

```bash
npm install
npm run dev
```

Vite serves the `files/` directory as the app root so model, image, and audio paths resolve the same way they will in production.

## Build For Bolt

```bash
npm run build
npm run preview
```

The production build is written to `dist/`. The build also copies runtime-loaded game assets from `files/` into both `dist/` and `dist/files/` so `.glb`, image, and audio paths work after deployment. On Bolt, import the Git repo and use:

- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

## Asset Path Rule

Keep new `.glb`, `.png`, `.jpg`, and audio files inside `files/`. In `files/index.html`, reference them by filename first, for example `hotdog_vendor.glb`, and only keep `files/...` as a compatibility fallback when needed.
