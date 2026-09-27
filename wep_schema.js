/*
 * WA 3.8.1 weapon table entry (0x1D0 bytes) as a Project X .wep carries it.
 *
 * Field names and offsets come from WormForge's crates/game/src/offsets.rs,
 * re/WeaponEntry.toml, re/MineEntity.toml, and OpenWA's WeaponFireParams
 * (openwa-game/src/game/weapon.rs), cross-checked against the 71 stock
 * records in Project X's default scheme (data/stock_weps.json).
 *
 * Every field is a little-endian dword. "fixed" fields are 16.16 fixed point.
 * A strike's munition reuses the missile layout shifted 0x14 bytes later
 * (WormForge weapons::wep STRIKE_SPRITE_FIELDS), so missile fields carry a
 * `slab` flag and the app adds the shift for fire type 3.
 */
window.WepSchema = (() => {
  const ENTRY_SIZE = 0x1d0;
  const TAG = [0x06, 0xdd, 0xbb, 0x5a];
  const STRINGS_AT = 0x1e4;
  const STRING_COUNT = 20;
  const STRIKE_SHIFT = 0x14;
  const PX_SPRITE_BASE = 100000;
  const LAST_STOCK_SPRITE = 696;

  const FIRE_TYPES = [
    [0, "None / utility"],
    [1, "Projectile (aim & fire)"],
    [2, "Placed (drop at worm)"],
    [3, "Strike (plane)"],
    [4, "Special (melee, rope, powerups)"],
  ];
  const FIRE_METHODS = [
    [1, "Placed explosive / spray"],
    [2, "Hitscan gun"],
    [3, "Missile body"],
    [4, "Arrow"],
  ];
  // WeaponEntry+0x34 for projectiles: which hold pose / firing flow WA uses.
  const HOLD_POSES = [
    [1, "Uzi"],
    [2, "Grenade throw"],
    [3, "Bazooka shoulder"],
    [4, "Minigun"],
    [5, "Shotgun"],
    [6, "Handgun"],
    [7, "Target click, then fire (Pigeon / Magic Bullet)"],
    [8, "Sheep Launcher"],
    [9, "Flame Thrower"],
    [10, "Longbow"],
    [11, "Mortar"],
    [12, "Target click, then fire (Homing Missile)"],
  ];
  const SPECIAL_SUBTYPES = [
    [1, "Fire Punch"], [2, "Baseball Bat"], [3, "Dragon Ball"], [4, "Kamikaze"],
    [5, "Suicide Bomber"], [6, "Ninja Rope"], [7, "Bungee"], [8, "Pneumatic Drill"],
    [9, "Prod"], [10, "Teleport"], [11, "Blow Torch"], [12, "Parachute"],
    [13, "Surrender"], [14, "Skip Go"], [15, "Select Worm"], [16, "Nuclear Test"],
    [17, "Girder"], [18, "Battle Axe"], [19, "Utility powerup"], [20, "Freeze"],
    [21, "Earthquake"], [22, "Scales of Justice"], [23, "Jet Pack"], [24, "Armageddon"],
  ];
  const IMPACT_TYPES = [
    [0, "Sits where it lands"],
    [1, "Bounces (grenade)"],
    [2, "Explodes on contact (bazooka)"],
    [3, "Glides (pigeon)"],
    [4, "Bullet (handgun)"],
    [5, "Bullet (uzi)"],
    [6, "Walks (animal)"],
  ];
  const MISSILE_TYPES = [
    [0, "Not a flying body"],
    [1, "Homing"],
    [2, "Standard"],
    [3, "Animal (self driven)"],
    [4, "Mole"],
    [5, "Launcher payload"],
  ];
  const DETONATION = [
    [0, "Explosion only"],
    [1, "Eject clusters"],
    [2, "Spread fire (petrol)"],
    [3, "Eject clusters (alt)"],
  ];
  const HOMING_KINDS = [
    [0, "Off"],
    [1, "Lock on target"],
    [2, "Dodge terrain (pigeon / magic bullet)"],
  ];
  const MUNITIONS = [
    [0, "Mines"],
    [2, "Missiles"],
  ];

  const F = (off, key, label, type, extra) => Object.assign({ off, key, label, type: type || "int" }, extra || {});

  // ---- Entry header (never shifted) -----------------------------------
  const HEADER = [
    F(0x30, "fire_type", "Fire type", "enum", { options: FIRE_TYPES, group: "fire" }),
    F(0x38, "fire_method", "Fire method", "enum", { options: FIRE_METHODS, group: "fire", when: (r) => r.ft === 1 || r.ft === 2 }),
    F(0x38, "plane_sprite", "Plane sprite id", "int", { group: "fire", when: (r) => r.ft === 3, hint: "Stock jet ids 86–91. Pick pack art in Sprites → Plane." }),
    F(0x38, "special_param", "Subtype parameter", "int", { group: "fire", when: (r) => r.ft === 4 }),
    F(0x34, "hold_pose", "Hold pose / firing flow", "enum", { options: HOLD_POSES, group: "fire", when: (r) => r.ft === 1 }),
    F(0x34, "special_subtype", "Special weapon", "enum", { options: SPECIAL_SUBTYPES, group: "fire", when: (r) => r.ft === 4 }),
    F(0x34, "subtype_param", "Subtype parameter", "int", { group: "fire", when: (r) => r.ft === 2 || r.ft === 3 || r.ft === 0 }),
    F(0x0c, "requires_aiming", "Needs aiming (crosshair)", "bool", { group: "handling" }),
    F(0x14, "shots", "Shots per turn", "int", { group: "handling", hint: "Shotgun 2, Longbow 2, Girder Pack 5" }),
    F(0x18, "uses_turn", "Counts as a turn", "bool", { group: "handling", hint: "0 for rope, bungee, parachute, jet pack, powerups" }),
    F(0x1c, "retreat", "Retreat time", "ms", { group: "handling", hint: "-1 none, -1000 drill/teleport, 5000 dynamite/mine" }),
    F(0x20, "creates_projectile", "Creates a projectile", "bool", { group: "handling" }),
    F(0x1c8, "power_pct", "Power / crate weight %", "int", { group: "handling", hint: "Bazooka 100, Shotgun 10, Cluster Bomb 25" }),
    F(0x1cc, "weight2", "Secondary weight", "int", { group: "handling", hint: "Bazooka 100, Grenade 70, Shotgun 20" }),
  ];

  // ---- Missile body (fire type 1 method 3, fire type 2 method 2; shifted +0x14 for strikes)
  const S = (off, key, label, type, extra) => F(off, key, label, type, Object.assign({ slab: true }, extra || {}));
  const MISSILE = [
    // flight
    S(0x3c, "pellets", "Pellets per shot", "int", { group: "flight" }),
    S(0x40, "spread", "Pellet spread", "int", { group: "flight", hint: "Mortar 100" }),
    S(0x44, "grenade_style", "Grenade style (player fuse, bounces)", "bool", { group: "flight" }),
    S(0x48, "collision_radius", "Collision radius", "fixed", { group: "flight" }),
    S(0x60, "sprite", "Flight sprite id", "sprite", { group: "flight" }),
    S(0x64, "impact", "On touching land", "enum", { options: IMPACT_TYPES, group: "flight" }),
    S(0x68, "flight_flags", "Flight flags", "int", { group: "flight", hint: "131 for most bodies, 0 for homing" }),
    S(0x6c, "trail", "Trail effect", "int", { group: "flight", hint: "50 = bazooka smoke, 0 none" }),
    S(0x70, "gravity_pct", "Gravity %", "int", { group: "flight" }),
    S(0x74, "wind_pct", "Wind %", "int", { group: "flight" }),
    S(0x78, "bounce_pct", "Bounce %", "int", { group: "flight" }),
    S(0x7c, "unk_7c", "Bounce extra", "int", { group: "flight", hint: "Bazooka 100, others 0" }),
    S(0x80, "unk_80", "Unknown 0x80", "int", { group: "flight" }),
    S(0x84, "friction_pct", "Friction %", "int", { group: "flight" }),
    S(0xa4, "missile_type", "Body type", "enum", { options: MISSILE_TYPES, group: "flight" }),
    S(0xa8, "render_size", "Render size", "fixed", { group: "flight", hint: "64.0 bazooka, 66.1 grenade" }),
    S(0xa0, "space_control", "Space key controls it", "bool", { group: "flight", hint: "Sheep, Super Banana, Mole, Skunk" }),
    S(0x90, "alt_sprite", "Alt sprite (+65536 flag)", "int", { group: "flight", hint: "Dynamite 65602 = sprite 66 lit" }),
    S(0x94, "unk_94", "Glow enable", "int", { group: "flight", hint: "Holy Grenade 1" }),
    S(0x98, "unk_98", "Glow sprite id", "int", { group: "flight", hint: "Holy Grenade 104" }),
    S(0x9c, "unk_9c", "Glow time", "ms", { group: "flight", hint: "Holy Grenade 1800" }),
    // explosion
    S(0x50, "damage", "Damage", "int", { group: "explosion" }),
    S(0x54, "blast", "Blast radius", "int", { group: "explosion" }),
    S(0x4c, "bias", "Explosion bias (down px)", "int", { group: "explosion", hint: "Lifts worms: Grenade 10, Dynamite 50, Holy 75" }),
    S(0x88, "fuse_default", "Default fuse", "ms", { group: "explosion", hint: "Grenade 5000, Holy 3000" }),
    S(0x8c, "fuse", "Fuse / lifetime", "ms", { group: "explosion", hint: "0 = player picks 1–5 s; Bazooka 9000 timeout" }),
    S(0xf0, "detonation", "On detonation", "enum", { options: DETONATION, group: "explosion" }),
    // homing (primary)
    S(0xc4, "homing_kind", "Homing", "enum", { options: HOMING_KINDS, group: "homing" }),
    S(0xac, "burn_sprite", "Burn / alt sprite id", "sprite", { group: "homing", hint: "Homing Missile 58 (flame), Pigeon 175" }),
    S(0xb0, "homing_strength", "Homing strength", "int", { group: "homing", hint: "HM 2, Pigeon 3" }),
    S(0xb4, "homing_sprite", "Homing sprite / param", "int", { group: "homing", hint: "HM 131, Pigeon 134" }),
    S(0xb8, "homing_turn", "Turn rate", "int", { group: "homing", hint: "HM 50, Pigeon 10, non-homing 8" }),
    S(0xbc, "homing_accel", "Acceleration", "int", { group: "homing", hint: "HM 100, Pigeon 20" }),
    S(0xc0, "homing_speed", "Speed", "int", { group: "homing", hint: "HM 50, Pigeon 50" }),
    S(0xc8, "homing_arm", "Arm delay", "ms", { group: "homing", hint: "HM 500, Pigeon 505" }),
    S(0xcc, "homing_time", "Homing duration", "ms", { group: "homing", hint: "HM 3500, Pigeon 4540" }),
    // clusters / fire payload
    S(0xf8, "cluster_count", "Count", "int", { group: "clusters", hint: "Cluster Bomb 5, Ming Vase 3, Petrol fire 40" }),
    S(0xfc, "cluster_speed", "Eject speed", "int", { group: "clusters", hint: "Cluster 30, Banana 45" }),
    S(0x100, "cluster_power", "Eject power", "int", { group: "clusters", hint: "Cluster 30, Salvation 50; Petrol fire life 4000" }),
    S(0x104, "cluster_angle", "Eject angle base", "int", { group: "clusters", hint: "-1 = follow velocity (Mortar), 0 = up" }),
    S(0x108, "cluster_spread", "Eject spread °", "int", { group: "clusters", hint: "Cluster 45, Banana 25, Mortar 40" }),
    S(0xf4, "unk_f4", "Unknown 0xF4", "int", { group: "clusters", hint: "Pigeon 51, Sheep Launcher 50" }),
    S(0x10c, "c_collision_radius", "Bit collision radius", "fixed", { group: "clusters", sub: true }),
    S(0x110, "c_bias", "Bit explosion bias", "int", { group: "clusters", sub: true }),
    S(0x114, "c_damage", "Bit damage", "int", { group: "clusters", sub: true }),
    S(0x118, "c_blast", "Bit blast radius", "int", { group: "clusters", sub: true }),
    S(0x124, "c_sprite", "Bit sprite id", "sprite", { group: "clusters", sub: true }),
    S(0x128, "c_impact", "Bit on touching land", "enum", { options: IMPACT_TYPES, group: "clusters", sub: true }),
    S(0x12c, "c_flags", "Bit flight flags", "int", { group: "clusters", sub: true }),
    S(0x130, "c_trail", "Bit trail", "int", { group: "clusters", sub: true }),
    S(0x134, "c_gravity_pct", "Bit gravity %", "int", { group: "clusters", sub: true }),
    S(0x138, "c_wind_pct", "Bit wind %", "int", { group: "clusters", sub: true }),
    S(0x13c, "c_bounce_pct", "Bit bounce %", "int", { group: "clusters", sub: true }),
    S(0x148, "c_friction_pct", "Bit friction %", "int", { group: "clusters", sub: true }),
    S(0x14c, "c_fuse_default", "Bit default fuse", "ms", { group: "clusters", sub: true }),
    S(0x150, "c_fuse", "Bit fuse / lifetime", "ms", { group: "clusters", sub: true, hint: "Cluster bits 9000" }),
    S(0x164, "c_space_control", "Bit: Space key controls it", "bool", { group: "clusters", sub: true }),
    S(0x168, "c_missile_type", "Bit body type", "enum", { options: MISSILE_TYPES, group: "clusters", sub: true }),
    S(0x16c, "c_render_size", "Bit render size", "fixed", { group: "clusters", sub: true }),
    S(0x170, "c_burn_sprite", "Bit burn / alt sprite id", "sprite", { group: "clusters", sub: true }),
    S(0x188, "c_homing_kind", "Bit homing", "enum", { options: HOMING_KINDS, group: "clusters", sub: true }),
    S(0x174, "c_homing_strength", "Bit homing strength", "int", { group: "clusters", sub: true }),
    S(0x178, "c_homing_sprite", "Bit homing sprite / param", "int", { group: "clusters", sub: true }),
    S(0x17c, "c_homing_turn", "Bit turn rate", "int", { group: "clusters", sub: true }),
    S(0x180, "c_homing_accel", "Bit acceleration", "int", { group: "clusters", sub: true }),
    S(0x184, "c_homing_speed", "Bit speed", "int", { group: "clusters", sub: true }),
    S(0x18c, "c_homing_arm", "Bit arm delay", "ms", { group: "clusters", sub: true }),
    S(0x190, "c_homing_time", "Bit homing duration", "ms", { group: "clusters", sub: true }),
  ];

  // ---- Hitscan guns (fire type 1 method 2) -------------------------------
  const HITSCAN = [
    F(0x3c, "h_shots", "Bullets per trigger", "int", { group: "hitscan", hint: "Shotgun 1, Handgun 6, Uzi 10, Minigun 20" }),
    F(0x40, "h_spread", "Spread cone", "int", { group: "hitscan", hint: "Shotgun 500, Uzi 0" }),
    F(0x44, "h_delay", "Delay between bullets", "int", { group: "hitscan", hint: "Handgun 10, Uzi 15, Minigun 25" }),
    F(0x48, "h_flag", "Hitscan flag", "int", { group: "hitscan", hint: "Always 1" }),
    F(0x50, "h_range", "Max range", "fixed", { group: "hitscan" }),
    F(0x54, "h_radius", "Impact radius", "int", { group: "hitscan", hint: "Shotgun 5, Minigun 20" }),
    F(0x58, "h_unk58", "Unknown 0x58", "int", { group: "hitscan", hint: "Shotgun 100, Handgun 50" }),
    F(0x5c, "h_damage", "Damage per bullet", "int", { group: "hitscan", hint: "Shotgun 25, Uzi 5" }),
    F(0x64, "h_kind", "Bullet kind", "int", { group: "hitscan", hint: "Shotgun 2, Minigun 3, Handgun 4, Uzi 5" }),
    F(0x68, "h_range_px", "Max range px", "int", { group: "hitscan", hint: "32767" }),
  ];

  // ---- Arrow (fire type 1 method 4: Longbow) -----------------------------
  const ARROW = [
    F(0x3c, "a_param0", "Arrow speed", "int", { group: "arrow", hint: "Longbow 15" }),
    F(0x40, "a_param1", "Parameter 0x40", "int", { group: "arrow" }),
    F(0x44, "a_param2", "Parameter 0x44", "int", { group: "arrow" }),
  ];

  // ---- Spray (fire type 1 method 1: Flame Thrower) ------------------------
  const SPRAY = [
    F(0x3c, "s_count", "Flames per burst", "int", { group: "spray", hint: "Flame Thrower 56" }),
    F(0x40, "s_spread", "Spread", "int", { group: "spray" }),
    F(0x44, "s_life", "Flame life", "int", { group: "spray", hint: "400" }),
    F(0x48, "s_speed", "Flame speed", "int", { group: "spray", hint: "2000" }),
  ];

  // ---- Mine (fire type 2 method 1) -------------------------------------
  const MINE = [
    F(0x3c, "m_proximity", "Proximity radius px", "int", { group: "mine", hint: "Mine 48" }),
    F(0x40, "m_fuse", "Arm delay", "ms", { group: "mine", hint: "Negative = scheme mine fuse; 4000" }),
    F(0x44, "m_mask", "Detect mask", "int", { group: "mine", hint: "60 = worms" }),
    F(0x48, "m_trigger", "Beep fuse", "ms", { group: "mine", hint: "3000 after a worm is seen" }),
    F(0x4c, "m_unk4c", "Unknown 0x4C", "int", { group: "mine", hint: "50" }),
    F(0x50, "m_damage", "Damage", "int", { group: "mine" }),
    F(0x54, "m_blast", "Blast radius", "int", { group: "mine" }),
    F(0x58, "m_unk58", "Unknown 0x58", "int", { group: "mine" }),
  ];

  // ---- Strike header (fire type 3) --------------------------------------
  const STRIKE = [
    F(0x3c, "k_count", "Munitions dropped", "int", { group: "strike", hint: "Air Strike 5" }),
    F(0x40, "k_spacing", "Spacing", "int", { group: "strike", hint: "Air Strike 32, Napalm 48" }),
    F(0x44, "k_unk44", "Unknown 0x44", "int", { group: "strike", hint: "100" }),
    F(0x48, "k_unk48", "Unknown 0x48", "int", { group: "strike", hint: "52 for most strikes, Sheep Strike 6" }),
    F(0x4c, "k_munition", "Munition type", "enum", { options: MUNITIONS, group: "strike" }),
  ];

  // ---- Special (fire type 4) ---------------------------------------------
  const SPECIAL = [];
  for (let i = 0; i < 8; i++) {
    SPECIAL.push(F(0x3c + i * 4, `p_${i}`, `Parameter ${i + 1} (0x${(0x3c + i * 4).toString(16).toUpperCase()})`, "int", { group: "special" }));
  }

  const NOT_IMPORTED = new Set([0x00, 0x04, 0x08, 0x10, 0x24, 0x28, 0x2c]);

  /** Offsets `patch = { [off] = v }` may set: what copy_from / wep import copy
   *  (the engine's `weapons::wep::patchable`). */
  function patchable(off) {
    return off % 4 === 0 && off >= 0x0c && off < ENTRY_SIZE && !NOT_IMPORTED.has(off) && !(off >= 0x10 && off < 0x14) && !(off >= 0x24 && off < 0x30);
  }

  // ---- record helpers -------------------------------------------------------
  function rd(rec, off) {
    return new DataView(rec.buffer, rec.byteOffset, rec.byteLength).getInt32(off, true);
  }
  function wr(rec, off, v) {
    new DataView(rec.buffer, rec.byteOffset, rec.byteLength).setInt32(off, v | 0, true);
  }

  function family(rec) {
    const ft = rd(rec, 0x30);
    const fm = rd(rec, 0x38);
    if (ft === 1) {
      if (fm === 2) return "hitscan";
      if (fm === 4) return "arrow";
      if (fm === 1) return "spray";
      return "missile";
    }
    if (ft === 2) return fm === 1 ? "mine" : "missile";
    if (ft === 3) return "strike";
    if (ft === 4) return "special";
    return "none";
  }

  function context(rec) {
    const ft = rd(rec, 0x30);
    const fam = family(rec);
    return { ft, fm: rd(rec, 0x38), fam, shift: fam === "strike" ? STRIKE_SHIFT : 0 };
  }

  /** Resolve a field's absolute offset for this record (strike shift). */
  function offsetOf(field, ctx) {
    return field.slab ? field.off + ctx.shift : field.off;
  }

  /** Fields visible for a record, with resolved offsets. */
  function fields(rec) {
    const ctx = context(rec);
    const out = [];
    const push = (list) => {
      for (const f of list) {
        if (f.when && !f.when(ctx)) continue;
        out.push(Object.assign({}, f, { abs: offsetOf(f, ctx) }));
      }
    };
    push(HEADER);
    if (ctx.fam === "missile" || ctx.fam === "strike") push(MISSILE);
    if (ctx.fam === "strike") push(STRIKE);
    if (ctx.fam === "hitscan") push(HITSCAN);
    if (ctx.fam === "arrow") push(ARROW);
    if (ctx.fam === "spray") push(SPRAY);
    if (ctx.fam === "mine") push(MINE);
    if (ctx.fam === "special") push(SPECIAL);
    return out;
  }

  function hasClusters(rec) {
    const ctx = context(rec);
    if (ctx.fam !== "missile" && ctx.fam !== "strike") return false;
    const d = rd(rec, 0xf0 + ctx.shift);
    return d === 1 || d === 3;
  }
  function spreadsFire(rec) {
    const ctx = context(rec);
    if (ctx.fam !== "missile" && ctx.fam !== "strike") return false;
    return rd(rec, 0xf0 + ctx.shift) === 2;
  }
  function isHoming(rec) {
    const ctx = context(rec);
    if (ctx.fam !== "missile" && ctx.fam !== "strike") return false;
    return rd(rec, 0xa4 + ctx.shift) === 1;
  }

  /** Offsets that one mix group covers, resolved for the record's family. */
  function range(a, b) {
    const out = [];
    for (let o = a; o <= b; o += 4) out.push(o);
    return out;
  }
  function groupOffsets(group, rec) {
    const ctx = context(rec);
    const sh = ctx.shift;
    const shifted = (list) => list.map((o) => o + sh);
    switch (group) {
      case "fire":
        return [0x30, 0x34, 0x38];
      case "handling":
        return [0x0c, 0x14, 0x18, 0x1c, 0x20, 0x1c8, 0x1cc];
      case "flight":
        return shifted([...range(0x3c, 0x48), ...range(0x60, 0x84), ...range(0x90, 0xa8), ...range(0xd0, 0xec)]);
      case "explosion":
        return shifted([0x4c, 0x50, 0x54, 0x88, 0x8c, 0xf0]);
      case "homing":
        return [0x0c, 0x34, ...shifted([0xa4, 0xac, ...range(0xb0, 0xcc)])];
      case "clusters":
        return shifted([...range(0xf0, 0x108), ...range(0x10c, 0x1b0)]);
      case "hitscan":
        return range(0x3c, 0x68);
      case "arrow":
      case "spray":
        return range(0x3c, 0x5c);
      case "mine":
        return range(0x3c, 0x5c);
      case "strike":
        return [0x34, 0x38, ...range(0x3c, 0x4c)];
      case "special":
        return range(0x34, 0x5c);
      default:
        return [];
    }
  }

  /** Does `rec` have something worth borrowing for this group? */
  function groupPresent(group, rec) {
    const ctx = context(rec);
    switch (group) {
      case "flight":
      case "explosion":
        return ctx.fam === "missile" || ctx.fam === "strike";
      case "homing":
        return isHoming(rec);
      case "clusters":
        return hasClusters(rec) || spreadsFire(rec);
      case "hitscan":
        return ctx.fam === "hitscan";
      case "arrow":
        return ctx.fam === "arrow";
      case "spray":
        return ctx.fam === "spray";
      case "mine":
        return ctx.fam === "mine";
      case "strike":
        return ctx.fam === "strike";
      case "special":
        return ctx.fam === "special";
      default:
        return true;
    }
  }

  /**
   * Copy one group's dwords from `donor` into `rec`. Donor offsets are
   * resolved for the donor's own family so a strike's munition can feed a
   * missile and vice versa.
   */
  function borrow(group, rec, donor) {
    const dst = groupOffsets(group, rec);
    const src = groupOffsets(group, donor);
    if (dst.length !== src.length) return false;
    for (let i = 0; i < dst.length; i++) wr(rec, dst[i], rd(donor, src[i]));
    return true;
  }

  // ---- .wep bytes ------------------------------------------------------------
  function parseWep(bytes) {
    if (bytes.length < STRINGS_AT || TAG.some((b, i) => bytes[i] !== b)) {
      throw new Error("not a Project X weapon file");
    }
    const record = bytes.slice(4, 4 + ENTRY_SIZE);
    const tail = bytes.slice(4 + ENTRY_SIZE, STRINGS_AT);
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let at = STRINGS_AT;
    const strings = [];
    for (let i = 0; i < STRING_COUNT && at + 4 <= bytes.length; i++) {
      const n = dv.getUint32(at, true);
      at += 4;
      if (n > 4096 || at + n > bytes.length) break;
      let s = "";
      for (let k = 0; k < n; k++) s += String.fromCharCode(bytes[at + k]);
      strings.push(s);
      at += n;
    }
    const flags = bytes.slice(at, at + 4);
    const ft = rd(record, 0x30);
    if (ft < 0 || ft > 4) throw new Error(`fire type ${ft} is not one WA knows`);
    if (!strings.length) throw new Error("weapon file has no name");
    return { record, tail, strings, flags, name: strings[0] };
  }

  function buildWep({ record, tail, strings, flags, name }) {
    const strs = strings.slice(0, STRING_COUNT);
    while (strs.length < STRING_COUNT) strs.push("");
    strs[0] = name;
    strs[1] = name;
    let size = 4 + ENTRY_SIZE + 16 + 4;
    for (const s of strs) size += 4 + s.length;
    const out = new Uint8Array(size);
    const dv = new DataView(out.buffer);
    out.set(TAG, 0);
    out.set(record, 4);
    const t = tail && tail.length === 16 ? tail : new Uint8Array(16);
    out.set(t, 4 + ENTRY_SIZE);
    let at = STRINGS_AT;
    for (const s of strs) {
      dv.setUint32(at, s.length, true);
      at += 4;
      for (let k = 0; k < s.length; k++) out[at + k] = s.charCodeAt(k) & 0xff;
      at += s.length;
    }
    const f = flags && flags.length === 4 ? flags : new Uint8Array(4);
    out.set(f, at);
    return out;
  }

  function base64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /** Sprite fields WormForge resets when they name a PX sprite (weapons::wep). */
  function pxSpriteFields(rec) {
    const ctx = context(rec);
    const list = [0x60, 0x64, 0x68, 0xdc, 0xe0, 0xe4, 0x124, 0x170];
    if (ctx.fam === "strike") list.push(0x74, 0x7c, 0x138, 0x140);
    return list.filter((o) => rd(rec, o) >= PX_SPRITE_BASE);
  }

  return {
    ENTRY_SIZE,
    STRIKE_SHIFT,
    PX_SPRITE_BASE,
    LAST_STOCK_SPRITE,
    NOT_IMPORTED,
    patchable,
    HEADER,
    MISSILE,
    HITSCAN,
    ARROW,
    SPRAY,
    MINE,
    STRIKE,
    SPECIAL,
    FIRE_TYPES,
    FIRE_METHODS,
    HOLD_POSES,
    SPECIAL_SUBTYPES,
    IMPACT_TYPES,
    MISSILE_TYPES,
    DETONATION,
    HOMING_KINDS,
    rd,
    wr,
    family,
    context,
    fields,
    hasClusters,
    spreadsFire,
    isHoming,
    groupOffsets,
    groupPresent,
    borrow,
    parseWep,
    buildWep,
    base64ToBytes,
    pxSpriteFields,
  };
})();
