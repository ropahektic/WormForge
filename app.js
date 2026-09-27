(() => {
  const $ = (id) => document.getElementById(id);
  const W = window.WepSchema;

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------
  let catalog = { sprites: [], px_sprites: [], slots: [], icons: [], slot_icons: {} };
  /** Stock records from Project X's default scheme: slot -> { slot, id, name, record, tail, strings, flags }. */
  const stock = new Map();
  let stockOrder = [];

  let tab = "fire";
  let catalogMode = "stock";
  let catalogHits = [];
  let pxShowAll = false;
  let aimFamilyCache = null;
  let stageRaf = 0;
  let aimWeaponImg = null;
  let aimBakeBusy = false;
  let aimPreviewRaf = 0;
  const packFiles = new Map();

  const state = {
    id: "user.my_weapon",
    name: "My Weapon",
    slot: "bazooka",
    panel_icon: "bazooka",
    /** Slot name of the base record, or "upload". */
    baseSlot: "bazooka",
    baseName: "Bazooka",
    record: new Uint8Array(W.ENTRY_SIZE),
    baseRecord: new Uint8Array(W.ENTRY_SIZE),
    tail: new Uint8Array(16),
    strings: [],
    flags: new Uint8Array(4),
    /** group -> donor slot, for the tree and the Lua header. */
    mix: {},
    /** Pack art that overrides the record's stock sprite ids. */
    sprites: { body: "", cluster: "", plane: "" },
    /** What the catalog click sets. */
    attachPick: "body",
    aim_p: "", aim_u: "", aim_d: "",
    draw_p: "", draw_u: "", draw_d: "",
    aimMode: "png",
    aimHand: "mid",
    aimScale: 1,
    aimRotate: 0,
    aimRadius: 8,
    aimHandRadius: 10,
    aimScrub: 16,
    aimWeaponSrc: "",
  };

  const rd = (off) => W.rd(state.record, off);
  const wr = (off, v) => W.wr(state.record, off, v);
  const ctx = () => W.context(state.record);
  const fam = () => ctx().fam;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function luaString(v) {
    return JSON.stringify(String(v));
  }
  function titleCase(slot) {
    return String(slot).split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  function stockName(slot) {
    const s = stock.get(slot);
    return s ? s.name : titleCase(slot);
  }
  function setError(msg) {
    $("error").textContent = msg || "";
  }

  // ---------------------------------------------------------------------
  // Base record / mix
  // ---------------------------------------------------------------------
  function loadBase(slot) {
    const s = stock.get(slot);
    if (!s) return;
    state.baseSlot = slot;
    state.baseName = s.name;
    state.record = s.record.slice();
    state.baseRecord = s.record.slice();
    state.tail = s.tail.slice();
    state.strings = s.strings.slice();
    state.flags = s.flags.slice();
    state.mix = {};
    state.sprites = { body: "", cluster: "", plane: "" };
  }

  function loadUploadedWep(name, bytes) {
    const wep = W.parseWep(bytes);
    state.baseSlot = "upload";
    state.baseName = wep.name || name;
    state.record = wep.record.slice();
    state.baseRecord = wep.record.slice();
    state.tail = wep.tail.slice();
    state.strings = wep.strings.slice();
    state.flags = wep.flags.slice();
    state.mix = {};
    state.sprites = { body: "", cluster: "", plane: "" };
    if (wep.name) state.name = wep.name;
    const px = W.pxSpriteFields(state.record);
    if (px.length) {
      setError(`${name} names Project X sprites at ${px.map((o) => "0x" + o.toString(16).toUpperCase()).join(", ")}; WA keeps the slot's stock art there unless you pick sprites in the Sprites tab.`);
    }
  }

  function hasEdits() {
    for (let o = 0; o < W.ENTRY_SIZE; o++) if (state.record[o] !== state.baseRecord[o]) return true;
    return false;
  }

  function borrowGroup(group, donorSlot) {
    if (!donorSlot || donorSlot === "__base") {
      W.borrow(group, state.record, state.baseRecord);
      delete state.mix[group];
      return;
    }
    const donor = stock.get(donorSlot);
    if (!donor) return;
    if (W.borrow(group, state.record, donor.record)) state.mix[group] = donorSlot;
    // Flight carries the body type; a homing weapon keeps homing through it.
    const sh = ctx().shift;
    if (group === "flight" && (ctx().fam === "missile" || ctx().fam === "strike") && rd(0xc4 + sh) !== 0) wr(0xa4 + sh, 1);
  }

  /** Groups a weapon of this family can mix. */
  function mixGroups() {
    const f = fam();
    const groups = [["fire", "Fire mode"], ["handling", "Handling"]];
    if (f === "missile" || f === "strike") {
      groups.push(["flight", "Flight"], ["explosion", "Explosion"], ["clusters", "Clusters / payload"], ["homing", "Homing"]);
    }
    if (f === "strike") groups.push(["strike", "Strike run"]);
    if (f === "hitscan") groups.push(["hitscan", "Gun"]);
    if (f === "arrow") groups.push(["arrow", "Arrow"]);
    if (f === "spray") groups.push(["spray", "Spray"]);
    if (f === "mine") groups.push(["mine", "Mine brain"]);
    if (f === "special") groups.push(["special", "Special parameters"]);
    return groups;
  }

  function groupLabel(group) {
    const hit = [["fire", "Fire mode"], ["handling", "Handling"], ["flight", "Flight"], ["explosion", "Explosion"],
      ["clusters", "Clusters / payload"], ["homing", "Homing"], ["strike", "Strike run"], ["hitscan", "Gun"],
      ["arrow", "Arrow"], ["spray", "Spray"], ["mine", "Mine brain"], ["special", "Special parameters"]].find(([g]) => g === group);
    return hit ? hit[1] : group;
  }

  function donorSelect(group) {
    const current = state.mix[group] || "__base";
    const withIt = [];
    const without = [];
    for (const slot of stockOrder) {
      if (slot === "none") continue;
      const s = stock.get(slot);
      (W.groupPresent(group, s.record) ? withIt : without).push(slot);
    }
    const opt = (slot) => `<option value="${slot}" ${slot === current ? "selected" : ""}>${esc(stockName(slot))}</option>`;
    return `<select class="donor" data-group="${group}">
      <option value="__base" ${current === "__base" ? "selected" : ""}>— ${esc(state.baseName)} (base)</option>
      ${withIt.length ? `<optgroup label="Has it">${withIt.map(opt).join("")}</optgroup>` : ""}
      ${without.length ? `<optgroup label="Other weapons">${without.map(opt).join("")}</optgroup>` : ""}
    </select>`;
  }

  // ---------------------------------------------------------------------
  // Field editing
  // ---------------------------------------------------------------------
  function fieldValueText(f, v) {
    if (f.type === "fixed") return (v / 65536).toFixed(3).replace(/\.?0+$/, "");
    return String(v);
  }

  function renderField(f) {
    const v = rd(f.abs);
    const base = W.rd(state.baseRecord, f.abs);
    const changed = v !== base;
    const off = `0x${f.abs.toString(16).toUpperCase()}`;
    let control;
    if (f.type === "bool") {
      control = `<label class="check"><input type="checkbox" data-off="${f.abs}" data-type="bool" ${v ? "checked" : ""} /><b>${v ? "yes" : "no"}</b></label>`;
    } else if (f.type === "enum") {
      const known = f.options.some(([val]) => val === v);
      control = `<select data-off="${f.abs}" data-type="enum">
        ${f.options.map(([val, label]) => `<option value="${val}" ${val === v ? "selected" : ""}>${esc(label)} (${val})</option>`).join("")}
        ${known ? "" : `<option value="${v}" selected>raw ${v}</option>`}
      </select>`;
    } else if (f.type === "sprite") {
      const info = catalog.sprites.find((s) => s.id === v);
      const px = v >= W.PX_SPRITE_BASE;
      control = `<div class="sprite-ro"><b>${v}</b> <span class="hint">${px ? "Project X sprite — pick pack art in Sprites" : info ? esc(info.name) : v === 0 ? "none" : "stock id"}</span>
        <input type="number" data-off="${f.abs}" data-type="int" value="${v}" class="narrow" /></div>`;
    } else {
      const step = f.type === "fixed" ? "0.001" : "1";
      const shown = f.type === "fixed" ? fieldValueText(f, v) : v;
      control = `<input type="number" step="${step}" data-off="${f.abs}" data-type="${f.type}" value="${shown}" />`;
    }
    const unit = f.type === "ms" ? "ms" : f.type === "fixed" ? "16.16" : "";
    return `<div class="fld ${changed ? "changed" : ""} ${f.sub ? "sub" : ""}">
      <div class="fld-head"><span class="fld-label">${esc(f.label)}</span><span class="off">${off}${unit ? " · " + unit : ""}</span></div>
      <div class="fld-ctl">${control}
        ${changed ? `<button type="button" class="reset" data-reset="${f.abs}" title="Back to ${esc(state.baseName)}: ${fieldValueText(f, base)}">↺</button>` : ""}
      </div>
      ${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ""}
    </div>`;
  }

  function fieldsFor(group) {
    return W.fields(state.record).filter((f) => f.group === group);
  }

  function groupPanel(group, intro) {
    const list = fieldsFor(group);
    const main = list.filter((f) => !f.sub);
    const sub = list.filter((f) => f.sub);
    return `
      <div class="mix-row"><span>Take <b>${esc(groupLabel(group))}</b> from</span>${donorSelect(group)}</div>
      ${intro ? `<p class="meta">${intro}</p>` : ""}
      <div class="grid">${main.map(renderField).join("")}</div>
      ${sub.length ? `<h3>Each cluster bit</h3><div class="grid">${sub.map(renderField).join("")}</div>` : ""}
    `;
  }

  /** Side effects after a field write: keep dependent fields coherent. */
  function afterWrite(off, v) {
    const c = ctx();
    if (off === 0x30) {
      // A new fire type needs a fire method / subtype that WA dispatches on.
      const donor = { 1: "bazooka", 2: "dynamite", 3: "air_strike", 4: "fire_punch", 0: "none" }[v];
      if (donor) {
        borrowGroup("fire", donor);
        delete state.mix.fire;
      }
      return;
    }
    if (c.fam !== "missile" && c.fam !== "strike") return;
    const sh = c.shift;
    if (off === 0xf0 + sh) {
      const count = rd(0xf8 + sh);
      if ((v === 1 || v === 3) && count === 0) {
        borrowGroup("clusters", "cluster_bomb");
        wr(0xf0 + sh, v);
      } else if (v === 2 && count === 0) {
        borrowGroup("clusters", "petrol_bomb");
        wr(0xf0 + sh, v);
      }
      return;
    }
    if (off === 0xc4 + sh) {
      if (v === 1 || v === 2) {
        if (rd(0xb0 + sh) === 0 || rd(0xa4 + sh) !== 1) {
          borrowGroup("homing", v === 1 ? "homing_missile" : "homing_pigeon");
        }
        wr(0xa4 + sh, 1);
        wr(0xc4 + sh, v);
      } else if (v === 0) {
        if (rd(0xa4 + sh) === 1) wr(0xa4 + sh, 2);
        for (let o = 0xb0; o <= 0xcc; o += 4) wr(o + sh, 0);
        wr(0xb8 + sh, 8);
        wr(0xac + sh, 1);
        if (sh === 0) {
          wr(0x0c, 1);
          const pose = rd(0x34);
          if (pose === 7 || pose === 12) wr(0x34, 3);
        }
        delete state.mix.homing;
      }
    }
  }

  function writeField(input) {
    const off = Number(input.dataset.off);
    const type = input.dataset.type;
    let v;
    if (type === "bool") v = input.checked ? 1 : 0;
    else if (type === "fixed") v = Math.round(Number(input.value || 0) * 65536);
    else v = Math.trunc(Number(input.value || 0));
    if (!Number.isFinite(v)) return;
    v = Math.max(-2147483648, Math.min(2147483647, v));
    wr(off, v);
    afterWrite(off, v);
  }

  // ---------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------
  function visibleTabs() {
    const f = fam();
    const tabs = [{ id: "fire", label: "Fire" }];
    if (f === "missile" || f === "strike") {
      if (f === "strike") tabs.push({ id: "strike", label: "Strike run" });
      tabs.push({ id: "flight", label: f === "strike" ? "Munition" : "Flight" });
      tabs.push({ id: "explosion", label: "Explosion" });
      tabs.push({ id: "clusters", label: W.spreadsFire(state.record) ? "Fire payload" : "Clusters" });
      tabs.push({ id: "homing", label: "Homing" });
    }
    if (f === "hitscan") tabs.push({ id: "hitscan", label: "Gun" });
    if (f === "arrow") tabs.push({ id: "arrow", label: "Arrow" });
    if (f === "spray") tabs.push({ id: "spray", label: "Spray" });
    if (f === "mine") tabs.push({ id: "mine", label: "Mine" });
    if (f === "special") tabs.push({ id: "special", label: "Special" });
    tabs.push({ id: "handling", label: "Handling" });
    tabs.push({ id: "sprites", label: "Sprites" });
    if (canAimHold()) tabs.push({ id: "aim", label: "Aiming" });
    tabs.push({ id: "advanced", label: "All fields" });
    return tabs;
  }

  function canAimHold() {
    const c = ctx();
    return c.ft === 1 || c.ft === 2;
  }

  function firePanel() {
    return groupPanel("fire", `Fire type picks WA's firing code; fire method and pose pick how the worm holds and releases it. Changing the type reloads the mode from a stock weapon of that type.`);
  }

  function handlingPanel() {
    return groupPanel("handling", "Turn handling for the slot. Ammo and the panel row stay with the slot you replace.");
  }

  function flightPanel() {
    const strike = fam() === "strike";
    return groupPanel("flight", strike
      ? "The munition the plane drops. Same layout as a thrown body, 0x14 bytes later in the record."
      : "How the body flies and what it does on touching land. The flight sprite id is stock art; pick pack art in Sprites.");
  }

  function explosionPanel() {
    return groupPanel("explosion", "Blast and timing. Choosing Eject clusters or Spread fire on an empty payload pulls the Cluster Bomb's or Petrol Bomb's payload in for you.");
  }

  function clustersPanel() {
    const fire = W.spreadsFire(state.record);
    const on = W.hasClusters(state.record) || fire;
    const intro = on
      ? fire
        ? "Fire spread on detonation: count, spread, flame life."
        : "Bits ejected on detonation. Each bit is a full body of its own: sprite, physics, fuse, even homing."
      : "This weapon ejects nothing on detonation. Set <b>On detonation</b> in Explosion, or take a payload from a stock weapon below.";
    return groupPanel("clusters", intro);
  }

  function homingPanel() {
    return groupPanel("homing", W.isHoming(state.record)
      ? "Lock on flies at the clicked target after the arm delay; dodge steers around land like the pigeon."
      : "Not homing. Set <b>Homing</b> to lock on or dodge to turn it on — the Homing Missile's or Pigeon's numbers come with it, and the worm clicks a target before firing.");
  }

  function familyPanel(group, intro) {
    return groupPanel(group, intro);
  }

  function spritesPanel() {
    const f = fam();
    const row = (key, label, note) => `<div class="pick-row"><span class="pick-label">${label}</span><b>${esc(state.sprites[key] || "stock")}</b>
      <button type="button" class="fire ${state.attachPick === key ? "active" : ""}" data-attach-pick="${key}">Catalog</button>
      ${state.sprites[key] ? `<button type="button" class="fire" data-sprite-clear="${key}">Clear</button>` : ""}
      ${note ? `<div class="hint">${note}</div>` : ""}</div>`;
    const bits = [];
    if (f === "missile" || f === "strike") {
      bits.push(row("body", f === "strike" ? "Munition" : "Flight body", `Stock id ${rd(0x60 + ctx().shift)} in the record; a pick here draws over it.`));
    }
    if (W.hasClusters(state.record)) {
      bits.push(row("cluster", "Cluster bit", `Stock id ${rd(0x124 + ctx().shift)} in the record.`));
    }
    if (f === "strike") {
      bits.push(row("plane", "Plane", `Stock jet id ${rd(0x38)} in the record.`));
    }
    if (!bits.length) bits.push(`<p class="meta">This weapon has no body of its own to re-skin. Aim sheets and the panel icon still apply.</p>`);
    return `
      <p class="meta">Stock names or PX gifs / uploaded PNGs. The record keeps its stock sprite ids; WormForge swaps the art at load.</p>
      ${bits.join("")}
      <div class="pick-row"><span class="pick-label">Panel icon</span><b>${esc(state.panel_icon || "—")}</b>
        <button type="button" class="fire ${catalogMode === "icon" ? "active" : ""}" data-pick-icon="1">Catalog</button></div>
      <button type="button" class="ghost" id="add-gifs-inline" style="margin-top:12px">Add GIF/PNG to pack…</button>
    `;
  }

  function advancedPanel() {
    const named = new Map();
    for (const f of W.fields(state.record)) if (!named.has(f.abs)) named.set(f.abs, f);
    const rows = [];
    for (let off = 0x0c; off <= 0x1cc; off += 4) {
      const v = rd(off);
      const base = W.rd(state.baseRecord, off);
      const f = named.get(off);
      const skip = W.NOT_IMPORTED.has(off);
      rows.push(`<tr class="${v !== base ? "changed" : ""} ${skip ? "skip" : ""}">
        <td class="off">0x${off.toString(16).toUpperCase().padStart(3, "0")}</td>
        <td>${f ? esc(f.label) : "<span class='hint'>unknown</span>"}</td>
        <td><input type="number" data-off="${off}" data-type="int" value="${v}" ${skip ? "disabled" : ""} /></td>
        <td class="basev">${base}</td>
        <td>${v !== base ? `<button type="button" class="reset" data-reset="${off}">↺</button>` : ""}</td>
      </tr>`);
    }
    return `
      <p class="meta">Every dword WormForge imports from the record, Fiddler style. Greyed rows stay with the slot (defined, availability, enabled). Silly values can crash WA.</p>
      <table class="raw"><thead><tr><th>Offset</th><th>Field</th><th>Value</th><th>Base</th><th></th></tr></thead><tbody>${rows.join("")}</tbody></table>
    `;
  }

  function renderPanel() {
    let html;
    switch (tab) {
      case "fire": html = firePanel(); break;
      case "flight": html = flightPanel(); break;
      case "explosion": html = explosionPanel(); break;
      case "clusters": html = clustersPanel(); break;
      case "homing": html = homingPanel(); break;
      case "strike": html = familyPanel("strike", "The plane run: how many munitions, how far apart, mines or missiles. The plane sprite lives in Fire."); break;
      case "hitscan": html = familyPanel("hitscan", "Instant bullets along the aim line."); break;
      case "arrow": html = familyPanel("arrow", "Arrow entity parameters (Longbow)."); break;
      case "spray": html = familyPanel("spray", "Flame spray parameters (Flame Thrower)."); break;
      case "mine": html = familyPanel("mine", "The mine's brain: who it sees, how long it waits, how hard it hits."); break;
      case "special": html = familyPanel("special", "Raw parameters for melee, rope and utility handlers. Meaning depends on the subtype."); break;
      case "handling": html = handlingPanel(); break;
      case "sprites": html = spritesPanel(); break;
      case "aim": html = aimPanel(); break;
      case "advanced": html = advancedPanel(); break;
      default: html = firePanel();
    }
    $("panel").innerHTML = html;
    if (tab === "aim" && state.aimMode === "png") {
      bindAimPngControls();
      scheduleAimPreview();
    }
    $("add-gifs-inline")?.addEventListener("click", () => $("gif-files").click());
  }

  function renderTabs() {
    const tabs = visibleTabs();
    if (!tabs.some((t) => t.id === tab)) tab = tabs[0].id;
    $("tabs").innerHTML = tabs
      .map((t) => `<button type="button" class="tab ${t.id === tab ? "active" : ""}" data-tab="${t.id}">${t.label}</button>`)
      .join("");
  }

  // ---------------------------------------------------------------------
  // Left column: weapon + mix
  // ---------------------------------------------------------------------
  function renderWeaponPanel() {
    const c = ctx();
    const famLabel = { missile: "flying body", hitscan: "hitscan gun", arrow: "arrow", spray: "spray", mine: "mine", strike: "air strike", special: "special", none: "nothing" }[c.fam];
    const mixed = Object.entries(state.mix);
    const dirty = hasEdits();
    $("weapon-panel").innerHTML = `
      <label class="field">Mod id</label>
      <input id="id" value="${esc(state.id)}" />
      <label class="field">Weapon name</label>
      <input id="name" value="${esc(state.name)}" maxlength="40" />
      <label class="field">Replaces panel slot</label>
      <select id="slot">${catalog.slots.map((s) => `<option value="${s}" ${s === state.slot ? "selected" : ""}>${esc(stockName(s))}</option>`).join("")}</select>
      <label class="field">Base weapon</label>
      <select id="base">
        ${stockOrder.filter((s) => s !== "none").map((s) => `<option value="${s}" ${s === state.baseSlot ? "selected" : ""}>${esc(stockName(s))}</option>`).join("")}
        ${state.baseSlot === "upload" ? `<option value="upload" selected>${esc(state.baseName)} (.wep)</option>` : ""}
      </select>
      <div class="btn-row">
        <button type="button" class="ghost" id="load-wep">Load .wep…</button>
        <button type="button" class="ghost" id="reset-base" ${dirty ? "" : "disabled"}>Reset to base</button>
      </div>
      <input id="wep-file" type="file" accept=".wep" hidden />
      <div class="summary">
        <div><span>Fires as</span><b>${esc(famLabel)}</b></div>
        <div><span>Type / method</span><b>${c.ft} / ${rd(0x34)} / ${c.fm}</b></div>
        ${W.hasClusters(state.record) ? `<div><span>Clusters</span><b>${rd(0xf8 + c.shift)} × ${esc(stockNameForSprite(rd(0x124 + c.shift)))}</b></div>` : ""}
        ${W.spreadsFire(state.record) ? `<div><span>Fire</span><b>${rd(0xf8 + c.shift)} flames</b></div>` : ""}
        ${W.isHoming(state.record) ? `<div><span>Homing</span><b>${rd(0xc4 + c.shift) === 2 ? "dodges land" : "locks on"}</b></div>` : ""}
      </div>
      <h2 style="margin-top:14px">Mix</h2>
      <p class="meta">Each group can come from another stock weapon. Fields you edit afterwards stay yours.</p>
      <div class="mix-list">
        ${mixGroups().map(([g, label]) => `<div class="mix-row"><span>${esc(label)}</span>${donorSelect(g)}</div>`).join("")}
      </div>
      ${mixed.length ? `<p class="meta">Mixed: ${mixed.map(([g, s]) => `${esc(groupLabel(g))} ← ${esc(stockName(s))}`).join(" · ")}</p>` : ""}
    `;
    bindWeaponPanel();
  }

  function stockNameForSprite(id) {
    const s = catalog.sprites.find((x) => x.id === id);
    return s ? s.name : `sprite ${id}`;
  }

  function bindWeaponPanel() {
    $("name").addEventListener("input", () => { state.name = $("name").value; renderLua(); });
    $("id").addEventListener("input", () => { state.id = $("id").value.trim(); renderLua(); });
    $("slot").addEventListener("change", () => {
      const prevDefault = defaultIcon(state.slot);
      state.slot = $("slot").value;
      if (!state.panel_icon || state.panel_icon === prevDefault) state.panel_icon = defaultIcon(state.slot);
      render();
      renderCatalog();
    });
    $("base").addEventListener("change", () => {
      const next = $("base").value;
      if (next === "upload") return;
      if (hasEdits() && !confirm(`Replace your edits with the ${stockName(next)}?`)) {
        $("base").value = state.baseSlot;
        return;
      }
      const prevDefault = defaultIcon(state.slot);
      loadBase(next);
      // Follow the base onto its own panel slot unless the user moved it.
      if (catalog.slots.includes(next)) {
        state.slot = next;
        if (!state.panel_icon || state.panel_icon === prevDefault) state.panel_icon = defaultIcon(next);
      }
      setError("");
      render();
      renderCatalog();
    });
    $("reset-base").addEventListener("click", () => {
      state.record = state.baseRecord.slice();
      state.mix = {};
      render();
    });
    $("load-wep").addEventListener("click", () => $("wep-file").click());
    $("wep-file").addEventListener("change", async (ev) => {
      const file = ev.target.files && ev.target.files[0];
      ev.target.value = "";
      if (!file) return;
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        setError("");
        loadUploadedWep(file.name, bytes);
        render();
        renderCatalog();
      } catch (err) {
        setError(`${file.name}: ${err.message || err}`);
      }
    });
  }

  // ---------------------------------------------------------------------
  // Lua + pack
  // ---------------------------------------------------------------------
  function packFolder() {
    return ((state.id.split(".").pop() || "weapon").replace(/[^a-z0-9_-]/g, "_")) || "weapon";
  }

  function aimPackPath(name) {
    if (!name) return "";
    const n = String(name).replace(/\\/g, "/");
    if (n.includes("/")) return n;
    if (/\.(gif|png)$/i.test(n)) return "sprites/" + n;
    return "sprites/" + n + ".gif";
  }

  function spriteLuaValue(name) {
    // Stock names go through as-is; pack files as sprites/<file>.
    if (!name) return null;
    if (isPxPath(name) || /\.(gif|png)$/i.test(name)) return aimPackPath(name);
    return name;
  }

  function emitWormSprites() {
    if (!canAimHold()) return [];
    const { aim_p: p, aim_u: u, aim_d: d } = state;
    if (!p && !u && !d) return [];
    const lines = [
      "  -- worm_sprites draw truecolor (GPU atlas) by default; set",
      "  -- params = { gpu_worm_sprites = false } to keep the 8-bit palette path.",
      "  worm_sprites = {",
    ];
    if (p) lines.push(`    weaponlnk = ${luaString(aimPackPath(p))},`);
    if (u) lines.push(`    weaponlnku = ${luaString(aimPackPath(u))},`);
    if (d) lines.push(`    weaponlnkd = ${luaString(aimPackPath(d))},`);
    if (state.draw_p) lines.push(`    wthrow = ${luaString(aimPackPath(state.draw_p))},`);
    if (state.draw_u) lines.push(`    wthrowu = ${luaString(aimPackPath(state.draw_u))},`);
    if (state.draw_d) lines.push(`    wthrowd = ${luaString(aimPackPath(state.draw_d))},`);
    lines.push("  },");
    return lines;
  }

  function mixSummary() {
    const bits = [`${state.baseName} record`];
    for (const [g, s] of Object.entries(state.mix)) bits.push(`${groupLabel(g).toLowerCase()} from ${stockName(s)}`);
    return bits.join(", ");
  }

  function luaSource() {
    const wepName = `${packFolder()}.wep`;
    const lines = [
      `-- ${state.name}: ${mixSummary()}.`,
      `-- ${wepName} is WA's weapon table entry for it; WormForge imports how it`,
      `-- fires onto the ${stockName(state.slot)} slot and swaps in the art below.`,
      "",
      "wa.weapons.replace({",
      `  weapon = ${luaString(state.slot)},`,
      `  wep = ${luaString(wepName)},`,
      `  name = ${luaString(state.name)},`,
    ];
    if (state.panel_icon) lines.push(`  panel_icon = ${luaString(state.panel_icon)},`);
    const body = spriteLuaValue(state.sprites.body);
    if (body) lines.push(`  sprite = ${luaString(body)},`);
    const bit = spriteLuaValue(state.sprites.cluster);
    if (bit && W.hasClusters(state.record)) lines.push(`  cluster = { sprite = ${luaString(bit)} },`);
    const plane = spriteLuaValue(state.sprites.plane);
    if (plane && fam() === "strike") lines.push(`  plane = ${luaString(plane)},`);
    lines.push(...emitWormSprites());
    lines.push("})");
    return lines.join("\n");
  }

  function renderLua() {
    $("preview").textContent = luaSource();
  }

  function wepBytes() {
    return W.buildWep({ record: state.record, tail: state.tail, strings: state.strings, flags: state.flags, name: state.name });
  }

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  $("download-wep").onclick = () => {
    setError("");
    saveBlob(new Blob([wepBytes()], { type: "application/octet-stream" }), `${packFolder()}.wep`);
  };

  $("download").onclick = async () => {
    setError("");
    if (typeof JSZip === "undefined") {
      setError("zip library failed to load");
      return;
    }
    const id = state.id.trim();
    if (!/^[a-z][a-z0-9._-]{0,62}$/.test(id)) {
      setError("id must look like user.my_weapon");
      return;
    }
    const folder = packFolder();
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
      `replace = [${JSON.stringify(state.slot)}]`,
      "",
      "[actors]",
      "register = []",
      "",
    ].join("\n");
    const zip = new JSZip();
    zip.file(`${folder}/mod.toml`, toml);
    zip.file(`${folder}/weapons.lua`, lua);
    zip.file(`${folder}/${folder}.wep`, wepBytes());
    for (const [path, file] of packFiles) {
      if (lua.includes(path) || lua.includes(file.name)) zip.file(`${folder}/${path}`, file);
    }
    const needed = new Set();
    for (const match of lua.matchAll(/sprites\/([A-Za-z0-9._-]+\.gif)/gi)) needed.add(match[1]);
    for (const name of needed) {
      const path = `sprites/${name}`;
      if (packFiles.has(path)) continue;
      const res = await fetch("px/" + encodeURIComponent(name));
      if (!res.ok) continue;
      zip.file(`${folder}/${path}`, await res.blob());
    }
    saveBlob(await zip.generateAsync({ type: "blob" }), `${folder}.zip`);
  };

  // ---------------------------------------------------------------------
  // Aiming (unchanged flow: GIF sets or bake from weapon art)
  // ---------------------------------------------------------------------
  function aimingPick() {
    return tab === "aim" && state.aimMode === "sets"
      && (state.attachPick === "aim_p" || state.attachPick === "aim_u" || state.attachPick === "aim_d");
  }
  function aimingWeaponPick() {
    return tab === "aim" && state.aimMode === "png";
  }

  function aimPanel() {
    const mode = state.aimMode === "png" ? "png" : "sets";
    const row = (key, label) => {
      const val = state[key] || "—";
      return `<div class="pick-row"><span class="pick-label">${label}</span><b>${esc(val)}</b>
        <button type="button" class="fire ${state.attachPick === key ? "active" : ""}" data-attach-pick="${key}">Catalog</button>
        ${state[key] ? `<button type="button" class="fire" data-aim-clear="${key}">Clear</button>` : ""}
      </div>`;
    };
    const setsBlock = `
      <label class="field">Hold sprites</label>
      ${row("aim_p", "Flat")}
      ${row("aim_u", "Uphill")}
      ${row("aim_d", "Downhill")}
      <p class="meta">Bound to panel slot <b>${esc(state.slot)}</b>. One sheet fills slopes; draw/undraw are eaten unless you bake via Generate custom.</p>
    `;
    const hands = [["mid", "Mid"], ["lower", "Lower"], ["upper", "Upper"]];
    const pngBlock = `
      <label class="field">Weapon art</label>
      <div class="pick-row"><span class="pick-label">Source</span><b>${esc(state.aimWeaponSrc || "—")}</b>
        ${state.aimWeaponSrc ? `<button type="button" class="fire" data-aim-weapon-clear="1">Clear</button>` : ""}
      </div>
      <p class="meta">Pick any Stock or PX sprite from the catalog (animated → first frame only), or upload a PNG.</p>
      <input type="file" id="aim-png" accept=".png,image/png" />
      <p class="meta">Upload: transparent PNG ≤60×60, grip at center. Catalog picks scale down to fit.</p>
      <label class="field">Hand</label>
      <div class="fires">
        ${hands.map(([id, title]) => `<button type="button" class="fire ${state.aimHand === id ? "active" : ""}" data-aim-hand="${id}">${title}</button>`).join("")}
      </div>
      <div class="aim-sliders">
        <label>Scale <input type="range" id="aim-scale" min="0.4" max="1.6" step="0.05" value="${state.aimScale}" /><span id="aim-scale-v">${state.aimScale.toFixed(2)}</span></label>
        <label>Rotate <input type="range" id="aim-rotate" min="-180" max="180" step="1" value="${state.aimRotate}" /><span id="aim-rotate-v">${state.aimRotate}°</span></label>
        <label>Radius <input type="range" id="aim-radius" min="0" max="20" step="1" value="${state.aimRadius}" /><span id="aim-radius-v">${state.aimRadius}</span></label>
        <label>Hand r <input type="range" id="aim-hand-r" min="0" max="22" step="1" value="${state.aimHandRadius}" /><span id="aim-hand-r-v">${state.aimHandRadius}</span></label>
        <label>Angle <input type="range" id="aim-scrub" min="0" max="31" step="1" value="${state.aimScrub}" /><span id="aim-scrub-v">${state.aimScrub}</span></label>
      </div>
      <div class="aim-preview"><canvas id="aim-preview" width="60" height="60"></canvas></div>
      <div class="aim-generate-row">
        <button type="button" class="aim-generate" id="aim-generate" ${aimBakeBusy ? "disabled" : ""}>${aimBakeBusy ? "Baking…" : "Generate"}</button>
        <span class="aim-generate-hint">&lt;--- Press to apply</span>
      </div>
      <p class="meta">Writes aim + draw GIFs for Flat / Uphill / Downhill into the pack, and uses the art as the flight body.</p>
      ${(state.aim_p || state.aim_u || state.aim_d) ? `
        <label class="field">Current</label>
        ${row("aim_p", "Flat")}
        ${row("aim_u", "Uphill")}
        ${row("aim_d", "Downhill")}
      ` : ""}
    `;
    return `
      <div class="aim-mode">
        <button type="button" class="${mode === "sets" ? "active" : ""}" data-aim-mode="sets">GIF sets</button>
        <button type="button" class="${mode === "png" ? "active" : ""}" data-aim-mode="png">Generate custom</button>
      </div>
      ${mode === "png" ? pngBlock : setsBlock}
    `;
  }

  function aimBakeOpts() {
    return { hand: state.aimHand, scale: state.aimScale, rotate: state.aimRotate, radius: state.aimRadius, handRadius: state.aimHandRadius };
  }

  function scheduleAimPreview() {
    if (aimPreviewRaf) cancelAnimationFrame(aimPreviewRaf);
    aimPreviewRaf = requestAnimationFrame(() => {
      aimPreviewRaf = 0;
      paintAimPreview();
    });
  }

  async function paintAimPreview() {
    const canvas = $("aim-preview");
    if (!canvas || typeof AimBake === "undefined") return;
    const c2 = canvas.getContext("2d");
    c2.clearRect(0, 0, 60, 60);
    try {
      const bases = await AimBake.loadPreviewBases("p");
      const hand = await AimBake.loadHandImage(state.aimHand);
      const worm = bases[Math.min(state.aimScrub, bases.length - 1)];
      const ang = AimBake.aimAngle(state.aimScrub, AimBake.AIM_FRAMES);
      if (!aimWeaponImg) {
        c2.putImageData(worm, (60 - worm.width) / 2, (60 - worm.height) / 2);
        return;
      }
      c2.putImageData(AimBake.previewFrame(aimWeaponImg, hand, worm, ang, aimBakeOpts()), 0, 0);
    } catch (err) {
      c2.fillStyle = "#888";
      c2.font = "10px sans-serif";
      c2.fillText(String(err.message || err).slice(0, 40), 2, 30);
    }
  }

  function bindAimPngControls() {
    const png = $("aim-png");
    if (png) {
      png.addEventListener("change", async () => {
        const file = png.files && png.files[0];
        if (!file) return;
        try {
          aimWeaponImg = await AimBake.staticFromPngFile(file);
          state.aimWeaponSrc = file.name;
          setError("");
          renderPanel();
          renderCatalog();
        } catch (err) {
          setError(String(err.message || err));
          aimWeaponImg = null;
          state.aimWeaponSrc = "";
        }
      });
    }
    const bindRange = (id, key, fmt) => {
      const el = $(id);
      const lab = $(`${id}-v`);
      if (!el) return;
      el.addEventListener("input", () => {
        state[key] = Number(el.value);
        if (lab) lab.textContent = fmt ? fmt(state[key]) : String(state[key]);
        scheduleAimPreview();
      });
    };
    bindRange("aim-scale", "aimScale", (v) => v.toFixed(2));
    bindRange("aim-rotate", "aimRotate", (v) => `${Math.round(v)}°`);
    bindRange("aim-radius", "aimRadius");
    bindRange("aim-hand-r", "aimHandRadius");
    bindRange("aim-scrub", "aimScrub");
    $("aim-generate")?.addEventListener("click", () => generateAimFromPng());
  }

  async function setAimWeaponFromCatalog(value) {
    if (typeof AimBake === "undefined") throw new Error("Aim baker failed to load");
    const info = spriteInfo(value);
    const px = isPxPath(value) || !!(info && info.file);
    if (px) {
      const url = info ? spriteThumb(info) : ("px/" + encodeURIComponent(pxFile(value)));
      if (!url) throw new Error("no preview for " + value);
      const asPng = /\.png$/i.test(url) || (info && info.file && /\.png$/i.test(info.file));
      aimWeaponImg = asPng
        ? await AimBake.staticFromStripUrl(url, info && info.fw, info && info.fh)
        : await AimBake.staticFromGifUrl(url);
    } else {
      if (!info || !info.preview) throw new Error("no stock preview for " + value);
      aimWeaponImg = await AimBake.staticFromStripUrl(info.preview, info.fw, info.fh);
    }
    state.aimWeaponSrc = value;
    setError("");
  }

  async function generateAimFromPng() {
    if (aimBakeBusy) return;
    setError("");
    if (typeof AimBake === "undefined") {
      setError("Aim baker failed to load");
      return;
    }
    if (!aimWeaponImg) {
      setError("Pick a Stock/PX sprite or upload a PNG first");
      return;
    }
    const err = AimBake.validateWeapon(aimWeaponImg);
    if (err) {
      setError(err);
      return;
    }
    aimBakeBusy = true;
    renderPanel();
    try {
      const baked = await AimBake.bakeAll(aimWeaponImg, aimBakeOpts());
      const stamp = Date.now().toString(36);
      // Flight body must be the same art — HM lock blits a separate bank seeded
      // from the weapon entry, so aim-only packs still swap to stock mid-air.
      try {
        const flightName = `flight_${stamp}.png`;
        const flightPath = `sprites/${flightName}`;
        const canvas = document.createElement("canvas");
        canvas.width = aimWeaponImg.naturalWidth || aimWeaponImg.width;
        canvas.height = aimWeaponImg.naturalHeight || aimWeaponImg.height;
        canvas.getContext("2d").drawImage(aimWeaponImg, 0, 0);
        const blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("flight png"))), "image/png"));
        const flightFile = new File([blob], flightName, { type: "image/png" });
        packFiles.set(flightPath, flightFile);
        catalog.px_sprites = catalog.px_sprites.filter((s) => s.path !== flightPath);
        catalog.px_sprites.push({ name: flightName.replace(/\.png$/i, ""), file: flightName, path: flightPath, preview: URL.createObjectURL(flightFile), fw: canvas.width, fh: canvas.height, frames: 1 });
        if (fam() === "missile" || fam() === "strike") state.sprites.body = flightPath;
      } catch (flightErr) {
        console.warn("aim bake: flight sprite pack failed", flightErr);
      }
      for (const slope of ["p", "u", "d"]) {
        const aimName = `aim_${slope}_${stamp}.gif`;
        const drawName = `draw_${slope}_${stamp}.gif`;
        const aimPath = `sprites/${aimName}`;
        const drawPath = `sprites/${drawName}`;
        const aimFile = new File([baked[slope].aim], aimName, { type: "image/gif" });
        const drawFile = new File([baked[slope].draw], drawName, { type: "image/gif" });
        packFiles.set(aimPath, aimFile);
        packFiles.set(drawPath, drawFile);
        catalog.px_sprites = catalog.px_sprites.filter((s) => s.path !== aimPath);
        catalog.px_sprites.push({ name: aimName.replace(/\.gif$/i, ""), file: aimName, path: aimPath, preview: URL.createObjectURL(aimFile), fw: 60, fh: 60, frames: 32 });
        state[`aim_${slope}`] = aimPath;
        state[`draw_${slope}`] = drawPath;
      }
      aimFamilyCache = null;
      render();
      renderCatalog();
    } catch (e) {
      setError(String(e.message || e));
      aimBakeBusy = false;
      renderPanel();
      return;
    }
    aimBakeBusy = false;
    renderPanel();
  }

  function slopeFamily(path) {
    const n = String(path || "").replace(/\\/g, "/");
    const m = n.match(/^(.*?)([pud])(\.[^.]+)?$/i);
    if (!m) return null;
    const base = m[1];
    const ext = m[3] || "";
    return { p: base + "p" + ext, u: base + "u" + ext, d: base + "d" + ext };
  }

  function pxStem(s) {
    const raw = String((s && (s.name || s.file)) || "").replace(/\\/g, "/");
    const file = raw.includes("/") ? raw.slice(raw.lastIndexOf("/") + 1) : raw;
    return file.replace(/\.(gif|png)$/i, "");
  }

  function aimFamilies() {
    if (aimFamilyCache) return aimFamilyCache;
    const by = new Map();
    for (const s of catalog.px_sprites || []) {
      const m = pxStem(s).match(/^(.*)([pud])$/i);
      if (!m) continue;
      let row = by.get(m[1]);
      if (!row) {
        row = {};
        by.set(m[1], row);
      }
      row[m[2].toLowerCase()] = s;
    }
    const out = [];
    for (const [base, parts] of by) {
      if (!parts.p || !parts.u || !parts.d) continue;
      out.push({ base, label: base.replace(/_+$/, "") || base, p: parts.p, u: parts.u, d: parts.d });
    }
    out.sort((a, b) => a.label.localeCompare(b.label));
    aimFamilyCache = out;
    return out;
  }

  function applyAimFamily(family) {
    state.aim_p = spriteValue(family.p);
    state.aim_u = spriteValue(family.u);
    state.aim_d = spriteValue(family.d);
    state.draw_p = state.draw_u = state.draw_d = "";
  }

  function catalogHasPath(path) {
    if (!path) return false;
    const src = [...(catalog.px_sprites || []), ...(catalog.sprites || [])];
    return src.some((s) => spriteValue(s) === path || s.name === path || s.file === pxFile(path));
  }

  function applyAimPick(slot, value) {
    state[slot] = value;
    state.draw_p = state.draw_u = state.draw_d = "";
    const f = slopeFamily(value);
    if (!f) return;
    const fill = (key, path) => {
      if (state[key]) return;
      if (catalogHasPath(path)) state[key] = path;
    };
    if (slot === "aim_p") { fill("aim_u", f.u); fill("aim_d", f.d); }
    else if (slot === "aim_u") { fill("aim_p", f.p); fill("aim_d", f.d); }
    else { fill("aim_p", f.p); fill("aim_u", f.u); }
  }

  // ---------------------------------------------------------------------
  // Sprite catalog (right column)
  // ---------------------------------------------------------------------
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
  function spriteInfo(name) {
    if (!name) return;
    const px = (catalog.px_sprites || []).find((s) => s.path === name || s.file === pxFile(name) || s.name === name);
    if (px) return px;
    return catalog.sprites.find((s) => s.name === name);
  }
  function defaultIcon(slot) {
    return catalog.slot_icons[slot] || slot;
  }

  /** Is the catalog currently picking a sprite (vs. a panel icon)? */
  function spritePickLive() {
    return aimingPick() || aimingWeaponPick() || ["body", "cluster", "plane"].includes(state.attachPick);
  }

  function catalogSelected() {
    if (aimingWeaponPick()) return state.aimWeaponSrc || "";
    if (aimingPick()) return state[state.attachPick] || "";
    if (["body", "cluster", "plane"].includes(state.attachPick)) return state.sprites[state.attachPick] || "";
    return "";
  }

  function thumbBox(fw, fh) {
    const scale = Math.min(36 / Math.max(fw, 1), 36 / Math.max(fh, 1));
    return { w: Math.max(1, Math.round(fw * scale)), h: Math.max(1, Math.round(fh * scale)) };
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

  function pickTargetLabel() {
    if (aimingWeaponPick()) return "aim weapon art";
    if (aimingPick()) return { aim_p: "flat hold sheet", aim_u: "uphill hold sheet", aim_d: "downhill hold sheet" }[state.attachPick];
    return { body: fam() === "strike" ? "munition sprite" : "flight body", cluster: "cluster bit", plane: "plane" }[state.attachPick] || "sprite";
  }

  function showPicked() {
    const img = $("sprite-img");
    if (catalogMode === "icon") {
      const icon = state.panel_icon;
      $("picked").textContent = icon ? `panel icon ${icon}` : "none";
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
      ? `${pickTargetLabel()}: ${sprite}${!px && info && info.id != null ? `  (#${info.id})` : ""}${px ? "  (pack gif)" : ""}${!px && info && info.frames > 1 ? `  ${info.frames} frames` : ""}`
      : `${pickTargetLabel()}: stock`;
    if (sprite) {
      img.style.display = "block";
      img.onload = () => {
        if (px) {
          layoutStage({ fw: img.naturalWidth || (info && info.fw) || 32, fh: img.naturalHeight || (info && info.fh) || 32, frames: 1, fps: 10 });
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
    const win = `${start}:${end}:${selected}:${catalogHits.length}:${catalogMode}:${aimingPick() && !pxShowAll ? "fam" : "all"}`;
    if (el.dataset.win === win) return;
    el.dataset.win = win;
    const keep = el.scrollTop;
    let html = `<div class="cat-spacer" style="height:${catalogHits.length * ROW}px">`;
    for (let i = start; i < end; i++) {
      const s = catalogHits[i];
      const box = thumbBox(s.fw || 32, s.fh || 32);
      const value = spriteValue(s);
      if (s._aimFamily) {
        const f = s._aimFamily;
        const sel = state.aim_p === spriteValue(f.p) && state.aim_u === spriteValue(f.u) && state.aim_d === spriteValue(f.d);
        html += `<button type="button" data-aim-family="${esc(f.base)}" class="${sel ? "selected" : ""}" style="top:${i * ROW}px;height:${ROW}px"><span class="thumb" style="width:${box.w}px;height:${box.h}px"><img src="${spriteThumb(f.p)}" alt="" draggable="false" style="width:${box.w}px" /></span><span>${esc(f.label)}</span><span class="sid">p/u/d</span></button>`;
      } else {
        html += `<button type="button" data-name="${esc(value)}" class="${value === selected ? "selected" : ""}" style="top:${i * ROW}px;height:${ROW}px"><span class="thumb" style="width:${box.w}px;height:${box.h}px"><img src="${spriteThumb(s)}" alt="" draggable="false" style="width:${box.w}px" /></span><span>${esc(s.name)}</span><span class="sid">${s.file ? "gif" : (s.id == null ? "—" : s.id)}</span></button>`;
      }
    }
    html += "</div>";
    el.innerHTML = html;
    el.scrollTop = keep;
  }

  function renderCatalog() {
    const picking = spritePickLive();
    $("mode-stock").hidden = !picking || aimingPick();
    $("mode-px").hidden = !picking;
    if (!picking && catalogMode !== "icon") catalogMode = "icon";
    if (picking && catalogMode === "icon") catalogMode = aimingPick() ? "px" : "stock";
    if (aimingPick() && catalogMode !== "px") catalogMode = "px";
    $("mode-stock").classList.toggle("active", catalogMode === "stock");
    $("mode-px").classList.toggle("active", catalogMode === "px");
    $("mode-icon").classList.toggle("active", catalogMode === "icon");
    const more = $("px-more");
    const showMore = aimingPick() && catalogMode === "px";
    more.hidden = !showMore;
    more.textContent = pxShowAll ? "Show Relevant" : "Show All";
    $("filter").placeholder = catalogMode === "icon"
      ? "filter panel icons…"
      : aimingPick() && catalogMode === "px" && !pxShowAll
        ? "filter aim sets…"
        : catalogMode === "px" ? "filter PX gifs…" : "filter stock sprites…";
    $("catalog").dataset.win = "";
    if (catalogMode === "icon") {
      paintIcons();
      return;
    }
    const q = $("filter").value.trim().toLowerCase();
    if (aimingPick() && catalogMode === "px" && !pxShowAll) {
      const fams = aimFamilies().filter((f) => !q || f.label.toLowerCase().includes(q) || f.base.toLowerCase().includes(q));
      catalogHits = fams.map((f) => ({ ...f.p, name: f.label, _aimFamily: f }));
      $("sprite-count").textContent = q ? `${catalogHits.length} / ${aimFamilies().length} aim` : `${catalogHits.length} aim`;
    } else {
      const src = spriteSource();
      catalogHits = src.filter((s) => !q || s.name.toLowerCase().includes(q) || String(s.id ?? "").includes(q) || (s.file && s.file.toLowerCase().includes(q)));
      $("sprite-count").textContent = q ? `${catalogHits.length} / ${src.length}` : `${src.length} ${catalogMode === "px" ? "gifs" : "sprites"}`;
    }
    paintCatalogWindow();
    showPicked();
  }

  // ---------------------------------------------------------------------
  // Render + events
  // ---------------------------------------------------------------------
  function render() {
    renderWeaponPanel();
    renderTabs();
    renderPanel();
    renderLua();
    showPicked();
  }

  $("tabs").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-tab]");
    if (!btn) return;
    tab = btn.dataset.tab;
    if (tab === "sprites") {
      state.attachPick = (fam() === "missile" || fam() === "strike") ? "body" : "icon";
      if (state.attachPick === "icon") catalogMode = "icon";
    } else if (tab === "aim") {
      state.attachPick = state.aimMode === "png" ? "aim_weapon" : "aim_p";
      catalogMode = state.aimMode === "png" ? (catalogMode === "stock" ? "stock" : "px") : "px";
      pxShowAll = state.aimMode === "png";
    } else {
      pxShowAll = false;
    }
    render();
    renderCatalog();
  });

  // Mix donors live in both the left column and each tab.
  document.addEventListener("change", (ev) => {
    const sel = ev.target.closest("select.donor");
    if (!sel) return;
    borrowGroup(sel.dataset.group, sel.value);
    render();
    renderCatalog();
  });

  $("panel").addEventListener("click", (ev) => {
    const reset = ev.target.closest("[data-reset]");
    if (reset) {
      const off = Number(reset.dataset.reset);
      wr(off, W.rd(state.baseRecord, off));
      render();
      return;
    }
    const aimMode = ev.target.closest("[data-aim-mode]");
    if (aimMode) {
      state.aimMode = aimMode.dataset.aimMode;
      if (state.aimMode === "sets") {
        state.attachPick = "aim_p";
        catalogMode = "px";
        pxShowAll = false;
      } else {
        state.attachPick = "aim_weapon";
        if (catalogMode === "icon") catalogMode = "px";
        pxShowAll = true;
      }
      render();
      renderCatalog();
      return;
    }
    const aimHand = ev.target.closest("[data-aim-hand]");
    if (aimHand) {
      state.aimHand = aimHand.dataset.aimHand;
      renderPanel();
      return;
    }
    if (ev.target.closest("[data-aim-weapon-clear]")) {
      state.aimWeaponSrc = "";
      aimWeaponImg = null;
      render();
      renderCatalog();
      return;
    }
    const pick = ev.target.closest("[data-attach-pick]");
    if (pick) {
      state.attachPick = pick.dataset.attachPick;
      if (aimingPick()) {
        state.aimMode = "sets";
        catalogMode = "px";
      } else if (catalogMode === "icon") {
        catalogMode = "stock";
      }
      render();
      renderCatalog();
      return;
    }
    if (ev.target.closest("[data-pick-icon]")) {
      state.attachPick = "icon";
      catalogMode = "icon";
      render();
      renderCatalog();
      return;
    }
    const spriteClear = ev.target.closest("[data-sprite-clear]");
    if (spriteClear) {
      state.sprites[spriteClear.dataset.spriteClear] = "";
      render();
      renderCatalog();
      return;
    }
    const aimClear = ev.target.closest("[data-aim-clear]");
    if (aimClear) {
      const key = aimClear.dataset.aimClear;
      state[key] = "";
      if (key === "aim_p") state.draw_p = "";
      if (key === "aim_u") state.draw_u = "";
      if (key === "aim_d") state.draw_d = "";
      render();
      renderCatalog();
    }
  });

  /** Offsets whose edits reshape the form (fire type, detonation, homing). */
  function reshapes(off) {
    const sh = ctx().shift;
    return off === 0x30 || off === 0x38 || off === 0xf0 + sh || off === 0xc4 + sh || off === 0xa4 + sh;
  }

  $("panel").addEventListener("change", (ev) => {
    const el = ev.target;
    if (!el.dataset || el.dataset.off == null) return;
    writeField(el);
    render();
  });

  $("panel").addEventListener("input", (ev) => {
    const el = ev.target;
    if (!el.dataset || el.dataset.off == null) return;
    if (el.dataset.type === "bool" || el.tagName === "SELECT") return;
    const off = Number(el.dataset.off);
    if (reshapes(off)) return; // applied on change, so typing does not tear the form down
    writeField(el);
    // Keep focus: refresh everything but the field grid.
    renderWeaponPanel();
    renderLua();
    const box = el.closest(".fld, tr");
    if (box) box.classList.toggle("changed", rd(off) !== W.rd(state.baseRecord, off));
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
    const famBtn = ev.target.closest("button[data-aim-family]");
    if (famBtn) {
      const f = aimFamilies().find((x) => x.base === famBtn.dataset.aimFamily);
      if (f) {
        applyAimFamily(f);
        render();
        renderCatalog();
      }
      return;
    }
    const btn = ev.target.closest("button[data-name]");
    if (!btn) return;
    if (!spritePickLive()) return;
    if (aimingWeaponPick()) {
      setAimWeaponFromCatalog(btn.dataset.name)
        .then(() => { render(); renderCatalog(); })
        .catch((err) => setError(String(err.message || err)));
      return;
    }
    if (aimingPick()) {
      applyAimPick(state.attachPick, btn.dataset.name);
      render();
      renderCatalog();
      return;
    }
    state.sprites[state.attachPick] = btn.dataset.name;
    render();
    paintCatalogWindow();
    showPicked();
  });
  $("catalog").addEventListener("scroll", () => {
    if (catalogMode === "stock" || catalogMode === "px") paintCatalogWindow();
  });
  $("filter").addEventListener("input", renderCatalog);
  $("px-more").addEventListener("click", () => {
    pxShowAll = !pxShowAll;
    $("catalog").scrollTop = 0;
    renderCatalog();
  });
  document.querySelector(".cat-mode").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-catmode]");
    if (!btn) return;
    catalogMode = btn.dataset.catmode;
    if (catalogMode === "icon") state.attachPick = "icon";
    else if (!spritePickLive()) state.attachPick = (fam() === "missile" || fam() === "strike") ? "body" : "body";
    if (catalogMode !== "px") pxShowAll = false;
    $("filter").value = "";
    $("catalog").scrollTop = 0;
    renderCatalog();
  });

  $("add-gifs")?.addEventListener("click", () => $("gif-files").click());
  $("gif-files")?.addEventListener("change", (ev) => {
    for (const file of ev.target.files || []) {
      const name = file.name.replace(/\\/g, "/").split("/").pop();
      if (!/^[A-Za-z0-9._-]+\.(gif|png)$/i.test(name)) continue;
      const path = `sprites/${name}`;
      packFiles.set(path, file);
      catalog.px_sprites = catalog.px_sprites.filter((s) => s.path !== path);
      catalog.px_sprites.push({ name: name.replace(/\.[^.]+$/, ""), file: name, path, preview: URL.createObjectURL(file), fw: 32, fh: 32, frames: 1 });
    }
    ev.target.value = "";
    aimFamilyCache = null;
    catalogMode = "px";
    if (!spritePickLive()) state.attachPick = "body";
    renderCatalog();
  });

  // ---------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------
  (async () => {
    const [sprites, meta, px, weps] = await Promise.all([
      fetch("data/stock_sprites.json").then((r) => r.json()),
      fetch("data/catalog.json").then((r) => r.json()),
      fetch("data/px_sprites.json").then((r) => r.json()),
      fetch("data/stock_weps.json").then((r) => r.json()),
    ]);
    catalog = {
      sprites: (sprites || []).filter(usableStock),
      px_sprites: px,
      slots: meta.slots || [],
      icons: meta.icons || [],
      slot_icons: meta.slot_icons || {},
    };
    for (const w of weps) {
      stock.set(w.slot, {
        slot: w.slot,
        id: w.id,
        name: w.name,
        record: W.base64ToBytes(w.record),
        tail: W.base64ToBytes(w.tail),
        strings: w.strings || [w.name],
        flags: W.base64ToBytes(w.flags),
      });
      stockOrder.push(w.slot);
    }
    loadBase("bazooka");
    state.panel_icon = defaultIcon(state.slot);
    aimFamilyCache = null;
    render();
    renderCatalog();
  })();

  // For console inspection / tests: the exact bytes and Lua the pack gets.
  window.WFEditor = { luaSource, wepBytes, loadUploadedWep, render, state };
})();
