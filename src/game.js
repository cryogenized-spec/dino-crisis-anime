(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const ATLAS_PARTS = [
    'assets/atlas/part-00.b64','assets/atlas/part-01.b64','assets/atlas/part-02.b64','assets/atlas/part-03.b64'
    'assets/atlas/part-04.b64','assets/atlas/part-05.b64','assets/atlas/part-06.b64','assets/atlas/part-07.b64'
    'assets/atlas/part-08.b64','assets/atlas/part-09.b64','assets/atlas/part-10.b64','assets/atlas/part-11.b64'
    'assets/atlas/part-12.b64','assets/atlas/part-13.b64','assets/atlas/part-14.b64','assets/atlas/part-15.b64'
    'assets/atlas/part-16.b64','assets/atlas/part-17.b64','assets/atlas/part-18.b64','assets/atlas/part-19.b64'
    'assets/atlas/part-20.b64','assets/atlas/part-21.b64','assets/atlas/part-22.b64','assets/atlas/part-23.b64'
    'assets/atlas/part-24.b64','assets/atlas/part-25.b64','assets/atlas/part-26.b64','assets/atlas/part-27.b64'
    'assets/atlas/part-28.b64','assets/atlas/part-29.b64','assets/atlas/part-30.b64','assets/atlas/part-31.b64'
    'assets/atlas/part-32.b64','assets/atlas/part-33.b64'
  ];

  const atlas = new Image();
  let atlasReady = false;
  let atlasError = null;

  async function loadPackedAtlas() {
    try {
      const chunks = await Promise.all(ATLAS_PARTS.map(async url => {
        const response = await fetch(url, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`Atlas part failed: ${url} (${response.status})`);
        return (await response.text()).trim();
      }));
      const raw = atob(chunks.join(''));
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      const objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }));
      atlas.onload = () => {
        atlasReady = true;
        URL.revokeObjectURL(objectUrl);
      };
      atlas.onerror = () => {
        atlasError = new Error('Packed sprite atlas could not be decoded.');
        URL.revokeObjectURL(objectUrl);
      };
      atlas.src = objectUrl;
    } catch (error) {
      atlasError = error;
      console.error(error);
    }
  }
  loadPackedAtlas();

  const ATLAS = {
    background: { x: 0, y: 0, w: 640, h: 360 },
  };

  const META = {
    idle: { frames: 26, cols: 4, cellW: 90, cellH: 160, fps: 12, sheetY: 360 },
    jog: { frames: 12, cols: 4, cellW: 90, cellH: 160, fps: 12, sheetY: 1480 },
    aimRaise: { frames: 19, cols: 4, cellW: 90, cellH: 160, fps: 12, sheetY: 1960 },
    aimHold: { frames: 1, cols: 4, cellW: 90, cellH: 160, fps: 1, sheetY: 2760 },
    fire: { frames: 7, cols: 4, cellW: 150, cellH: 160, fps: 24, sheetY: 2920 },
  };

  const input = { left: false, right: false, aim: false };
  const state = {
    last: performance.now(),
    elapsed: 0,
    x: 0.235,
    facing: 1,
    speed: 0,
    targetSpeed: 0,
    runClock: 0,
    idleClock: 0,
    aimProgress: 0,
    fireTime: -1,
    fireQueued: false,
    ammo: 17,
    radioShown: false,
    radioTimer: 0,
  };

  const WORLD = { minX: 0.075, maxX: 0.91, groundY: 0.885 };
  const PLAYER = {
    speed: 0.19,
    accel: 1.8,
    brake: 2.9,
    spriteCellHeight: 0.595,
    spriteGroundRatio: 565 / 640,
  };

  const radio = document.getElementById('radio');
  const ammoEl = document.querySelector('.hud-block.ammo strong');
  const fireButton = document.getElementById('fire');

  function updateAmmo() {
    ammoEl.innerHTML = `${state.ammo} <small>/ 51</small>`;
  }
  updateAmmo();

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

  function bindHold(id, key) {
    const el = document.getElementById(id);
    const set = (value, ev) => {
      if (ev) ev.preventDefault();
      input[key] = value;
      el.classList.toggle('active', value);
      if (value && el.setPointerCapture && ev?.pointerId != null) {
        try { el.setPointerCapture(ev.pointerId); } catch (_) {}
      }
    };
    el.addEventListener('pointerdown', e => set(true, e));
    el.addEventListener('pointerup', e => set(false, e));
    el.addEventListener('pointercancel', e => set(false, e));
    el.addEventListener('lostpointercapture', e => set(false, e));
  }

  bindHold('left', 'left');
  bindHold('right', 'right');
  bindHold('aim', 'aim');

  function startFire() {
    if (state.fireTime >= 0 || state.ammo <= 0) return false;
    state.fireTime = 0;
    state.fireQueued = false;
    state.ammo -= 1;
    updateAmmo();
    fireButton.classList.add('active');
    setTimeout(() => fireButton.classList.remove('active'), 70);
    return true;
  }

  function tryFire(ev) {
    if (ev) ev.preventDefault();
    if (state.ammo <= 0) return;

    if (state.fireTime >= 0) {
      if (input.aim) state.fireQueued = true;
      return;
    }
    if (state.aimProgress >= 0.94) {
      startFire();
      return;
    }
    if (input.aim) state.fireQueued = true;
  }

  fireButton.addEventListener('pointerdown', tryFire);

  addEventListener('keydown', e => {
    if (['ArrowLeft','ArrowRight','KeyA','KeyD','ShiftLeft','ShiftRight','Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.aim = true;
    if (e.code === 'Space' && !e.repeat) tryFire(e);
  }, { passive: false });

  addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.aim = false;
  });

  function coverRect(imgW, imgH, viewW, viewH) {
    const scale = Math.max(viewW / imgW, viewH / imgH);
    const w = imgW * scale;
    const h = imgH * scale;
    return { x: (viewW - w) * 0.5, y: (viewH - h) * 0.5, w, h };
  }

  function update(dt) {
    const canMove = state.aimProgress < 0.04 && state.fireTime < 0;
    const dir = canMove ? ((input.right ? 1 : 0) - (input.left ? 1 : 0)) : 0;
    state.targetSpeed = dir * PLAYER.speed;
    const rate = dir ? PLAYER.accel : PLAYER.brake;
    const delta = state.targetSpeed - state.speed;
    const step = Math.sign(delta) * Math.min(Math.abs(delta), rate * dt);
    state.speed += step;
    state.x = Math.max(WORLD.minX, Math.min(WORLD.maxX, state.x + state.speed * dt));
    if (Math.abs(state.speed) > 0.004) state.facing = Math.sign(state.speed);

    const speedRatio = Math.min(1, Math.abs(state.speed) / PLAYER.speed);
    state.runClock += dt * Math.max(0.15, speedRatio);
    if (Math.abs(state.speed) <= 0.015 && state.aimProgress <= 0.005 && state.fireTime < 0) {
      state.idleClock += dt;
    } else {
      state.idleClock = 0;
    }

    const aimInSeconds = 0.52;
    const aimOutSeconds = 0.30;
    if (input.aim || state.fireTime >= 0) {
      state.aimProgress = Math.min(1, state.aimProgress + dt / aimInSeconds);
    } else {
      state.aimProgress = Math.max(0, state.aimProgress - dt / aimOutSeconds);
    }

    if (!input.aim && state.fireTime < 0) state.fireQueued = false;

    if (state.fireTime >= 0) {
      state.fireTime += dt;
      const duration = META.fire.frames / META.fire.fps;
      if (state.fireTime >= duration) {
        state.fireTime = -1;
        if (state.fireQueued && input.aim && state.ammo > 0) startFire();
      }
    } else if (state.fireQueued && input.aim && state.aimProgress >= 0.94) {
      startFire();
    }

    if (!state.radioShown && state.x > 0.52) {
      state.radioShown = true;
      state.radioTimer = 4.2;
      radio.classList.remove('hidden');
    }
    if (state.radioTimer > 0) {
      state.radioTimer -= dt;
      if (state.radioTimer <= 0) radio.classList.add('hidden');
    }
  }

  function drawBackground(w, h) {
    const b = ATLAS.background;
    const r = coverRect(b.w, b.h, w, h);
    const panRange = Math.max(0, r.w - w);
    const pan = (state.x - WORLD.minX) / (WORLD.maxX - WORLD.minX);
    const camX = panRange ? -pan * panRange : 0;
    ctx.drawImage(atlas, b.x, b.y, b.w, b.h, r.x + camX, r.y, r.w, r.h);

    const grad = ctx.createLinearGradient(0, h * .55, 0, h);
    grad.addColorStop(0, 'rgba(2,5,8,0)');
    grad.addColorStop(1, 'rgba(2,5,8,.34)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  function drawSheetFrame(meta, frameIndex, dx, dy, dw, dh) {
    const f = Math.max(0, Math.min(meta.frames - 1, frameIndex | 0));
    const sx = (f % meta.cols) * meta.cellW;
    const sy = meta.sheetY + Math.floor(f / meta.cols) * meta.cellH;
    ctx.drawImage(atlas, sx, sy, meta.cellW, meta.cellH, dx, dy, dw, dh);
  }

  function chooseAnimation() {
    if (state.fireTime >= 0) {
      return {
        key: 'fire',
        frame: Math.min(META.fire.frames - 1, Math.floor(state.fireTime * META.fire.fps)),
      };
    }

    if (state.aimProgress > 0.005) {
      if (state.aimProgress >= 0.995 && input.aim) return { key: 'aimHold', frame: 0 };
      return {
        key: 'aimRaise',
        frame: Math.round(state.aimProgress * (META.aimRaise.frames - 1)),
      };
    }

    const moving = Math.abs(state.speed) > 0.015;
    if (moving) {
      return {
        key: 'jog',
        frame: Math.floor(state.runClock * META.jog.fps) % META.jog.frames,
      };
    }

    return {
      key: 'idle',
      frame: Math.floor(state.idleClock * META.idle.fps) % META.idle.frames,
    };
  }

  function drawPlayer(w, h) {
    const anim = chooseAnimation();
    const meta = META[anim.key];

    const drawH = h * PLAYER.spriteCellHeight;
    const drawW = drawH * (meta.cellW / meta.cellH);
    const px = state.x * w;
    const py = WORLD.groundY * h;
    const topY = -drawH * PLAYER.spriteGroundRatio;

    ctx.save();
    ctx.translate(px, py);
    if (state.facing < 0) ctx.scale(-1, 1);

    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.beginPath();
    ctx.ellipse(0, 1, drawW * .20, h * .010, 0, 0, Math.PI * 2);
    ctx.fill();

    drawSheetFrame(meta, anim.frame, -drawW * .5, topY, drawW, drawH);
    ctx.restore();
  }

  function allReady() {
    return atlasReady && atlas.complete && atlas.naturalWidth;
  }

  function drawLoading(w, h) {
    ctx.fillStyle = '#080c10';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c8d3d6';
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(atlasError ? 'FIELD LINK ASSET ERROR — RELOAD' : 'INITIALIZING FIELD LINK…', w / 2, h / 2);
  }

  function frame(now) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    const dt = Math.min(.033, (now - state.last) / 1000 || 0);
    state.last = now;
    state.elapsed += dt;

    if (!allReady()) {
      drawLoading(w, h);
      requestAnimationFrame(frame);
      return;
    }

    update(dt);
    drawBackground(w, h);
    drawPlayer(w, h);
    requestAnimationFrame(frame);
  }

  addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js?v=6').catch(() => {});
})();