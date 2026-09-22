(() => {
  const $ = (id) => document.getElementById(id);

  function makeBody(sprite) {
    return {
      sprite: sprite || "missile",
      damage: "",
      gravity_pct: "",
      wind_pct: "",
      bounce_pct: "",
      fuse: false,
      homing: "off",
      cluster: false,
      child: null,
      proximity: "",
      fuse_ms: "",
      mask: "",
      trigger: "",
      prox_on: false,
      boom_on: false,
      boom_cluster: false,
      custom_cluster: false,
      custom_site: "explode",
      boom_sprite: "banana",
      boom_count: "5",
      boom_spread: "45",
      boom_power: "",
      boom_damage: "30",
      boom_trail: "smklt25",
      boom_impact: true,
      boom_bounce: false,
      boom_homing: "off",
      prox_id: "25",
    };
  }

  function usingCustomClusters() {
    if (state.fire === "power") return !!state.body.custom_cluster;
    if (state.fire === "drop" && !state.body.fuse) return !!(state.body.boom_on && state.body.boom_cluster);
    return false;
  }

  function clearPowerExclusive(keep) {
    const body = state.body;
    if (keep !== "stock") {
      body.cluster = false;
      if (focus === "child") focus = "root";
    }
    if (keep !== "custom") body.custom_cluster = false;
    if (keep !== "homing" && focus === "root") body.homing = "off";
  }

  let catalog = { sprites: [], px_sprites: [], slots: [], icons: [], slot_icons: {} };
  let tab = "fire";
  let focus = "root";
  let catalogMode = "stock";
  let catalogHits = [];
  let stageRaf = 0;
  let state = {
    id: "user.my_weapon",
    name: "My Weapon",
    slot: "bazooka",
    panel_icon: "bazooka",
    fire: "power",
    teleport: false,
    attachPick: "boom",
    aim_p: "",
    aim_u: "",
    aim_d: "",
    body: makeBody("missile"),
  };

  function ensureChild(body) {
    if (!body.child) body.child = makeBody("clustlet");
    return body.child;
  }

  function canAimHold() {
    return state.fire === "power" || state.fire === "hitscan";
  }

  function aimingPick() {
    return tab === "aim"
      && (state.attachPick === "aim_p" || state.attachPick === "aim_u" || state.attachPick === "aim_d");
  }

  function focusedBody() {
    if (focus === "child" && state.fire === "power" && state.body.cluster) {
      return ensureChild(state.body);
    }
    return state.body;
  }

  function setFocus(next) {
    focus = next === "child" && state.body.cluster ? "child" : "root";
    if (focus === "child") {
      tab = "body";
      state.attachPick = "body";
    }
    render();
  }

  function bodySpriteLive() {
    return state.fire === "power" || state.fire === "drop" || aimingPick();
  }

  function catalogSelected() {
    if (aimingPick()) {
      if (state.attachPick === "aim_p") return state.aim_p;
      if (state.attachPick === "aim_u") return state.aim_u;
      if (state.attachPick === "aim_d") return state.aim_d;
    }
    if (usingCustomClusters() && (tab === "attach" || tab === "custom" || state.attachPick === "boom" || state.attachPick === "trail")) {
      if (state.attachPick === "trail") return state.body.boom_trail;
      if (state.attachPick === "boom") return state.body.boom_sprite;
    }
    return focusedBody().sprite;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function inferCopyFrom() {
    if (state.fire === "hitscan") return "uzi";
    if (state.fire === "drop") return state.body.fuse ? "dynamite" : "mine";
    if (state.fire === "cursor") return state.teleport ? "teleport" : "air_strike";
    // Custom clusters use on_fire LuaActor; keep a plain power donor.
    if (state.body.custom_cluster) {
      if (state.body.fuse) return "grenade";
      return "bazooka";
    }
    if (state.body.cluster) return "cluster_bomb";
    if (state.body.homing === "avoid") return "homing_pigeon";
    if (state.body.homing === "dodge") return "magic_bullet";
    if (state.body.homing !== "off") return "homing_missile";
    if (state.body.fuse) return "grenade";
    return "bazooka";
  }

  function syncSlotFromTree() {
    const prevDefault = defaultIcon(state.slot);
    state.slot = inferCopyFrom();
    if (!state.panel_icon || state.panel_icon === prevDefault) {
      state.panel_icon = defaultIcon(state.slot);
    }
  }

  function visibleTabs() {
    const tabs = [{ id: "fire", label: "Fire" }];
    if (state.fire === "hitscan") {
      tabs.push({ id: "hitscan", label: "Hitscan" });
      tabs.push({ id: "aim", label: "Aiming" });
      return tabs;
    }
    if (state.fire === "cursor") {
      tabs.push({ id: "cursor", label: "Cursor" });
      return tabs;
    }
    tabs.push({ id: "body", label: focus === "child" ? "Stock bit" : "Projectile" });
    if (state.fire === "power" && focus === "root") {
      tabs.push({ id: "aim", label: "Aiming" });
    }
    if (state.fire === "power" && focus === "root" && state.body.homing !== "off" && !state.body.custom_cluster) {
      tabs.push({ id: "homing", label: "Homing" });
    }
    if (state.fire === "power" && focus === "child" && focusedBody().homing !== "off") {
      tabs.push({ id: "homing", label: "Bit homing" });
    }
    if (state.fire === "power" && state.body.cluster && focus === "root") {
      tabs.push({ id: "cluster", label: "Stock clusters" });
    }
    if (state.fire === "power" && state.body.custom_cluster && focus === "root") {
      tabs.push({ id: "custom", label: "Custom clusters" });
    }
    if (state.fire === "drop" && !state.body.fuse) {
      tabs.push({ id: "attach", label: "Attach" });
    }
    return tabs;
  }

  function isPxPath(name) {
    return typeof name === "string" && (name.includes("/") || /\.gif$/i.test(name));
  }

  function pxFile(name) {
    const n = String(name).replace(/\\/g, "/");
    const i = n.lastIndexOf("/");
    return i >= 0 ? n.slice(i + 1) : n;
  }

  function spriteValue(s) {
    return s.path || s.name;
  }

  const packFiles = new Map();

  // Engine Display-id aliases (_2) and hash stubs are not real sprites.
  function junkStockName(name) {
    const n = String(name || "").toLowerCase();
    return !n || n.includes("#") || n.endsWith("_2");
  }

  function usableStock(s) {
    if (!s || junkStockName(s.name)) return false;
    if (s.file) return true;
    return !!s.preview;
  }

  function spriteThumb(s) {
    if (s.preview) return s.preview;
    if (s.file) return "px/" + encodeURIComponent(s.file);
    return "";
  }

  function spriteSource() {
    if (catalogMode === "px") return catalog.px_sprites || [];
    return (catalog.sprites || []).filter(usableStock);
  }

  function luaString(v) {
    return JSON.stringify(String(v));
  }

  function aimPackPath(name) {
    if (!name) return "";
    const n = String(name).replace(/\\/g, "/");
    if (n.includes("/")) return n;
    if (/\.(gif|png)$/i.test(n)) return "sprites/" + n;
    return "sprites/" + n + ".gif";
  }

  function slopeFamily(path) {
    const n = String(path || "").replace(/\\/g, "/");
    const m = n.match(/^(.*?)([pud])(\.[^.]+)?$/i);
    if (!m) return null;
    const base = m[1];
    const ext = m[3] || "";
    return {
      p: base + "p" + ext,
      u: base + "u" + ext,
      d: base + "d" + ext,
    };
  }

  function catalogHasPath(path) {
    if (!path) return false;
    const src = [...(catalog.px_sprites || []), ...(catalog.sprites || [])];
    return src.some((s) => spriteValue(s) === path || s.name === path || s.file === pxFile(path));
  }

  function applyAimPick(slot, value) {
    state[slot] = value;
    const fam = slopeFamily(value);
    if (!fam) return;
    const fill = (key, path) => {
      if (state[key]) return;
      if (catalogHasPath(path)) state[key] = path;
    };
    if (slot === "aim_p") {
      fill("aim_u", fam.u);
      fill("aim_d", fam.d);
    } else if (slot === "aim_u") {
      fill("aim_p", fam.p);
      fill("aim_d", fam.d);
    } else if (slot === "aim_d") {
      fill("aim_p", fam.p);
      fill("aim_u", fam.u);
    }
  }

  function emitWormSprites() {
    if (!canAimHold()) return [];
    const p = state.aim_p;
    const u = state.aim_u;
    const d = state.aim_d;
    if (!p && !u && !d) return [];
    const lines = ["  worm_sprites = {"];
    if (p) lines.push(`    weaponlnk = ${luaString(aimPackPath(p))},`);
    if (u) lines.push(`    weaponlnku = ${luaString(aimPackPath(u))},`);
    if (d) lines.push(`    weaponlnkd = ${luaString(aimPackPath(d))},`);
    lines.push("  },");
    return lines;
  }

  function emitParams(body, indent) {
    const keys = ["damage", "gravity_pct", "wind_pct", "bounce_pct"].filter((k) => body[k] !== "" && body[k] != null);
    if (!keys.length) return [];
    return [
      `${indent}params = {`,
      ...keys.map((k) => `${indent}  ${k} = ${Number(body[k])},`),
      `${indent}},`,
    ];
  }

  function emitSpriteAndParams(body, indent) {
    const lines = [];
    if (body.sprite) lines.push(`${indent}sprite = ${luaString(body.sprite)},`);
    lines.push(...emitParams(body, indent));
    return lines;
  }

  function emitRoot() {
    const lines = [];
    if (state.fire === "power" || state.fire === "drop") {
      lines.push(...emitSpriteAndParams(state.body, "  "));
    } else if (state.fire === "hitscan" && state.body.damage !== "" && state.body.damage != null) {
      lines.push("  params = {", `    damage = ${Number(state.body.damage)},`, "  },");
    }
    if (state.fire === "power" && state.body.cluster && !state.body.custom_cluster) {
      const child = ensureChild(state.body);
      lines.push("  cluster = {");
      lines.push(...emitSpriteAndParams(child, "    "));
      if (child.homing && child.homing !== "off") {
        lines.push(`    homing = ${luaString(child.homing)},`);
      }
      lines.push("  },");
    }
    if (state.fire === "drop" && !state.body.fuse) {
      const keys = [
        ["proximity", "proximity"],
        ["fuse_ms", "fuse"],
        ["mask", "mask"],
        ["trigger", "trigger"],
      ].filter(([src]) => state.body[src] !== "" && state.body[src] != null);
      if (keys.length) {
        lines.push("  mine = {");
        for (const [src, dst] of keys) {
          lines.push(`    ${dst} = ${Number(state.body[src])},`);
        }
        lines.push("  },");
      }
    }
    if (state.fire === "drop" && !state.body.fuse) {
      lines.push(...emitStep("on_proximity", state.body.prox_on, {
        invisible: true,
        now: true,
        damage: 0,
        id: state.body.prox_id === "" || state.body.prox_id == null ? 25 : Number(state.body.prox_id),
        hurt: false,
        dirt: true,
      }));
      lines.push(...emitStep("on_explode", state.body.boom_on && state.body.boom_cluster, customClusterSpec()));
    }
    if (state.fire === "power" && state.body.custom_cluster) {
      lines.push(...emitPowerCustomFire());
    }
    lines.push(...emitWormSprites());
    return lines;
  }

  function customClusterSpec() {
    const body = state.body;
    return {
      kind: "cluster",
      sprite: body.boom_sprite || "banana",
      count: body.boom_count === "" || body.boom_count == null ? 5 : Number(body.boom_count),
      spread: body.boom_spread === "" || body.boom_spread == null ? 45 : Number(body.boom_spread),
      power: body.boom_power === "" || body.boom_power == null ? 0 : Number(body.boom_power),
      trail: body.boom_trail || "smklt25",
      impact: body.boom_impact !== false,
      bounce: !!body.boom_bounce,
      homing: body.boom_homing && body.boom_homing !== "off" ? body.boom_homing : null,
      damage: body.boom_impact === false ? null : (body.boom_damage === "" || body.boom_damage == null ? 30 : Number(body.boom_damage)),
      id: 100,
      hurt: body.boom_impact !== false,
      gravity: true,
      collide: true,
      persist: false,
    };
  }

  function emitSpawnLines(spec, indent) {
    const inner = [];
    if (spec.kind) inner.push(`${indent}kind = ${luaString(spec.kind)},`);
    if (spec.invisible) inner.push(`${indent}sprite = false,`);
    if (spec.sprite) inner.push(`${indent}sprite = ${luaString(spec.sprite)},`);
    if (spec.count != null && spec.count !== "" && Number(spec.count) > 1) inner.push(`${indent}count = ${Number(spec.count)},`);
    if (spec.spread != null && spec.spread !== "") inner.push(`${indent}spread = ${Number(spec.spread)},`);
    if (spec.power != null && spec.power !== "") inner.push(`${indent}power = ${Number(spec.power)},`);
    if (spec.trail) inner.push(`${indent}trail = ${luaString(spec.trail)},`);
    if (spec.impact === true) inner.push(`${indent}impact = true,`);
    if (spec.impact === false) inner.push(`${indent}impact = false,`);
    if (spec.bounce) inner.push(`${indent}bounce = true,`);
    if (spec.homing) inner.push(`${indent}homing = ${luaString(spec.homing)},`);
    if (spec.vy != null && spec.vy !== "") inner.push(`${indent}vy = ${Number(spec.vy)},`);
    if (spec.now || spec.damage != null) {
      const dmg = spec.damage == null ? 0 : Number(spec.damage);
      const id = spec.id == null ? 40 : Number(spec.id);
      inner.push(`${indent}explode = { damage = ${dmg}, id = ${id}${spec.now ? ", now = true" : ""} },`);
    }
    if (spec.hurt === false) inner.push(`${indent}damage_worms = false,`);
    if (spec.dirt === true && spec.hurt === false) inner.push(`${indent}damage_terrain = true,`);
    if (spec.dirt === false && spec.hurt === false) inner.push(`${indent}damage_terrain = false,`);
    if (spec.persist === false) inner.push(`${indent}persist = false,`);
    if (spec.persist) inner.push(`${indent}persist = true,`);
    if (spec.gravity === false) inner.push(`${indent}gravity = false,`);
    if (spec.gravity === true) inner.push(`${indent}gravity = true,`);
    if (spec.collide === false) inner.push(`${indent}collide = false,`);
    if (spec.collide === true) inner.push(`${indent}collide = true,`);
    if (spec.persist || spec.invisible) inner.push(`${indent}drown = true,`);
    return inner;
  }

  function emitStep(key, on, spec) {
    if (!on) return [];
    return [
      `  ${key} = {`,
      "    spawn = {",
      ...emitSpawnLines(spec, "      "),
      "    },",
      "  },",
    ];
  }

  function emitPowerCustomFire() {
    const cluster = customClusterSpec();
    if (state.body.custom_site === "launch") {
      return [
        "  on_fire = {",
        "    spawn = {",
        ...emitSpawnLines(cluster, "      "),
        "    },",
        "  },",
      ];
    }
    const body = state.body;
    const dmg = body.damage === "" || body.damage == null ? 50 : Number(body.damage);
    return [
      "  on_fire = {",
      "    spawn = {",
      `      sprite = ${luaString(body.sprite || "missile")},`,
      "      impact = true,",
      "      gravity = true,",
      "      collide = true,",
      `      explode = { damage = ${dmg}, id = 100 },`,
      "      on_explode = {",
      "        spawn = {",
      ...emitSpawnLines(cluster, "          "),
      "        },",
      "      },",
      "    },",
      "  },",
    ];
  }

  function luaSource() {
    const copy = inferCopyFrom();
    const lines = [
      `-- copy_from ${copy}`,
      "",
      "wa.weapons.replace({",
      `  weapon = ${luaString(state.slot)},`,
      `  name = ${luaString(state.name)},`,
      `  copy_from = ${luaString(copy)},`,
    ];
    if (state.fire === "cursor" && state.teleport) {
      lines.push("  on_select = { cursor = true },");
    }
    if (state.panel_icon) {
      lines.push(`  panel_icon = ${luaString(state.panel_icon)},`);
    }
    lines.push(...emitRoot());
    lines.push("})");
    return lines.join("\n");
  }

  function renderTree() {
    const copy = inferCopyFrom();
    const bits = [];
    bits.push(`<button type="button" class="tree-btn ${focus === "root" ? "active" : ""}" data-focus="root">${esc(state.name)}<div class="meta">${state.fire} · ${copy}</div></button>`);
    if (state.fire === "power" && state.body.cluster && !state.body.custom_cluster) {
      const child = ensureChild(state.body);
      bits.push(`<button type="button" class="tree-btn child ${focus === "child" ? "active" : ""}" data-focus="child">↳ stock bits · ${esc(child.sprite || "clustlet")}</button>`);
    }
    if (state.fire === "power" && state.body.custom_cluster) {
      bits.push(`<button type="button" class="tree-btn child ${tab === "custom" ? "active" : ""}" data-open-custom="1">↳ custom bits · ${esc(state.body.boom_sprite || "banana")}</button>`);
    }
    if (state.fire === "drop" && !state.body.fuse && state.body.boom_cluster) {
      bits.push(`<button type="button" class="tree-btn child ${tab === "attach" ? "active" : ""}" data-open-attach="1">↳ custom bits · ${esc(state.body.boom_sprite || "banana")}</button>`);
    }
    $("tree").innerHTML = bits.join("");
  }

  function renderTabs() {
    const tabs = visibleTabs();
    if (!tabs.some((t) => t.id === tab)) tab = tabs[0].id;
    $("tabs").innerHTML = tabs
      .map((t) => `<button type="button" class="tab ${t.id === tab ? "active" : ""}" data-tab="${t.id}">${t.label}</button>`)
      .join("");
  }

  function numField(key, label, body) {
    return `<div><label class="field">${label}</label><input data-num="${key}" type="number" value="${body[key] ?? ""}" placeholder="stock" /></div>`;
  }

  function textField(key, label, body) {
    return `<div><label class="field">${label}</label><input data-text="${key}" type="text" value="${esc(body[key] ?? "")}" /></div>`;
  }

  function firePanel() {
    const fires = [
      ["power", "Power"],
      ["hitscan", "Hitscan"],
      ["drop", "Drop"],
      ["cursor", "Cursor"],
    ];
    return `
      <label class="field">Fire</label>
      <div class="fires">
        ${fires.map(([id, title]) => `<button type="button" class="fire ${state.fire === id ? "active" : ""}" data-fire="${id}">${title}</button>`).join("")}
      </div>
      <div class="row">
        <div><label class="field">Panel slot</label>
          <select id="slot">${catalog.slots.map((s) => `<option value="${s}" ${s === state.slot ? "selected" : ""}>${s}</option>`).join("")}</select>
        </div>
        <div><label class="field">Mod id</label><input id="id" value="${state.id}" /></div>
      </div>
      <label class="field">Weapon name</label>
      <input id="name" value="${state.name}" maxlength="40" />
      <p class="meta">copy_from ${inferCopyFrom()}</p>
    `;
  }

  function aimPanel() {
    const row = (key, label) => {
      const val = state[key] || "—";
      return `<div class="pick-row">${label} <b>${esc(val)}</b>
        <button type="button" class="fire ${state.attachPick === key ? "active" : ""}" data-attach-pick="${key}">Catalog</button>
        ${state[key] ? `<button type="button" class="fire" data-aim-clear="${key}">Clear</button>` : ""}
      </div>`;
    };
    return `
      <label class="field">Hold sprites</label>
      ${row("aim_p", "Flat")}
      ${row("aim_u", "Uphill")}
      ${row("aim_d", "Downhill")}
      <p class="meta">One sheet fills all slopes. Draw/undraw are eaten.</p>
    `;
  }

  function customClusterFields() {
    const body = state.body;
    const homingBtns = [
      ["off", "Off"],
      ["aim", "Aim"],
      ["worm", "Worm"],
    ]
      .map(
        ([id, title]) =>
          `<button type="button" class="fire ${body.boom_homing === id ? "active" : ""}" data-boom-homing="${id}">${title}</button>`
      )
      .join("");
    return `
      <div class="pick-row">Bit <b>${esc(body.boom_sprite)}</b>
        <button type="button" class="fire ${state.attachPick === "boom" ? "active" : ""}" data-attach-pick="boom">Catalog</button>
      </div>
      <div class="pick-row">Trail <b>${esc(body.boom_trail)}</b>
        <button type="button" class="fire ${state.attachPick === "trail" ? "active" : ""}" data-attach-pick="trail">Catalog</button>
      </div>
      <div class="row">
        ${numField("boom_count", "Bit count", body)}
        ${numField("boom_spread", "Fan degrees", body)}
        ${numField("boom_power", "Launch speed", body)}
        ${numField("boom_damage", "Bit damage", body)}
      </div>
      <div class="mods">
        <label class="check"><input type="checkbox" data-flag="boom_impact" ${body.boom_impact !== false ? "checked" : ""} /><b>Explode on impact</b></label>
        <label class="check"><input type="checkbox" data-flag="boom_bounce" ${body.boom_bounce ? "checked" : ""} /><b>Bounce</b></label>
      </div>
      <label class="field">Homing</label>
      <div class="fires">${homingBtns}</div>
    `;
  }

  function bodyPanel() {
    const body = focusedBody();
    const bit = focus === "child";
    const powerRoot = state.fire === "power" && !bit;
    const drop = state.fire === "drop";
    const showFuse = (powerRoot && body.homing === "off" && !body.cluster && !body.custom_cluster) || drop;
    const showHoming = (powerRoot && !body.cluster && !body.custom_cluster) || bit;
    const showStock = powerRoot && body.homing === "off" && !body.custom_cluster;
    const showCustom = powerRoot && body.homing === "off" && !body.cluster;
    const customInline = powerRoot && body.custom_cluster
      ? `<div class="mods" style="margin-top:10px">
          <label class="field">Site</label>
          <div class="fires">
            <button type="button" class="fire ${body.custom_site === "explode" ? "active" : ""}" data-custom-site="explode">On explode</button>
            <button type="button" class="fire ${body.custom_site === "launch" ? "active" : ""}" data-custom-site="launch">At launch</button>
          </div>
        </div>
        ${customClusterFields()}`
      : "";
    return `
      <div class="pick-row">Sprite <b>${esc(body.sprite || "—")}</b>
        <button type="button" class="fire ${state.attachPick === "body" ? "active" : ""}" data-attach-pick="body">Catalog</button>
      </div>
      <div class="row">
        ${numField("damage", "Damage", body)}
        ${numField("gravity_pct", "Gravity %", body)}
        ${numField("wind_pct", "Wind %", body)}
        ${numField("bounce_pct", "Bounce %", body)}
      </div>
      ${drop && !body.fuse ? `<div class="row">
        ${numField("proximity", "Proximity px", body)}
        ${numField("fuse_ms", "Arm fuse ms", body)}
        ${numField("trigger", "Beep fuse ms", body)}
        ${numField("mask", "Detect mask", body)}
      </div>` : ""}
      <div class="mods">
        ${showFuse ? `<label class="check"><input type="checkbox" data-flag="fuse" ${body.fuse ? "checked" : ""} /><b>${drop ? "Dynamite" : "Fuse"}</b></label>` : ""}
        ${showHoming ? `<label class="check"><input type="checkbox" data-flag="homingOn" ${body.homing !== "off" ? "checked" : ""} /><b>Homing</b></label>` : ""}
        ${showStock ? `<label class="check"><input type="checkbox" data-flag="cluster" ${body.cluster ? "checked" : ""} /><b>Stock clusters</b></label>` : ""}
        ${showCustom ? `<label class="check"><input type="checkbox" data-flag="custom_cluster" ${body.custom_cluster ? "checked" : ""} /><b>Custom clusters</b></label>` : ""}
      </div>
      ${customInline}
    `;
  }

  function homingPanel() {
    const body = focusedBody();
    const opts = [
      ["lock", "Lock"],
      ["avoid", "Avoid"],
      ["dodge", "Dodge"],
    ];
    return `
      <div class="fires">
        ${opts.map(([id, title]) => `<button type="button" class="fire ${body.homing === id ? "active" : ""}" data-homing="${id}">${title}</button>`).join("")}
      </div>
    `;
  }

  function clusterPanel() {
    ensureChild(state.body);
    return `
      <button type="button" class="primary" data-open-child="child">Edit stock bits</button>
    `;
  }

  function customPanel() {
    const body = state.body;
    return `
      <label class="field">Site</label>
      <div class="fires" style="margin-bottom:10px">
        <button type="button" class="fire ${body.custom_site === "explode" ? "active" : ""}" data-custom-site="explode">On explode</button>
        <button type="button" class="fire ${body.custom_site === "launch" ? "active" : ""}" data-custom-site="launch">At launch</button>
      </div>
      ${customClusterFields()}
    `;
  }

  function attachPanel() {
    const body = state.body;
    return `
      <div class="mods">
        <label class="check"><input type="checkbox" data-flag="prox_on" ${body.prox_on ? "checked" : ""} /><b>On proximity</b></label>
        ${body.prox_on ? numField("prox_id", "Dirt puff id", body) : ""}
        <label class="check"><input type="checkbox" data-flag="boom_on" ${body.boom_on ? "checked" : ""} /><b>On explode</b></label>
        ${body.boom_on ? `<label class="check"><input type="checkbox" data-flag="boom_cluster" ${body.boom_cluster ? "checked" : ""} /><b>Custom clusters</b></label>` : ""}
      </div>
      ${body.boom_on && body.boom_cluster ? customClusterFields() : ""}
    `;
  }

  function hitscanPanel() {
    const body = state.body;
    return `
      <div class="row">
        ${numField("damage", "Damage per hit", body)}
      </div>
    `;
  }

  function cursorPanel() {
    return `
      <div class="mods">
        <label class="check"><input type="checkbox" data-flag="teleport" ${state.teleport ? "checked" : ""} /><b>Teleport</b></label>
      </div>
    `;
  }

  function renderPanel() {
    if (tab === "fire") $("panel").innerHTML = firePanel();
    else if (tab === "hitscan") $("panel").innerHTML = hitscanPanel();
    else if (tab === "aim") $("panel").innerHTML = aimPanel();
    else if (tab === "homing") $("panel").innerHTML = homingPanel();
    else if (tab === "cluster") $("panel").innerHTML = clusterPanel();
    else if (tab === "custom") $("panel").innerHTML = customPanel();
    else if (tab === "cursor") $("panel").innerHTML = cursorPanel();
    else if (tab === "attach") $("panel").innerHTML = attachPanel();
    else $("panel").innerHTML = bodyPanel();
  }

  function spriteInfo(name) {
    if (!name) return;
    const px = (catalog.px_sprites || []).find((s) => s.path === name || s.file === pxFile(name) || s.name === name);
    if (px) return px;
    return catalog.sprites.find((s) => s.name === name);
  }

  function defaultIcon(slot) {
    return catalog.slot_icons[slot] || slot;
  }

  function thumbBox(fw, fh) {
    const scale = Math.min(36 / Math.max(fw, 1), 36 / Math.max(fh, 1));
    return {
      w: Math.max(1, Math.round(fw * scale)),
      h: Math.max(1, Math.round(fh * scale)),
    };
  }

  function stopStage() {
    if (stageRaf) {
      cancelAnimationFrame(stageRaf);
      stageRaf = 0;
    }
  }

  function layoutStage(info) {
    const clip = $("stage-clip");
    const img = $("sprite-img");
    if (!info) {
      clip.style.width = "0";
      clip.style.height = "0";
      return;
    }
    const fw = Math.max(1, info.fw || 32);
    const fh = Math.max(1, info.fh || 32);
    const scale = Math.min(140 / fw, 140 / fh, 6);
    clip.style.width = `${Math.round(fw * scale)}px`;
    clip.style.height = `${Math.round(fh * scale)}px`;
    clip.dataset.scale = String(scale);
    clip.dataset.frames = String(info.frames || 1);
    clip.dataset.fh = String(fh);
    clip.dataset.fps = String(info.fps || 10);
    img.style.width = `${Math.round(fw * scale)}px`;
    img.style.transform = "translateY(0)";
  }

  function tickStage(now) {
    stageRaf = requestAnimationFrame(tickStage);
    const clip = $("stage-clip");
    const img = $("sprite-img");
    const frames = Number(clip.dataset.frames) || 1;
    if (frames <= 1) {
      img.style.transform = "translateY(0)";
      return;
    }
    const fps = Number(clip.dataset.fps) || 10;
    const fh = Number(clip.dataset.fh) || 1;
    const scale = Number(clip.dataset.scale) || 1;
    const frame = Math.floor((now / 1000) * fps) % frames;
    img.style.transform = `translateY(${-frame * fh * scale}px)`;
  }

  function showPicked() {
    if (catalogMode === "icon") {
      const icon = state.panel_icon;
      $("picked").textContent = icon ? `panel icon ${icon}` : "none";
      const img = $("sprite-img");
      stopStage();
      const next = icon && catalog.icons.find((s) => s.name === icon);
      img.onload = () => layoutStage({ fw: (next && next.fw) || 48, fh: (next && next.fh) || 48, frames: 1, fps: 10 });
      img.style.display = next && next.preview ? "block" : "none";
      img.src = next && next.preview ? next.preview : "";
      return;
    }
    const sprite = catalogSelected();
    const info = spriteInfo(sprite);
    const px = isPxPath(sprite);
    $("picked").textContent = sprite
      ? `using ${sprite}${!px && info && info.id != null ? `  (#${info.id})` : ""}${px ? "  (PX gif)" : ""}${!px && info && info.frames > 1 ? `  ${info.frames} frames` : ""}`
      : "none";
    const img = $("sprite-img");
    if (sprite) {
      img.style.display = "block";
      img.onload = () => {
        if (px) {
          layoutStage({
            fw: img.naturalWidth || (info && info.fw) || 32,
            fh: img.naturalHeight || (info && info.fh) || 32,
            frames: 1,
            fps: 10,
          });
          stopStage();
          return;
        }
        layoutStage(info || { fw: img.naturalWidth || 32, fh: img.naturalHeight || 32, frames: 1, fps: 10 });
        stopStage();
        stageRaf = requestAnimationFrame(tickStage);
      };
      const next = info ? spriteThumb(info) : (px ? "px/" + encodeURIComponent(pxFile(sprite)) : "");
      if (!next) {
        stopStage();
        img.removeAttribute("src");
        img.removeAttribute("data-src");
        img.style.display = "none";
      } else if (img.dataset.src !== next) {
        img.dataset.src = next;
        img.src = next;
      } else if (img.complete) {
        img.onload();
      }
    } else {
      stopStage();
      img.removeAttribute("src");
      img.removeAttribute("data-src");
      img.style.display = "none";
    }
  }

  function paintIcons() {
    const q = $("filter").value.trim().toLowerCase();
    const hits = (catalog.icons || []).filter((s) => !q || s.name.includes(q));
    $("sprite-count").textContent = q ? `${hits.length} / ${catalog.icons.length}` : `${catalog.icons.length} icons`;
    $("catalog").innerHTML = `<div class="icon-grid">${hits.map((s) =>
      `<button type="button" data-icon="${s.name}" class="${s.name === state.panel_icon ? "selected" : ""}">${s.preview ? `<img src="${s.preview}" alt="" draggable="false" />` : ""}<span>${s.name}</span></button>`
    ).join("")}</div>`;
    showPicked();
  }

  function paintCatalogWindow() {
    const el = $("catalog");
    const ROW = 44;
    const selected = catalogSelected();
    const view = el.clientHeight || 360;
    const start = Math.max(0, Math.floor(el.scrollTop / ROW) - 4);
    const end = Math.min(catalogHits.length, start + Math.ceil(view / ROW) + 8);
    const win = `${start}:${end}:${selected}:${catalogHits.length}:${catalogMode}`;
    if (el.dataset.win === win) return;
    el.dataset.win = win;
    const keep = el.scrollTop;
    let html = `<div class="cat-spacer" style="height:${catalogHits.length * ROW}px">`;
    for (let i = start; i < end; i++) {
      const s = catalogHits[i];
      const box = thumbBox(s.fw || 32, s.fh || 32);
      const value = spriteValue(s);
      html += `<button type="button" data-name="${esc(value)}" class="${value === selected ? "selected" : ""}" style="top:${i * ROW}px;height:${ROW}px"><span class="thumb" style="width:${box.w}px;height:${box.h}px"><img src="${spriteThumb(s)}" alt="" draggable="false" style="width:${box.w}px" /></span><span>${esc(s.name)}</span><span class="sid">${s.file ? "gif" : (s.id == null ? "—" : s.id)}</span></button>`;
    }
    html += "</div>";
    el.innerHTML = html;
    el.scrollTop = keep;
  }

  function renderCatalog() {
    const pickingBody = bodySpriteLive();
    $("mode-stock").hidden = !pickingBody;
    $("mode-px").hidden = !pickingBody;
    if (!pickingBody && catalogMode !== "icon") catalogMode = "icon";
    $("mode-stock").classList.toggle("active", catalogMode === "stock");
    $("mode-px").classList.toggle("active", catalogMode === "px");
    $("mode-icon").classList.toggle("active", catalogMode === "icon");
    $("filter").placeholder = catalogMode === "icon"
      ? "filter panel icons…"
        : catalogMode === "px"
        ? "filter PX gifs…"
        : "filter stock sprites…";
    $("catalog").dataset.win = "";
    if (catalogMode === "icon") {
      paintIcons();
      return;
    }
    const src = spriteSource();
    const q = $("filter").value.trim().toLowerCase();
    catalogHits = src.filter((s) => !q || s.name.toLowerCase().includes(q) || String(s.id ?? "").includes(q) || (s.file && s.file.toLowerCase().includes(q)));
    $("sprite-count").textContent = q ? `${catalogHits.length} / ${src.length}` : `${src.length} ${catalogMode === "px" ? "gifs" : "sprites"}`;
    paintCatalogWindow();
    showPicked();
  }

  function renderLua() {
    $("preview").textContent = luaSource();
  }

  function render() {
    renderTree();
    renderTabs();
    renderPanel();
    renderLua();
    showPicked();
    bindStateInputs();
  }

  function bindStateInputs() {
    const name = $("name");
    const id = $("id");
    const slot = $("slot");
    if (name) name.addEventListener("input", () => { state.name = name.value; renderTree(); renderLua(); });
    if (id) id.addEventListener("input", () => { state.id = id.value.trim(); renderLua(); });
    if (slot) slot.addEventListener("change", () => {
      const prevDefault = defaultIcon(state.slot);
      state.slot = slot.value;
      if (!state.panel_icon || state.panel_icon === prevDefault) {
        state.panel_icon = defaultIcon(state.slot);
      }
      render();
    });
  }

  $("tabs").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-tab]");
    if (!btn) return;
    tab = btn.dataset.tab;
    if (tab === "body") state.attachPick = "body";
    if (tab === "custom" || tab === "attach") state.attachPick = "boom";
    if (tab === "aim") {
      state.attachPick = "aim_p";
      catalogMode = "px";
    }
    render();
    renderCatalog();
  });

  $("tree").addEventListener("click", (ev) => {
    const openCustom = ev.target.closest("[data-open-custom]");
    if (openCustom) {
      focus = "root";
      tab = "custom";
      state.attachPick = "boom";
      render();
      renderCatalog();
      return;
    }
    const openAttach = ev.target.closest("[data-open-attach]");
    if (openAttach) {
      focus = "root";
      tab = "attach";
      state.attachPick = "boom";
      render();
      renderCatalog();
      return;
    }
    const btn = ev.target.closest("[data-focus]");
    if (!btn) return;
    if (btn.dataset.focus === "root") state.attachPick = "body";
    setFocus(btn.dataset.focus);
    renderCatalog();
  });

  $("panel").addEventListener("click", (ev) => {
    const fire = ev.target.closest("[data-fire]");
    if (fire) {
      state.fire = fire.dataset.fire;
      focus = "root";
      if (state.fire !== "power") {
        state.body.cluster = false;
        state.body.custom_cluster = false;
        state.body.homing = "off";
      }
      if (state.fire === "drop" && (state.body.sprite === "missile" || !state.body.sprite)) {
        state.body.sprite = "dynamite";
      }
      if (state.fire === "hitscan" || state.fire === "cursor") {
        catalogMode = "icon";
      }
      syncSlotFromTree();
      render();
      renderCatalog();
      return;
    }
    const customSite = ev.target.closest("[data-custom-site]");
    if (customSite) {
      state.body.custom_site = customSite.dataset.customSite;
      render();
      return;
    }
    const homing = ev.target.closest("[data-homing]");
    if (homing) {
      focusedBody().homing = homing.dataset.homing;
      if (focus === "root") syncSlotFromTree();
      render();
      return;
    }
    const boomHoming = ev.target.closest("[data-boom-homing]");
    if (boomHoming) {
      state.body.boom_homing = boomHoming.dataset.boomHoming;
      render();
      return;
    }
    const open = ev.target.closest("[data-open-child]");
    if (open) {
      setFocus(open.dataset.openChild);
      renderCatalog();
      return;
    }
    const pick = ev.target.closest("[data-attach-pick]");
    if (pick) {
      state.attachPick = pick.dataset.attachPick;
      if (aimingPick()) catalogMode = "px";
      render();
      renderCatalog();
      return;
    }
    const aimClear = ev.target.closest("[data-aim-clear]");
    if (aimClear) {
      state[aimClear.dataset.aimClear] = "";
      render();
      renderCatalog();
    }
  });

  $("panel").addEventListener("change", (ev) => {
    const flag = ev.target.dataset.flag;
    const body = state.body;
    if (flag === "fuse") {
      body.fuse = ev.target.checked;
      if (focus === "root") syncSlotFromTree();
    }
    if (flag === "homingOn") {
      if (ev.target.checked) {
        clearPowerExclusive("homing");
        body.homing = "lock";
      } else {
        body.homing = "off";
      }
      if (focus === "root") syncSlotFromTree();
    }
    if (flag === "cluster") {
      if (ev.target.checked) {
        clearPowerExclusive("stock");
        body.cluster = true;
        ensureChild(body);
      } else {
        body.cluster = false;
        focus = "root";
      }
      if (focus === "root") syncSlotFromTree();
    }
    if (flag === "custom_cluster") {
      if (ev.target.checked) {
        clearPowerExclusive("custom");
        body.custom_cluster = true;
        if (!body.custom_site) body.custom_site = "explode";
        state.attachPick = "boom";
        tab = "custom";
      } else {
        body.custom_cluster = false;
        if (tab === "custom") tab = "body";
      }
      if (focus === "root") syncSlotFromTree();
    }
    if (flag === "teleport") {
      state.teleport = ev.target.checked;
      syncSlotFromTree();
    }
    if (flag === "prox_on") body.prox_on = ev.target.checked;
    if (flag === "boom_on") {
      body.boom_on = ev.target.checked;
      if (!ev.target.checked) body.boom_cluster = false;
    }
    if (flag === "boom_cluster") {
      body.boom_cluster = ev.target.checked;
      if (ev.target.checked) {
        body.boom_on = true;
        state.attachPick = "boom";
      }
    }
    if (flag === "boom_impact") body.boom_impact = ev.target.checked;
    if (flag === "boom_bounce") body.boom_bounce = ev.target.checked;
    render();
  });

  $("panel").addEventListener("input", (ev) => {
    const key = ev.target.dataset.num;
    if (key) {
      if (key.startsWith("boom_") || key === "prox_id") state.body[key] = ev.target.value;
      else focusedBody()[key] = ev.target.value;
      renderLua();
      return;
    }
    const text = ev.target.dataset.text;
    if (text) {
      focusedBody()[text] = ev.target.value;
      renderLua();
    }
  });

  document.addEventListener("contextmenu", (ev) => {
    if (ev.target.closest(".catalog, .stage, .icon-grid")) ev.preventDefault();
  });

  $("catalog").addEventListener("click", (ev) => {
    const icon = ev.target.closest("button[data-icon]");
    if (icon) {
      state.panel_icon = icon.dataset.icon;
      render();
      renderCatalog();
      return;
    }
    const btn = ev.target.closest("button[data-name]");
    if (!btn) return;
    if (!bodySpriteLive()) return;
    if (canAimHold() && aimingPick()) {
      applyAimPick(state.attachPick, btn.dataset.name);
      render();
      renderCatalog();
      return;
    }
    if (usingCustomClusters() && (tab === "attach" || tab === "custom" || state.attachPick === "boom" || state.attachPick === "trail")) {
      if (state.attachPick === "trail") state.body.boom_trail = btn.dataset.name;
      else if (state.attachPick === "boom") state.body.boom_sprite = btn.dataset.name;
      else focusedBody().sprite = btn.dataset.name;
      render();
      renderCatalog();
      return;
    }
    focusedBody().sprite = btn.dataset.name;
    showPicked();
    renderTree();
    renderLua();
    paintCatalogWindow();
  });
  $("catalog").addEventListener("scroll", () => {
    if (catalogMode === "stock" || catalogMode === "px") paintCatalogWindow();
  });
  $("filter").addEventListener("input", renderCatalog);
  document.querySelector(".cat-mode").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-catmode]");
    if (!btn) return;
    catalogMode = btn.dataset.catmode;
    $("filter").value = "";
    $("catalog").scrollTop = 0;
    renderCatalog();
  });

  $("download").onclick = async () => {
    $("error").textContent = "";
    if (typeof JSZip === "undefined") {
      $("error").textContent = "zip library failed to load";
      return;
    }
    const id = state.id.trim();
    if (!/^[a-z][a-z0-9._-]{0,62}$/.test(id)) {
      $("error").textContent = "id must look like user.my_weapon";
      return;
    }
    const slot = inferCopyFrom();
    const folder = (id.split(".").pop() || "weapon").replace(/[^a-z0-9_-]/g, "_") || "weapon";
    const lua = luaSource();
    const toml = [
      `id = ${JSON.stringify(id)}`,
      'version = "0.1.0"',
      'author = "weapon-creator"',
      "api_version = 1",
      'entry = "weapons.lua"',
      "",
      "[weapons]",
      `register = [${JSON.stringify(id)}]`,
      `replace = [${JSON.stringify(slot)}]`,
      "",
      "[actors]",
      "register = []",
      "",
    ].join("\n");
    const zip = new JSZip();
    zip.file(`${folder}/mod.toml`, toml);
    zip.file(`${folder}/weapons.lua`, lua);
    for (const [path, file] of packFiles) {
      if (lua.includes(path) || lua.includes(file.name)) {
        zip.file(`${folder}/${path}`, file);
      }
    }
    const needed = new Set();
    for (const match of lua.matchAll(/sprites\/([A-Za-z0-9._-]+\.gif)/gi)) {
      needed.add(match[1]);
    }
    for (const name of needed) {
      const path = `sprites/${name}`;
      if (packFiles.has(path)) continue;
      const res = await fetch("px/" + encodeURIComponent(name));
      if (!res.ok) continue;
      zip.file(`${folder}/${path}`, await res.blob());
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${folder}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  $("add-gifs")?.addEventListener("click", () => $("gif-files").click());
  $("gif-files")?.addEventListener("change", (ev) => {
    for (const file of ev.target.files || []) {
      const name = file.name.replace(/\\/g, "/").split("/").pop();
      if (!/^[A-Za-z0-9._-]+\.(gif|png)$/i.test(name)) continue;
      const path = `sprites/${name}`;
      packFiles.set(path, file);
      catalog.px_sprites = catalog.px_sprites.filter((s) => s.path !== path);
      catalog.px_sprites.push({
        name: name.replace(/\.[^.]+$/, ""),
        file: name,
        path,
        preview: URL.createObjectURL(file),
        fw: 32,
        fh: 32,
        frames: 1,
      });
    }
    ev.target.value = "";
    catalogMode = "px";
    renderCatalog();
  });

  (async () => {
    const [sprites, meta, px] = await Promise.all([
      fetch("data/stock_sprites.json").then((r) => r.json()),
      fetch("data/catalog.json").then((r) => r.json()),
      fetch("data/px_sprites.json").then((r) => r.json()),
    ]);
    catalog = {
      sprites: (sprites || []).filter(usableStock),
      px_sprites: px,
      slots: meta.slots || [],
      icons: meta.icons || [],
      slot_icons: meta.slot_icons || {},
      templates: [],
    };
    render();
    bindStateInputs();
    renderCatalog();
  })();
})();
