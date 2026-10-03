# Containment // Mobile Side-Scroller POC

**Build: v4 combat responsiveness pass**

Landscape Android-first proof of concept using the supplied research-facility backdrop and generated Regina animation clips.

## Current controls

- **Left / Right**: move (keyboard: A/D or arrow keys)
- **AIM**: hold to raise the pistol (keyboard: Shift)
- **FIRE**: fires once the pistol is substantially raised (keyboard: Space). Early taps while AIM is held are buffered rather than discarded.

## Current animation pass

Three source clips have been processed into transparent, canonically registered sprite atlases:

- `regina-idle-right.webp` — 26-frame subtle breathing / standby loop
- `regina-jog-right.webp` — 12-frame looping jog cycle
- `regina-aim-raise-right.webp` — 19-frame pistol raise / sight-in transition
- `regina-aim-hold-right.webp` — registered aiming hold pose
- `regina-fire-right.webp` — **7-frame / 24 fps** single-shot cycle from the dedicated fast firing video (source frames 28–34), including muzzle flash, slide/recoil and brass

All Regina sprites are normalized to approximately **505 px character height** and **ground Y=565**. Idle/jog/aim use **360×640** cells; the firing atlas intentionally uses a wider **600×640** transparent cell so the muzzle flash remains inside the sprite without changing Regina's in-game scale.

The dedicated idle clip is now integrated. It loops from a self-matching section of the source so the breathing motion wraps cleanly without a visible pose jump.

## v4 combat responsiveness changes

- Aim raise shortened from **1.42 s to 0.52 s** while retaining all 19 transition poses.
- Aim lowering shortened from **0.72 s to 0.30 s**.
- Fire cycle shortened from ~**0.58 s to ~0.29 s**.
- New firing atlas uses the dedicated shooting clip rather than the old combined aim/fire clip.
- FIRE input is buffered while AIM is being raised and during recoil, so quick taps are not silently lost.
- A queued second semi-auto shot begins immediately after the current recoil/recovery cycle finishes, provided AIM remains held and ammunition remains.
- The firing atlas uses a wider transparent cell so the muzzle flash is not clipped while Regina's body remains anchored at the same world position.

## Local test

Serve the directory over HTTP rather than opening `index.html` directly, e.g.:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Rebuilding the sprite atlases

The canonical extractor now accepts all three source videos:

```bash
python3 tools/build_video_sprites.py \
  --idle /path/to/idle.mp4 \
  --jog /path/to/jog.mp4 \
  --aim /path/to/aim-fire.mp4 \
  --out assets/animation
```

The current idle loop uses source frames 172–222 at 12 fps; frame 224 was measured as a close visual match to frame 172 and is intentionally omitted so the loop wraps cleanly.

The dedicated firing atlas can be rebuilt separately with `tools/build_fast_fire.py --video <shooting.mp4> --out assets/animation/regina-fire-right.webp`.

## Windows: one-click play (no Python required)

1. Extract the ZIP fully.
2. Open the `dino-crisis-mobile-poc` folder.
3. Double-click `PLAY_GAME.bat`.
4. A PowerShell window will remain open and your default browser should open the game automatically on localhost.
5. Keep the PowerShell window open while playing. Press Ctrl+C in that window when finished.

The launcher uses Windows PowerShell/.NET only; Python and Node.js are not required.
