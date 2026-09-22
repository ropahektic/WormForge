(() => {
  const SIZE = 60;
  const AIM_FRAMES = 32;
  const DRAW_FRAMES = 10;
  const DELAY = 5; // hundredths of a second

  const BASE = {
    aim: {
      p: "px/p_sprite_builder_graphics__def_shot_aim_p.gif",
      u: "px/p_sprite_builder_graphics__def_shot_aim_u.gif",
      d: "px/p_sprite_builder_graphics__def_shot_aim_d.gif",
    },
    pick: {
      p: "px/p_sprite_builder_graphics__default_pick_p.gif",
      u: "px/p_sprite_builder_graphics__default_pick_u.gif",
      d: "px/p_sprite_builder_graphics__default_pick_d.gif",
    },
    hand: {
      mid: "px/p_sprite_builder_graphics__hand_rad.gif",
      lower: "px/p_sprite_builder_graphics__hand_rad_lower.gif",
      upper: "px/p_sprite_builder_graphics__hand_rad_upper.gif",
    },
  };

  function gifApi() {
    const Writer = typeof GifWriter !== "undefined" ? GifWriter : (window.omggif && window.omggif.GifWriter);
    const Reader = typeof GifReader !== "undefined" ? GifReader : (window.omggif && window.omggif.GifReader);
    if (!Writer || !Reader) throw new Error("omggif failed to load");
    return { Writer, Reader };
  }

  const frameCache = new Map();

  async function loadGifFrames(url) {
    if (frameCache.has(url)) return frameCache.get(url);
    const buf = new Uint8Array(await fetch(url).then((r) => {
      if (!r.ok) throw new Error(`missing base ${url}`);
      return r.arrayBuffer();
    }));
    const { Reader } = gifApi();
    const reader = new Reader(buf);
    const w = reader.width;
    const h = reader.height;
    const frames = [];
    // Aim/pick sheets are independent poses — clear between frames.
    for (let i = 0; i < reader.numFrames(); i++) {
      const rgba = new Uint8ClampedArray(w * h * 4);
      reader.decodeAndBlitFrameRGBA(i, rgba);
      frames.push(new ImageData(rgba, w, h));
    }
    frameCache.set(url, frames);
    return frames;
  }

  async function loadHandImage(kind) {
    const url = BASE.hand[kind] || BASE.hand.mid;
    const frames = await loadGifFrames(url);
    return frames[0];
  }

  function aimAngle(i, total) {
    const t = total <= 1 ? 0 : i / (total - 1);
    // Left-facing strip (PX TurnSide < 0): π + π*FireAngle. WA mirrors for right.
    return Math.PI * (1 + t);
  }

  function drawLayer(ctx, imageData, cx, cy, angle, radius, scale) {
    if (!imageData) return;
    const off = document.createElement("canvas");
    off.width = imageData.width;
    off.height = imageData.height;
    off.getContext("2d").putImageData(imageData, 0, 0);
    const x = cx - Math.sin(angle) * radius;
    const y = cy + Math.cos(angle) * radius;
    const s = Math.abs(scale) || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    // TransformQuad(..., Scale * TurnSide, Scale) with TurnSide < 0
    ctx.scale(-s, s);
    ctx.drawImage(off, -imageData.width / 2, -imageData.height / 2);
    ctx.restore();
  }

  function drawWeapon(ctx, img, cx, cy, angle, radius, scale, artRotate) {
    const x = cx - Math.sin(angle) * radius;
    const y = cy + Math.cos(angle) * radius;
    const s = Math.abs(scale) || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + (artRotate || 0));
    ctx.scale(-s, s);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  }

  function compositeFrame(wormFrame, weaponImg, handFrame, angle, opts) {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, SIZE, SIZE);
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    if (wormFrame) {
      const wx = (SIZE - wormFrame.width) / 2;
      const wy = (SIZE - wormFrame.height) / 2;
      const off = document.createElement("canvas");
      off.width = wormFrame.width;
      off.height = wormFrame.height;
      off.getContext("2d").putImageData(wormFrame, 0, 0);
      ctx.drawImage(off, wx, wy);
    }
    const artRot = ((Number(opts.rotate) || 0) * Math.PI) / 180;
    drawWeapon(ctx, weaponImg, cx, cy, angle, opts.radius, opts.scale, artRot);
    // Hand size is fixed — Scale only affects the imported weapon art.
    drawLayer(ctx, handFrame, cx, cy, angle, opts.handRadius, 1);
    return ctx.getImageData(0, 0, SIZE, SIZE);
  }

  function quantizeFrames(rgbaFrames) {
    const counts = new Map();
    for (const frame of rgbaFrames) {
      const d = frame.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) continue;
        const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const palette = [0]; // index 0 = transparent black
    const map = new Map();
    for (const [key] of sorted) {
      if (palette.length >= 256) break;
      map.set(key, palette.length);
      palette.push(key);
    }
    while (palette.length < 2) palette.push(0);
    let pow = 2;
    while (pow < palette.length) pow <<= 1;
    while (palette.length < pow) palette.push(0);

    function nearest(r, g, b) {
      let best = 1;
      let bestD = 1e18;
      for (let i = 1; i < palette.length; i++) {
        const c = palette[i];
        if (!c && i !== 0) continue;
        const dr = r - ((c >> 16) & 255);
        const dg = g - ((c >> 8) & 255);
        const db = b - (c & 255);
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestD) {
          bestD = dist;
          best = i;
        }
      }
      return best;
    }

    const indexed = rgbaFrames.map((frame) => {
      const d = frame.data;
      const out = new Uint8Array(SIZE * SIZE);
      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        if (d[i + 3] < 128) {
          out[p] = 0;
          continue;
        }
        const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
        let idx = map.get(key);
        if (idx == null) {
          idx = nearest(d[i], d[i + 1], d[i + 2]);
          map.set(key, idx);
        }
        out[p] = idx;
      }
      return out;
    });
    return { indexed, palette: new Uint32Array(palette) };
  }

  function encodeGif(rgbaFrames) {
    const { Writer } = gifApi();
    const { indexed, palette } = quantizeFrames(rgbaFrames);
    const buf = new Uint8Array(SIZE * SIZE * indexed.length * 6 + 2048);
    const writer = new Writer(buf, SIZE, SIZE, { loop: 0 });
    for (const pixels of indexed) {
      writer.addFrame(0, 0, SIZE, SIZE, pixels, {
        delay: DELAY,
        palette,
        transparent: 0,
        disposal: 2,
      });
    }
    return buf.subarray(0, writer.end());
  }

  function validateWeapon(img) {
    if (!img || !img.width || !img.height) return "Could not load weapon art";
    if (img.width > SIZE || img.height > SIZE) {
      return `Weapon art must be ≤${SIZE}×${SIZE} (got ${img.width}×${img.height}). Center the grip.`;
    }
    return null;
  }

  /** Match gfx::spr_key — WA treats these as transparent in .spr sheets. */
  function isSprKey(r, g, b, a) {
    return a < 16
      || r + g + b < 12
      || (r === 128 && g === 128 && b === 192)
      || (r === 255 && g === 0 && b === 255);
  }

  /** Punch stock key colors to real alpha (Gfx.dir / extract PNGs bake black opaque). */
  function punchSprKey(canvas) {
    const ctx = canvas.getContext("2d");
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (isSprKey(d[i], d[i + 1], d[i + 2], d[i + 3])) {
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
        d[i + 3] = 0;
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }

  /** Scale source down to fit SIZE×SIZE (never upscale). Returns a canvas. */
  function fitWeapon(source, punchKey) {
    const sw = source.width || source.naturalWidth;
    const sh = source.height || source.naturalHeight;
    if (!sw || !sh) throw new Error("empty weapon frame");
    const scale = Math.min(1, SIZE / sw, SIZE / sh);
    const w = Math.max(1, Math.round(sw * scale));
    const h = Math.max(1, Math.round(sh * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    if (source instanceof ImageData) {
      const tmp = document.createElement("canvas");
      tmp.width = sw;
      tmp.height = sh;
      tmp.getContext("2d").putImageData(source, 0, 0);
      ctx.drawImage(tmp, 0, 0, w, h);
    } else {
      ctx.drawImage(source, 0, 0, sw, sh, 0, 0, w, h);
    }
    if (punchKey) punchSprKey(canvas);
    return canvas;
  }

  /** First GIF frame only (static hold art). */
  async function staticFromGifUrl(url) {
    const frames = await loadGifFrames(url);
    if (!frames.length) throw new Error("empty GIF");
    // PX sheets often use real GIF transparency; still punch leftover black keys.
    return fitWeapon(frames[0], true);
  }

  /** Crop first cell of a vertical stock strip PNG. */
  async function staticFromStripUrl(url, fw, fh) {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`failed to load ${url}`));
      el.src = url;
    });
    const w = fw || img.naturalWidth;
    const h = fh || img.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h, 0, 0, w, h);
    punchSprKey(canvas);
    return fitWeapon(canvas, true);
  }

  async function staticFromPngFile(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Could not load PNG"));
        el.src = url;
      });
      if (img.width > SIZE || img.height > SIZE) {
        throw new Error(`Weapon PNG must be ≤${SIZE}×${SIZE} (got ${img.width}×${img.height}). Center the grip.`);
      }
      // Author PNGs already have real alpha — do not punch intentional near-black pixels.
      return fitWeapon(img, false);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function bakeSlope(slope, weaponImg, handFrame, opts) {
    const aimBase = await loadGifFrames(BASE.aim[slope]);
    const pickBase = await loadGifFrames(BASE.pick[slope]);
    const aimRgba = [];
    for (let i = 0; i < AIM_FRAMES; i++) {
      const worm = aimBase[Math.min(i, aimBase.length - 1)];
      const ang = aimAngle(i, AIM_FRAMES);
      aimRgba.push(compositeFrame(worm, weaponImg, handFrame, ang, opts));
    }
    const drawRgba = [];
    const holdAng = aimAngle(16, AIM_FRAMES); // horizontal-ish mid aim
    for (let i = 0; i < DRAW_FRAMES; i++) {
      const worm = pickBase[Math.min(i, pickBase.length - 1)];
      drawRgba.push(compositeFrame(worm, weaponImg, handFrame, holdAng, opts));
    }
    return {
      aim: encodeGif(aimRgba),
      draw: encodeGif(drawRgba),
    };
  }

  async function bakeAll(weaponImg, opts) {
    const err = validateWeapon(weaponImg);
    if (err) throw new Error(err);
    const handFrame = await loadHandImage(opts.hand || "mid");
    const settings = {
      scale: Number(opts.scale) || 1,
      radius: Number(opts.radius) || 8,
      handRadius: Number(opts.handRadius) || 10,
      rotate: Number(opts.rotate) || 0,
    };
    const out = {};
    for (const slope of ["p", "u", "d"]) {
      out[slope] = await bakeSlope(slope, weaponImg, handFrame, settings);
    }
    return out;
  }

  function previewFrame(weaponImg, handFrame, wormFrame, angle, opts) {
    return compositeFrame(wormFrame, weaponImg, handFrame, angle, opts);
  }

  async function loadPreviewBases(slope) {
    const aim = await loadGifFrames(BASE.aim[slope || "p"]);
    return aim;
  }

  window.AimBake = {
    SIZE,
    AIM_FRAMES,
    DRAW_FRAMES,
    BASE,
    validateWeapon,
    fitWeapon,
    staticFromGifUrl,
    staticFromStripUrl,
    staticFromPngFile,
    bakeAll,
    previewFrame,
    loadPreviewBases,
    loadHandImage,
    aimAngle,
    encodeGif,
  };
})();
