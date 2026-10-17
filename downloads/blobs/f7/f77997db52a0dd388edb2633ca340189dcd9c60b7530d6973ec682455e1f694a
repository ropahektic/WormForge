-- Drives mods/px/rules.lua against a mocked WA.
--
--   lua mods/px/test_rules.lua              (from the repo root)
--   lua mods/px/test_rules.lua --baseline   (rewrites baseline.txt)
--
-- baseline.txt is the pack's observable shape: every slot it claims and what
-- with, the hooks it registers, the globals it defines, and what each hand can
-- be dealt. Every run compares against it, so a refactor that changes any of
-- it fails until baseline.txt is rewritten on purpose.

-- The globals Lua itself defines, before this file or the pack adds any.
local PRISTINE = {}
for k in pairs(_G) do
  PRISTINE[k] = true
end
--
-- The pack is data, not a crate, so this is not part of `cargo test`. Ammo
-- is modelled per ammo group, as WA stores it, and `{ set = n }` is
-- absolute, infinite included, as the engine implements it. Which row a team
-- writes to is the engine's job (`world::ammo_row`), not the pack's, so it is
-- not something this mock can test.

local STOCK = {
  "none", "bazooka", "homing_missile", "mortar", "homing_pigeon",
  "sheep_launcher", "grenade", "cluster_bomb", "banana_bomb", "battle_axe",
  "earthquake", "shotgun", "handgun", "uzi", "minigun", "longbow",
  "fire_punch", "dragon_ball", "kamikaze", "suicide_bomber", "prod",
  "dynamite", "mine", "sheep", "super_sheep", "aqua_sheep", "mole_bomb",
  "air_strike", "napalm_strike", "mail_strike", "mine_strike",
  "mole_squadron", "blow_torch", "pneumatic_drill", "girder",
  "baseball_bat", "girder_pack", "ninja_rope", "bungee", "parachute",
  "teleport", "scales_of_justice", "super_banana", "holy_grenade",
  "flame_thrower", "salvation_army", "mb_bomb", "petrol_bomb", "skunk",
  "ming_vase", "sheep_strike", "carpet_bomb", "mad_cow", "old_woman",
  "donkey", "nuclear_test", "armageddon", "skip_go", "surrender",
  "select_worm", "freeze", "magic_bullet", "jet_pack", "low_gravity",
  "fast_walk", "laser_sight", "invisibility", "damage_x2", "crate_spy",
  "double_turn_time", "crate_shower",
}
local IS_STOCK = {}
for _, n in ipairs(STOCK) do
  IS_STOCK[n] = true
end

-- The engine names weapons by id; the suite, like WA, by slot. rules.lua puts
-- every Highlander weapon on its home slot (lib/homes.lua), so this mock
-- engine translates at its boundary as the real one does: a slot reads as
-- the id of the weapon on it, and an id the pack passes is that slot.
local HOME = assert(loadfile((HIGHLANDER_ROOT or "mods/px/") .. "lib/homes.lua"))()
local ID_ON = {}
for id, home in pairs(HOME) do ID_ON[home] = id end
local function ID(slot)
  if slot == nil or slot:find(".", 1, true) then return slot end
  return ID_ON[slot] or "stock." .. slot
end
local function SLOT(name)
  if name == nil then return nil end
  return HOME[name] or name:match("^stock%.(.+)$") or name
end

-- The scheme's layout: each HL weapon as the stock slot it takes.
local MOVEMENT = {
  girder_pack = 1, ninja_rope = 1, parachute = 1, teleport = 1,
  jet_pack = 1, low_gravity = 1, laser_sight = 1,
}
local SECOND = {
  fire_punch = 1, dragon_ball = 1, kamikaze = 1, prod = 1, girder = 1,
  baseball_bat = 1, shotgun = 1, handgun = 1, uzi = 1, minigun = 1,
  longbow = 1, blow_torch = 1, pneumatic_drill = 1, scales_of_justice = 1,
  armageddon = 1, flame_thrower = 1, nuclear_test = 1, donkey = 1,
  napalm_strike = 1,
}
local SCHEME_OWNED = {
  suicide_bomber = 1, super_sheep = 1, mole_bomb = 1, bungee = 1,
  skip_go = 1, surrender = 1, select_worm = 1, freeze = 1,
  magic_bullet = 1, fast_walk = 1, invisibility = 1, damage_x2 = 1,
  crate_spy = 1, double_turn_time = 1, crate_shower = 1,
}
-- What PX's cavern ranges leave out: the Ferret and the strikes from the
-- sky, and the last three second weapons.
local NOT_IN_CAVES = {
  salvation_army = 1, air_strike = 1, mail_strike = 1, mine_strike = 1,
  mole_squadron = 1, mb_bomb = 1, sheep_strike = 1, carpet_bomb = 1,
  nuclear_test = 1, donkey = 1, napalm_strike = 1,
}

-- ------------------------------------------------------------ mocked WA

local M, ammo, worms, cavern, rng, logs, active, death_seen, replaced
local unregistered_sounds = {} -- pack WAVs played but never registered

local Worm = {}
-- A worm's `weapon` is kept as WA's slot and read as the weapon's id.
Worm.__index = function(worm, key)
  if key == "weapon" then return ID(rawget(worm, "weapon_slot")) end
  return Worm[key]
end
Worm.__newindex = function(worm, key, value)
  rawset(worm, key == "weapon" and "weapon_slot" or key, value)
end
function Worm:ammo(name, change)
  name = SLOT(name)
  assert(IS_STOCK[name], "pack asked for a weapon that does not exist: " .. tostring(name))
  local store = ammo[self.ammo_group]
  if change == nil then
    return store[name] or 0
  end
  assert(type(change) == "table" and change.set, "rules must only ever SET ammo")
  store[name] = change.set
  return change.set
end
function Worm:heal(amount) if self.hp > 0 then self.hp = self.hp + amount end end
function Worm:hurt(amount)
  if type(amount) == "table" then
    self.knock = { amount.vx or 0, amount.vy or 0 }
    amount = amount.amount or 0
  end
  self.hp = math.max(0, self.hp - amount)
end
function Worm:carry(x, y) self.x, self.y, self.carried = x, y, true end
function Worm:drop() self.carried = false end
function Worm:clear_keys() self.keys = {} end
function Worm:set_state(state) self.state = state end
function Worm:teleport_pose() self.state = "teleporting"; return true end
function Worm:freeze()
  if self.hp <= 0 or self.state == "frozen" then return false end
  self.state = "frozen"
  return true
end
-- The engine's handoff verbs: what the worm looks like to the pack after.
function Worm:take(opts)
  opts = opts or {}
  self.taken = { hide = opts.hide or false, turn = opts.turn or "run" }
  if opts.hide then self.visible = false end
end
function Worm:release(vx, vy, opts)
  self.taken, self.carried = nil, false
  if self.visible == false then self.visible = true end
  self.state = opts and opts.tumble and "tumbling" or "sliding"
  self.vx, self.vy = vx or 0, vy or 0
  self.release_options = opts
end
function Worm:air_fire(on) self.air_firing = on ~= false end
function Worm:jetpack_steer(on) self.steered = on ~= false end
-- WA's collision test, in the mock: the land M.solid gives, 4 pixels either
-- side of the worm and 6 above and below.
function Worm:fits(x, y)
  if not M.solid then return true end
  local w, h = 4, 6
  return not (M.solid(x, y) or M.solid(x - w, y) or M.solid(x + w, y)
    or M.solid(x, y - h) or M.solid(x, y + h))
end

-- A copy of `v` and every table in it.
local function deep_copy(v)
  if type(v) ~= "table" then return v end
  local out = {}
  for k, x in pairs(v) do out[k] = deep_copy(x) end
  return out
end

local function inventory_api()
  local api = {}

  function api.create(spec)
    local slots, allowed, values = spec.slots, {}, {}
    for _, name in ipairs(slots) do allowed[name] = true end

    local inv = {}
    local function row(worm, create)
      local r = values[worm.id]
      if not r and create then r = {}; values[worm.id] = r end
      return r
    end
    function inv:get(worm, name)
      local r = row(worm)
      return r and (r[name] or 0) or 0
    end
    function inv:set(worm, name, n)
      assert(allowed[name])
      local r = row(worm, true)
      r[name] = n > 0 and n or nil
      return n
    end
    function inv:add(worm, name, n)
      return self:set(worm, name, self:get(worm, name) + (n or 1))
    end
    function inv:remove(worm, name, n)
      return self:set(worm, name, math.max(0, self:get(worm, name) - (n or 1)))
    end
    function inv:list(worm)
      local out, r = {}, row(worm)
      if not r then return out end
      for _, name in ipairs(slots) do
        for _ = 1, r[name] or 0 do out[#out + 1] = name end
      end
      return out
    end
    function inv:deal(worm, pool, count)
      local out = {}
      for _ = 1, count or 1 do
        local name = pool[wa.random(1, #pool)]
        self:add(worm, name, 1)
        out[#out + 1] = name
      end
      return out
    end
    function inv:clear(worm, weapons)
      local r = row(worm)
      if not r then return end
      local names = weapons
      if names == nil or names == "all" then names = slots end
      if type(names) == "string" then names = { names } end
      for _, name in ipairs(names) do r[name] = nil end
    end
    function inv:transfer(from, to, opts)
      opts = opts or {}
      M.transfers = M.transfers or {}
      M.transfers[#M.transfers + 1] = {from = from.id, to = to.id, x = opts.x, y = opts.y}
      local names = opts.weapons
      if names == nil or names == "all" then names = slots end
      if type(names) == "string" then names = { names } end
      local moved = {}
      for _, name in ipairs(names) do
        local have = self:get(from, name)
        local n = opts.amount and math.min(have, opts.amount) or have
        if n > 0 then
          self:add(to, name, n)
          if (opts.mode or "move") == "move" then self:remove(from, name, n) end
          moved[name] = n
        end
      end
      return moved
    end
    function inv:apply(worm, opts)
      opts = opts or {}
      if opts.clear then
        local seen = {}
        for _, live in ipairs(wa.worms.all()) do
          if not seen[live.ammo_group] then
            seen[live.ammo_group] = true
            for _, name in ipairs(slots) do live:ammo(name, { set = 0 }) end
          end
        end
      end
      local names = opts.weapons or slots
      local r = row(worm)
      if not r then return end
      for _, name in ipairs(names) do
        if (r[name] or 0) > 0 then
          worm:ammo(name, { set = opts.each or r[name] })
        end
      end
    end
    return inv
  end
  return api
end

local function new_match(opts)
  opts = opts or {}
  M, logs, active, death_seen, replaced = {}, {}, nil, {}, {}
  cavern = opts.cavern or false
  rng = 12345
  ammo = {}
  worms = {}
  rng = opts.seed or rng
  -- Two teams of two, each its own alliance: team 1 is alliance 0, team 2 is 1.
  -- `per_team` makes larger teams, numbered team * 1000 + index.
  local per_team = opts.per_team or 2
  for team = 1, 2 do
    ammo[team - 1] = {}
    for index = 0, per_team - 1 do
      worms[#worms + 1] = setmetatable({
        id = (per_team > 2 and team * 1000 or team * 16) + index, team = team,
        alliance = team - 1, ammo_group = team - 1, hp = 100,
        kind = "worm", x = 0, y = 0, vx = 0, vy = 0, facing = 1,
        gravity = 1, -- WA's normal
      }, Worm)
    end
  end
  -- A stock-like scheme: infinite bazooka, a few counted weapons, and two
  -- slots Highlander leaves alone (Teleport's and Skip Go's).
  for a = 0, 1 do
    ammo[a].bazooka = -1
    ammo[a].grenade = 5
    ammo[a].invisibility = 2
    ammo[a].skip_go = -1
  end
  wa = {
    depth = { FRONT = 0x10000, EFFECTS = 0xC0000, WORMS = 0xD0000, OBJECTS = 0xE0000, TERRAIN = 0x180000, BEHIND_TERRAIN = 0x190000 },
    sorted = function(t)
      local out = {}
      for k in pairs(t) do out[#out + 1] = k end
      table.sort(out)
      return out
    end,
    log = function(s) logs[#logs + 1] = s end,
    hud = { line = function(text) M.hud_lines = M.hud_lines or {}; M.hud_lines[#M.hud_lines + 1] = text end },
    msg = { FRAME_FINISH = 2, START_TURN = 0x34, FIRE_WEAPON = 0x26, JUMP = 0x24,
      JUMP_UP = 0x25, RELEASE_WEAPON = 0x27 },
    world = {
      cavern = function() return cavern end,
      retreat = function() return M.retreat or 0 end,
      frame = function() return M.frame or 0 end,
      turn_clock = function() return M.turn_clock or 0 end,
      water = function() return M.water or 32767.99998474121 end,
      size = function() return { w = M.map_w or 2000, h = M.map_h or 1000 } end,
      gravity = function() return M.gravity or 0 end,
      wind = function() return M.wind or 0 end,
      keys = function()
        return { shift = M.shift or false, digit = M.digit, plus_key = M.plus_key or false,
          ctrl = M.ctrl or false, left = M.left or false, right = M.right or false }
      end,
      set_gravity = function(v) M.gravity = v end,
      set_wind = function(v) M.wind = v end,
      sky = -208,
      -- As the engine's wa.world.collides: terrain from M.solid at the
      -- circle's centre and rim; worms, mines, oil drums and crates as circles
      -- of the engine's sizes (6, 5, 9, 9), the first in the list touched.
      collides = function(q)
        local r = q.radius or 0
        local want = {}
        for _, w in ipairs(q.with or { "terrain" }) do want[w] = true end
        if want.terrain and M.solid then
          if M.solid(q.x, q.y) then return true end
          for k = 0, 15 do
            local t = k * math.pi / 8
            if M.solid(q.x + (r * math.cos(t)), q.y + (r * math.sin(t))) then
              return true
            end
          end
        end
        local groups = {
          { "worms", worms, 6, "worm" }, { "mines", M.mines or {}, 5, "mine" },
          { "oil", M.oil or {}, 9, "oil" }, { "crates", M.crates or {}, 9, "crate" },
        }
        for _, g in ipairs(groups) do
          if want[g[1]] then
            for _, o in ipairs(g[2]) do
              local dx, dy = (o.x - q.x), (o.y - q.y)
              local reach = r + g[3]
              if (g[4] ~= "worm" or (o.hp or 1) > 0) and dx * dx + dy * dy <= reach * reach then
                o.kind = o.kind or g[4]
                return true, o
              end
            end
          end
        end
        return false
      end,
      -- As the engine's wa.world.trace, against M.solid, cheaper: the
      -- circle's rim and centre (terrain is contiguous and the sweep moves a
      -- pixel at a time), the normal from the rim samples a pixel or two out
      -- that are solid. Crates and oil drums asked for are 9-pixel circles,
      -- as the engine's; a hit on one takes its normal from its centre.
      trace = function(q)
        for _, k in ipairs({ "x0", "y0", "x1", "y1" }) do
          local v = q[k]
          if v and (v > 32767.99998474121 or v < -32768) then
            error("error converting Lua integer to i32 (out of range)")
          end
        end
        local r = q.radius or 0
        local RIM = {}
        for k = 0, 47 do
          local t = k * math.pi / 24
          RIM[#RIM + 1] = { math.cos(t), math.sin(t) }
        end
        local bodies = {}
        for _, kind in ipairs(q.with or {}) do
          local list = (kind == "crates" and M.crates) or (kind == "oil" and M.oil) or {}
          for _, o in ipairs(list) do bodies[#bodies + 1] = o end
        end
        local function body_at(x, y)
          for _, o in ipairs(bodies) do
            local dx, dy = (x - o.x), (y - o.y)
            if dx * dx + dy * dy < (r + 9) * (r + 9) then return o end
          end
        end
        local function solid_at(x, y)
          x, y = x // 1, y // 1
          if M.solid and M.solid(x, y) then return true end
          -- Actor stamps share the terrain grid, but ignore removes only
          -- the named contributor; real terrain and other masks remain.
          for _, a in ipairs(M.trace_masks or {}) do
            local ignored = false
            for _, o in ipairs(q.ignore or {}) do if o == a then ignored = true end end
            if not ignored then
              for _, row in ipairs(require("lib/sentry_mask").rows) do
                if y == math.floor(a.y) + row[1] then
                  for i = 2, #row, 2 do
                    if x >= math.floor(a.x) + row[i] and x <= math.floor(a.x) + row[i + 1] then return true end
                  end
                end
              end
            end
          end
          return false
        end
        local function overlaps(x, y)
          if body_at(x, y) then return true end
          if solid_at(x, y) then return true end
          for rr = r, 1, -4 do
            for _, d in ipairs(RIM) do
              if solid_at(x + (d[1] * rr), y + (d[2] * rr)) then return true end
            end
          end
          return false
        end
        local function normal(x, y)
          local o = body_at(x, y)
          if o then
            local dx, dy = (x - o.x), (y - o.y)
            local len = math.sqrt(dx * dx + dy * dy)
            if len > 0 then return dx / len, dy / len end
          end
          local sx, sy = 0, 0
          for _, reach in ipairs({ r + 1, r + 2 }) do
            for _, d in ipairs(RIM) do
              if solid_at(x + (d[1] * reach), y + (d[2] * reach)) then
                sx, sy = sx - d[1], sy - d[2]
              end
            end
          end
          if sx == 0 and sy == 0 then sx, sy = -(q.x1 - q.x0), -(q.y1 - q.y0) end
          local len = math.sqrt(sx * sx + sy * sy)
          if len == 0 then return 0, -1 end
          return sx / len, sy / len
        end
        local dx, dy = q.x1 - q.x0, q.y1 - q.y0
        local n = math.max(1, math.max(math.abs(dx), math.abs(dy)) // 1 + 1)
        local function at(i) return q.x0 + (dx * i) / n, q.y0 + (dy * i) / n end
        local out, from = { starts_solid = false, hit = false }, 0
        if overlaps(at(0)) then
          out.starts_solid = true
          for i = 1, n do
            if not overlaps(at(i)) then out.left_x, out.left_y = at(i); from = i; break end
          end
          if not out.left_x then return out end
        end
        for i = from + 1, n do
          local x, y = at(i)
          if overlaps(x, y) then
            out.hit = true
            out.x, out.y = at(i - 1)
            out.nx, out.ny = normal(x, y)
            out.tx, out.ty = -out.ny, out.nx
            return out
          end
        end
        if out.starts_solid then return out end
        return nil
      end,
    },
    -- A fixed LCG: the pack must not care which numbers, only that it draws
    -- through here.
    random = function(lo, hi)
      rng = (rng * 1103515245 + 12345) % 2147483648
      return lo + rng % (hi - lo + 1)
    end,
    -- As the engine's: 16.16 steps of a sine (WA's table differs from this
    -- by at most one step), and atan.
    math = {
      sin = function(x) return math.floor(math.sin(x) * 65536 + 0.5) / 65536 end,
      cos = function(x) return math.floor(math.cos(x) * 65536 + 0.5) / 65536 end,
      atan = math.atan,
    },
    worms = {
      -- As the engine's: a new worm for the team, or an error when it is full.
      spawn = function(spec)
        if M.team_full then error("worms.spawn: team " .. spec.team .. " already has 8 worms") end
        M.worm_spawns = M.worm_spawns or {}
        M.worm_spawns[#M.worm_spawns + 1] = spec
        -- A test can have it come in a given (dead) worm's place.
        if M.spawn_into then
          local w = M.spawn_into
          w.hp, w.x, w.y = spec.health, spec.x, spec.y
          return w
        end
        -- As the engine's: a worm, with the place it took (here its team's
        -- eighth) for an id.
        return { kind = "worm", id = spec.team * 16 + 8, team = spec.team, x = spec.x, y = spec.y, hp = spec.health }
      end,
      all = function()
        local live = {}
        -- Deliberately NOT in id order: the pack must sort for itself.
        for i = #worms, 1, -1 do
          live[#live + 1] = worms[i]
        end
        return live
      end,
    },
    mines = { all = function() return M.mines end },
    missiles = { all = function() return M.missiles end },
    crates = {
      all = function() return M.crates end,
      -- As the engine's: WA's crate, its contents WA's pick; recorded.
      spawn = function(spec)
        M.crate_spawns = M.crate_spawns or {}
        M.crate_spawns[#M.crate_spawns + 1] = spec
        return { kind = "crate", x = spec.x, y = spec.y }
      end,
    },
    oil = { all = function() return M.oil end },
    graves = { all = function() return M.graves end },
    inventory = inventory_api(),
    land = {
      stamp = function(spec) M.stamps = M.stamps or {}; M.stamps[#M.stamps + 1] = spec end,
      -- Round holes go in M.digs, WA's drill and torch shapes in M.cuts.
      cut = function(spec)
        assert(({ circle = true, drill = true, torch = true })[spec.shape], "land.cut: unknown shape " .. tostring(spec.shape))
        if spec.shape == "circle" then
          assert(spec.radius and spec.radius >= 1 and spec.radius <= 200, "land.cut: a circle's radius must be 1..200 pixels")
          M.digs = M.digs or {}
          M.digs[#M.digs + 1] = spec
        else
          M.cuts = M.cuts or {}
          M.cuts[#M.cuts + 1] = spec
        end
      end,
      trace = function(...)
        if type(M.trace_hit) == "function" then return M.trace_hit(...) end
        return M.trace_hit
      end,
      solid = function(x, y) return M.solid ~= nil and M.solid(x, y) or false end,
    },
    sprites = { key = function(path) return "px.mock:" .. path end },
    draw = {
      -- The engine reads the table before returning, so a pack may refill
      -- one table for every call: keep a copy, as the engine does.
      quad = function(q) M.quads[#M.quads + 1] = deep_copy(q) end,
      ribbon = function(q) M.ribbons[#M.ribbons + 1] = deep_copy(q) end,
      random = function() return 0.5 end,
    },
    sound = {
      play = function(target, name, flags)
        M.sound_targets = M.sound_targets or {}
        M.sound_targets[#M.sound_targets + 1] = target
        M.sounds[#M.sounds + 1] = name
        M.sound_flags[#M.sound_flags + 1] = flags
        M.sound_positions[#M.sound_positions + 1] = { x = target.x, y = target.y }
        -- A pack WAV plays only once an entry registers it (`sounds`);
        -- otherwise the engine plays nothing, without a word.
        if type(name) == "string" then
          local registered = false
          for _, r in ipairs(replaced) do
            for _, snd in ipairs(r.sounds or {}) do
              if snd == name then registered = true end
            end
          end
          if not registered then unregistered_sounds[name] = true end
        end
      end,
    },
    actors = {
      spawn = function(spec)
        -- As the engine: outside a fire, click or actor callback, a spawn
        -- needs its owner named.
        if spec.owner == nil then
          error("spawn needs an owner worm or actor", 2)
        end
        M.next_actor_id = (M.next_actor_id or 0) + 1
        -- `on` is a frame function or a table of handlers (frame, land, hit).
        local on, hit, contact = spec.on, nil, nil
        if type(on) == "table" then on, hit, contact = spec.on.frame, spec.on.hit, spec.on.contact end
        local a = { id = M.next_actor_id, sprite = spec.sprite, x = spec.x, y = spec.y,
                    vx = spec.vx or 0, vy = spec.vy or 0, dead = false,
                    explode = spec.explode, on = on, hit = hit, contact = contact, owner = spec.owner, as_object = spec.as_object,
                    shape = spec.shape, spec = spec }
        function a:gfx(g)
          self.angle, self.scale, self.tint, self.blend, self.depth = g.angle, g.scale, g.tint, g.blend, g.depth
        end
        function a:frame(i) self.shown = i end
        a.ignored_worms, a.ignore_calls = {}, {}
        function a:collision_ignore(w, enabled)
          self.ignored_worms[w.id] = enabled or nil
          self.ignore_calls[#self.ignore_calls + 1] = { worm = w.id, enabled = enabled }
          return true
        end
        -- As the engine's a:fits: here a 3-pixel shape against M.solid.
        function a:fits(x, y)
          if not M.solid then return true end
          if M.solid(x, y) then return false end
          for k = 0, 7 do
            local t = k * math.pi / 4
            if M.solid(x + (3 * math.cos(t)), y + (3 * math.sin(t))) then
              return false
            end
          end
          return true
        end
        function a:look(sprite) self.sprite = sprite end
        function a:look(sprite) self.sprite = sprite end
        -- As the engine's auto physics, simply: gravity, a step, and land
        -- where M.solid says.
        function a:gravity() self.vy = (self.vy or 0) + (M.gravity or 0) end
        function a:move()
          self.x, self.y = self.x + (self.vx or 0), self.y + (self.vy or 0)
          return { land = M.solid ~= nil and M.solid(self.x, self.y) or false }
        end
        function a:advance() end
        function a:in_water() return self.y >= (M.water or 32767.99998474121) end
        function a:despawn() self.dead = true; self.ignored_worms = {} end
        -- a.explode is the spawn's explode spec and a:explode(opts) the
        -- method, as on the engine's actor: a callable table.
        a.explode = setmetatable(a.explode or {}, { __call = function(_, self, opts)
          M.actor_booms = M.actor_booms or {}
          M.actor_booms[#M.actor_booms + 1] = { x = self.x, y = self.y, opts = opts }
          self.dead = true
        end })
        function a:sound(id)
          M.actor_sounds = M.actor_sounds or {}
          M.actor_sounds[#M.actor_sounds + 1] = id
        end
        M.spawned = M.spawned or {}
        M.spawned[#M.spawned + 1] = a
        if spec.explode and spec.explode.now then a:explode(spec.explode) end
        return a
      end,
    },
    -- wa.fire.spawn: the fires a pack starts, as given.
    fire = {
      spawn = function(spec)
        M.fires = M.fires or {}
        M.fires[#M.fires + 1] = spec
        return #M.fires
      end,
    },
    weapons = {
      fire_bullet = function(spec)
        assert(SLOT(spec.weapon) == "uzi" and spec.owner ~= nil)
        M.bullets = M.bullets or {}
        M.bullets[#M.bullets + 1] = spec
      end,
      -- A weapon component claims the slot rules.lua is installing it on.
      replace = function(spec)
        spec.weapon = SLOT(spec.weapon) or HIGHLANDER_CLAIMING
        assert(IS_STOCK[spec.weapon], "replace of a slot that does not exist: " .. tostring(spec.weapon))
        replaced[#replaced + 1] = spec
      end,
      -- As the engine: a real missile, its id.
      launch = function(spec)
        spec.weapon = SLOT(spec.weapon)
        assert(IS_STOCK[spec.weapon], "launch from a slot that does not exist: " .. tostring(spec.weapon))
        assert(spec.owner ~= nil, "launch needs an owner")
        M.launched = M.launched or {}
        M.launched[#M.launched + 1] = spec
        return 9000 + #M.launched
      end,
    },
    on = {
      -- Every handler, in registration order, as the engine keeps them,
      -- each run only for the messages it names (no options: every one).
      worm_message = function(f, opts)
        M.handlers = M.handlers or {}
        M.handler_msgs = M.handler_msgs or {}
        local wants = false
        if opts then
          assert(type(opts.msgs) == "table" and #opts.msgs > 0, "worm_message: msgs = { ... }")
          wants = {}
          for _, m in ipairs(opts.msgs) do
            assert(math.type(m) == "integer", "worm_message: msgs lists message numbers")
            wants[m] = true
          end
        end
        M.handlers[#M.handlers + 1] = f
        M.handler_msgs[#M.handlers] = wants
        -- "eat" from any handler swallows the message, as the engine's.
        M.message = function(w, msg)
          local eat
          for i, h in ipairs(M.handlers) do
            local wanted = M.handler_msgs[i]
            if not wanted or wanted[msg] then
              if h(w, msg) == "eat" then eat = "eat" end
            end
          end
          return eat
        end
      end,
      -- Every handler, as for worm_message: the balloon's and the rules'.
      turn_start = function(f)
        M.turn_starts = M.turn_starts or {}
        M.turn_starts[#M.turn_starts + 1] = f
        M.turn_start = function(...)
          for _, h in ipairs(M.turn_starts) do h(...) end
        end
      end,
      turn_end = function(f)
        M.turn_ends = M.turn_ends or {}
        M.turn_ends[#M.turn_ends + 1] = f
        M.turn_end = function(...)
          for _, h in ipairs(M.turn_ends) do h(...) end
        end
      end,
      missile_frame = function(f)
        M.missile_handlers = M.missile_handlers or {}
        M.missile_handlers[#M.missile_handlers + 1] = f
        M.missile = function(m)
          m.weapon = ID(m.weapon)
          for _, h in ipairs(M.missile_handlers) do h(m) end
        end
      end,
      hurt = function(f)
        M.hurt_handlers = M.hurt_handlers or {}
        M.hurt_handlers[#M.hurt_handlers + 1] = f
        M.hurt = function(hit)
          hit.weapon, hit.source_weapon = ID(hit.weapon), ID(hit.source_weapon)
          for _, h in ipairs(M.hurt_handlers) do h(hit) end
        end
      end,
      death = function(f) M.death = f end,
      -- Every pack module may draw its own HUD lines: run them all.
      hud = function(f)
        M.hud_handlers = M.hud_handlers or {}
        M.hud_handlers[#M.hud_handlers + 1] = f
        M.hud = function()
          for _, h in ipairs(M.hud_handlers) do h() end
        end
      end,
      draw = function(f)
        M.draws = M.draws or {}
        M.draws[#M.draws + 1] = f
        M.draw = function()
          for _, h in ipairs(M.draws) do h() end
        end
      end,
      body_move = function(f, opts)
        M.body_move = f
      end,
      contact = function(f)
        M.contacts = M.contacts or {}
        M.contacts[#M.contacts + 1] = f
        M.contact = function(...)
          for _, h in ipairs(M.contacts) do h(...) end
        end
      end,
    },
  }
  M.quads, M.ribbons, M.sounds, M.sound_flags, M.sound_positions, M.trace_hit, M.draws =
    {}, {}, {}, {}, {}, nil, nil
  M.mines, M.missiles, M.crates, M.oil, M.graves = {}, {}, {}, {}, {}
  M.trace_masks = nil
  -- The engine's require: a pack module runs once per match, in its own
  -- environment that reads the shared globals and keeps its writes.
  local modules = {}
  function require(name)
    if modules[name] ~= nil then return modules[name] end
    local env = setmetatable({}, { __index = _G })
    local root = HIGHLANDER_ROOT or "mods/px/"
    local chunk = assert(loadfile(root .. name .. ".lua", "t", env))
    local result = chunk()
    if result == nil then result = true end
    modules[name] = result
    return result
  end
  dofile("mods/px/rules.lua")
end

local function worm(id)
  for _, w in ipairs(worms) do
    if w.id == id then
      return w
    end
  end
end

local function frame()
  for _, w in ipairs(worms) do
    M.message(w, 2)
    if w.hp <= 0 and not death_seen[w.id] then
      death_seen[w.id] = true
      M.death({ victim = w, active = active })
    end
  end
end

local function turn(id)
  active = worm(id)
  M.message(active, 0x34)
  M.turn_start({ worm = active, active = active })
end

local function kill(id)
  worm(id).hp = 0
  frame()
end

local function remove(id)
  for i, w in ipairs(worms) do
    if w.id == id then
      table.remove(worms, i)
      return
    end
  end
end

-- What the pack dealt, read back out of its own log lines, as slots.
local function hand(id)
  for _, line in ipairs(logs) do
    local who, list = line:match("^highlander: worm (%d+) dealt (.-) %(")
    if tonumber(who) == id then
      local out = {}
      for name in list:gmatch("[^, ]+") do
        out[#out + 1] = SLOT(name)
      end
      return out
    end
  end
end

local function near(a, b) return math.abs(a - b) <= 1 / 65536 end
local fails = 0
local function check(name, cond, detail)
  print(("  %s %s%s"):format(cond and "ok  " or "FAIL", name, detail and ("   [" .. detail .. "]") or ""))
  if not cond then
    fails = fails + 1
  end
end

local function usable(alliance)
  local out = {}
  for name, n in pairs(ammo[alliance]) do
    if n ~= 0 and not SCHEME_OWNED[name] then
      out[#out + 1] = name
    end
  end
  table.sort(out)
  return out
end

local function sorted(list)
  local c = {}
  for i, v in ipairs(list) do
    c[i] = v
  end
  table.sort(c)
  return c
end

local function same(a, b)
  return table.concat(sorted(a), ",") == table.concat(sorted(b), ",")
end

-- ------------------------------------------------------------ tests

print("weapons: the ported slots take the scheme's records")
do
  new_match()
  local by_slot, dupes = {}, false
  for _, spec in ipairs(replaced) do
    if by_slot[spec.weapon] then dupes = true end
    by_slot[spec.weapon] = spec
  end
  -- One claim per Highlander weapon, each on its home slot.
  local weapons_count = 0
  for _ in pairs(HOME) do weapons_count = weapons_count + 1 end
  check("each Highlander weapon claims its slot, once", #replaced == weapons_count and not dupes,
    #replaced .. " of " .. weapons_count)
  -- A weapon component may claim only the slot it is placed on, and the
  -- engine skips any other claim, silently: every replaced slot needs a
  -- weapon component at that slot's panel position, and the Highlander
  -- profile places each. (Checked where the suite can read the
  -- pack's files: run from the repo, not inside the engine's loader test.)
  local toml = io and io.open("mods/px/mod.toml")
  if toml then
    local manifest = toml:read("a")
    toml:close()
    -- WA's panel: F1..F12 hold five slots each from slot 1, F5 six; the
    -- utilities are slots 62..70 (crates/weapons/src/panel.rs).
    local STOCK = { "bazooka", "homing_missile", "mortar", "homing_pigeon", "sheep_launcher",
      "grenade", "cluster_bomb", "banana_bomb", "battle_axe", "earthquake",
      "shotgun", "handgun", "uzi", "minigun", "longbow",
      "fire_punch", "dragon_ball", "kamikaze", "suicide_bomber", "prod",
      "dynamite", "mine", "sheep", "super_sheep", "aqua_sheep", "mole_bomb",
      "air_strike", "napalm_strike", "mail_strike", "mine_strike", "mole_squadron",
      "blow_torch", "pneumatic_drill", "girder", "baseball_bat", "girder_pack",
      "ninja_rope", "bungee", "parachute", "teleport", "scales_of_justice",
      "super_banana", "holy_grenade", "flame_thrower", "salvation_army", "mb_bomb",
      "petrol_bomb", "skunk", "ming_vase", "sheep_strike", "carpet_bomb",
      "mad_cow", "old_woman", "donkey", "nuclear_test", "armageddon",
      "skip_go", "surrender", "select_worm", "freeze", "magic_bullet",
      "jet_pack", "low_gravity", "fast_walk", "laser_sight", "invisibility",
      "damage_x2", "crate_spy", "double_turn_time", "crate_shower" }
    local F_FIRST = { 1, 6, 11, 16, 21, 27, 32, 37, 42, 47, 52, 57 }
    local function slot_at(row, column)
      if row == "utility" then return STOCK[61 + column] end
      return STOCK[F_FIRST[tonumber(row:sub(2))] + column - 1]
    end
    local component, preset = {}, {}
    local blocks, at = {}, 1
    while true do
      local i = manifest:find("[[components]]", at, true)
      if not i then break end
      local j = manifest:find("[[components]]", i + 1, true) or #manifest + 1
      blocks[#blocks + 1] = manifest:sub(i, j - 1)
      at = j
    end
    for _, block in ipairs(blocks) do
      local id = block:match('id = "(px%.[%w_]+)"')
      local row, column = block:match('default_position = { row = "(%w+)", column = (%d+) }')
      -- Highlander's weapons, all through components/weapon.lua: the other
      -- ports in the bundle (reddaz's) have their own files and no part in it.
      local highlander = block:find('entry = "components/weapon.lua"', 1, true)
      if id and row and highlander then component[slot_at(row, tonumber(column))] = id end
    end
    -- The Highlander profile's weapon set: its [weapons] table.
    local file = assert(io.open("mods/px/profiles/Highlander.toml"))
    local weapons = file:read("a"):match("%[weapons%](.-)\n%[") or ""
    file:close()
    for id, row, column in weapons:gmatch('"([%w_.]+)" = { row = "(%w+)", column = (%d+) }') do
      preset[slot_at(row, tonumber(column))] = id
    end
    -- Where PX uses WA's weapon unchanged, the profile places the stock one.
    local AS_STOCK = {
      dynamite = "stock.dynamite", flame_thrower = "stock.flame_thrower", fast_walk = "stock.fast_walk",
      crate_spy = "stock.crate_spy", crate_shower = "stock.crate_shower",
      invisibility = "stock.teleport",
    }
    local missing = {}
    for _, r in ipairs(replaced) do
      if AS_STOCK[r.weapon] then
        if component[r.weapon] or preset[r.weapon] ~= AS_STOCK[r.weapon] then
          missing[#missing + 1] = r.weapon
        end
      elseif not component[r.weapon] or preset[r.weapon] ~= component[r.weapon] then
        missing[#missing + 1] = r.weapon
      end
    end
    check("every replaced slot is a Highlander weapon the profile places, or WA's own", #missing == 0,
      table.concat(missing, ","))
  end
  local own_file = true
  for slot, spec in pairs(by_slot) do
    if slot == "earthquake" or slot == "napalm_strike" or slot == "teleport" or slot == "uzi"
      or slot == "prod" or slot == "armageddon" or slot == "petrol_bomb" or slot == "nuclear_test"
      or slot == "sheep_strike" or slot == "salvation_army" or slot == "baseball_bat" or slot == "donkey"
      or slot == "suicide_bomber" or slot == "scales_of_justice" or slot == "freeze" then
      if spec.wep ~= "weps/" .. slot .. ".wep" or spec.copy_from then own_file = false end
    elseif slot == "kamikaze" or slot == "dragon_ball" then
      -- The Sentry Gun and the Sentry Laser are placed as WA places a mine.
      if spec.copy_from ~= "stock.mine" or spec.wep then own_file = false end
    elseif spec.copy_from ~= "stock." .. slot or spec.wep then own_file = false end
  end
  check("scheme records use their intended bases; others copy stock", own_file)
  check("Skip Go uses stock Skip Go, with Ctrl choosing stock Surrender",
    by_slot.skip_go and by_slot.skip_go.copy_from == "stock.skip_go"
      and by_slot.skip_go.name == "Skip Go/Surrender"
      and by_slot.skip_go.panel_icon == "sprites/skip_go/icon.png"
      and by_slot.skip_go.stock_fire_choice.held == "ctrl"
      and by_slot.skip_go.stock_fire_choice.alternate == "stock.surrender")
  check("Ice Arrow uses PX's arrow record and icon",
    by_slot.armageddon and by_slot.armageddon.wep == "weps/armageddon.wep"
      and by_slot.armageddon.panel_icon == "sprites/ice_arrow/icon.png")
  check("Reinforcement uses PX's record and icon, and a click",
    by_slot.nuclear_test and by_slot.nuclear_test.wep == "weps/nuclear_test.wep"
      and by_slot.nuclear_test.panel_icon == "sprites/reinforcement/icon.png"
      and by_slot.nuclear_test.on_select.cursor and type(by_slot.nuclear_test.on_click) == "function")
  check("Electromagnet uses PX's placed weapon record and icon",
    by_slot.baseball_bat and by_slot.baseball_bat.wep == "weps/baseball_bat.wep"
      and by_slot.baseball_bat.panel_icon == "sprites/electromagnet/ico_magnet.png"
      and type(by_slot.baseball_bat.on_fire) == "function")
  check("Super Tele owns the teleport cursor and click dispatch",
    by_slot.teleport and by_slot.teleport.on_select.cursor
      and type(by_slot.teleport.on_click) == "function"
      and by_slot.teleport.panel_icon == "sprites/super_tele/icon.png")
  check("Lightning Strike claims the stock land cursor and click dispatch",
    by_slot.napalm_strike and by_slot.napalm_strike.on_select.cursor
      and type(by_slot.napalm_strike.on_click) == "function")
  check("no PX Baseball Bat on the girder slot: the Baseball Bat is WA's own", by_slot.girder == nil)
  check("a weapon on its own slot keeps its icon",
    by_slot.girder_pack and by_slot.girder_pack.panel_icon == nil)
  check("Priceless Ming Vase: the stock vase, as the scheme tunes it",
    by_slot.ming_vase and by_slot.ming_vase.panel_icon == nil and by_slot.ming_vase.on_fire == nil)
  check("Windy Cluster brings PX's icon and bits",
    by_slot.cluster_bomb and by_slot.cluster_bomb.panel_icon == "sprites/windy_cluster/ico_windyc.png"
      and by_slot.cluster_bomb.cluster.sprite == "sprites/windy_cluster/cluster")
end

print("Ice Arrow: only its own arrow freezes after the bow hit")
do
  new_match()
  local target, other = worm(32), worm(17)
  target.state, target.vx = "tumbling", 3
  M.hurt({ phase = "post", source_weapon = "longbow", kind = "hit", worm = other })
  M.hurt({ phase = "pre", source_weapon = "armageddon", kind = "hit", worm = other })
  M.hurt({ phase = "post", source_weapon = "armageddon", kind = "hit", worm = target })
  check("bow impulse remains until the target's next frame",
    target.state == "tumbling" and target.vx == 3 and other.state ~= "frozen")
  M.message(other, wa.msg.FRAME_FINISH)
  M.message(target, wa.msg.FRAME_FINISH)
  check("the hit target alone enters frozen state", target.state == "frozen" and other.state ~= "frozen")
  target.state, target.hp = "tumbling", 0
  M.hurt({ phase = "post", source_weapon = "armageddon", kind = "hit", worm = target })
  M.message(target, wa.msg.FRAME_FINISH)
  check("a later hit cannot freeze a dead worm", target.state == "tumbling")
end

print("Reinforcement: a new worm for the team, on the ground under the click")
do
  new_match()
    local click
  for _, spec in ipairs(replaced) do if spec.weapon == "nuclear_test" then click = spec.on_click end end
  local w = worm(16)
  M.solid = function(_, y) return y >= 300 end
  M.worm_spawns, M.sounds = {}, {}
  click({ worm = w, x = 250 + 0.25, y = 40 })
  local s = M.worm_spawns[1]
  check("PX's Reinforcement: the team's, 200 health, at the click's column, standing on the ground",
    s and s.team == w.team and s.name == "Reinforcement" and s.health == 200
      and s.x == 250 and s.y == (300 - 12), s and (s.x .. "," .. s.y) or "none")
  M.solid = function() return false end
  M.water = 500
  click({ worm = w, x = 100, y = 40 })
  check("over the water it drops in at the surface", M.worm_spawns[2] and M.worm_spawns[2].y == (500 - 12))
  M.team_full = true
  click({ worm = w, x = 100, y = 40 })
  check("a full team gets no worm, and an error sound", #M.worm_spawns == 2
    and M.sounds[#M.sounds] == "sounds/gravity_control/error.wav")
  M.team_full, M.water, M.solid = nil, nil, nil
end

print("Electromagnet: plus-key polarity, stock object force and discharge")
do
  new_match()
  local w = worm(16)
  w.x, w.y, w.weapon, w.turn = 100, 100, "baseball_bat", true
  local shot = assert((function()
    for _, spec in ipairs(replaced) do if spec.weapon == "baseball_bat" then return spec.on_fire end end
  end)())
  local function mine_at(id, x, fuse)
    local mine = { id = id, x = x, y = 100, fuse = fuse }
    function mine:arm(ms) self.armed = ms; return true end
    function mine:impulse(dx, dy) self.dx, self.dy = dx, dy; return true end
    return mine
  end
  local mine, timed = mine_at(101, 150, -1), mine_at(103, 160, 2000)
  local missile = { id = 102, x = 50, y = 100 }
  function missile:impulse(dx, dy) self.dx, self.dy = dx, dy; return true end
  M.mines, M.missiles = { mine, timed }, { missile }
  M.hud()
  check("the HUD names the mode", M.hud_lines and M.hud_lines[#M.hud_lines]:find("REPEL") ~= nil)
  shot({ worm = w })
  local repel = M.spawned[#M.spawned]
  repel.on(repel)
  check("default repel sends stock objects away", mine.dx > 0 and missile.dx < 0)
  check("a random-fuse mine it catches gets 1 to 5 seconds", mine.armed >= 1000 and mine.armed <= 4999)
  check("a mine with a fuse is triggered with its own", timed.armed == 2000)
  local other = worm(17)
  other.x, other.y, other.weapon = 100, 100, "baseball_bat"
  M.plus_key = true
  M.message(other, wa.msg.FRAME_FINISH)
  check("+ held on another worm's turn changes nothing for it", (function()
    M.plus_key = false
    M.message(other, wa.msg.FRAME_FINISH)
    shot({ worm = other })
    local m = M.spawned[#M.spawned]
    mine.dx = 0
    m.on(m)
    return mine.dx > 0
  end)())
  M.plus_key = true
  M.message(w, wa.msg.FRAME_FINISH)
  M.message(w, wa.msg.FRAME_FINISH) -- held key must not switch twice
  M.plus_key = false
  M.message(w, wa.msg.FRAME_FINISH)
  M.hud()
  check("the HUD follows the switch", M.hud_lines[#M.hud_lines]:find("ATTRACT") ~= nil)
  shot({ worm = w })
  local attract = M.spawned[#M.spawned]
  mine.dx = 0
  attract.on(attract)
  check("one plus press switches the next magnet to attract", mine.dx < 0)
  -- The Hellish Hand-Grenade slows in a live field; another missile doesn't.
  local hellish = { phase = "pre", weapon = "holy_grenade", x = 120, y = 100, vx = 1000, vy = 0 }
  local bazooka = { phase = "pre", weapon = "bazooka", x = 120, y = 100, vx = 1000, vy = 0 }
  M.missile(hellish)
  M.missile(bazooka)
  check("the Hellish Hand-Grenade is damped in a field", hellish.vx == math.floor(1000 * 0.985)
    and bazooka.vx == 1000)
  -- 300 frames after the turn ended, missiles and mines are let go (a dud
  -- mine held against a magnet would never rest, and the turn never end).
  M.turn_end({ worm = w })
  for _ = 1, 299 do attract.on(attract) end
  missile.dx, mine.dx = 0, 0
  attract.on(attract)
  check("still held 300 frames after the turn ends", missile.dx ~= 0 and mine.dx ~= 0)
  missile.dx, mine.dx = 0, 0
  attract.on(attract)
  check("missiles and mines are let go after that", missile.dx == 0 and mine.dx == 0)
  M.turn_start({ worm = other, active = other })
  missile.dx, mine.dx = 0, 0
  attract.on(attract)
  check("and caught again from the next turn", missile.dx ~= 0 and mine.dx ~= 0)
  -- A blast hurts it less the further off (PX's TakeExplosionDamage).
  local function blast(m, damage, dist)
    m.hit(m, { kind = "blast", damage = damage, x = m.x + dist, y = m.y, vx = 0, vy = 0 })
  end
  shot({ worm = w })
  local target = M.spawned[#M.spawned]
  blast(target, 40, 40) -- 40 * (1 - 1600 / 6400) = 30: 80 -> 50
  blast(target, 40, 80) -- at twice the damage, nothing
  M.actor_booms = M.actor_booms or {}
  local before = #M.actor_booms
  blast(target, 49, 0) -- 50 -> 1
  target.on(target)
  check("a blast hurts it by PX's falloff", #M.actor_booms == before)
  blast(target, 1, 0)
  target.on(target)
  check("at 0 health it explodes, blast 100, damage 50", #M.actor_booms == before + 1
    and M.actor_booms[#M.actor_booms].opts.id == 100 and M.actor_booms[#M.actor_booms].opts.damage == 50)
  -- Four of its owner's turns discharge it; the last one triggers mines.
  local late = mine_at(104, 140, -1)
  M.mines = { late }
  for _ = 1, 4 do M.turn_start({ worm = w, active = w }) end
  check("the last turn triggers the mines in range, without a push", late.armed ~= nil and late.dx == nil)
  mine.dx = 0
  M.mines = { mine }
  repel.on(repel)
  attract.on(attract)
  check("four owner turns discharge both magnets", mine.dx == 0)
end

print("Electromagnet: it lands and rests on the land, and sinks in the water")
do
  new_match()
  local w = worm(16)
  w.x, w.y, w.facing = 100, 150, 1
  local shot = assert((function()
    for _, spec in ipairs(replaced) do if spec.weapon == "baseball_bat" then return spec.on_fire end end
  end)())
  M.gravity, M.solid = 0.25, function(_, y) return y >= 200 end
  shot({ worm = w })
  local magnet = M.spawned[#M.spawned]
  for _ = 1, 200 do magnet.on(magnet) end
  local y = magnet.y
  for _ = 1, 20 do magnet.on(magnet) end
  check("it falls onto the floor and rests on it, its body above the land",
    magnet.y == y and y > 185 and y < 200 and magnet.x > w.x, magnet.y)
  check("the engine is told where, and moves nothing itself", magnet.vx == 0 and magnet.vy == 0)
  M.water = 190
  for _ = 1, 600 do if not magnet.dead then magnet.on(magnet) end end
  check("in the water it sinks out of sight and is gone", magnet.dead)
  M.water, M.gravity, M.solid = nil, nil, nil
end

print("Electromagnet: placed under a ceiling, it drops into the tunnel, never up through the rock")
do
  new_match()
  local w = worm(16)
  w.x, w.y, w.facing = 100, 150, 1
  local shot = assert((function()
    for _, spec in ipairs(replaced) do if spec.weapon == "baseball_bat" then return spec.on_fire end end
  end)())
  -- A tunnel: rock above y 146 (the magnet's circle, 8 pixels round the
  -- worm's centre, overlaps it) and a floor at 200.
  M.gravity, M.solid = 0.25, function(_, y) return y < 146 or y >= 200 end
  shot({ worm = w })
  local magnet = M.spawned[#M.spawned]
  local highest = magnet.y
  for _ = 1, 200 do
    magnet.on(magnet)
    highest = math.min(highest, magnet.y)
  end
  check("it never rises into the rock above", highest >= 150, highest)
  check("it comes to rest on the tunnel's floor", magnet.y > 185 and magnet.y < 200, magnet.y)
  -- Buried, with nothing free within reach: it stays where it is.
  new_match()
  w = worm(16)
  w.x, w.y = 100, 150
  M.solid = function() return true end
  shot({ worm = w })
  magnet = M.spawned[#M.spawned]
  for _ = 1, 50 do magnet.on(magnet) end
  check("buried, it stays put rather than tunnel", magnet.y == 150 and magnet.x == 100, magnet.y)
  M.gravity, M.solid = nil, nil
end

print("Reinforcement: in a dead worm's place, it is dealt a fresh hand")
do
  new_match()
  frame()
  local click
  for _, spec in ipairs(replaced) do if spec.weapon == "nuclear_test" then click = spec.on_click end end
  local deals = function(id)
    local n = 0
    for _, line in ipairs(logs) do
      if line:match("^highlander: worm " .. id .. " dealt ") then n = n + 1 end
    end
    return n
  end
  check("every worm is dealt once at the start", deals(17) == 1)
  -- Worm 17 dies on worm 16's turn: its hand goes to 16.
  turn(16)
  kill(17)
  M.solid = function(_, y) return y >= 300 end
  M.spawn_into = worm(17)
  click({ worm = worm(16), x = 250, y = 40 })
  frame()
  check("the reinforcement, in 17's place, is dealt a fresh hand", deals(17) == 2, deals(17))
  local fresh = {}
  for _, line in ipairs(logs) do
    local list = line:match("^highlander: worm 17 dealt (.-) %(")
    if list then fresh = {} for name in list:gmatch("[^, ]+") do fresh[#fresh + 1] = name end end
  end
  check("one from each pool, as any worm's", #fresh == 3, table.concat(fresh, ","))
  M.spawn_into, M.solid = nil, nil
end

print("Sentry Gun: placed, it plants, picks a moving enemy, fires, reloads")
do
  new_match()
    local spec
  for _, s in ipairs(replaced) do if s.weapon == "kamikaze" then spec = s end end
  check("it claims Kamikaze, placed as a mine, its housing tinted per team",
    spec and spec.copy_from == "stock.mine" and spec.name == "Sentry Gun" and type(spec.on_fire) == "function"
      and spec.worm_sprites.weaponlnk == "sprites/sentry_gun/equip"
      and spec.worm_sprites_team_tint.worm_sprites.weaponlnk == "sprites/sentry_gun/equip_housing"
      and #spec.worm_sprites_team_tint.colours == 6)
  local owner, enemy = worm(16), worm(32)
  for _, w in ipairs(worms) do w.x, w.y = 5000, 5000 end
  owner.x, owner.y, owner.facing = 100, 100, 1
  M.solid = function(_, y) return y >= 110 end
  M.gravity, M.spawned, M.actor_sounds, M.actor_booms = 0.25, {}, {}, {}
  spec.on_fire({ worm = owner })
  local body = M.spawned[#M.spawned]
  local turret = require("lib/shared").sentry_gun
  local state = turret.state[body.id]
  check("one persistent body carries indestructible feet for worms and weapons", #M.spawned == 1
    and body.sprite == "sprites/sentry_gun/turret_mask.png" and body.x == 100
    and body.spec.mask and body.spec.mask_worms and body.spec.mask_weapons
    and not body.spec.mask_land and not body.spec.mask_actors and body.as_object)
  for _ = 1, 40 do body.on(body) end
  check("it falls and plants on the land, with PX's sound",
    body.y >= 113 and body.y < 114 and M.actor_sounds[#M.actor_sounds] == "sounds/sentry_gun/sentryplace.wav", body.y)
  M.trace_masks = { body }
  M.trace_hit = { x = body.x, y = body.y - turret.muzzle_up }
  check("its sight origin is inside its own authored mask",
    wa.world.trace { x0 = body.x, y0 = body.y - turret.muzzle_up,
      x1 = body.x + 50, y1 = body.y - turret.muzzle_up }.starts_solid)
  local function impacts()
    return #(M.bullets or {})
  end
  local function run(n)
    for _ = 1, n do
      enemy.x = enemy.x + 1 -- moving: PX notices only what moves
      body.on(body)
    end
  end
  enemy.x, enemy.y = 300, 90
  run(50)
  check("it waits 60 frames once it has a target", impacts() == 0)
  run(40)
  check("then it fires stock Uzi rounds at the enemy", impacts() >= 3, impacts())
  local bullet = M.bullets[1]
  local dx, dy = bullet.x - body.x, bullet.y - (body.y - turret.muzzle_up)
  check("2 damage, muzzle origin, unit direction, only its own feet excluded",
    bullet.damage == 2 and bullet.ignore[1] == body and #bullet.ignore == 1
    and math.abs(dx * dx + dy * dy - 121) < 0.02
    and math.abs(bullet.dx * bullet.dx + bullet.dy * bullet.dy - 1) < 0.001)
  check("rounds create no explosion actors", #M.actor_booms == 0)
  for _, a in ipairs(M.spawned) do
    check("only body and ejected casings", a == body or a.sprite == "sprites/sentry_gun/casing")
  end
  M.quads = {}; M.draw()
  local head
  for _, q in ipairs(M.quads) do if q.sprite == "sprites/sentry_gun/turret_gun" then head = q end end
  check("its head is drawn in its coalition colour", head and (head.color & 0xFFFFFF) == 0xFF6447 and head.depth == wa.depth.FRONT)
  M.message(owner, wa.msg.START_TURN)
  local before = impacts()
  run(60)
  check("it holds fire on its owner's colour's turns", impacts() == before)
  M.message(enemy, wa.msg.START_TURN)
  enemy.x = 300  -- back in range: it has walked on meanwhile
  run(100)
  check("and fires again on the enemy's", impacts() > before, impacts() - before)
  check("its rounds are its owner's while the owner lives", M.bullets[#M.bullets].owner == owner)
  -- Losing the placing worm does not lose coalition ownership.
  for i, w in ipairs(worms) do if w == owner then table.remove(worms, i) break end end
  before = impacts()
  run(20)
  check("after the placing worm dies, a live coalition member parents its rounds", impacts() > before
    and M.bullets[#M.bullets].owner == worm(17))
  local coalition = {}
  for i = #worms, 1, -1 do
    if worms[i].alliance == state.alliance then coalition[#coalition + 1] = table.remove(worms, i) end
  end
  before = impacts()
  local remaining = state.ammo
  run(20)
  check("an eliminated coalition retains its sentry without invalid native shots",
    impacts() == before and state.ammo == remaining and not state.firing)
  for _, w in ipairs(coalition) do worms[#worms + 1] = w end
  worms[#worms + 1] = owner
  body.hit(body, { kind = "blast", damage = 10, vy = 0 })
  body.on(body, { damage = 10 })
  check("blast damage is counted once, ignoring its repeated frame accumulator", state.health == 40)
  before = impacts()
  run(120)
  check("a blast disables it for the turn", impacts() == before)
  body.hit(body, { kind = "hit", damage = 40 })
  check("at 0 of its 50 health it explodes, damage 50, blast 100, and its head goes",
    #M.actor_booms == 1 and M.actor_booms[1].opts.damage == 50 and M.actor_booms[1].opts.id == 100 and body.dead and turret.state[body.id] == nil)
  M.solid, M.gravity = nil, nil
end

print("Sentry Laser: shoots enemy projectiles out of the air, not worms")
do
  new_match()
    local spec
  for _, s in ipairs(replaced) do if s.weapon == "dragon_ball" then spec = s end end
  check("it claims Dragon Ball, placed as a mine, its body tinted per team",
    spec and spec.copy_from == "stock.mine" and spec.name == "Sentry Laser" and type(spec.on_fire) == "function"
      and spec.worm_sprites.weaponlnk == "sprites/sentry_laser/equip"
      and spec.worm_sprites_team_tint.worm_sprites.weaponlnk == "sprites/sentry_laser/equip_housing")
  local owner, enemy = worm(16), worm(32)
  for _, w in ipairs(worms) do w.x, w.y = 5000, 5000 end
  owner.x, owner.y, owner.facing = 100, 100, 1
  M.solid = function(_, y) return y >= 110 end
  M.gravity, M.spawned, M.actor_sounds, M.actor_booms, M.digs = 0.25, {}, {}, {}, {}
  spec.on_fire({ worm = owner })
  local body = M.spawned[#M.spawned]
  local turret = require("lib/shared").sentry_laser
  check("one body, with the head and barrel rendered separately", #M.spawned == 1
    and body.sprite == "sprites/sentry_laser/turret_mask.png" and body.spec.mask and body.as_object)
  for _ = 1, 40 do body.on(body) end
  check("it plants with PX's sound", M.actor_sounds[#M.actor_sounds] == "sounds/sentry_laser/sentrylaserplace.wav")
  M.trace_masks = { body }
  M.trace_hit = { x = body.x, y = body.y - turret.muzzle_up }
  local function disintegrations()
    local n = 0
    for _, snd in ipairs(M.actor_sounds) do if snd == "sounds/sentry_laser/sentrylaserdisin.wav" then n = n + 1 end end
    return n
  end
  local function missile(id, alliance, x)
    local m = { id = id, kind = "missile", x = x, y = 80, vx = 1, vy = 0, alliance = alliance }
    function m:remove()
      self.removed = true
      for i, o in ipairs(M.missiles) do if o == self then table.remove(M.missiles, i) break end end
      return true
    end
    return m
  end
  local function run(n)
    for _ = 1, n do
      enemy.x = enemy.x + 1
      for _, m in ipairs(M.missiles) do m.x = m.x + m.vx end
      body.on(body)
    end
  end
  enemy.x, enemy.y = 200, 90
  local own = missile(901, owner.alliance, 150)
  M.missiles = { own }
  run(60)
  check("it ignores a moving enemy worm and its own colour's missiles",
    disintegrations() == 0 and not own.removed and enemy.hp == 100)
  local foe = missile(902, enemy.alliance, 200)
  M.missiles = { own, foe }
  run(10)
  check("an enemy missile: not before its 20 frames", not foe.removed)
  run(20)
  check("then a beam in its owner's colour disintegrates it", foe.removed and disintegrations() == 1
    and #M.digs >= 1 and M.digs[#M.digs].radius == 4)
  M.ribbons = {}
  M.draw()
  check("the beam is drawn red", #M.ribbons == 1 and M.ribbons[1].points[1].color == 0xFFFF0000)
  local still = missile(903, enemy.alliance, 200)
  still.vx = 0
  M.missiles = { own, still }
  run(60)
  check("a missile at rest is no target", not still.removed)
  -- An enemy worm in the beam's way burns.
  local foes = {}
  for i = 1, 4 do
    foes[i] = missile(910 + i, enemy.alliance, 220)
    foes[i].y = 70
  end
  -- Halfway from the turret's head to them.
  enemy.x, enemy.y = (body.x + 220) // 2, (body.y - 25 + 70) // 2
  M.missiles = foes
  local hp = enemy.hp
  for _ = 1, 200 do body.on(body) end
  check("4 shots a turn: four missiles, then it is spent", disintegrations() == 4 and #M.missiles == 1)
  check("a worm in the beam's way takes 10 a shot", enemy.hp < hp and (hp - enemy.hp) % 10 == 0, hp - enemy.hp)
  M.message(owner, wa.msg.START_TURN)
  for _ = 1, 60 do body.on(body) end
  check("each turn reloads it, its owner's turn too", disintegrations() == 5 and #M.missiles == 0)
  -- An enemy's Bowling Ball rolling by is shot too.
  local shared = require("lib/shared")
  M.message(enemy, wa.msg.START_TURN)
  local _, ball = shared.spawn_bowling_ball(enemy, 220, 60, 2, 0)
  local _, own_ball = shared.spawn_bowling_ball(owner, 180, 60, 2, 0)
  for _ = 1, 60 do body.on(body) end
  check("an enemy's moving Bowling Ball is disintegrated too, its own colour's spared",
    disintegrations() == 6 and ball.gone and not own_ball.gone, disintegrations())
  body.hit(body, { kind = "blast", damage = 35 })
  check("at 0 of its 35 health it explodes, damage 50, blast 100, body and barrel gone",
    #M.actor_booms == 1 and M.actor_booms[1].opts.damage == 50 and body.dead and turret.state[body.id] == nil)
  M.solid, M.gravity, M.missiles = nil, nil, {}
end

print("Sentry traces: ignore own feet, retain real terrain and other actors")
do
  new_match()
  local trace = require("lib/turret").trace
  local body, other = { x = 100, y = 100 }, { x = 100, y = 100 }
  M.trace_masks = { body }
  check("clear sight through its own mask", trace(body, 100, 83, 150, 83) == nil)
  M.trace_masks = { body, other }
  local hit = trace(body, 100, 83, 150, 83)
  check("an overlapping actor still blocks at the origin", hit and hit.x == 100 and hit.y == 83)
  M.trace_masks = { body }
  M.solid = function(x, y) return x == 100 and y == 83 end
  hit = trace(body, 100, 83, 150, 83)
  check("terrain beneath its own mask still blocks", hit and hit.x == 100 and hit.y == 83)
  M.solid = function(x) return x >= 125 end
  hit = trace(body, 100, 83, 150, 83)
  check("a wall beyond its own feet still blocks", hit and hit.x >= 124 and hit.x < 125)
  M.solid = nil
end

print("Sentries: nearby terrain has sight grace; distant terrain blocks tracking")
do
  for _, kind in ipairs({ "sentry_gun", "sentry_laser" }) do
    for _, facing in ipairs({ -1, 1 }) do
      new_match()
      local shared, turret = require("lib/shared"), require("lib/turret")
      local t = shared[kind]
      local owner, enemy = worm(16), worm(32)
      for _, w in ipairs(worms) do w.x, w.y = 5000, 5000 end
      owner.x, owner.y, owner.facing = 100, 100, facing
      M.gravity = 0.25
      M.solid = function(_, y) return y >= 110 end
      local body, s = t.place({ worm = owner })
      for _ = 1, 40 do body.on(body) end
      local px, py = body.x, body.y - t.muzzle_up
      enemy.x, enemy.y, enemy.vx = px + facing * 150, py, 1
      local projectile = { id = 940, kind = "missile", alliance = enemy.alliance,
        x = enemy.x, y = py, vx = 1, vy = 0 }
      M.missiles = { projectile }
      local shots = 0
      t.fire = function() shots = shots + 1 end
      s.angle = s.idle + 30
      M.solid = function(x, y) return y >= 110 or (math.abs(x - px) <= 3 and math.abs(y - py) <= 3) end
      local old_angle = s.angle
      body.on(body)
      check(kind .. ": buried pivot still acquires and turns, facing " .. facing,
        s.had_target and s.angle ~= old_angle)
      for _ = 1, 100 do body.on(body) end
      check(kind .. ": buried pivot still fires from its clear tip", shots > 0)
      local mx, my = turret.muzzle(t, body, s.angle)
      M.solid = function(x, y)
        return y >= 110 or (math.abs(x - math.floor(mx)) <= 1 and math.abs(y - math.floor(my)) <= 1)
      end
      local before = shots
      for _ = 1, 20 do body.on(body) end
      check(kind .. ": blocked tip stops firing and spends no shot", shots == before and not s.firing and s.had_target)
      -- A wall outside the grace circle blocks tracking and firing.
      M.solid = function(x, y) return y >= 110 or math.abs(x - (px + facing * 60)) <= 1 end
      for _ = 1, 20 do body.on(body) end
      check(kind .. ": distant wall loses the target and stops firing", shots == before and not s.firing and not s.had_target)
      M.solid = function(_, y) return y >= 110 end
      for _ = 1, 100 do body.on(body) end
      check(kind .. ": removing the distant wall restores tracking and firing", shots > before)

      -- Use horizontal and diagonal rays around the complete sweep, not a
      -- grace area anchored to the current barrel direction.
      for _, direction in ipairs({ {facing, 0}, {0, -1}, {facing, -1} }) do
        local dx, dy = direction[1], direction[2]
        local norm = math.sqrt(dx * dx + dy * dy)
        dx, dy = dx / norm, dy / norm
        local radius = t.muzzle_out + t.sight_grace_px
        local inside_x, inside_y = math.floor(px + dx * (radius - 3)), math.floor(py + dy * (radius - 3))
        M.solid = function(x, y) return x == inside_x and y == inside_y end
        check(kind .. ": terrain inside the full tip sweep has grace", turret.sight(t, body, px + dx * 150, py + dy * 150))
        local outside_x, outside_y = math.floor(px + dx * (radius + 3)), math.floor(py + dy * (radius + 3))
        M.solid = function(x, y) return math.abs(x - outside_x) <= 1 and math.abs(y - outside_y) <= 1 end
        check(kind .. ": terrain outside the grace circle blocks sight", not turret.sight(t, body, px + dx * 150, py + dy * 150))
      end
      M.solid = function() return true end
      check(kind .. ": grace cannot skip a solid ray origin beyond its boundary", not turret.sight(t, body, px + facing * 150, py))
      check(kind .. ": targets inside the grace circle require no sight ray", turret.sight(t, body, px + facing * 5, py))
      M.solid, M.gravity = nil, nil
    end
  end
end

print("Sentry Laser: terrain after the muzzle stops the beam, not firing")
do
  new_match()
  local owner, enemy = worm(16), worm(32)
  for _, w in ipairs(worms) do w.x, w.y = 5000, 5000 end
  owner.x, owner.y = 100, 100
  M.gravity, M.digs = 0.25, {}
  M.solid = function(_, y) return y >= 110 end
  local t = require("lib/shared").sentry_laser
  local body, s = t.place({ worm = owner })
  for _ = 1, 40 do body.on(body) end
  local py = body.y - t.muzzle_up
  local projectile = { id = 950, kind = "missile", x = 220, y = py, alliance = enemy.alliance, vx = 1, vy = 0 }
  function projectile:remove() self.removed = true; return true end
  local target = { x = projectile.x, y = projectile.y, obj = projectile }
  s.angle = 90
  enemy.x, enemy.y = 200, py
  M.solid = function(x, y) return y >= 110 or x == 160 end
  local ammo = s.ammo
  t.fire(t, body, s, target)
  check("a wall receives the shot and protects the target beyond it",
    not projectile.removed and enemy.hp == 100 and s.ammo == ammo - 1 and M.digs[#M.digs].x < 160)
  M.solid = function(_, y) return y >= 110 end
  t.fire(t, body, s, target)
  check("a clear beam still disintegrates its target", projectile.removed and enemy.hp == 90)
  M.solid, M.gravity = nil, nil
end

print("Sentries: movable feet, damage, lights and coalition capture")
do
  for _, kind in ipairs({ "sentry_gun", "sentry_laser" }) do
    new_match()
    local shared = require("lib/shared")
    local t = shared[kind]
    local owner, ally, enemy = worm(16), worm(17), worm(32)
    for _, w in ipairs(worms) do w.x, w.y = 5000, 5000 end
    owner.x, owner.y = 100, 100
    -- Allied team with its own physical ammo group, same coalition colour.
    ally.team, ally.ammo_group = 9, 9
    local floor = 110
    M.solid = function(_, y) return y >= floor end
    M.gravity, M.spawned, M.actor_sounds, M.actor_booms = 0.25, {}, {}, {}
    local body, s = t.place({ worm = owner })
    for _ = 1, 40 do body.on(body) end
    local x, y, hp = body.x, body.y, s.health
    check(kind .. ": mask overlaps the ground by the requested settling depth", s.planted and y >= 113 and y < 114)
    for _ = 1, 30 do body.on(body) end
    check(kind .. ": no repeated planting or downward creep", s.planted and body.y == y)
    local mask = require("lib/sentry_mask")
    local stamped_x, stamped_y = math.floor(s.x), math.floor(s.y)
    floor = 200
    M.solid = function(px, py)
      px, py = math.floor(px), math.floor(py)
      if py >= floor then return true end
      for _, row in ipairs(mask.rows) do
        if py == stamped_y + row[1] then
          for i = 2, #row, 2 do
            if px >= stamped_x + row[i] and px <= stamped_x + row[i+1] then return true end
          end
        end
      end
      return false
    end
    body.on(body)
    check(kind .. ": destroying support starts a fall despite its old stamped mask", not s.planted and body.y > y and s.health == hp)
    M.solid = function(_, py) return py >= floor end
    for _ = 1, 60 do body.on(body) end
    check(kind .. ": resettles on lower terrain with the same feet actor", s.planted and body.y >= 203 and body.y < 204 and #M.spawned == 1)
    y = body.y
    body.hit(body, { kind = "blast", damage = 3, vx = 9, vy = -4 })
    body.on(body, { damage = 3 })
    check(kind .. ": blast moves horizontally and up, counted once and disabled", body.x > x and body.y < y and s.health == hp - 3 and s.disabled and not s.active, string.format("pos %.2f %.2f old %.2f %.2f speed %.2f %.2f", body.x, body.y, x, y, s.vx, s.vy))
    for _ = 1, 60 do body.on(body) end
    check(kind .. ": damage lockout survives landing", s.planted and s.disabled and not s.active)
    M.message(enemy, wa.msg.START_TURN)
    body.on(body)
    local rgb, _, status = t.status(s)
    check(kind .. ": next turn reactivates with a green light", not s.disabled and rgb == 0x30FF50 and status == "ready")
    s.had_target = true
    check(kind .. ": tracking is red", t.status(s) == 0xFF3030)
    s.had_target, s.ammo = false, 0
    check(kind .. ": empty is grey", t.status(s) == 0x808080)
    M.message(enemy, wa.msg.START_TURN)
    body.hit(body, { kind = "hit", damage = 0, vx = -8, vy = -2 })
    body.on(body)
    check(kind .. ": zero-damage push lifts without damage lockout", not s.planted and not s.disabled and s.vx < 0 and s.health == hp - 3)
    for _ = 1, 50 do body.on(body) end
    local before_rng, before_spawn = rng, #M.spawned
    M.quads = {}; s.tick = 0; M.draw()
    local light, head
    for _, q in ipairs(M.quads) do
      if q.sprite == "sprites/" .. kind .. "/turret_light.png" then light = q end
      if q.sprite == t.art.gun then head = q end
    end
    check(kind .. ": added light follows the head, no RNG or bodies", light and head and (light.color & 0xFFFFFF) == 0x30FF50 and rng == before_rng and #M.spawned == before_spawn)
    s.tick = 15; M.quads = {}; M.draw()
    for _, q in ipairs(M.quads) do if q.sprite == t.art.light then light = q end end
    check(kind .. ": light flashes on simulation ticks", (light.color & 0xFFFFFF) == ((0x30FF50 & 0xFEFEFE) >> 1))
    owner.hp = 0
    check(kind .. ": living allied team is its shot parent", t.owner(body, s) == ally)
    local ammo = s.ammo
    check(kind .. ": capture changes coalition, preserving health and ammo", t.capture(body, s, enemy.alliance) and s.alliance == enemy.alliance and s.health == hp - 3 and s.ammo == ammo and s.disabled and t.owner(body, s) == enemy)
    M.quads = {}; M.draw()
    for _, q in ipairs(M.quads) do if q.sprite == t.art.gun then head = q end end
    check(kind .. ": captured housing follows new coalition colour", (head.color & 0xFFFFFF) == t.tints[enemy.alliance + 1])
    M.message(ally, wa.msg.START_TURN); body.on(body)
    check(kind .. ": capture lockout ends on the next turn", not s.disabled)
    check(kind .. ": gun holds allied turns; laser remains active", select(3, t.status(s)) == "ready")
    M.message(enemy, wa.msg.START_TURN); body.on(body)
    check(kind .. ": own coalition turn follows captured ownership", select(3, t.status(s)) == (t.hold_own_turn and "inactive" or "ready"))
    M.water = body.y - 1; body.on(body)
    check(kind .. ": water removes the single actor and visual state", body.dead and t.state[body.id] == nil)
    M.water, M.solid, M.gravity = nil, nil, nil
  end
end

print("Sentries: worm and projectile contacts, sliding, walls and ledges")
do
  for _, kind in ipairs({ "sentry_gun", "sentry_laser" }) do
    new_match()
    local t = require("lib/shared")[kind]
    local owner, enemy = worm(16), worm(32)
    for _, w in ipairs(worms) do w.x, w.y = 5000, 5000 end
    owner.x, owner.y = 100, 100
    M.gravity = 0.25
    M.solid = function(_, y) return y >= 110 end
    local a, s = t.place({ worm = owner })
    for _ = 1, 40 do a.on(a) end
    check(kind .. ": contact callback is enabled on the same feet actor", type(a.contact) == "function")
    local x, y, hp = s.x, s.y, s.health
    a.contact(a, { other = owner, vx = 8, vy = -4 })
    check(kind .. ": passage for the original planter also excludes pushes", s.vx == 0 and s.vy == 0)
    owner.x = 5000; a.on(a)
    a.contact(a, { other = enemy, vx = 8, vy = -4 })
    check(kind .. ": another jumping worm transfers velocity without damage", s.vx == 4 and s.vy == -2 and s.health == hp and not s.disabled)
    a.on(a)
    check(kind .. ": a jump contact moves sideways and up", a.x > x and a.y < y)
    for _ = 1, 80 do a.on(a) end
    check(kind .. ": settles and friction stops ground sliding", s.planted and s.vx == 0 and s.vy == 0 and s.health == hp)
    -- Reset position between independent obstacle cases, without new bodies.
    s.x, s.y, a.x, a.y = x, y, x, y
    a.contact(a, { other = { kind = "arrow", uid = 501, alive = false }, vx = -8, vy = 0 })
    check(kind .. ": a freed stock arrow supplies quarter incoming momentum", s.vx == -2 and s.health == hp)
    a.on(a)
    check(kind .. ": a horizontal push slides on supported ground", a.x < x and s.planted and s.vx > -2)
    s.x, s.y, a.x, a.y, s.vx, s.vy, s.planted = x, y, x, y, 100, 0, true
    M.solid = function(px, py) return py >= 110 or px >= 125 end
    a.on(a)
    check(kind .. ": fast rightward motion cannot tunnel through a one-pixel wall", a.x > x and a.x < 125 and s.vx == 0)
    s.x, s.y, a.x, a.y, s.vx, s.vy, s.planted = x, y, x, y, -100, 0, true
    M.solid = function(px, py) return py >= 110 or px <= 75 end
    a.on(a)
    check(kind .. ": fast leftward motion stops at the authored feet", a.x < x and a.x > 75 and s.vx == 0)
    s.x, s.y, a.x, a.y, s.vx, s.vy, s.planted = x, y, x, y, 0, -50, false
    M.solid = function(_, py) return py >= 110 or py <= 60 end
    a.on(a)
    check(kind .. ": upward momentum stops below a ceiling", a.y < y and a.y - 22 > 60 and s.vy == 0)
    s.x, s.y, a.x, a.y, s.vx, s.vy, s.planted = x, y, x, y, 20, 0, true
    M.solid = function(px, py) return px < 105 and py >= 110 end
    a.on(a); a.on(a)
    check(kind .. ": sliding beyond support retains momentum and starts falling", a.x > 120 and a.y > y and not s.planted and s.vx > 0)
    s.x, s.y, a.x, a.y, s.vx, s.vy, s.planted = x, y, x, y, 0, 0, true
    M.solid = function(_, py) return py >= 110 end
    owner.x, owner.y = 140, 100
    local other = t.place({ worm = owner })
    for _ = 1, 40 do other.on(other) end
    owner.x = 5000
    s.vx = 60; a.on(a)
    check(kind .. ": another sentry stops sliding with no overlapping silhouettes",
      not require("lib/sentry_mask").intersects(a.x, a.y, other.x, other.y) and a.x < other.x and s.vx == 0)
    s.vx, s.vy = 0, 0
    t.projectile_hit(a, s, 20, 2, -1, 777)
    a.contact(a, { other = { kind = "missile", uid = 777, alive = false }, vx = 8, vy = -4 })
    check(kind .. ": Javelin contact does not add its impulse twice", s.vx == 2 and s.vy == -1 and s.health == hp - 20)
    M.solid, M.gravity = nil, nil
  end
end

print("Sentry placement: at the planter, clear of other worms and walls; buried visual feet")
do
  for _, kind in ipairs({ "sentry_gun", "sentry_laser" }) do
    for _, facing in ipairs({ -1, 1 }) do
      new_match()
      local t = require("lib/shared")[kind]
      local mask = require("lib/sentry_mask")
      local owner, ally = worm(16), worm(17)
      for _, w in ipairs(worms) do w.x, w.y = 1000, 1000 end
      owner.x, owner.y, owner.facing = 100, 100, facing
      M.solid = function(_, y) return y >= 100 end
      M.gravity, M.spawned = 0.25, {}
      local body, s = t.place({ worm = owner })
      check(kind .. ": plants at the worm without launch momentum, facing " .. facing,
        body and body.x == owner.x and body.y == owner.y - 8 and body.vx == 0 and body.vy == 0
        and body.ignored_worms[owner.id] and mask.clear(body.x, body.y, { owner }, owner.id, t.settle_px))
      check(kind .. ": only the mechanical mask is hidden", body.tint == 0 and body.blend == "add" and body.spec.mask)
      for _ = 1, 40 do body.on(body) end
      M.quads = {}; M.draw()
      local base
      for _, q in ipairs(M.quads) do if q.sprite == t.art.base then base = q end end
      local centre_y = (base.points[1][2] + base.points[3][2]) / 2
      -- The original feet are at source row49, 17px below its quad centre.
      local visible_feet = centre_y + 17
      check(kind .. ": full feet art remains 8px below the buried mask anchor", math.abs(visible_feet-body.y-8) < 0.000001
        and visible_feet > 100 and body.y >= 103 and body.y < 104
        and base.depth == wa.depth.BEHIND_TERRAIN)
      body:despawn(); t.state[body.id] = nil
      -- An allied worm stands exactly where the first candidate would be.
      ally.x, ally.y = owner.x, owner.y
      local other, os = t.place({ worm = owner })
      check(kind .. ": searches around another worm, allied or enemy", other and mask.clear(other.x, other.y, { owner, ally }, owner.id, t.settle_px)
        and (other.x ~= ally.x or other.y ~= owner.y - 8))
      other:despawn(); t.state[other.id] = nil
      ally.visible, ally.alliance = false, 1
      local hidden = t.place({ worm = owner })
      check(kind .. ": hidden opponents also retain body clearance", hidden and mask.clear(hidden.x, hidden.y, { owner, ally }, owner.id, t.settle_px))
      hidden:despawn(); t.state[hidden.id] = nil
      ally.visible = true
      ally.x, ally.y = 1000, 1000
      -- Thin wall next to the worm. Free terrain beyond it is inaccessible.
      M.solid = function(x, y) return y >= 100 or (x >= 110 and x <= 114) end
      M.trace_hit = function(x0, _, x1)
        if (x0-112)*(x1-112) <= 0 then return { hit = true, x = 112, y = 90 } end
      end
      local around = t.place({ worm = owner })
      check(kind .. ": placement never crosses a thin wall", around and around.x + mask.right < 110
        and mask.clear(around.x, around.y, { owner }, owner.id, t.settle_px))
      -- Even when an obstacle touches just an extremity, reject the candidate.
      M.solid = function(x, y) return x == 100 + mask.left and y == 100 - 11 end
      check(kind .. ": terrain clearance covers side of silhouette", not mask.clear(100,100,{}))
      M.solid = function() return true end
      local before, ammo = #M.spawned, owner:ammo(t.weapon)
      local failed = t.place({ worm = owner })
      check(kind .. ": blocked search makes no trapping mask and refunds finite ammo", failed == nil and #M.spawned == before
        and owner:ammo(t.weapon) == ammo + 1)
      owner:ammo(t.weapon, { set = -1 })
      t.place({ worm = owner })
      check(kind .. ": blocked search preserves infinite ammo", owner:ammo(t.weapon) == -1)
      M.solid, M.gravity, M.trace_hit = nil, nil, nil
    end
  end
end

print("Sentry placement: bounded native work when a second placement exhausts the search")
do
  for _, kind in ipairs({ "sentry_gun", "sentry_laser" }) do
    new_match({ per_team = 24 })
    local shared = require("lib/shared")
    local t, owner = shared[kind], worms[1]
    for _, w in ipairs(worms) do w.x, w.y = 1000, 1000 end
    owner.x, owner.y = 100, 100
    M.solid = function(_, y) return y >= 100 end
    local first = shared.sentry_gun.place({ worm = owner })
    local reads, probes, sorts, traces, duplicates = 0, 0, 0, 0, 0
    for i = 2, #worms do
      local values = worms[i]
      -- Like native userdata, reads cross the API boundary; count those reads
      -- independently of host speed so the test also works on slower machines.
      worms[i] = setmetatable({}, { __index = function(_, key)
        reads = reads + 1
        return values[key]
      end })
    end
    local solid, sorted, seen = wa.land.solid, wa.sorted, {}
    wa.land.solid = function(x, y)
      probes = probes + 1
      local key = x .. ":" .. y
      if seen[key] then duplicates = duplicates + 1 end
      seen[key] = true
      return solid(x, y)
    end
    wa.sorted = function(tab) sorts = sorts + 1; return sorted(tab) end
    -- The current stamped feet obstruct the ray from the planter, forcing
    -- every otherwise clear candidate to fail, as in the profiling log.
    M.trace_hit = function() traces = traces + 1; return { hit = true, starts_solid = true } end
    local before, ammo = #M.spawned, owner:ammo(t.weapon)
    local failed = t.place({ worm = owner })
    check(kind .. ": exhaustive second placement preserves its failure and refund",
      first and failed == nil and #M.spawned == before and owner:ammo(t.weapon) == ammo + 1 and traces > 100)
    check(kind .. ": each other worm is snapshotted once, not per mask pixel", reads == 47 * 4, reads)
    check(kind .. ": live sentry lists are sorted once per weapon type", sorts == 2, sorts)
    check(kind .. ": each terrain pixel is probed once, including empty pixels",
      duplicates == 0 and probes < 20000, probes)
    -- A new fire must see terrain changes; caches may not survive the callback.
    M.solid = function() return true end
    seen, probes = {}, 0
    t.place({ worm = owner })
    check(kind .. ": the next placement reads the updated terrain", probes > 0)
  end
end

print("Sentry passage: only the planter, until clear, independent of turns and ownership")
do
  new_match()
  local shared, mask = require("lib/shared"), require("lib/sentry_mask")
  local owner = worm(16)
  for _, w in ipairs(worms) do w.x, w.y = 1000, 1000 end
  owner.x, owner.y = 100, 100
  M.solid = function(_, y) return y >= 100 end
  M.gravity, M.spawned = 0, {}
  local first = shared.sentry_gun.place({ worm = owner })
  local second = shared.sentry_laser.place({ worm = owner })
  check("a second sentry searches nearby without overlapping the first mask",
    first and second and not mask.intersects(first.x, first.y, second.x, second.y))
  -- Burial admits soil only in the configured bottom band.
  M.solid = function(_, y) return y >= 100 end
  check("placement accepts its configured burial depth", mask.clear(100,107,{},nil,8))
  check("placement rejects terrain above its burial band", not mask.clear(100,108,{},nil,8))
  check("burial never exempts another worm", not mask.clear(100,107,{owner},nil,8))
  M.solid, M.gravity = nil, nil
  new_match()
  local t = require("lib/shared").sentry_gun
  local planter = worm(16)
  for _, w in ipairs(worms) do w.x, w.y = 1000, 1000 end
  planter.x, planter.y = 100, 100
  M.solid = function(_, y) return y >= 500 end
  M.gravity, M.spawned = 0, {}
  local falling, fs = t.place({ worm = planter })
  fs.vy = 40
  falling.on(falling)
  check("falling retains passage while the frame's old stamp overlaps the planter", fs.planter ~= nil
    and not mask.overlaps_worm(fs.x, fs.y, planter) and falling.ignored_worms[planter.id])
  falling.on(falling)
  check("falling clears passage once old and moved feet are both clear", fs.planter == nil
    and not falling.ignored_worms[planter.id])
  M.solid, M.gravity = nil, nil
  for _, kind in ipairs({ "sentry_gun", "sentry_laser" }) do
    for _, exit in ipairs({ "left", "right", "jump", "death", "gone" }) do
      new_match()
      local t, mask = require("lib/shared")[kind], require("lib/sentry_mask")
      local owner, ally, enemy = worm(16), worm(17), worm(32)
      for _, w in ipairs(worms) do w.x, w.y = 1000, 1000 end
      owner.x, owner.y, owner.vx, owner.vy = 100, 100, 7, -3
      M.solid = function(_, y) return y >= 100 end
      M.gravity, M.spawned = 0, {}
      local body, s = t.place({ worm = owner })
      check(kind .. ": passage is pair-specific (" .. exit .. ")", body.ignored_worms[owner.id]
        and not body.ignored_worms[ally.id] and not body.ignored_worms[enemy.id] and body.vx == 0 and body.vy == 0)
      M.message(enemy, wa.msg.START_TURN)
      body.on(body)
      check(kind .. ": a turn change retains passage while overlapping", s.planter_id == owner.id and body.ignored_worms[owner.id])
      t.capture(body, s, enemy.alliance)
      body.on(body)
      check(kind .. ": coalition capture retains the original planter", s.alliance == enemy.alliance and s.planter_id == owner.id
        and body.ignored_worms[owner.id] and not body.ignored_worms[enemy.id])
      if exit == "left" or exit == "right" then
        local side = exit == "left" and -1 or 1
        owner.y = body.y - 10
        owner.x = body.x + (side < 0 and mask.left - 10 or mask.right + 10)
        body.on(body)
        check(kind .. ": touching the silhouette still retains passage (" .. exit .. ")", s.planter ~= nil)
        owner.x = owner.x + side
      elseif exit == "jump" then
        owner.y = body.y - mask.top - 7
      elseif exit == "death" then owner.hp = 0
      else
        for i, w in ipairs(worms) do if w == owner then table.remove(worms, i); break end end
      end
      body.on(body)
      check(kind .. ": passage ends after " .. exit, s.planter == nil and not body.ignored_worms[owner.id]
        and #body.ignore_calls == 2 and body.ignore_calls[2].enabled == false)
      owner.x, owner.y, owner.hp = body.x, body.y, 100
      body.on(body)
      body.hit(body, { kind = "hit", damage = 0, vy = -1 })
      body.on(body)
      M.message(owner, wa.msg.START_TURN)
      body.on(body)
      check(kind .. ": returning, falling and later turns never grant passage again", #body.ignore_calls == 2
        and not body.ignored_worms[owner.id])
      M.solid, M.gravity = nil, nil
    end
  end
end

print("Lightning Strike: captures the selected sentry for the caster colour")
do
  for _, kind in ipairs({ "sentry_gun", "sentry_laser" }) do
    for _, blocked in ipairs({ false, true }) do
      new_match()
      local t = require("lib/shared")[kind]
      local owner, caster = worm(16), worm(32)
      for _, w in ipairs(worms) do w.x, w.y = 5000, 5000 end
      owner.x, owner.y = 100, 100
      caster.alliance, caster.team, caster.ammo_group = 4, 8, 3
      M.solid = function(_, y) return y >= 110 end
      M.gravity, M.spawned, M.actor_sounds = 0.25, {}, {}
      local body, s = t.place({ worm = owner })
      for _ = 1, 40 do body.on(body) end
      local lightning
      for _, spec in ipairs(replaced) do if spec.weapon == "napalm_strike" then lightning = spec end end
      -- The ray passes down-right through the body centre.
      local dx, dy = 0.5, 0.8660254037844386
      local cx, cy = s.x, s.y - t.capture_up
      if blocked then M.trace_hit = { x = cx - dx * 70, y = cy - dy * 70 } end
      lightning.on_click({ worm = caster, x = cx, y = cy, vx = -1 })
      local effect = M.spawned[#M.spawned]
      caster.alliance = 1 -- the warning retains the colour at fire time
      for _ = 1, 166 do effect.on(effect) end
      check(kind .. ": Lightning " .. (blocked and "cannot capture through terrain" or "captures for snapshotted coalition colour"), s.alliance == (blocked and 0 or 4) and (blocked or s.disabled))
      local registry = require("lib/turret")
      local entry = { t = t, s = s, body = body }
      check(kind .. ": moved sentry cannot be captured at stale beam endpoint",
        not registry.capture_hit(entry, s.x + 100, s.y - 16, 2))
      t.state[body.id] = nil
      check(kind .. ": destroyed sentry cannot be captured", not registry.capture_hit(entry, s.x, s.y - 16, 2))
      M.solid, M.gravity = nil, nil
    end
  end
end

print("Kamikaze Rocket: Ctrl + Space, steered, digging, then a blast into the water")
do
  new_match()
    local spec
  for _, s in ipairs(replaced) do if s.weapon == "suicide_bomber" then spec = s end end
  check("it claims Suicide Bomber with PX's record and the Kamikaze's sheets",
    spec and spec.wep == "weps/suicide_bomber.wep" and spec.worm_sprites.wkamlnk == "sprites/kamikaze_rocket/take_out"
      and spec.worm_sprites.wkamjmp == "sprites/kamikaze_rocket/launch")
  local w = worm(16)
  w.x, w.y, w.weapon, w.turn, w.aim, w.facing, w.state = 100, 100, "suicide_bomber", true, 0.5, 1, "ready"
  M.ctrl, M.digs, M.actor_booms, M.water = false, {}, {}, 500
  check("without Ctrl the fire is eaten: nothing is used", M.message(w, wa.msg.FIRE_WEAPON) == "eat")
  M.hud_lines = {}
  M.hud()
  check("and the HUD says to hold Ctrl", M.hud_lines[#M.hud_lines] ~= nil and M.hud_lines[#M.hud_lines]:find("Ctrl") ~= nil)
  M.ctrl = true
  check("with Ctrl it fires", M.message(w, wa.msg.FIRE_WEAPON) == nil)
  M.message(w, wa.msg.FRAME_FINISH)
  check("nothing moves before WA's Kamikaze begins", w.x == 100 and w.visible ~= false)
  w.state = "kamikaze"
  M.message(w, wa.msg.FRAME_FINISH)
  check("then it flies along the aim, 8 px a frame, the worm hidden, digging 8",
    w.x == 108 and w.y == 100 and w.visible == false and M.digs[#M.digs].radius == 8, w.x .. "," .. w.y)
  local y = w.y
  M.right = true
  M.message(w, wa.msg.FRAME_FINISH)
  M.right = false
  check("right turns it clockwise (down, facing right)", w.y > y)
  M.hud_lines = {}
  M.hud()
  check("the HUD counts down its 4 seconds", M.hud_lines[1] == "Kamikaze Rocket: 3.96", M.hud_lines[1])
  for _ = 1, 197 do M.message(w, wa.msg.FRAME_FINISH) end
  check("no blast before 4 seconds", #M.actor_booms == 0)
  M.message(w, wa.msg.FRAME_FINISH)
  check("at 4 seconds it blows up (damage 30, blast 100) and the worm goes into the water",
    #M.actor_booms == 1 and M.actor_booms[1].opts.damage == 30 and M.actor_booms[1].opts.id == 100
      and w.y > M.water)
  w.state = nil -- WA's Kamikaze ends in the water
  M.message(w, wa.msg.FRAME_FINISH)
  check("when WA's Kamikaze ends, the worm is shown again and the rocket gone",
    w.visible == true and next(require("lib/shared").kamikaze_rockets) == nil)
  M.ctrl, M.water = nil, nil
end

print("pools: every stock slot is in exactly one place")
do
  new_match()
  turn(16)
  -- Every slot the pack zeroed is a pooled slot; every other slot it never touched.
  local pooled = {}
  for _, alliance in ipairs({ 0, 1 }) do
    for name in pairs(ammo[alliance]) do
      if not SCHEME_OWNED[name] then
        pooled[name] = true
      end
    end
  end
  local n, bad = 0, {}
  for name in pairs(pooled) do
    n = n + 1
    if not IS_STOCK[name] then
      bad[#bad + 1] = name
    end
  end
  -- 54: the Baseball Bat is WA's own (stock.baseball_bat), pooled by the
  -- Highlander profile, not a PX weapon on the girder's slot.
  check("54 pooled slots", n == 54, tostring(n))
  check("all pooled names are stock", #bad == 0, table.concat(bad, ","))
  local untouched = true
  for name in pairs(SCHEME_OWNED) do
    if pooled[name] then
      untouched = false
    end
  end
  check("scheme-owned slots are never pooled", untouched)
  check("Teleport's slot left to the scheme", ammo[0].invisibility == 2 and ammo[1].invisibility == 2)
  check("skip go left to the scheme", ammo[0].skip_go == -1)
end

print("deal: one from each pool, per worm")
do
  new_match()
  frame()
  local ok = true
  for _, id in ipairs({ 16, 17, 32, 33 }) do
    local h = hand(id)
    if not h or #h ~= 3 or SECOND[h[1]] or MOVEMENT[h[1]] or SCHEME_OWNED[h[1]]
        or not SECOND[h[2]] or not MOVEMENT[h[3]] then
      ok = false
    end
  end
  check("every worm gets offensive, second, movement", ok)
end

print("deal: deterministic, each worm dealt on its own first message")
do
  new_match()
  frame()
  local first = { hand(16), hand(17), hand(32), hand(33) }
  new_match()
  frame()
  local again = { hand(16), hand(17), hand(32), hand(33) }
  local same_hands = true
  for i = 1, 4 do
    if table.concat(first[i], ",") ~= table.concat(again[i], ",") then
      same_hands = false
    end
  end
  check("same RNG, same hands", same_hands)
  local order = {}
  for _, line in ipairs(logs) do
    local who = line:match("^highlander: worm (%d+) dealt")
    if who then
      order[#order + 1] = who
    end
  end
  check("dealt in message order", table.concat(order, ",") == "16,17,32,33", table.concat(order, ","))
end

print("deal: a worm that first speaks late still gets a hand")
do
  new_match()
  -- Only worm 16 exists when the first message arrives.
  local later = {}
  for i = #worms, 2, -1 do
    table.insert(later, 1, table.remove(worms, i))
  end
  frame()
  for _, w in ipairs(later) do
    worms[#worms + 1] = w
  end
  frame()
  local ok = true
  for _, id in ipairs({ 16, 17, 32, 33 }) do
    if not hand(id) or #hand(id) ~= 3 then
      ok = false
    end
  end
  check("all four dealt", ok)
end

print("cavern: PX's short ranges, no strikes or Ferret")
do
  local banned = false
  for seed = 1, 40 do
    new_match({ cavern = true })
    rng = seed * 7919
    frame()
    for _, id in ipairs({ 16, 17, 32, 33 }) do
      local h = hand(id)
      if NOT_IN_CAVES[h[1]] or NOT_IN_CAVES[h[2]] then
        banned = true
      end
    end
  end
  check("160 cavern hands, none of them", not banned)
  local seen = false
  for seed = 1, 40 do
    new_match()
    rng = seed * 7919
    frame()
    for _, id in ipairs({ 16, 17, 32, 33 }) do
      local h = hand(id)
      if NOT_IN_CAVES[h[1]] or NOT_IN_CAVES[h[2]] then
        seen = true
      end
    end
  end
  check("...while open maps do deal them", seen)
end

print("turn: the rules leave the scheme's gifts to its weapon data")
do
  new_match()
  frame()
  ammo[0].bungee, ammo[0].surrender, ammo[0].freeze = 1, 0, 0
  turn(16)
  -- The engine gives them from components/highlander.lua's data (lua-host's
  -- Highlander tests); the rules don't touch them.
  check("the Hot Air Balloons are left alone", ammo[0].bungee == 1, tostring(ammo[0].bungee))
  check("and the Wind Changer and Weapon Crate", ammo[0].surrender == 0 and ammo[0].freeze == 0)
end

print("Weapon Crate: placed, a weapon crate teleported in front of the worm")
do
  new_match()
    local spec
  for _, s in ipairs(replaced) do if s.weapon == "freeze" then spec = s end end
  check("it claims Freeze with PX's record, placed through on_fire",
    spec and spec.wep == "weps/freeze.wep" and type(spec.on_fire) == "function"
      and spec.worm_sprites.weaponlnk == "sprites/weapon_crate/take_out")
  local w = worm(16)
  w.x, w.y, w.facing = 100, 50, -1
  M.crate_spawns = {}
  spec.on_fire({ worm = w })
  local c = M.crate_spawns[1]
  check("one weapon crate, teleported in 40 px in front", #M.crate_spawns == 1 and c.kind == "weapon"
    and c.drop == "teleport" and c.x == 60 and c.y == 50)
end

print("turn: only the active worm's hand is usable, one of each")
do
  new_match()
  frame()
  turn(16)
  check("team 1 holds exactly worm 16's hand", same(usable(0), hand(16)),
    table.concat(usable(0), ","))
  local ones = true
  for _, name in ipairs(hand(16)) do
    if ammo[0][name] ~= 1 then
      ones = false
    end
  end
  check("each at exactly 1", ones)
  check("the other team holds nothing", #usable(1) == 0, table.concat(usable(1), ","))
  check("the scheme's infinite bazooka is gone unless dealt",
    ammo[1].bazooka == 0)
end

print("turn: the previous worm's hand is taken back")
do
  new_match()
  frame()
  turn(16)
  turn(32)
  check("team 1 holds nothing", #usable(0) == 0, table.concat(usable(0), ","))
  check("team 2 holds worm 32's hand", same(usable(1), hand(32)))
end

print("turn: a teammate's hand is not usable on your turn")
do
  new_match()
  frame()
  turn(17)
  check("team 1 holds worm 17's hand, not 16's", same(usable(0), hand(17)))
end

print("death: the active worm takes the dead worm's hand, at once")
do
  new_match()
  frame()
  turn(16)
  local victim = hand(32)
  worm(32).x, worm(32).y = 321, 123
  worm(16).x, worm(16).y = 50, 40
  kill(32)
  local reward = M.transfers[#M.transfers]
  check("reward icons start at the killed worm", reward.from == 32 and reward.to == 16
    and reward.x == 321 and reward.y == 123)
  worm(32).x = 999
  check("reward origin is captured", reward.x == 321)
  local expect = {}
  for _, n in ipairs(hand(16)) do expect[#expect + 1] = n end
  for _, n in ipairs(victim) do expect[#expect + 1] = n end
  -- Duplicates collapse in ammo (both are just "1"), so compare as sets.
  local want = {}
  for _, n in ipairs(expect) do want[n] = true end
  local got = {}
  for _, n in ipairs(usable(0)) do got[n] = true end
  local ok = true
  for n in pairs(want) do if not got[n] then ok = false end end
  for n in pairs(got) do if not want[n] then ok = false end end
  check("stolen weapons usable this turn", ok, table.concat(usable(0), ","))
  -- The dead worm's entity goes away; its id must be all the pack needs.
  remove(32)
  turn(33)
  turn(16)
  local ok2 = true
  for n in pairs(want) do if ammo[0][n] ~= 1 then ok2 = false end end
  check("and kept on the stealer's next turn", ok2)
end

print("death: a friendly kill still transfers, as in PX")
do
  new_match()
  frame()
  turn(16)
  kill(17)
  local has = {}
  for _, n in ipairs(usable(0)) do has[n] = true end
  local ok = true
  for _, n in ipairs(hand(17)) do if not has[n] then ok = false end end
  check("teammate's hand goes to the active worm", ok)
end

print("death: one death, one transfer")
do
  new_match()
  frame()
  turn(16)
  kill(32)
  local n = 0
  for _, line in ipairs(logs) do
    if line:find("took") then n = n + 1 end
  end
  frame()
  frame()
  local m = 0
  for _, line in ipairs(logs) do
    if line:find("took") then m = m + 1 end
  end
  check("no second transfer on later frames", n == 1 and m == 1, n .. " then " .. m)
end

print("death: the active worm dying on its own turn loses its hand, gives nothing")
do
  new_match()
  frame()
  turn(16)
  kill(16)
  check("team 1 holds nothing", #usable(0) == 0, table.concat(usable(0), ","))
  local took = false
  for _, line in ipairs(logs) do
    if line:find("took") then took = true end
  end
  check("no transfer", not took)
end

print("death: a worm that dies after its stealer died gives nothing")
do
  new_match()
  frame()
  turn(16)
  kill(16)
  kill(32)
  local took = false
  for _, line in ipairs(logs) do
    if line:find("took") then took = true end
  end
  check("no transfer to a dead worm", not took)
end

print("inventory verbs: damage and weapon conditions choose arbitrary targets")
do
  new_match()
  local loot = wa.inventory.create({
    id = "conditional-test", slots = { "bazooka", "grenade" },
  })
  loot:set(worm(32), "bazooka", 2)
  loot:set(worm(32), "grenade", 1)
  local hit = {
    victim = worm(32), attacker = worm(16),
    lost = 25, weapon = "baseball_bat",
  }
  if hit.lost >= 20 and hit.weapon == "baseball_bat" then
    loot:transfer(hit.victim, hit.attacker, {
      weapons = "bazooka", amount = 1, mode = "move",
    })
  end
  check("conditioned steal moved one selected weapon",
    loot:get(worm(16), "bazooka") == 1
      and loot:get(worm(32), "bazooka") == 1
      and loot:get(worm(32), "grenade") == 1)
end

print("fire jump: PX's timeline after a fire punch")
do
  new_match()
  frame()
  local w = worm(16)
  w.weapon, w.facing, w.vx, w.vy = "fire_punch", -1, 0, 0
  ammo[w.ammo_group].fire_punch = 1
  M.message(w, wa.msg.FIRE_WEAPON)
  -- WA's wind-up: the worm stands still, and nothing may move it.
  for _ = 1, 12 do M.message(w, wa.msg.FRAME_FINISH) end
  check("nothing during the wind-up", w.vx == 0 and w.vy == 0, w.vx .. " " .. w.vy)
  -- FireFinal: WA's setup_Punching starts the worm up at 6.
  w.vy = -6
  local at = {}
  for t = 1, 215 do
    if t == 100 then w.vy = 8 end -- falling fast mid-glide
    M.message(w, wa.msg.FRAME_FINISH)
    at[t] = { vx = w.vx, vy = w.vy }
  end
  check("up at 9 on the punch's first frame", at[1].vy == -9, tostring(at[1].vy))
  check("forward, the way it faces, 30 frames in", at[30].vx == -4 and at[29].vx == 0,
    tostring(at[30].vx))
  check("a little higher at 60", at[60].vy == -10, tostring(at[60].vy))
  check("a fall past 5 goes back to 4", at[100].vy == 4, tostring(at[100].vy))
  w.vy = 8
  M.message(w, wa.msg.FRAME_FINISH)
  check("and lets go after 210 frames", w.vy == 8, tostring(w.vy))
  check("no cut of its own: WA's punch cuts", not M.cuts)
  local other = worm(32)
  other.weapon, other.vy = "bazooka", 0
  M.message(other, wa.msg.FIRE_WEAPON)
  other.vy = -6
  M.message(other, wa.msg.FRAME_FINISH)
  check("another weapon does not jump", other.vy == -6)
end

print("fire jump: a wind-up that never ends in a punch")
do
  new_match()
  frame()
  local w = worm(16)
  w.weapon, w.vy = "fire_punch", 0
  ammo[w.ammo_group].fire_punch = 1
  M.message(w, wa.msg.FIRE_WEAPON)
  for _ = 1, 100 do M.message(w, wa.msg.FRAME_FINISH) end
  w.vy = -3  -- a later jump of some other kind
  M.message(w, wa.msg.FRAME_FINISH)
  check("is forgotten", w.vy == -3, tostring(w.vy))
end

print("px holds: each replacement carries declarative engine hold data")
do
  new_match()
  local holds = {}
  for _, spec in ipairs(replaced) do
    if spec.hold then holds[spec.weapon] = spec.hold end
  end
  local count = 0
  for _ in pairs(holds) do count = count + 1 end
  check("ten PX holds claimed", count == 10, tostring(count))
  check("Sticky Bomb has a weapon and the lower radial hand",
    holds.grenade.sheet == "sprites/px_hold/sticky_bomb"
    and holds.grenade.hand == "sprites/px_hold/hand_rad_lower"
    and holds.grenade.thrown)
  check("Shadow-Bolt animates with no hand",
    holds.longbow.sheet == "sprites/px_hold/shadow_bolt"
    and holds.longbow.hand == nil and holds.longbow.frames == 6)
  check("Sniper Rifle keeps its shot hold and flash",
    holds.handgun.keep_while_firing and holds.handgun.flash.sheet == "sprites/sniper_rifle/flash"
    and holds.handgun.hand == nil)
  check("Nuke Rocket uses PX's fixed angles",
    holds.mine.static.weap == -0.1 and holds.mine.static.hand == 0.4
    and holds.mine.hand == "sprites/px_hold/hand_rad")
end

print("sniper rifle: PX's laser sight, drawn only")
do
  new_match()
  frame()
  local w = worm(16)
  for _, o in ipairs(worms) do
    o.x, o.y = -5000, 0 -- behind the ray
  end
  w.weapon, w.facing, w.x, w.y, w.aiming, w.aim, w.turn = "handgun", 1, 100, 50, true, 0.5, true
  M.message(w, wa.msg.FRAME_FINISH) -- the rifle is drawn with this aim
  w.aim = 0.53 -- WA's crosshair, rewritten at render time: the ray keeps the rifle's
  M.draw()
  check("a full-length ray: 150 quads and the tip", #M.quads == 151, tostring(#M.quads))
  local q = M.quads[1]
  -- The quad's first corner is the start plus half the ray's width, across.
  local sx, sy = (q.points[1][1] + q.points[4][1]) / 2, (q.points[1][2] + q.points[4][2]) / 2
  check("from 12 pixels out along the aim, on the barrel 2 above the centre line",
    math.abs(sx - 112) < 1 / 8 and math.abs(sy - 48) < 1 / 8, sx .. "," .. sy)
  check("added, red, brighter at the start", q.blend == "add" and q.colors[1] == 0xC0FF6060
    and q.colors[2] == 0xFFFF3030)
  local tip = M.quads[#M.quads]
  check("fading out at the tip", tip.colors[2] == 0x10FF3030 and tip.colors[1] == 0xFFFF3030)
  M.quads, M.trace_hit = {}, { x = 312, y = 50 }
  M.draw()
  check("stops at terrain 200 pixels on", #M.quads == 3, tostring(#M.quads))
  M.quads, M.trace_hit = {}, nil
  local other = worm(32)
  other.x, other.y = 172, 52
  M.draw()
  check("and at a worm in the way", #M.quads == 2, tostring(#M.quads))
  M.quads = {}
  w.turn = false
  M.draw()
  w.turn, w.aiming = true, false
  M.message(w, wa.msg.FRAME_FINISH)
  M.draw()
  check("only the current worm, only while aiming", #M.quads == 0)
  w.aiming, w.facing, w.x, w.aim = true, -1, 300, 0.5
  M.message(w, wa.msg.FRAME_FINISH)
  M.draw()
  q = M.quads[1]
  sx, sy = (q.points[1][1] + q.points[4][1]) / 2, (q.points[1][2] + q.points[4][2]) / 2
  check("facing left: 12 out to the left, the barrel still above",
    math.abs(sx - 288) < 1 / 8 and math.abs(sy - 48) < 1 / 8, sx .. "," .. sy)
  M.quads = {}
  w.aiming = false
  M.message(w, wa.msg.FRAME_FINISH)
  ammo[w.ammo_group].handgun = 1
  M.message(w, wa.msg.FIRE_WEAPON)
  check("its own shot sound on firing", M.sounds[1] == "sounds/sniper_firing.wav")
end

print("double bazooka: a second shell carries on")
do
  new_match()
  frame()
  local spec
  for _, r in ipairs(replaced) do
    if r.weapon == "bazooka" then spec = r end
  end
  check("held as a plain bazooka: its fires.subtype stays stock (3), not the scheme's 7",
    not (spec.fires and spec.fires.subtype))
  check("the Double Bazooka on the bazooka slot, with its icon and an explode step", spec
    and spec.copy_from == "stock.bazooka" and spec.panel_icon == "sprites/double_bazooka/double_bazooka_ico.png"
    and type(spec.on_explode) == "function")
  local w = worm(16)
  w.weapon = "bazooka"
  ammo[w.ammo_group].bazooka = 1
  M.message(w, wa.msg.FIRE_WEAPON)
  M.missile({ id = 500, phase = "pre", weapon = "bazooka", x = 90, y = 52, vx = 0, vy = 0 })
  M.missile({ id = 500, phase = "post", weapon = "bazooka", x = 100, y = 50, vx = 6, vy = -1 })
  spec.on_explode({ x = 100, y = 50, slot = 1, missile = 500 })
  check("the first shell cuts PX's 50-pixel hole", M.digs and #M.digs == 1
    and M.digs[1].x == 100 and M.digs[1].y == 50 and M.digs[1].radius == 50)
  check("no second shell during the blast", not M.launched)
  M.message(worm(32), wa.msg.FRAME_FINISH)
  local l = M.launched and M.launched[1]
  check("a second shell after it, at the first one's speed, for the shooter", l and #M.launched == 1
    and l.weapon == "bazooka" and l.owner == w and l.x == 100 and l.y == 50
    and l.vx == 6 and l.vy == -1)
  check("with PX's damage 40 and 5 s fuse, and the record's own bazooka shell (not PX's 54, a cluster bit here)",
    l.missile.explosion.power == 40 and l.missile.fuse == 5000 and l.missile.sprite == nil)
  M.message(worm(32), wa.msg.FRAME_FINISH)
  check("launched once", #M.launched == 1)
  M.missile({ id = 9001, phase = "post", weapon = "bazooka", x = 140, y = 44, vx = 6, vy = 0 })
  spec.on_explode({ x = 140, y = 44, slot = 1, missile = 9001 })
  M.message(w, wa.msg.FRAME_FINISH)
  check("the second shell's explosion ends it", #M.launched == 1 and #M.digs == 1)
  spec.on_explode({ x = 1, y = 1, slot = 1 })
  spec.on_explode({ x = 1, y = 1, slot = 1, missile = 777 })
  M.message(w, wa.msg.FRAME_FINISH)
  check("no missile id, or one never seen flying: nothing", #M.launched == 1 and #M.digs == 1)
end

print("s.m.a.r.t bomb: homing bits leave the red trail")
do
  new_match()
  local spec
  for _, r in ipairs(replaced) do
    if r.weapon == "mortar" then spec = r end
  end
  check("homing bits draw the trail's red circles, not WA's green gas, on the generated record",
    spec and spec.clusters.bit.homing.trail.sprite == 250 and spec.clusters.bit.homing.kind == "lock"
      and spec.clusters.count == 7)
end

print("old woman launcher: launch the Old Woman from a clear point")
do
  new_match()
  local spec
  for _, r in ipairs(replaced) do
    if r.weapon == "old_woman" then spec = r end
  end
  check("stock Old Woman supplies the animal and Lua handles its projectile",
    spec and spec.copy_from == "stock.old_woman" and type(spec.on_fire) == "function"
      and spec.fires.type == 1 and spec.fires.method == 3)
  local w = worm(17)
  w.x, w.y = 100, 100
  M.solid = function(x) return x <= 91 end
  spec.on_fire({ worm = w, x = 86, y = w.y, vx = -12, vy = 0 })
  check("a wall at the muzzle moves the Old Woman into clear space",
    #M.launched == 1 and M.launched[1].weapon == "old_woman"
      and M.launched[1].x >= 94 and M.launched[1].missile.fuse == 5000)
  M.solid = nil
  spec.on_fire({ worm = w, x = 114, y = w.y, vx = 12, vy = 0 })
  check("a clear muzzle keeps WA's original launch point",
    #M.launched == 2 and M.launched[2].x == 114)
  -- A thin wall (105-108) between the worm and a clear muzzle beyond it:
  -- the worm can't see the muzzle, so she starts on the worm's side.
  M.solid = function(x) return x >= 105 and x < 109 end
  M.trace_hit = function(x0, _, x1)
    local wall = 107
    if (x0 - wall) * (x1 - wall) < 0 then return { hit = true, x = wall, y = w.y } end
  end
  spec.on_fire({ worm = w, x = 114, y = w.y, vx = 12, vy = 0 })
  check("a muzzle past a thin wall moves her back to the worm's side",
    #M.launched == 3 and M.launched[3].x < 105 and M.launched[3].x > w.x - 40,
    #M.launched == 3 and M.launched[3].x or #M.launched)
  M.trace_hit = nil
  M.solid = function() return true end
  spec.on_fire({ worm = w, x = 86, y = w.y, vx = -12, vy = 0 })
  check("with no clear point within 40 pixels she starts at the worm",
    #M.launched == 4 and M.launched[4].x == w.x and M.launched[4].y == w.y)
  M.solid = nil
end

print("valyrian fire: PX's bottle, thrown further out, refunded from the water")
do
  new_match()
  local spec
  for _, r in ipairs(replaced) do
    if r.weapon == "petrol_bomb" then spec = r end
  end
  check("Valyrian Fire takes the scheme's record, its icon and PX's bottle in hand and flight", spec
    and spec.wep == "weps/petrol_bomb.wep" and spec.panel_icon == "sprites/valyrian_fire/icon.png"
    and spec.sprite == "petrolbm" and type(spec.on_fire) == "function"
    and spec.hold and spec.hold.sheet == "sprites/px_hold/valyrian_fire.png")
  local w = worm(17)
  w.x, w.y = 100, 100
  spec.on_fire({ worm = w, x = 110, y = 100, vx = 3, vy = -4 })
  local l = M.launched and M.launched[1]
  check("the bottle starts 15 pixels further along the throw, at the throw's speed", l
    and l.weapon == "petrol_bomb" and l.owner == w and l.vx == 3 and l.vy == -4
    and l.x == 110 + 9 and l.y == 100 - 12,
    l and (l.x .. "," .. l.y))
  M.water = 90
  ammo[w.ammo_group].petrol_bomb = 0
  spec.on_fire({ worm = w, x = 110, y = 100, vx = 3, vy = -4 })
  check("from the water nothing is thrown and the bottle goes back to the team",
    #M.launched == 1 and ammo[w.ammo_group].petrol_bomb == 1)
  M.water = nil
  -- The impact: PX's 51 fires on a 3-pixel ring, for the turn's worm.
  w.turn = true
  spec.on_explode({ worm = worm(32), x = 300, y = 200 })
  local f = M.fires or {}
  local near, pxs = true, true
  for _, fire in ipairs(f) do
    local dx, dy = (fire.x - 300), (fire.y - 200)
    if dx * dx + dy * dy > 9.0001 then near = false end
    if fire.owner ~= w or fire.count ~= 0 or fire.duration ~= 6000 or fire.up_power ~= 0
      or fire.damage ~= 0 or fire.damage_scale ~= 1.25 or fire.knock_scale ~= 2
      or fire.tint ~= 0x4BE14B then pxs = false end
  end
  check("51 fires on a 3-pixel ring around the impact", #f == 51 and near, tostring(#f))
  check("each with PX's fire values, green, hitting 25% harder and knocking twice as far, for the turn's worm", pxs)
  check("PX's first fire: x + 3 cos(360), y - 3 sin(360)",
    f[1] and f[1].x == 300 - 0.85107421875 and f[1].y == 200 - 2.8767547607421875)
  w.turn = nil
end

print("ferret: thrown, it walks the terrain's outline and blows up on worms")
do
  local function setup(solid)
    new_match()
    M.gravity = (1 / 4)
    M.solid = solid
    M.spawned, M.actor_booms, M.mines, M.oil = {}, {}, {}, {}
    for _, w in ipairs(worms) do w.x, w.y, w.turn = -9000, -9000, false end
    local spec
    for _, r in ipairs(replaced) do
      if r.weapon == "salvation_army" then spec = r end
    end
    return spec
  end
  local function run(n)
    for _ = 1, n do
      for _, a in ipairs(M.spawned) do if not a.dead then a.on(a) end end
    end
  end
  local floor = function(_, y) return y >= 200 end
  local spec = setup(floor)
  check("the Ferret takes the scheme's record, its icon, its hold and a throw", spec
    and spec.wep == "weps/salvation_army.wep" and spec.panel_icon == "sprites/ferret/icon.png"
    and spec.hold and spec.hold.sheet == "sprites/ferret/hold.png" and type(spec.on_fire) == "function")
  local thrower = worm(16)
  thrower.facing, thrower.turn = 1, true
  spec.on_fire({ worm = thrower, x = 100, y = 120, vx = 1, vy = 0 })
  local f = M.spawned[1]
  run(40)
  local landed_y = f.y
  check("it falls to the floor and stands on it with WA's missile shape (the Skunk's), its body drawn above",
    f.shape == "missile" and landed_y > 180 and landed_y < 190, landed_y)
  check("a walking sound once it lands", #M.sounds > 0 and M.sounds[#M.sounds] == "sounds/ferret/walk.wav")
  local x0 = f.x
  run(30)
  check("it walks the way its thrower faced, 2 steps of 3 pixels a frame along the floor",
    f.x > x0 + 120 and math.abs(f.y - landed_y) <= 3, (f.x - x0))
  check("upright on the floor, animated", f.angle ~= nil and (f.angle < 1 or f.angle > 359) and f.shown ~= nil,
    tostring(f.angle))
  -- As WA places it: at its worm standing on the floor, no speed. Its
  -- circle starts in the ground; it must rise clear and walk off, not turn
  -- on the spot until the grace is over and blow up on its thrower.
  spec = setup(floor)
  thrower = worm(16)
  thrower.facing, thrower.turn = 1, true
  thrower.x, thrower.y = 100, 192
  spec.on_fire({ worm = thrower, x = 100, y = 192, vx = 0, vy = 0 })
  f = M.spawned[1]
  run(120)
  check("placed at its worm, it rises clear of the ground and walks off, sparing it",
    not f.dead and #M.actor_booms == 0 and f.x > 300 and math.abs(f.y - landed_y) <= 3,
    (f.x) .. "," .. (f.y))
  -- Placed beside another worm, 15 pixels off: it only goes off once it
  -- walks into it, not on the spot.
  spec = setup(floor)
  thrower = worm(16)
  thrower.facing, thrower.turn = 1, true
  thrower.x, thrower.y = 100, 192
  local neighbour = worm(17)
  neighbour.x, neighbour.y, neighbour.vx, neighbour.vy = 115, 192, 0, 0
  spec.on_fire({ worm = thrower, x = 100, y = 192, vx = 0, vy = 0 })
  f = M.spawned[1]
  run(1)
  local first = f.dead
  run(60)
  check("placed beside a worm, it doesn't go off at once, but on walking into it",
    not first and f.dead and neighbour.vy == -5, tostring(first))
  check("and says why", logs[#logs] and logs[#logs]:find("Ferret explodes on a worm") ~= nil, logs[#logs])
  -- A cliff: the floor at 200 up to x = 400, at 300 beyond.
  spec = setup(function(x, y) return y >= (x < 400 and 200 or 300) end)
  spec.on_fire({ worm = thrower, x = 300, y = 120, vx = 0, vy = 0 })
  f = M.spawned[1]
  run(200)
  check("off a ledge it follows the cliff down instead of falling, and walks on below",
    not f.dead and f.x > 420 and f.y > 270 and f.y < 290, (f.x) .. "," .. (f.y))
  -- A worm in the way: the turn's worm is spared at first, any other is not.
  spec = setup(floor)
  thrower = worm(16)
  thrower.facing, thrower.turn = 1, true
  local victim = worm(17)
  victim.x, victim.y, victim.vx, victim.vy = 260, 190, 0, 0
  spec.on_fire({ worm = thrower, x = 100, y = 120, vx = 0, vy = 0 })
  f = M.spawned[1]
  run(120)
  check("it blows up on a worm, thrown up first (SpX = TurnSide, SpY = -5)",
    f.dead and #M.actor_booms == 1 and M.actor_booms[1].opts.damage == 100 and M.actor_booms[1].opts.id == 50
    and victim.vy == -5 and victim.vx == 1, #M.actor_booms)
  spec = setup(floor)
  thrower = worm(16)
  thrower.facing, thrower.turn = 1, true
  thrower.x, thrower.y = 140, 190
  spec.on_fire({ worm = thrower, x = 100, y = 120, vx = 0, vy = 0 })
  f = M.spawned[1]
  run(55) -- it falls for some 23 frames, then walks past its thrower
  check("the turn's worm is spared for its first 60 frames", not f.dead and f.x > 180, f.x)
  -- Mines are flicked up and it walks on; oil drums and the water end it.
  spec = setup(floor)
  local mine = { id = 901, x = 200, y = 195, vx = 0, vy = 0 }
  M.mines = { mine }
  spec.on_fire({ worm = thrower, x = 100, y = 120, vx = 0, vy = 0 })
  f = M.spawned[1]
  run(60)
  check("a mine is flicked up (SpX = TurnSide, SpY = -7) and it walks on",
    mine.vy == -7 and mine.vx == 1 and not f.dead)
  spec = setup(floor)
  M.oil = { { id = 902, x = 200, y = 191 } }
  spec.on_fire({ worm = thrower, x = 100, y = 120, vx = 0, vy = 0 })
  run(60)
  check("it blows up on an oil drum", M.spawned[1].dead and #M.actor_booms == 1)
  spec = setup(floor)
  M.water = 150
  spec.on_fire({ worm = thrower, x = 100, y = 120, vx = 0, vy = 0 })
  run(30)
  M.water = nil
  check("and in the water", M.spawned[1].dead and #M.actor_booms == 1)
  -- A Ferret nothing sets off goes off by itself after 15 seconds.
  spec = setup(function(x, y) return y >= 200 and x >= 0 and x < 4000 end)
  spec.on_fire({ worm = thrower, x = 100, y = 120, vx = 0, vy = 0 })
  f = M.spawned[1]
  run(749)
  local alive_at_749 = not f.dead
  run(1)
  check("nothing in its way, it goes off by itself after 15 s (750 frames)",
    alive_at_749 and f.dead and #M.actor_booms == 1 and logs[#logs]:find("its 15 s fuse") ~= nil, logs[#logs])
  -- At most ten walk: the eleventh makes the oldest vanish, without a bang.
  spec = setup(floor)
  for i = 1, 11 do
    spec.on_fire({ worm = thrower, x = (100 + 20 * i), y = 120, vx = 0, vy = 0 })
  end
  run(2)
  local walking = 0
  for _, a in ipairs(M.spawned) do if not a.dead then walking = walking + 1 end end
  check("at most ten walk; the oldest goes quietly", walking == 10 and M.spawned[1].dead and #M.actor_booms == 0,
    walking)
  M.gravity, M.solid = nil, nil
end

print("bowling ball strike: three balls from the sky, rolling on PX's physics")
do
  new_match()
  local spec
  for _, r in ipairs(replaced) do
    if r.weapon == "sheep_strike" then spec = r end
  end
  check("the strike takes the scheme's record, its icon, the ball and a click", spec
    and spec.wep == "weps/sheep_strike.wep" and spec.panel_icon == "sprites/bowling_ball/strike_icon.png"
    and type(spec.on_click) == "function" and spec.on_select and spec.on_select.cursor)
  local function run(n)
    for _ = 1, n do
      for _, a in ipairs(M.spawned or {}) do if not a.dead then a.on(a) end end
    end
  end
  local w = worm(16)
  M.gravity = (1 / 4)
  M.solid = function(_, y) return y >= 200 end
  M.spawned = {}
  -- WA's arrow turned to the right-to-left: the shot's x speed negative.
  -- The click is on the floor.
  spec.on_click({ worm = w, x = 300, y = 200, vx = -5, vy = 0 })
  local xs = {}
  for i, a in ipairs(M.spawned) do xs[i] = a.x // 1 end
  check("three balls 48 apart from PX's plane height, set back upwind of the click", #M.spawned == 3
    and xs[2] > 300 and xs[1] == xs[2] - 48 and xs[3] == xs[2] + 48 and M.spawned[2].y == -128 + 4,
    table.concat(xs, ","))
  local ball = M.spawned[2]
  local x_start = ball.x
  run(1)
  check("moving the way WA's strike arrow points: the shot's x speed", ball.x < x_start)
  local landed_x
  for _ = 1, 200 do
    run(1)
    if not landed_x and ball.y >= (200 - 16) then landed_x = ball.x end
  end
  check("the middle ball comes down on the click", landed_x and math.abs(landed_x - 300) <= 6,
    landed_x and tostring(landed_x))
  check("drawn in front of the terrain", ball.depth == wa.depth.OBJECTS)
  run(600)
  local rest = ball.y
  check("it comes to rest on the floor, its 16-pixel circle on it, drawn 4 lower", rest > 186 and rest < 188,
    tostring(rest))
  local x0, angle0 = ball.x, ball.angle
  run(50)
  check("and stays there, asleep", ball.x == x0 and ball.y == rest)
  check("asleep, it stops turning (PX zeroes its real speed)", ball.angle == angle0)
  check("it spun while it rolled", ball.angle ~= nil)
  -- A slope down to the right: solid below y = 200 + x / 2.
  new_match()
  for _, r in ipairs(replaced) do
    if r.weapon == "sheep_strike" then spec = r end
  end
  w = worm(16)
  M.gravity = (1 / 4)
  M.solid = function(x, y) return 2 * (y // 1) >= 400 + x // 1 end
  M.spawned = {}
  -- No arrow pressed: the strike comes from the left (x speed 0 or more).
  spec.on_click({ worm = w, x = 200, y = 0, vx = 0, vy = 0 })
  local start2 = M.spawned[2].x
  run(1)
  check("unturned, the strike comes from the left", start2 < 200 and M.spawned[2].x > start2)
  ball = M.spawned[2]
  run(120)
  local landed = ball.x
  run(60)
  check("on a slope it rolls downhill, whichever way it fell", ball.x > landed,
    (landed // 1) .. " -> " .. (ball.x // 1))
  -- The hits (PX's ProcessBallOnOtherCollision and BallOnBall), on a floor.
  local shared = require("lib/shared")
  local function rolling(x, vx, vy, y)
    new_match()
    shared = require("lib/shared") -- each match loads the pack afresh
    M.gravity = (1 / 4)
    M.solid = function(_, yy) return yy >= 200 end
    M.spawned, M.actor_sounds = {}, {}
    local a, b = shared.spawn_bowling_ball(worm(16), x, (y or 183), vx, vy or 0)
    return a, b
  end
  local function stand(w, x)
    w.x, w.y, w.state = x, 194, "standing"
    return w
  end
  rolling(100, 8)
  local v = stand(worm(17), 160)
  run(30)
  check("a ball rolling at 8 hurts the worm it rolls through, once: 5 + 55 * (speed - 4) / 11",
    v.hp < 80 and v.hp >= 75 and #M.actor_sounds == 1 and M.actor_sounds[1] == 101,
    v.hp .. " " .. table.concat(M.actor_sounds, ","))
  check("and knocks it on and up, by 0.7 of how the ball moved (worm:hurt's vx, vy)",
    v.knock and v.knock[1] > 4 and v.knock[1] < 6 and v.knock[2] < 0,
    v.knock and (v.knock[1] .. "," .. v.knock[2]))
  rolling(100, 3)
  v = stand(worm(17), 140)
  run(30)
  check("slower than 4 it hurts nothing", v.hp == 100 and #M.actor_sounds == 0)
  local a = rolling(100, 8)
  v = stand(worm(17), 100)
  for _ = 1, 30 do
    run(1)
    v.x = a.x
  end
  check("a worm it keeps overlapping is hurt again only after 12 frames (PX's DamageRecoverTime)",
    #M.actor_sounds == 3, tostring(#M.actor_sounds))
  rolling(300, 0, 8, 100)
  v = stand(worm(17), 300)
  run(20)
  check("falling straight on a standing worm crushes it: knocked straight down by 10", v.hp < 100
    and M.actor_sounds[1] == 33 and v.knock and v.knock[1] == 0 and v.knock[2] == 10,
    table.concat(M.actor_sounds, ","))
  -- Crates and drums are solid to the ball: it stops against one, touching,
  -- and that counts as a hit (WA then blows it up).
  local function took(obj) function obj:hit(damage, vx, vy) self.taken = { damage, vx, vy } end return obj end
  rolling(100, 8)
  local crate = took({ id = 900, kind = "crate", x = 160, y = 191 })
  M.crates = { crate }
  run(30)
  check("a crate the ball stops against takes 100, pushed the way the ball rolled", crate.taken
    and crate.taken[1] == 100 and crate.taken[2] > 0 and crate.taken[3] < 0)
  rolling(100, 8)
  local drum = took({ id = 902, kind = "oil", x = 160, y = 191 })
  M.oil = { drum }
  run(30)
  check("so does an oil drum", drum.taken and drum.taken[1] == 100)
  rolling(100, 8)
  local mine = took({ id = 901, kind = "mine", x = 160, y = 195 })
  M.mines = { mine }
  run(30)
  check("a mine takes the speed's damage", mine.taken and mine.taken[1] >= 5 and mine.taken[1] < 30)
  local _, sleeper = rolling(400, 0)
  run(200)
  check("a ball left alone sleeps", sleeper.asleep)
  local _, roller = shared.spawn_bowling_ball(worm(16), 330, 183, 8, 0)
  local x0 = sleeper.x
  run(30)
  check("another ball rolling into it wakes it and pushes it on", sleeper.x > x0 + 4,
    (sleeper.x - x0) .. " " .. roller.x)
  -- Flung off the map faster than gravity brings it down: it flies on (WA
  -- draws its arrow at the edge) until its next move would leave the range
  -- WA keeps positions in, and then it is gone, as in the water.
  local flung_a, flung = rolling(1000, 3000, -40)
  local errors = 0
  for _ = 1, 20 do
    local ok = pcall(run, 1)
    if not ok then errors = errors + 1 end
  end
  check("a ball flung far off the map flies on while WA can place it, then is removed",
    errors == 0 and flung_a.dead and flung.x > 30000 and flung.x <= 32767, errors .. " " .. flung.x)
  -- The Lightning Strike's overcharge.
  local zapped_actor, zapped = rolling(400, 0)
  local _, far = shared.spawn_bowling_ball(worm(16), 600, 183, 0, 0)
  run(200)
  shared.zap_bowling_balls(400, 199)
  check("struck within reach, a ball wakes, thrown up at 5 to 10 and nearly straight",
    zapped.zapped and not zapped.asleep and zapped.vy <= -5 and zapped.vy >= -10
    and math.abs(zapped.vx) <= 0.1 * 10, zapped.vx .. "," .. zapped.vy)
  check("one out of reach is left alone", not far.zapped and far.asleep)
  local bx, by = shared.bowling_ball_on_beam(400, 0, 0, 1, 1000)
  check("a beam straight down meets the ball's circle at its top", bx == 400
    and math.abs(by - (zapped.y - 16)) < 1, tostring(by and by))
  check("and a beam beside it misses", shared.bowling_ball_on_beam(440, 0, 0, 1, 1000) == nil)
  -- PX's electrified look, drawn for the zapped ball only.
  run(5)
  M.quads = {}
  M.draw()
  local glows, sparks, behind, sheen = 0, {}, true, nil
  for _, q in ipairs(M.quads) do
    if q.sprite == wa.sprites.key("sprites/bowling_ball/glow.png") then
      glows = glows + 1
      if q.blend ~= "add" or q.depth <= wa.depth.OBJECTS then behind = false end
    end
    if q.sprite == wa.sprites.key("sprites/bowling_ball/spark.png") then sparks[#sparks + 1] = q end
    if q.sprite == wa.sprites.key("sprites/bowling_ball/sheen.png") then sheen = q end
  end
  check("an electrified ball glows behind itself: PX's glow three times, a trail glow for each frame since",
    glows == 3 + 5 and behind, tostring(glows))
  check("and its spark plays, added, in front of the ball", #sparks == 1 and sparks[1].frame == 1
    and sparks[1].color == 0xFFFFFFFF and sparks[1].blend == "add" and sparks[1].depth < wa.depth.OBJECTS,
    sparks[1] and tostring(sparks[1].frame))
  check("the ball itself turns electric blue: darkened, a blue sheen added in front, under the spark",
    zapped_actor.tint == 0x405980 and sheen and sheen.blend == "add" and sheen.color == 0xFF3C96FF
    and sheen.depth < wa.depth.OBJECTS and sheen.depth > sparks[1].depth)
  -- WA's hits: the ball is an object to WA (its oil-drum layer, as PX's), so
  -- its fires, guns and blasts reach it. Any wakes it; a blast pushes it
  -- whole, any other hit (a fire's) at 0.7.
  local ball_actor, resting = rolling(500, 0)
  run(200)
  check("the ball is an object to WA, and takes its hits", ball_actor.as_object == true
    and type(ball_actor.hit) == "function" and resting.asleep)
  ball_actor.hit(ball_actor, { kind = "hit", hit_kind = 1, vx = 2, vy = -3, damage = 5, team = 0 })
  check("a fire's hit wakes it and pushes it at 0.7", not resting.asleep
    and math.abs(resting.vx - 1.4) < 1e-9 and math.abs(resting.vy + 2.1) < 1e-9,
    resting.vx .. "," .. resting.vy)
  local _, blasted = rolling(500, 0)
  run(200)
  local blasted_actor = M.spawned[1]
  blasted_actor.hit(blasted_actor, { kind = "blast", hit_kind = 0, vx = -4, vy = -6, damage = 20, team = -1 })
  check("a blast's push is taken whole", not blasted.asleep and blasted.vx == -4 and blasted.vy == -6)
  local x_before = blasted.x
  run(5)
  check("and it flies off", blasted.x < x_before)
  M.gravity, M.solid = nil, nil
end

print("crate strike: PX's three parachute crates over the click")
do
  new_match()
  local spec
  for _, r in ipairs(replaced) do
    if r.weapon == "donkey" then spec = r end
  end
  check("the strike takes the scheme's record, its icon and a click", spec
    and spec.wep == "weps/donkey.wep" and spec.panel_icon == "sprites/crate_strike/icon.png"
    and type(spec.on_click) == "function" and spec.on_select and spec.on_select.cursor)
  M.crate_spawns = {}
  spec.on_click({ worm = worm(16), x = 300 + 0.5, y = 400, sky = wa.world.sky })
  local c = M.crate_spawns
  local kinds = { weapon = true, utility = true, health = true }
  check("three crates on parachutes, at stock sky and the precise click plus 50 either side",
    #c == 3 and c[1].x == 300.5 and c[2].x == 250.5 and c[3].x == 350.5
    and c[1].y == wa.world.sky and c[2].y == wa.world.sky and c[3].y == wa.world.sky
    and c[1].drop == "chute" and c[2].drop == "chute" and c[3].drop == "chute",
    #c == 3 and (c[1].x .. "," .. c[2].x .. "," .. c[3].x) or tostring(#c))
  check("each a weapon, utility or health crate, health 20-40, 40-60, 60-80 by place",
    kinds[c[1].kind] and kinds[c[2].kind] and kinds[c[3].kind]
    and c[1].health >= 20 and c[1].health <= 40 and c[2].health >= 40 and c[2].health <= 60
    and c[3].health >= 60 and c[3].health <= 80)
  local seen = {}
  for _ = 1, 20 do
    M.crate_spawns = {}
    spec.on_click({ worm = worm(16), x = 300, y = 400, sky = wa.world.sky })
    for _, s in ipairs(M.crate_spawns) do seen[s.kind] = true end
  end
  check("all three kinds come up", seen.weapon and seen.utility and seen.health)
  -- A match whose crates hold no weapon: the engine refuses one.
  local spawn = wa.crates.spawn
  wa.crates.spawn = function(spec)
    if spec.kind == "weapon" then error("wa.crates.spawn: this match's crates hold no weapon") end
    return spawn(spec)
  end
  local healths = 0
  for _ = 1, 20 do
    M.crate_spawns = {}
    spec.on_click({ worm = worm(16), x = 300, y = 400, sky = wa.world.sky })
    if #M.crate_spawns ~= 3 then healths = -1000 end
    for _, s in ipairs(M.crate_spawns) do
      if s.kind == "weapon" then healths = -1000 elseif s.kind == "health" then healths = healths + 1 end
    end
  end
  wa.crates.spawn = spawn
  check("a refused weapon crate drops as a health crate, still three", healths > 0)
end

print("chilli bomb: five more Chillis burst out")
do
  new_match()
  frame()
  local spec
  for _, r in ipairs(replaced) do
    if r.weapon == "super_banana" then spec = r end
  end
  check("the Chilli Bomb on the super banana slot, with its icon, the banana kept, and an explode step", spec
    and spec.copy_from == "stock.super_banana" and spec.panel_icon == "sprites/chilli_bomb/chilli_ico.png"
    and spec.sprite == "banana" and type(spec.on_explode) == "function")
  local w = worm(16)
  w.weapon = "super_banana"
  M.launched = nil
  M.message(w, wa.msg.FIRE_WEAPON)
  spec.on_explode({ x = 100, y = 50, slot = 42, missile = 600 })
  check("none during the blast", not M.launched)
  M.message(worm(32), wa.msg.FRAME_FINISH)
  local l = M.launched or {}
  local ok = #l == 5
  for _, c in ipairs(l) do
    ok = ok and c.weapon == "super_banana" and c.owner == w and c.x == 100 and c.y == 50
      and c.vx >= -3 and c.vx <= 3 and c.vy >= -10 and c.vy <= -7
  end
  check("five after it, for the thrower, up with PX's spread", ok, tostring(#l))
  local c = l[1] or {}
  check("each with damage 30, an 8 s fuse, no countdown, set off by the fire key, bursting into fire",
    c.missile.explosion.power == 30 and c.missile.fuse == 8000 and c.missile.countdown == 0
    and c.missile.explode_on_space == true and c.missile.burst == "fire")
  check("and WA's sprite 0: only the chilli is drawn", c.missile.sprite == 0)
  local m = { id = 610, phase = "pre", weapon = "super_banana", x = 0, y = 0, vx = 1, vy = 0, sprite = 51 }
  local was_turn = w.turn
  w.turn = true -- thrown in its turn
  M.missile(m)
  w.turn = was_turn
  check("the thrown Chilli's own banana hidden in flight", m.sprite == 0)
  local b = { id = 611, phase = "pre", weapon = "bazooka", x = 0, y = 0, vx = 1, vy = 0, sprite = 48 }
  M.missile(b)
  check("other missiles keep theirs", b.sprite == 48)
  M.message(worm(32), wa.msg.FRAME_FINISH)
  check("launched once", #M.launched == 5)
  -- The blast hurt the thrower, which ends WA's turn: no worm holds the turn
  -- while the five fly, and they are drawn all the same.
  M.turn_start({ worm = w })
  for _, x in ipairs(wa.worms.all()) do x.turn = false end
  M.spawned = {}
  local child = { id = 620, phase = "post", weapon = "super_banana", x = 0, y = 0, vx = 1, vy = -1, sprite = 0 }
  M.missile(child)
  check("the five are drawn after the turn ends, for the last turn's worm",
    M.spawned[1] and M.spawned[1].sprite == "sprites/px_hold/chilli_bomb" and M.spawned[1].owner == w)
  for i = 1, 5 do
    spec.on_explode({ x = 1, y = 1, slot = 42, missile = 9000 + i })
  end
  M.message(w, wa.msg.FRAME_FINISH)
  check("the five do not burst again", #M.launched == 5)
  spec.on_explode({ x = 1, y = 1, slot = 42 })
  M.message(w, wa.msg.FRAME_FINISH)
  check("no missile id: nothing", #M.launched == 5)
end

print("nuke rocket: a nuke climbs out of the fusing rocket")
do
  new_match()
  frame()
  local spec
  for _, r in ipairs(replaced) do
    if r.weapon == "mine" then spec = r end
  end
  check("the Nuke Rocket on the mine slot, its icon, its rocket, an explode step", spec
    and spec.copy_from == "stock.mine" and spec.panel_icon == "sprites/nuke_rocket/nuke_rocket_ico.png"
    and spec.sprite == "sprites/nuke_rocket/nuke_rocket_bullet.png" and type(spec.on_explode) == "function")
  check("its launch sound registered, so it can play", spec.sounds and spec.sounds[1] == "sounds/nuke_rocket_launch.wav")
  for _, o in ipairs(worms) do
    o.x, o.y, o.vx, o.vy = -5000, 0, 0, 0
  end
  local w, near, far = worm(16), worm(17), worm(32)
  w.weapon, w.x, w.y = "mine", 60, 50
  near.x, near.y = 105, 55
  far.x, far.y = 300, 50
  M.message(w, wa.msg.FIRE_WEAPON)
  -- WA's own shot is the first rocket: it fuses on the ground, hissing.
  for _ = 1, 10 do
    M.missile({ id = 600, phase = "post", weapon = "mine", x = 100, y = 50, vx = 0, vy = 0 })
  end
  check("the fusing rocket hisses every 10 frames", #M.sounds == 1 and M.sounds[1] == 66,
    tostring(M.sounds[1]))
  spec.on_explode({ x = 100, y = 50, slot = 12, missile = 600 })
  check("its explosion plays PX's launch sound", M.sounds[2] == "sounds/nuke_rocket_launch.wav")
  check("no nuke during the blast", not M.launched)
  M.message(far, wa.msg.FRAME_FINISH)
  local l = M.launched and M.launched[1]
  check("then a nuke from there, for the shooter", l and #M.launched == 1 and l.weapon == "mine"
    and l.owner == w and l.x == 100 and l.y == 50 and l.vx == 0 and l.vy == 0)
  check("silent, a 1.6 s fuse, bursting into clustlets", l.missile.fuse == 1600 and l.missile.flight_sound == 0
    and l.missile.burst == "clusters")
  check("keeping 11% of its speed on terrain, as reddaz's 0.11 restitution", l.missile.bounce.terrain_keep_pct == 11)
  local nuke = { id = 9001, phase = "pre", weapon = "mine", x = 100, y = 50, vx = 0, vy = 0 }
  local other = { id = 700, phase = "pre", weapon = "bazooka", x = 110, y = 45, vx = 1, vy = 0 }
  local climb_ok, jitter = true, 0
  for t = 0, 52 do
    local vy, vx = nuke.vy, nuke.vx
    M.missile(nuke)
    local up = vy - nuke.vy
    if up < 19661 / 65536 or up > 52429 / 65536 then climb_ok = false end
    if nuke.vx ~= vx then
      jitter = jitter + 1
      if t % 2 == 0 then climb_ok = false end
    end
    if t == 0 then
      M.missile(other)
      check("a missile within 17 pixels is carried along", other.vx == nuke.vx and other.vy == nuke.vy)
      check("so is a worm, but not one further off", near.vx == nuke.vx and near.vy == nuke.vy
        and far.vx == 0 and far.vy == 0)
    end
  end
  check("for 53 frames it climbs 0.3 to 0.8 a frame, jittering sideways on every other", climb_ok
    and jitter > 0)
  local vy = nuke.vy
  M.missile(nuke)
  check("then it brakes by 0.2 a frame", nuke.vy == vy + 13107 / 65536, tostring((nuke.vy - vy)))
  local sounds = #M.sounds
  for _ = 1, 10 do
    M.missile({ id = 800, phase = "post", weapon = "mine", x = 90, y = 40, vx = 0, vy = 0 })
  end
  check("later missiles of the slot (the cluster bits) are no fusing rocket: no hiss", #M.sounds == sounds)
  M.sounds = {}
  local before = M.spawned and #M.spawned or 0
  spec.on_explode({ x = 100, y = -200, slot = 12, missile = 9001 })
  M.message(far, wa.msg.FRAME_FINISH)
  check("its explosion: sounds 85 and 70, and two 40/40 blasts", M.sounds[1] == 85 and M.sounds[2] == 70
    and #M.spawned == before + 2 and M.spawned[before + 1].explode.damage == 40
    and M.spawned[before + 1].explode.id == 40 and M.spawned[before + 2].explode.now)
  check("and it ends there", #M.launched == 1)
end

print("helicopter: PX's script on WA's jet pack")
do
  -- WA starts the jet pack with the fuel of the record fired (the
  -- Helicopter's jet_pack.fuel, 100; engine/jet_fuel.rs).
  local function jet_pack_starts(w)
    w.state, w.fuel = "jetpacking", 100
  end
  new_match()
  frame()
  local w = worm(16)
  w.weapon, w.state, w.x, w.y, w.vx, w.vy, w.facing, w.turn = "jet_pack", "prefiring", 100, 50, 0, 0, 1, true
  w.fuel, w.gravity, w.wind, w.body_visible = 30, 1, 0, true
  w.keys = { up = false, down = false, left = false, right = false }
  function w:clear_keys() error("Helicopter must leave key consumption to the engine") end
  function w:set_state() error("Helicopter must leave landing state to WA") end
  M.spawned = {}
  M.message(w, wa.msg.FRAME_FINISH)
  local climb = M.spawned[#M.spawned]
  check("the climb-in while WA winds up, the body hidden, the labels kept", climb and climb.sprite == "sprites/helicopter/jumpin"
    and w.body_visible == false and w.visible == nil)
  jet_pack_starts(w)
  w.keys.up = true
  M.message(w, wa.msg.FRAME_FINISH)
  check("launch: the record's fuel, PX's gravity and wind", w.fuel < 100 and w.fuel > 99 and w.gravity == (0.2)
    and w.wind == (0.2), w.fuel .. " " .. w.gravity .. " " .. w.wind)
  check("up: a kick of 0.8 from standstill", near(w.vy, -0.8), tostring(w.vy))
  check("the engine owns the keys after the script reads them", w.steered and w.keys.up)
  check("the helicopter replaces the climb-in", climb.dead and M.spawned[#M.spawned].sprite == "sprites/helicopter/flying")
  -- In game, the engine consumes this key after the callback.
  w.keys.up = false
  local vy = w.vy
  M.message(w, wa.msg.FRAME_FINISH)
  check("no key: speed dies away", w.vy > vy and w.vy < 0, vy .. " -> " .. w.vy)
  local fuel = w.fuel
  M.retreat = 2000
  M.message(w, wa.msg.FRAME_FINISH)
  check("no fuel burnt during retreat", w.fuel == fuel)
  M.retreat = 0
  -- Hitting a mine is fine; hitting a worm fast is not.
  M.contact(w, { kind = "mine" }, { vx = 3, vy = 0, flags = 0 })
  check("a mine does not crash it", #M.spawned == 2)
  M.contact(w, { kind = "worm" }, { vx = (1 / 2), vy = 0, flags = 0 })
  check("a slow touch does not crash it", #M.spawned == 2)
  M.contact(w, { kind = "land" }, { vx = 0, vy = (1 / 2), flags = 0 })
  check("a slow landing does not crash it: PX's smooth landing", #M.spawned == 2)
  M.contact(w, { kind = "worm" }, { vx = 3, vy = 0, flags = 0 })
  local boom = M.spawned[#M.spawned]
  check("a fast hit crashes it: an explosion of at least 10", boom.explode and boom.explode.id == 10
    and boom.explode.damage == 20 and boom.explode.now, boom.explode and boom.explode.id)
  -- From wa.on.contact there is no brain to inherit an owner from.
  check("the explosion is the worm's own", boom.owner == w)
  check("and lands the worm, shown again", w.gravity == 1 and w.wind == 0 and w.body_visible == true)
  -- Out of fuel.
  w.state = "prefiring"
  M.message(w, wa.msg.FRAME_FINISH)
  jet_pack_starts(w)
  M.message(w, wa.msg.FRAME_FINISH)
  local n = #M.spawned
  w.fuel = (0.05)
  M.message(w, wa.msg.FRAME_FINISH)
  check("fuel below 0.1 crashes it", #M.spawned == n + 1 and M.spawned[#M.spawned].explode)
  -- WA ends the jet pack on the ground without a scripted state change.
  w.state = "prefiring"
  M.message(w, wa.msg.FRAME_FINISH)
  jet_pack_starts(w)
  M.message(w, wa.msg.FRAME_FINISH)
  w.fuel, w.vy, w.vx = 50, 0, 0
  w.state = "standing"
  n = #M.spawned
  M.message(w, wa.msg.FRAME_FINISH)
  check("WA ends the jet pack at rest: its state survives, no explosion", w.state == "standing" and #M.spawned == n
    and w.gravity == 1 and not w.steered and w.body_visible == true)
  -- A native sentry bullet puts the flying worm in WA's hit state. The
  -- Helicopter must release its steering/art without replacing the knock.
  w.state = "prefiring"
  M.message(w, wa.msg.FRAME_FINISH)
  jet_pack_starts(w)
  M.message(w, wa.msg.FRAME_FINISH)
  local flying = M.spawned[#M.spawned]
  w.state, w.vx, w.vy = "hit", 3, -2
  n = #M.spawned
  M.message(w, wa.msg.FRAME_FINISH)
  check("a bullet hit cancels flight and preserves WA's hit state and push",
    w.state == "hit" and w.vx == 3 and w.vy == -2 and w.gravity == 1
    and w.wind == 0 and not w.steered and w.body_visible == true
    and flying.dead and #M.spawned == n)
  -- The last Helicopter: WA clears the selection when it fires.
  w.state, w.weapon, w.vy = "prefiring", "jet_pack", 0
  M.message(w, wa.msg.FRAME_FINISH)
  jet_pack_starts(w); w.weapon = nil
  M.message(w, wa.msg.FRAME_FINISH)
  check("the last one still flies: armed in the wind-up", w.fuel > 99, tostring(w.fuel))
  local before = #M.spawned
  M.contact(w, { kind = "land" }, { vx = 0, vy = 3, flags = 0 })
  check("a fast landing crashes it, as in PX", #M.spawned == before + 1 and M.spawned[#M.spawned].explode)
end

print("hot air balloon: PX's balloon, flown with WA's parachute physics upside down")
do
  new_match()
  frame()
  M.gravity, M.wind, M.water, M.solid = 0.25, 0, nil, nil
  local w = worm(16)
  w.weapon, w.state, w.x, w.y, w.vx, w.vy, w.facing, w.turn = "bungee", "sliding", 100, 50, 0, 1, 1, true
  w.gravity, w.body_visible, w.alliance, w.keys = 1, true, 1, {}
  for i, o in ipairs(worms) do
    if o ~= w then o.x, o.y = -1000 * i, 0 end
  end
  function w:set_state() error("the balloon takes and releases the worm; it sets no state") end
  M.spawned, M.sounds = {}, {}
  M.message(w, wa.msg.FRAME_FINISH)
  check("nothing while it just falls", #M.spawned == 0 and not w.taken)
  -- WA opens the parachute and clears the selection: "none", as seen in WA.
  w.state, w.weapon = "parachuting", "none"
  local y0 = w.y
  M.message(w, wa.msg.FRAME_FINISH)
  check("taken for the flight, the turn running", w.taken and w.taken.turn == "run")
  check("an inflate sound", M.sounds[1] and M.sounds[1]:find("inflate"))
  -- WA's step: gravity (upside down) in, then damped to 0.8.
  check("its first step: the fall turned upward, damped", w.y - y0 == (1 - 0.25) * 0.79998779296875,
    tostring((w.y - y0)))
  local balloon, basket = M.spawned[1], M.spawned[2]
  check("the balloon in the team's colour, the basket below", balloon.sprite == "sprites/balloon/balloon"
    and balloon.tint == 0xFF0096FF and basket.sprite == "sprites/balloon/basket" and w.body_visible == false,
    string.format("%x", balloon.tint or 0))
  check("the balloon 43 above, 6 ahead; the basket's art mirrored facing right",
    balloon.y == w.y - 43 and balloon.x == w.x + 6 and basket.facing == -1)
  -- It settles at four times gravity upward and four times the wind across.
  M.wind = 0.00390625
  for _ = 1, 100 do M.message(w, wa.msg.FRAME_FINISH) end
  local x1, y1 = w.x, w.y
  M.message(w, wa.msg.FRAME_FINISH)
  check("rising at four times gravity", math.abs((w.y - y1) + 4 * 0.25) <= 8, tostring(w.y - y1))
  check("drifting with four times the wind", math.abs((w.x - x1) - 4 * 0.00390625) <= 8, tostring(w.x - x1))
  -- The arrow keys push it, half of gravity a frame, as WA's parachute:
  -- the new speed is (last + push + wind) damped, and it moves by it.
  local function step_x(keys)
    local before, last = w.x, w.x - x1
    x1, w.keys = w.x, keys
    M.message(w, wa.msg.FRAME_FINISH)
    return w.x - before, last
  end
  local dx, last = step_x({ left = true })
  check("left pushes it left by half of gravity", near(dx, (last - 0.125 + 0.00390625) * 0.79998779296875),
    dx .. " " .. last)
  dx, last = step_x({ left = true, right = true })
  check("left and right together cancel", near(dx, (last + 0.00390625) * 0.79998779296875), dx .. " " .. last)
  dx, last = step_x({ right = true })
  check("right pushes it right", near(dx, (last + 0.125 + 0.00390625) * 0.79998779296875), dx .. " " .. last)
  w.keys = {}
  check("weapons fire from the basket", M.message(w, wa.msg.FIRE_WEAPON) ~= "eat" and w.taken)
  -- The jump key pops it: the worm back to WA, falling with its speed.
  check("the jump key pops it", M.message(w, wa.msg.JUMP) == "eat" and M.sounds[#M.sounds]:find("pop")
    and balloon.dead and w.body_visible == true and not w.taken and w.state == "sliding" and w.vy < 0)
  local function up_again()
    w.state, w.weapon = "sliding", "bungee"
    M.message(w, wa.msg.FRAME_FINISH)
    w.state, w.weapon = "parachuting", "none"
    M.message(w, wa.msg.FRAME_FINISH)
    return w.taken
  end
  -- Up again, into land above it: it pops there.
  check("up again", up_again())
  local top = w.y - 5
  M.solid = function(_, y) return y < top end
  for _ = 1, 20 do
    M.message(w, wa.msg.FRAME_FINISH)
    if not w.taken then break end
  end
  check("land: popped, the worm back to WA, not pushed up into it", not w.taken
    and w.state == "sliding" and w.vy >= 0 and M.sounds[#M.sounds]:find("pop"))
  M.solid = nil
  -- WA stands it up against the ceiling: released again, falling.
  w.state, w.vy = "standing", 0
  M.message(w, wa.msg.FRAME_FINISH)
  check("stood up under the ceiling: released again", w.state == "sliding")
  w.state = "standing"
  M.message(w, wa.msg.FRAME_FINISH)
  check("only once", w.state == "standing")
  -- Up again; the engine lets go at the turn's end: it pops.
  check("up again", up_again())
  w.taken = nil
  M.message(w, wa.msg.FRAME_FINISH)
  check("the turn over: popped", M.sounds[#M.sounds]:find("pop") and w.body_visible == true)
  -- Up again, then the next turn begins.
  check("up again", up_again())
  M.turn_start({ worm = worm(32), active = worm(32) })
  check("a turn change pops it", not w.taken and w.body_visible == true)
  -- The Hang-Glider's parachute is not a balloon.
  local n = #M.spawned
  w.state, w.weapon, w.keys = "sliding", "parachute", {}
  M.message(w, wa.msg.FRAME_FINISH)
  w.state = "parachuting"
  M.message(w, wa.msg.FRAME_FINISH)
  local balloons = 0
  for i = n + 1, #M.spawned do
    if M.spawned[i].sprite == "sprites/balloon/balloon" then balloons = balloons + 1 end
  end
  check("another slot's parachute is left alone", balloons == 0)
  M.message(w, wa.msg.JUMP)
end

print("automatic parachute: only the equipped weapon opens")
do
  new_match()
  frame()
  M.gravity, M.wind, M.water, M.solid, M.trace_hit = 0.014373779296875, 0, nil, nil, nil
  local w = worm(16)
  w.weapon, w.state, w.x, w.y, w.vx, w.vy, w.turn =
    "bungee", "sliding", 100, 50, 0, 1, true
  M.spawned, M.sounds = {}, {}
  M.message(w, wa.msg.FRAME_FINISH)
  -- WA has replaced the selected slot with stock Parachute while opening.
  w.weapon, w.state = "parachute", "parachuting"
  M.message(w, wa.msg.FRAME_FINISH)
  check("equipped balloon owns the auto opening despite WA's slot change",
    w.taken and M.spawned[1] and M.spawned[1].sprite == "sprites/balloon/balloon")
  local glider = false
  for _, a in ipairs(M.spawned) do
    if a.sprite == "sprites/hang_glider/glider" then glider = true end
  end
  check("equipped balloon does not start the glider", not glider)
  M.message(w, wa.msg.JUMP)

  new_match()
  frame()
  w = worm(16)
  w.weapon, w.state, w.x, w.y, w.vx, w.vy, w.turn =
    "parachute", "sliding", 100, 50, 0, 1, true
  w.keys = {}
  M.spawned = {}
  M.message(w, wa.msg.FRAME_FINISH)
  w.weapon, w.state = "none", "parachuting"
  M.message(w, wa.msg.FRAME_FINISH)
  check("equipped glider owns its auto opening",
    M.spawned[1] and M.spawned[1].sprite == "sprites/hang_glider/glider" and w.taken)
  M.message(w, wa.msg.JUMP)

  new_match()
  frame()
  w = worm(16)
  w.weapon, w.state, w.x, w.y, w.vx, w.vy, w.turn =
    "shotgun", "sliding", 100, 50, 0, 1, true
  M.spawned = {}
  M.message(w, wa.msg.FRAME_FINISH)
  check("another equipped weapon keeps falling", w.state == "sliding" and #M.spawned == 0)
  -- Even an unexpected stock parachute state must not turn into either mod.
  w.weapon, w.state = "none", "parachuting"
  M.message(w, wa.msg.FRAME_FINISH)
  check("another equipped weapon claims neither parachute replacement", #M.spawned == 0 and not w.taken)

  new_match()
  frame()
  w = worm(16)
  w.weapon, w.state, w.x, w.y, w.vx, w.vy, w.turn =
    "parachute", "sliding", 100, 50, 0, 1, true
  M.spawned = {}
  M.message(w, wa.msg.FRAME_FINISH)
  w.weapon = "shotgun"
  M.message(w, wa.msg.FRAME_FINISH)
  w.weapon, w.state = "none", "parachuting"
  M.message(w, wa.msg.FRAME_FINISH)
  check("putting the glider away removes its automatic claim", #M.spawned == 0 and not w.taken)
end

print("hang-glider: PX's glider, flown by the pack")
do
  new_match()
  frame()
  M.gravity, M.wind, M.water, M.solid, M.trace_hit = 0.014373779296875, 0, nil, nil, nil -- a small pull, as WA's is
  for i, o in ipairs(worms) do o.x, o.y = -1000 * i, 0 end
  local w = worm(16)
  w.weapon, w.state, w.x, w.y, w.vx, w.vy, w.facing, w.turn = "parachute", "sliding", 100, 50, 3, 1, 1, true
  w.body_visible, w.keys = true, {}
  function w:set_state() error("the glider takes and releases the worm; it sets no state") end
  M.spawned, M.sounds = {}, {}
  M.message(w, wa.msg.FRAME_FINISH)
  check("nothing while it just falls", #M.spawned == 0 and w.body_visible == true)
  -- WA opens the parachute and clears the selection: the pack takes over.
  w.state, w.weapon = "parachuting", "none"
  local x0, y0 = w.x, w.y
  M.message(w, wa.msg.FRAME_FINISH)
  local art = M.spawned[1]
  check("opens: taken, the glider sound and art, the body hidden", w.taken and w.taken.turn == "run"
    and M.sounds[1] and M.sounds[1]:find("hangopen")
    and art and art.sprite == "sprites/hang_glider/glider" and w.body_visible == false)
  check("its art faces left, as WA's worms: mirrored facing right", art.facing == -1)
  -- Level, the wing's up side is straight up: a quarter of the fall goes.
  check("the speed carries on into the glide; the wing takes a quarter of the fall",
    math.abs((w.x - x0) - 3) <= 1 and math.abs((w.y - y0) - (1 + 0.014373779296875 * 0.75) * 0.75) <= 1,
    (w.x - x0) .. " " .. (w.y - y0))
  for _ = 1, 30 do M.message(w, wa.msg.FRAME_FINISH) end
  check("and the nose follows the flight path", art.angle ~= 0, tostring(art.angle))
  check("it opens over 25 frames", art.shown == 9, tostring(art.shown))
  check("weapons fire while it glides", M.message(w, wa.msg.FIRE_WEAPON) ~= "eat" and w.taken)
  -- Nose up: the nose angle drops, faster the faster it flies.
  w.keys = { up = true }
  for _ = 1, 10 do M.message(w, wa.msg.FRAME_FINISH) end
  w.keys = {}
  check("up turns the nose up", art.angle and art.angle > 180, tostring(art.angle))
  local function glide_again(vy)
    w.state, w.weapon, w.vx, w.vy = "sliding", "parachute", 3, vy or 1
    M.message(w, wa.msg.FRAME_FINISH)
    w.state, w.weapon = "parachuting", "none"
    M.message(w, wa.msg.FRAME_FINISH)
    return w.taken
  end
  -- Into something ahead, no land below: a crash, the worm back to WA with
  -- the glider's speed, and no pack-away.
  local n = #M.spawned
  local wall = w.x + 7
  M.solid = function(x) return x >= wall end
  M.message(w, wa.msg.FRAME_FINISH)
  M.solid = nil
  check("a crash: let go, falling on", not w.taken and w.state == "sliding" and w.vx > 0)
  check("closed: the sound, the art gone, the body back",
    M.sounds[#M.sounds]:find("hangclose") and art.dead and w.body_visible == true)
  w.state = "standing"
  M.message(w, wa.msg.FRAME_FINISH)
  check("and no pack-away; stood up where it hit, released again", #M.spawned == n
    and w.state == "sliding")
  -- Coming down onto land: let go, then begin the pack-away at WA's terrain
  -- contact instead of waiting for its delayed standing state.
  check("gliding again", glide_again())
  local floor = w.y + 13 * (1 / 2)
  M.solid = function(_, y) return y >= floor end
  M.message(w, wa.msg.FRAME_FINISH)
  M.solid = nil
  check("about to land: let go", not w.taken and w.state == "sliding")
  local landing_art = M.spawned[#M.spawned]
  check("gentle landing keeps the wing over the worm until contact",
    landing_art.sprite == "sprites/hang_glider/glider" and not landing_art.dead
    and w.body_visible == false)
  w.state, w.x, w.y = "jump_falling", w.x + 1, w.y + 1
  M.message(w, wa.msg.FRAME_FINISH)
  check("the wing follows the falling worm without exposing its body",
    landing_art.x == w.x and landing_art.y == w.y and not landing_art.dead
    and w.body_visible == false)
  M.contact(w, { kind = "land" }, { vx = w.vx, vy = w.vy, flags = 0 })
  local pack = M.spawned[#M.spawned]
  check("land contact immediately replaces the wing with pack-away, before WA stands the worm",
    landing_art.dead and pack.sprite == "sprites/hang_glider/pack"
    and w.state == "jump_falling" and w.body_visible == false and pack.facing == -1)
  M.message(w, wa.msg.FRAME_FINISH)
  check("pack-away runs while WA is still in the landing handoff",
    not pack.dead and pack.shown == 0 and w.body_visible == false)
  w.state = "standing"
  for _ = 1, 12 do M.message(w, wa.msg.FRAME_FINISH) end
  check("six frames at 24 a second", pack.shown == 5 and not pack.dead, tostring(pack.shown))
  M.message(w, wa.msg.FRAME_FINISH)
  check("then the worm again", pack.dead and w.body_visible == true)
  -- A movement key interrupts the pack-away even before WA has changed the
  -- worm's landing state to walking.
  check("gliding again", glide_again())
  floor = w.y + 13 * (1 / 2)
  M.solid = function(_, y) return y >= floor end
  M.message(w, wa.msg.FRAME_FINISH)
  M.solid = nil
  M.contact(w, { kind = "land" }, { vx = w.vx, vy = w.vy, flags = 0 })
  local interrupted_pack = M.spawned[#M.spawned]
  w.keys = { left = true }
  M.message(w, wa.msg.FRAME_FINISH)
  check("moving interrupts pack-away and returns to WA's worm immediately",
    interrupted_pack.dead and w.body_visible == true)
  w.keys = {}
  check("gliding again", glide_again())
  floor = w.y + 13 * (1 / 2)
  M.solid = function(_, y) return y >= floor end
  M.message(w, wa.msg.FRAME_FINISH)
  M.solid = nil
  M.contact(w, { kind = "land" }, { vx = w.vx, vy = w.vy, flags = 0 })
  local jump_pack = M.spawned[#M.spawned]
  check("jump interrupts pack-away without eating WA's jump",
    M.message(w, wa.msg.JUMP) ~= "eat" and jump_pack.dead and w.body_visible == true)
  check("gliding again", glide_again())
  floor = w.y + 13 * (1 / 2)
  M.solid = function(_, y) return y >= floor end
  M.message(w, wa.msg.FRAME_FINISH)
  M.solid = nil
  n = #M.spawned
  w.keys = { right = true }
  M.contact(w, { kind = "land" }, { vx = w.vx, vy = w.vy, flags = 0 })
  check("a held movement key skips the pack-away at contact",
    #M.spawned == n and w.body_visible == true)
  w.keys = {}
  -- A fast downward arrival gives WA the full speed. The engine holds the
  -- equipped chute closed until WA has resolved the impact and any damage.
  check("gliding into a hard landing", glide_again(20))
  n = #M.spawned
  floor = w.y + 13 * (1 / 2)
  M.solid = function(_, y) return y >= floor end
  M.message(w, wa.msg.FRAME_FINISH)
  M.solid = nil
  check("hard landing: fall at full speed without auto chute", not w.taken
    and w.state == "sliding" and w.vy >= 8 - 1
    and w.release_options and w.release_options.suppress_auto_parachute == true,
    string.format("taken=%s state=%s vy=%s", tostring(w.taken), tostring(w.state), tostring(w.vy)))
  w.state = "standing"
  M.message(w, wa.msg.FRAME_FINISH)
  check("hard landing: no safe pack-away or mid-air unstick",
    #M.spawned == n and w.state == "standing",
    string.format("spawned=%d expected=%d state=%s", #M.spawned, n, tostring(w.state)))
  -- The jump key lets go of it.
  check("gliding again", glide_again())
  check("the jump key: let go", M.message(w, wa.msg.JUMP) == "eat" and not w.taken
    and M.sounds[#M.sounds]:find("hangclose"))
  -- The engine lets go at the turn's end.
  check("gliding again", glide_again())
  w.taken = nil
  M.message(w, wa.msg.FRAME_FINISH)
  check("the turn over: closed", M.sounds[#M.sounds]:find("hangclose") and w.body_visible == true)
  -- The balloon's parachute is not a glider.
  w.state, w.weapon = "sliding", "bungee"
  M.message(w, wa.msg.FRAME_FINISH)
  n = #M.spawned
  w.state = "parachuting"
  M.message(w, wa.msg.FRAME_FINISH)
  local glider = false
  for i = n + 1, #M.spawned do
    if M.spawned[i].sprite == "sprites/hang_glider/glider" then glider = true end
  end
  check("the Hot Air Balloon's parachute is left alone", not glider)
  M.message(w, wa.msg.JUMP)
end

print("swim suit: PX's swimming on WA's laser sight")
do
  new_match()
  frame()
  M.water = 500
  local w = worm(16)
  for i, o in ipairs(worms) do
    if o ~= w then o.x, o.y, o.turn = -1000 * i, 0, false end
  end
  w.weapon, w.state, w.x, w.y, w.vx, w.vy, w.facing, w.turn = "laser_sight", "standing", 100, 400, 0, 0, 1, true
  w.gravity, w.body_visible, w.keys, w.collision_mask = 1, true, {}, 0x420CC6
  function w:set_state(s) self.state = s end
  function w:clear_keys() self.keys = {} end
  local spent = 0
  function w:ammo(slot, n) if SLOT(slot) == "laser_sight" then spent = spent + n end end
  M.spawned, M.sounds, M.quads = {}, {}, {}
  check("putting it on replaces WA's laser sight", M.message(w, wa.msg.FIRE_WEAPON) == "eat" and spent == -1)
  check("the suit's mask: without the bit WA's water acts on", w.collision_mask == 134342)
  check("its sound", M.sounds[#M.sounds] == "sounds/swim_suit/putting_on_ssuit.wav")
  M.message(w, wa.msg.FRAME_FINISH)
  M.draw()
  check("a bubble while worn", #M.quads == 1 and M.quads[1].sprite == "sprites/swim_suit/ring")
  local bubble = M.quads[1]
  local h = 25
  check("centred on the worm", bubble.points[1][1] == w.x - h and bubble.points[3][1] == w.x + h
    and bubble.points[1][2] == w.y - h and bubble.points[3][2] == w.y + h)
  function w:set_state() error("the Swim Suit takes and releases the worm; it sets no state") end
  function w:clear_keys() error("a taken worm's keys are the engine's to clear") end
  local function frames(n, until_fn)
    for _ = 1, n do
      M.message(w, wa.msg.FRAME_FINISH)
      if until_fn and until_fn() then return end
    end
  end
  -- Into the water, falling fast: a splash, taken by the pack for the swim
  -- with the turn running, the speed capped.
  w.state, w.y, w.vx, w.vy = "sliding", 510, 9, 12
  local x0, y0 = w.x, w.y
  M.message(w, wa.msg.FRAME_FINISH)
  check("splash, taken for the swim, the turn running", M.sounds[#M.sounds] == 57 and w.taken
    and w.taken.turn == "run" and w.state == "sliding")
  local dx, dy = w.x - x0, w.y - y0
  check("the speed capped at 5 (2.5 times the swim speed 2), then eased", dx < 5 and dy < 5
    and dx > 4 and dy > 4, dx .. " " .. dy)
  check("the swim animation in its place, facing left art mirrored", w.body_visible == false
    and M.spawned[#M.spawned].sprite == "sprites/swim_suit/swim" and M.spawned[#M.spawned].facing == -1)
  -- Swimming left: a push that way, turned.
  x0, w.keys = w.x, { left = true }
  M.message(w, wa.msg.FRAME_FINISH)
  check("left: 0.2 a frame slower, facing left", near(w.x - x0, 5 / 1.05 - 0.2)
    and w.facing == -1, tostring((w.x - x0)))
  check("no jumping while it swims", M.message(w, wa.msg.JUMP) == "eat")
  local spent_before = spent
  check("no weapons while it swims", M.message(w, wa.msg.FIRE_WEAPON) == "eat" and spent == spent_before)
  -- Land in the way: it stops there.
  M.solid = function(x) return x >= w.x + 6 end
  x0, w.keys = w.x, { right = true }
  M.message(w, wa.msg.FRAME_FINISH)
  check("land stops it", w.x == x0 and w.taken, tostring((w.x - x0)))
  M.solid = nil
  -- Still, no key: the float animation, once it has glided to a stop.
  w.keys = {}
  frames(120)
  check("still: floating", M.spawned[#M.spawned].sprite == "sprites/swim_suit/float" and w.taken)
  -- Up out of the water: released as from a jump, the suit still on.
  w.keys = { up = true }
  frames(200, function() return not w.taken end)
  check("out: released above the surface, moving up, the suit still on", w.state == "sliding"
    and w.vy < 0 and w.y < M.water and w.collision_mask == 134342 and w.body_visible == true)
  M.message(w, wa.msg.FRAME_FINISH)
  check("no second splash on the way out", not w.taken)
  -- Back in, then too deep: it gives out and the worm drowns.
  w.y, w.vx, w.vy, w.keys = 510, 0, 0, { down = true }
  frames(200, function() return w.state == "tumbling" end)
  check("too deep: out of control, the water's bit back, drawn as itself", w.state == "tumbling"
    and not w.taken and w.collision_mask == 134342 | 0x400000 and w.body_visible == true)
  -- Fast Walk: swim speed 6 for the turn.
  w.weapon, w.keys = "fast_walk", {}
  M.message(w, wa.msg.FIRE_WEAPON)
  w.weapon, w.state, w.y, w.vx, w.vy = "laser_sight", "sliding", 400, 0, 0
  M.message(w, wa.msg.FIRE_WEAPON)
  x0 = w.x
  w.y, w.vx, w.vy = 510, 20, 0
  M.message(w, wa.msg.FRAME_FINISH)
  check("Fast Walk: capped at 15", w.x - x0 > 14 and w.x - x0 <= 15, tostring((w.x - x0)))
  -- A missile in the water hits worms, and blows up on a swimmer.
  local m = { id = 1, phase = "pre", weapon = "bazooka", x = 0, y = 0, vx = 0, vy = 0, collision_mask = 0x400000 }
  M.missile(m)
  check("a missile in the water also hits worms", m.collision_mask == 0x40007C)
  local n = #M.spawned
  local missile = { kind = "missile", x = 120, y = 520 }
  M.contact(w, missile, { vx = 0, vy = 0, flags = 0 })
  local boom = M.spawned[n + 1]
  check("it blows up on the swimmer (100, 50) and is gone", boom and boom.explode and boom.explode.damage == 100
    and boom.explode.id == 50 and missile.y > M.water)
  -- The turn ends with it in the water: the engine lets go, and it drowns.
  w.taken, w.vx, w.vy = nil, 0, 0
  M.message(w, wa.msg.FRAME_FINISH)
  check("the turn over, in the water: out of control, the water's bit back", w.state == "tumbling"
    and w.collision_mask & 0x400000 ~= 0 and w.body_visible == true)
  M.message(w, wa.msg.FRAME_FINISH)
  check("and no longer the pack's", not w.taken)
  M.turn_start({ worm = w, active = w })
end

print("swim suit: knocked flying into the water, it gives out")
do
  new_match()
  frame()
  M.water = 500
  local w = worm(16)
  for i, o in ipairs(worms) do
    if o ~= w then o.x, o.y, o.turn = -1000 * i, 0, false end
  end
  w.weapon, w.state, w.x, w.y, w.vx, w.vy, w.facing, w.turn = "laser_sight", "standing", 100, 400, 0, 0, 1, true
  w.gravity, w.body_visible, w.keys, w.collision_mask = 1, true, {}, 0x420CC6
  function w:set_state(s) self.state = s end
  function w:clear_keys() self.keys = {} end
  function w:ammo() end
  M.spawned, M.sounds, M.quads = {}, {}, {}
  M.message(w, wa.msg.FIRE_WEAPON)
  check("the suit on: without the water's bit", w.collision_mask & 0x400000 == 0)
  -- Hit, it flies into the water in WA's hit state (0x80).
  w.state, w.state_id, w.y, w.vx, w.vy = nil, 0x80, 510, 3, 4
  M.message(w, wa.msg.FRAME_FINISH)
  check("not taken to swim: the suit gives out, the water's bit back for WA to drown it",
    not w.taken and w.collision_mask & 0x400000 ~= 0 and w.body_visible == true)
  M.message(w, wa.msg.FRAME_FINISH)
  check("and it stays WA's", not w.taken)
  M.turn_start({ worm = w, active = w })
end

print("wind changer and gravity control: 0-9 and 1-5, then fire")
do
  new_match()
  M.gravity, M.wind, M.digit = 0.014373779296875, 0, nil
  frame()
  M.sounds = {}
  local w = worm(16)
  for _, o in ipairs(worms) do o.turn = false end
  w.turn, w.facing, w.weapon = true, -1, "surrender"
  -- Choose 7: once, on the key going down.
  M.digit = 7
  M.message(w, wa.msg.FRAME_FINISH)
  M.message(w, wa.msg.FRAME_FINISH)
  check("a digit counts once, when it goes down", #M.sounds == 1 and M.sounds[1] == 107)
  M.hud_lines = {}
  M.hud()
  check("the HUD says the force and the keys", M.hud_lines[1] and M.hud_lines[1]:find("force 7"))
  M.digit = nil
  check("firing it goes on to WA's no-op utility", M.message(w, wa.msg.FIRE_WEAPON) == nil)
  check("wind 7 x 0.0317 towards where the worm faces, a strong wind (6 and up)",
    M.wind == -(7 * 0.0317) and M.sounds[#M.sounds] == "sounds/wind_changer/strong_wind.wav",
    tostring(M.wind) .. " " .. tostring(M.sounds[#M.sounds]))
  -- Gravity Control: nothing chosen, no shot.
  w.weapon = "low_gravity"
  check("nothing chosen: not fired, an error sound", M.message(w, wa.msg.FIRE_WEAPON) == "eat"
    and M.sounds[#M.sounds] == "sounds/gravity_control/error.wav" and M.gravity == 0.014373779296875)
  M.digit = 9
  M.message(w, wa.msg.FRAME_FINISH)
  M.digit = 5
  M.message(w, wa.msg.FRAME_FINISH)
  M.digit = nil
  M.message(w, wa.msg.FRAME_FINISH)
  check("5: very high gravity chosen (9 means nothing)", M.message(w, wa.msg.FIRE_WEAPON) == nil
    and M.gravity == (0.014373779296875 * 2.4), tostring(M.gravity))
  M.turn_start({ worm = w, active = w })
  check("turn start leaves Gravity Control active", M.gravity == (0.014373779296875 * 2.4))
  M.turn_end({ worm = w, active = w })
  check("turn end restores the match's gravity", M.gravity == 0.014373779296875)
  -- PX's rule: the turn clock standing still for 10 s puts the gravity back.
  local high = (0.014373779296875 * 2.4)
  M.digit = 5
  M.message(w, wa.msg.FRAME_FINISH)
  M.digit = nil
  M.message(w, wa.msg.FIRE_WEAPON)
  M.turn_clock = 20000
  for _ = 1, 120 do
    M.message(w, wa.msg.FRAME_FINISH)
  end
  check("a shot's settling (2.4 s, clock still) keeps the gravity", M.gravity == high)
  for i = 1, 600 do
    M.turn_clock = 20000 - i * 20
    M.message(w, wa.msg.FRAME_FINISH)
  end
  check("a running clock keeps it however long", M.gravity == high)
  for _ = 1, 499 do
    M.message(w, wa.msg.FRAME_FINISH)
  end
  check("the clock still for 499 frames keeps it", M.gravity == high)
  M.message(w, wa.msg.FRAME_FINISH)
  check("10 s with the clock still puts the gravity back", M.gravity == 0.014373779296875, tostring(M.gravity))
  M.turn_end({ worm = w, active = w })
  check("turn end after that leaves the match's gravity", M.gravity == 0.014373779296875)
end

print("jump: the worm leaves with the shot")
do
  new_match()
  frame()
  local spec
  for _, r in ipairs(replaced) do
    if r.weapon == "ninja_rope" then spec = r end
  end
  check("on the ninja rope's slot, PX's record and aim sheets", spec and spec.copy_from == "stock.ninja_rope"
    and spec.worm_sprites.weaponlnk == "sprites/jump/aim" and type(spec.on_fire) == "function")
  local w = worm(33)
  w.turn, w.weapon, w.facing, w.body_visible = true, "ninja_rope", 1, true
  w.x, w.y, w.vx, w.vy, w.state = 100, 50, 0, 0, "standing"
  function w:set_state() error("the Jump releases the worm; it sets no state") end
  M.spawned, M.sounds = {}, {}
  M.message(w, wa.msg.FIRE_WEAPON)
  M.message(w, wa.msg.FRAME_FINISH)
  check("charging: the worm keeps its aim posture", #M.spawned == 0 and w.body_visible)
  spec.on_fire({ worm = w, x = w.x, y = w.y, vx = 3, vy = -5 })
  check("fired: the shot's speed, airborne", w.vx == 3 and w.vy == -5 and w.state == "sliding")
  check("the team's Jump line: team 2's bank", M.sounds[#M.sounds] == 150 + 54, tostring(M.sounds[#M.sounds]))
end

print("laser gun: PX's 5 s beam in place of the uzi's bullet")
do
  new_match()
  frame()
  local spec
  for _, r in ipairs(replaced) do if r.weapon == "uzi" then spec = r end end
  local shooter, target = worm(16), worm(32)
  for _, o in ipairs(worms) do o.turn = false end
  shooter.turn, shooter.weapon, shooter.aim, shooter.facing = true, "uzi", 0.5, 1
  shooter.x, shooter.y = 100, 100
  target.x, target.y = 160, 100
  local drum = { kind = "oil", id = 1, x = 200, y = 100, taken = 0 }
  function drum:hit(damage) self.taken = self.taken + damage end
  M.oil = { drum }
  M.trace_hit = { x = 300, y = 100 }
  M.spawned, M.sounds, M.digs = {}, {}, {}
  spec.on_fire({ worm = shooter, x = shooter.x, y = shooter.y, vx = 0, vy = 0 })
  spec.on_fire({ worm = shooter, x = shooter.x, y = shooter.y, vx = 0, vy = 0 })
  check("one beam per worm, with its start and loop sounds", #M.spawned == 1
    and M.sounds[1] == "sounds/laser_gun/laser_start.wav" and M.sounds[2] == "sounds/laser_gun/laser_loop.wav")
  local beam = M.spawned[1]
  local function tick(n) for _ = 1, n do if not beam.dead then beam.on(beam) end end end
  tick(1)
  check("the worm is held firing: 0 of 1 shots", shooter.shots_fired == 0 and shooter.shots_to_fire == 1)
  check("the first trace: 2 to the worm, 4 to the drum, a 4 px cut where it hits land",
    target.hp == 98 and drum.taken == 4 and M.digs[1] and M.digs[1].x == 300 and M.digs[1].radius == 4,
    tostring(target.hp) .. " " .. tostring(drum.taken))
  tick(39)
  check("every fourth frame: 2 until 10 taken, then 1", target.hp == 85, tostring(target.hp))
  M.quads, M.ribbons = {}, {}
  M.draw()
  local strip = M.ribbons[1]
  check("a red strip from 24 px out to where it hits, PX's width", strip
    and strip.sprite == "sprites/laser_gun/laser_beam.png" and (strip.points[1].color & 0xFFFFFF) == 0xFF0000
    and strip.points[2].x == 300 and strip.points[1].width <= 16 and strip.points[1].width >= 8)
  tick(210)
  check("no more than 45 from one beam", target.hp == 55, tostring(target.hp))
  check("after 250 frames it stops and lets WA end the shot", shooter.shots_fired == shooter.shots_to_fire
    and M.sounds[#M.sounds] == "sounds/laser_gun/laser_end.wav")
  tick(200)
  check("its sparks gone, the beam is released", beam.dead)
  M.spawned = {}
  spec.on_fire({ worm = shooter, x = shooter.x, y = shooter.y, vx = 0, vy = 0 })
  check("the next shot starts a new beam", #M.spawned == 1)
end

print("px missile sprites: WeapSprite at run time")
do
  new_match()
  frame()
  local m = { id = 77, phase = "post", weapon = "longbow", x = 10, y = 20, vx = 3, vy = 0 }
  M.missile(m)
  check("no current worm: nothing drawn (PX's WeapSprite needs one)", not M.spawned)
  local shooter = worm(16)
  shooter.turn = true
  M.missile(m)
  local bolt = M.spawned and M.spawned[#M.spawned]
  check("a bolt on the Shadow-Bolt's missile, owned by the current worm", bolt
    and bolt.sprite == "sprites/shadow_bolt/bolt" and bolt.x == m.x and bolt.y == m.y
    and bolt.owner == shooter)
  check("flying right, turned to its flight", bolt.facing == 1 and math.abs(bolt.angle - 90) < 1e-6,
    tostring(bolt.angle))
  local before = #M.spawned
  m.vx = -3
  M.missile(m)
  check("one bolt per missile, mirrored flying left", #M.spawned == before and bolt.facing == -1)
  local shown = {}
  for _ = 1, 26 do
    M.missile(m)
    shown[bolt.shown] = true
  end
  check("steps through all six frames", shown[0] and shown[5], tostring(bolt.shown))
  m.phase = "pre"
  M.missile(m)
  m.phase, m.weapon, m.id = "post", "bazooka", 78
  M.missile(m)
  check("nothing for another weapon's missile", #M.spawned == before)

  -- The Igniter's bullet, climbing up and to the left: turned, not upright.
  m.weapon, m.id, m.vx, m.vy = "homing_missile", 79, -3, -3
  M.missile(m)
  local bullet = M.spawned[#M.spawned]
  check("a bullet on the Igniter's missile", #M.spawned == before + 1
    and bullet.sprite == "sprites/igniter/flight")
  check("turned to its flight, mirrored flying left", bullet.facing == -1
    and math.abs(bullet.angle - 315) < 1e-6, tostring(bullet.angle))
  shown = {}
  for _ = 1, 40 do
    M.missile(m)
    shown[bullet.shown] = true
  end
  check("steps through all sixteen frames", shown[0] and shown[15])
end

print("Super Tele: frozen click, 50-frame delay, three cuts and cavern ceiling")
do
  new_match()
  local spec
  for _, r in ipairs(replaced) do if r.weapon == "teleport" then spec = r end end
  local w = worm(16)
  w.x, w.y, w.hp = 40, 70, 100
  local target_x, target_y = 190 + 1234, 100 + 2345
  spec.on_click({ worm = w, x = target_x, y = target_y })
  local marker = M.spawned[#M.spawned]
  check("target marker stays at the frozen click position",
    marker.sprite == "markerr" and marker.x == target_x and marker.y == target_y and not marker.dead)
  check("click confirms target with PX's sound at WA's teleport priority",
    w.state ~= "teleporting" and M.sounds[1] == 68 and M.sound_flags[1] == 3)
  M.message(w, wa.msg.FRAME_FINISH)
  check("the next frame enters WA's teleport pose and plays PX's start sound",
    w.state == "teleporting" and M.sounds[2] == 67 and M.sound_flags[2] == 3)
  for _ = 1, 49 do M.message(w, wa.msg.FRAME_FINISH) end
  check("worm and marker remain in place for 49 frames after starting",
    w.x == 40 and w.y == 70 and not M.digs and not marker.dead)
  M.message(w, wa.msg.FRAME_FINISH)
  check("frame 50 arrives at the saved target and removes its marker",
    w.x == target_x and w.y == target_y and marker.dead)
  local cuts = M.digs or {}
  check("arrival cuts three overlapping holes at and above the destination",
    #cuts == 3 and cuts[1].x == target_x and cuts[1].y == target_y
      and cuts[2].y == target_y - 10 and cuts[3].y == target_y - 22
      and cuts[1].radius == 12 and cuts[2].radius == 12 and cuts[3].radius == 12)
  for _ = 1, 5 do M.message(w, wa.msg.FRAME_FINISH) end
  check("arrival runs once", #M.digs == 3)

  new_match({ cavern = true })
  spec = nil
  for _, r in ipairs(replaced) do if r.weapon == "teleport" then spec = r end end
  w = worm(16)
  spec.on_click({ worm = w, x = 50, y = 2 })
  for _ = 1, 51 do M.message(w, wa.msg.FRAME_FINISH) end
  check("cavern clicks stay at least 19 pixels below the ceiling", w.y == 19)

  new_match()
  spec = nil
  for _, r in ipairs(replaced) do if r.weapon == "teleport" then spec = r end end
  w = worm(16)
  w.x, w.y = 40, 70
  spec.on_click({ worm = w, x = 200, y = 150 })
  marker = M.spawned[#M.spawned]
  w.hp = 0
  for _ = 1, 50 do M.message(w, wa.msg.FRAME_FINISH) end
  check("a dead worm is never moved or carved in and its marker is removed",
    w.x == 40 and w.y == 70 and not M.digs and marker.dead)

  new_match()
  spec = nil
  for _, r in ipairs(replaced) do if r.weapon == "teleport" then spec = r end end
  w = worm(16)
  w.x, w.y, w.hp = 960, -10000, 100
  local place_x, place_y = 220, 130
  spec.on_click({ worm = w, x = place_x, y = place_y })
  check("manual placement moves the unplaced worm before it can fall",
    w.x == place_x and w.y == place_y and w.state == "teleporting")
  check("manual placement plays WA's placement Communicator from the worm",
    #M.sounds == 1 and M.sounds[1] == 68 and M.sound_targets[1] == w and M.sound_flags[1] == 3)
  check("manual placement carves the destination without a delayed marker",
    #M.digs == 3 and not (M.spawned and #M.spawned > 0))
  for _ = 1, 20 do M.message(w, wa.msg.FRAME_FINISH) end
  check("no WormPop before WA's placement delay", #M.sounds == 1)
  M.message(w, wa.msg.FRAME_FINISH)
  check("WormPop 21 frames after the click, as WA's placement",
    #M.sounds == 2 and M.sounds[2] == 54 and M.sound_targets[2] == w and M.sound_flags[2] == 3)
  for _ = 1, 51 do M.message(w, wa.msg.FRAME_FINISH) end
  check("manual placement has no second arrival or sound",
    w.x == place_x and w.y == place_y and #M.digs == 3 and #M.sounds == 2)

  -- The wind-up: none for an unplaced worm, as WA's own placement; PX's in
  -- a turn.
  new_match()
  w = worm(16)
  w.x, w.y, w.weapon = 960, -10000, "teleport"
  M.message(w, wa.msg.FIRE_WEAPON)
  check("firing Super Tele from an unplaced worm skips the wind-up", w.windup == 0)
  local placed = worm(17)
  placed.x, placed.y, placed.weapon = 40, 70, "teleport"
  M.message(placed, wa.msg.FIRE_WEAPON)
  placed.state = "prefiring"
  M.message(placed, wa.msg.FRAME_FINISH)
  check("in a turn Super Tele keeps its wind-up", placed.windup == nil)
  local late = worm(32)
  late.x, late.y, late.weapon, late.state = 960, -10000, "teleport", "prefiring"
  M.message(late, wa.msg.FRAME_FINISH)
  check("an unplaced worm already winding up has it skipped at the frame's end", late.windup == 0)
  local other = worm(33)
  other.x, other.y, other.weapon = 960, -10000, "bazooka"
  M.message(other, wa.msg.FIRE_WEAPON)
  check("other weapons keep their wind-up in placement", other.windup == nil)
end

print("lightning strike: warning, hit, grave identity and copied hand")
do
  new_match()
  local click
  for _, spec in ipairs(replaced) do
    if spec.weapon == "napalm_strike" then click = spec.on_click; break end
  end
  local jumper = worm(16)
  jumper.turn, jumper.weapon = true, "napalm_strike"
  jumper.state = "prefiring"
  function jumper:set_state() error("the engine ends a click-only fire's prefire, not the pack") end
  click({ worm=jumper, x=100, y=100 })
  check("click leaves ending WA's prefiring pose to the engine", jumper.state == "prefiring")

  -- The strike comes from where WA's arrow points (the sign of ev.vx), not
  -- from the worm's facing. With no land the beam ends 300 pixels along it,
  -- which is where its effect sits: left of the click when it comes from
  -- the left.
  new_match()
  local facing_right = worm(16)
  facing_right.facing = 1
  click({ worm = facing_right, x = 100, y = 100, vx = -1 })
  local from_right = M.spawned[#M.spawned]
  facing_right.facing = -1
  click({ worm = facing_right, x = 100, y = 100, vx = 1 })
  local from_left = M.spawned[#M.spawned]
  check("the arrow, not the worm's facing, sets the side it strikes from",
    from_right.x > 100 and from_left.x < 100, (from_right.x) .. "," .. (from_left.x))

  new_match()
  local by_slot = {}
  for _, spec in ipairs(replaced) do by_slot[spec.weapon] = spec end
  local owner, target = worm(16), worm(17)
  owner.x, owner.y = 100, 100
  target.x, target.y = 100, 100
  for _, w in ipairs(worms) do
    if w ~= owner and w ~= target then w.x, w.y = 1000, 1000 end
  end
  local shared = require("lib/shared")
  local zap_balls, zapped_at = shared.zap_bowling_balls, nil
  shared.zap_bowling_balls = function(x, y) zapped_at = { x, y } end
  by_slot.napalm_strike.on_click({ worm=owner, x=100, y=100 })
  local effect = M.spawned[#M.spawned]
  for _ = 1, 149 do effect.on(effect) end
  check("150 frame warning leaves health alone", target.hp == 100)
  effect.on(effect)
  M.draw()
  check("active strike emits a terrain-occluded GPU ribbon",
    #M.ribbons > 0 and M.ribbons[1].depth == wa.depth.BEHIND_TERRAIN)
  for _ = 1, 15 do effect.on(effect) end
  check("beam stays active for 16 frames", target.hp == 100)
  effect.on(effect)
  check("final hit heals the living worm by 25", target.hp == 125)
  check("and overcharges the bowling balls where it hit", zapped_at ~= nil)
  shared.zap_bowling_balls = zap_balls
  M.quads = {}
  M.draw()
  local puffs = 0
  for _, q in ipairs(M.quads) do
    if q.sprite == wa.sprites.key("sprites/lightning/cloud.png") and q.blend == "alpha" and (q.color & 0xFFFFFF) == 0x2D283C then
      puffs = puffs + 1
    end
  end
  check("PX's cloud: dark puffs built up over the warning, drawn behind the terrain", puffs > 60, tostring(puffs))
  for _ = 1, 60 do effect.on(effect) end
  check("after the 60 frame tail the effect waits for its last puff", not effect.dead)
  for _ = 1, 140 do effect.on(effect) end
  check("the last puff gone, the effect is released", effect.dead)

  -- The grave is matched to the dead worm before the strike; revival returns
  -- the same stable ID and restores the copied inventory to that worm.
  new_match()
  by_slot = {}
  for _, spec in ipairs(replaced) do by_slot[spec.weapon] = spec end
  owner, target = worm(16), worm(17)
  owner.x, owner.y = 100, 100
  target.x, target.y = 140, 100
  for _, w in ipairs(worms) do
    if w ~= owner and w ~= target then w.x, w.y = 1000, 1000 end
  end
  turn(16)
  frame()
  local original = hand(17)
  kill(17)
  remove(17)
  local grave = { id=701, kind="grave", worm_id=17, x=140, y=100 }
  function grave:revive(id, hp)
    assert(id == 17 and hp == 10)
    local revived = setmetatable({ id=id, kind="worm", team=1, alliance=0, ammo_group=0,
      hp=hp, x=self.x, y=self.y-5, facing=1 }, Worm)
    worms[#worms+1] = revived
    M.graves = {}
    return revived
  end
  M.graves = { grave }
  by_slot.napalm_strike.on_click({ worm=owner, x=140, y=100 })
  effect = M.spawned[#M.spawned]
  for _ = 1, 166 do effect.on(effect) end
  local revived = worm(17)
  check("linked grave revives its own worm at 10 HP", revived and revived.hp == 10)
  turn(17)
  local have = {}
  for _, name in ipairs(original) do have[name] = true end
  local restored = true
  for name in pairs(have) do if ammo[0][name] ~= 1 then restored = false end end
  check("the original Highlander hand is restored", restored)

  -- A revive the engine refuses (a living worm holds the place, a full
  -- team) plays Reinforcement's error sound at the grave.
  new_match()
  by_slot = {}
  for _, spec in ipairs(replaced) do by_slot[spec.weapon] = spec end
  owner = worm(16)
  owner.x, owner.y = 100, 100
  for _, w in ipairs(worms) do if w ~= owner then w.x, w.y = 1000, 1000 end end
  local full = { id=703, kind="grave", worm_id=17, x=140, y=100 }
  function full:revive() return nil end
  M.graves = { full }
  M.sounds, M.sound_targets = {}, {}
  by_slot.napalm_strike.on_click({ worm=owner, x=140, y=100 })
  effect = M.spawned[#M.spawned]
  for _ = 1, 166 do effect.on(effect) end
  check("a refused revive plays the error sound at the grave",
    M.sounds[#M.sounds] == "sounds/gravity_control/error.wav" and M.sound_targets[#M.sound_targets] == full)

  new_match()
  by_slot = {}
  for _, spec in ipairs(replaced) do by_slot[spec.weapon] = spec end
  owner = worm(16)
  owner.x, owner.y = 100, 100
  for _, w in ipairs(worms) do if w ~= owner then w.x, w.y = 1000, 1000 end end
  local mine = { id=702, kind="mine", x=100, y=100, fuse=2500 }
  function mine:arm(fuse) self.armed = fuse end
  M.mines = {mine}
  local before_rng = rng
  by_slot.napalm_strike.on_click({ worm=owner, x=100, y=100 })
  effect = M.spawned[#M.spawned]
  for _ = 1, 166 do effect.on(effect) end
  check("a fixed-fuse mine keeps its timer without an RNG draw",
    mine.armed == 2500 and rng == before_rng)
  mine.fuse, mine.armed = -1, nil
  by_slot.napalm_strike.on_click({ worm=owner, x=100, y=100 })
  effect = M.spawned[#M.spawned]
  for _ = 1, 166 do effect.on(effect) end
  check("a random-fuse mine draws one 1–5 s fuse in simulation",
    mine.armed >= 1000 and mine.armed <= 5000 and rng ~= before_rng)
end

print("electric grenade: seek, delayed zap, and target kinds")
do
  local function setup()
    new_match()
    local spec
    for _, r in ipairs(replaced) do if r.weapon == "earthquake" then spec = r end end
    local owner = worm(16)
    for _, w in ipairs(worms) do w.x, w.y = 1000, 1000 end
    owner.x, owner.y = 0, 0
    return spec, owner
  end
  local function tick(n)
    local a = M.spawned[#M.spawned]
    for _ = 1, n do if not a.dead then a.on(a) end end
  end
  -- Dozens of live arcs, drawn: the draw refills its tables rather than
  -- making garbage for every glow, so Lua's GC does not run inside it.
  do
    local spec, owner = setup()
    for i = 1, 40 do spec.on_explode({ worm = owner, x = i * 40, y = 0 }) end
    for _ = 1, 12 do
      for _, a in ipairs(M.spawned) do if not a.dead then a.on(a) end end
    end
    local quad, ribbon = wa.draw.quad, wa.draw.ribbon
    local quads, ribbons = 0, 0
    wa.draw.quad = function() quads = quads + 1 end
    wa.draw.ribbon = function() ribbons = ribbons + 1 end
    M.draw()
    quads, ribbons = 0, 0
    collectgarbage("stop")
    local before = collectgarbage("count")
    M.draw()
    local kb = collectgarbage("count") - before
    collectgarbage("restart")
    wa.draw.quad, wa.draw.ribbon = quad, ribbon
    check("40 arcs drawn without new tables per glow", ribbons == 40 and quads > 400 and kb < 4,
      string.format("%d ribbons, %d quads, %.1f KB", ribbons, quads, kb))
  end
  local spec, owner = setup()
  check("a stock grenade for the worm's throw sheet, PX's hold over it",
    spec.sprite == "grenade" and spec.worm_sprites and spec.worm_sprites.weaponlnk == "sprites/px_hold/aim"
    and spec.params.gpu_prefix == "sprites/px_hold/")
  -- In flight: the stock grenade hidden, PX's grenade drawn in its place.
  M.spawned = {}
  owner.turn = true
  local m = { id = 501, phase = "pre", weapon = "earthquake", x = 10, y = 20, vx = 1, vy = 0, sprite = 50 }
  M.missile(m)
  m.phase = "post"
  M.missile(m)
  check("thrown: WA's sprite hidden, PX's grenade follows it", m.sprite == 0
    and M.spawned[1] and M.spawned[1].sprite == "sprites/px_hold/electric_grenade.png")
  -- Its sprite's owner when no worm holds the turn: the last turn's worm;
  -- if that one died since (WA frees a dead worm, its handle dangles), a
  -- living worm, never the dead one, so PX's grenade is still drawn (WA's
  -- own sprite is the stock grenade, which the Sticky Bomb redraws).
  do
    local before = M.spawned
    owner.turn = false
    M.turn_start({ worm = owner })
    local listed = wa.worms.all
    wa.worms.all = function()
      local alive = {}
      for _, w in ipairs(listed()) do if w ~= owner then alive[#alive + 1] = w end end
      return alive
    end
    M.spawned = {}
    local late = { id = 502, phase = "post", weapon = "earthquake", x = 10, y = 20, vx = 1, vy = 0, sprite = 0 }
    late.phase = "pre"
    late.sprite = 50
    M.missile(late)
    late.phase = "post"
    M.missile(late)
    check("a grenade flying after the last turn's worm died is drawn for a living worm,"
      .. " WA's own sprite hidden", #M.spawned == 1 and M.spawned[1].owner ~= owner
      and M.spawned[1].owner ~= nil and late.sprite == 0)
    wa.worms.all = listed
    M.spawned = {}
    local later = { id = 503, phase = "post", weapon = "earthquake", x = 10, y = 20, vx = 1, vy = 0, sprite = 0 }
    M.missile(later)
    check("while that worm lives, it owns the sprite", M.spawned[1] and M.spawned[1].owner == owner)
    owner.turn = true
    M.spawned = before
  end
  -- It spins as a grenade (its record's WAT_Rotation), not faces its flight:
  -- flying right at 4 px a frame, 0.5 * 4 * 0.15 = 0.3 rad a frame.
  m.vx, m.vy = 4, 0
  local before = M.spawned[1].angle
  M.missile(m)
  local turned = (M.spawned[1].angle - before) % 360
  check("thrown: it spins with its speed, as PX's grenade", math.abs(turned - math.deg(0.3)) < 1e-6,
    tostring(turned))
  owner.turn = false
  local target = worm(17)
  target.x, target.y = 5, 0
  spec.on_explode({ worm=owner, x=0, y=0 })
  tick(1)
  function target:set_state() error("a tazed worm is taken, not set to a state") end
  function target:clear_keys() error("a tazed worm's keys are the engine's to consume") end
  check("near worm is held in tazed pose", target.taken and target.taken.turn == "freeze"
    and target.body_visible == false)
  check("a tazed worm cannot start a shot", M.message(target, wa.msg.FIRE_WEAPON) == "eat")
  -- The current, drawn: a glow at every point of the strip, and PX's
  -- widths (9 at the thickest, a half width).
  M.quads, M.ribbons = {}, {}
  M.draw()
  local glows = 0
  for _, q in ipairs(M.quads) do if q.sprite == wa.sprites.key("sprites/lightning/glow.png") then glows = glows + 1 end end
  local strip = M.ribbons[1]
  check("the current glows at every point, PX's width at its ends",
    strip and glows >= #strip.points and math.abs(strip.points[1].width - 2 * 9 * 0.1) < 1e-9,
    tostring(glows) .. " glows")
  tick(23)
  check("zap waits 24 frames", target.hp == 100)
  tick(1)
  check("zap deals 24 and releases movement", target.hp == 76 and target.taken == nil
    and target.state == "sliding" and target.body_visible == true)
  check("released, it may fire again", M.message(target, wa.msg.FIRE_WEAPON) ~= "eat")
  spec, owner = setup()
  local first, second = worm(17), worm(32)
  first.x, first.y = 5, 0
  second.x, second.y = 14, 0
  spec.on_explode({ worm=owner, x=0, y=0 })
  tick(50)
  check("arc chains to a second unvisited worm", first.hp == 76 and second.hp == 76)
  -- Bowling Balls are links too (PX's Tazer): the arc snaps to one, glows on
  -- it for 24 frames, then zaps it: Zap(0), thrown up and electrified; an
  -- electrified one Zap(1), thrown at 0.8. No damage. The chain goes on.
  spec, owner = setup()
  local shared = require("lib/shared")
  local _, ball = shared.spawn_bowling_ball(owner, 5, 0, 0, 0)
  local after = worm(17)
  after.x, after.y = 14, 4
  spec.on_explode({ worm = owner, x = 0, y = 0 })
  tick(1)
  M.quads = {}
  M.draw()
  local on_ball = false
  for _, q in ipairs(M.quads) do
    if q.sprite == wa.sprites.key("sprites/lightning/glow.png") and q.points[1][1] < 5 and q.points[3][1] > 5
      and q.points[3][1] - q.points[1][1] > 40 then on_ball = true end
  end
  check("the arc links to a Bowling Ball, PX's glow on it", ball and on_ball and not ball.zapped)
  tick(23)
  check("the ball's zap waits 24 frames", not ball.zapped)
  tick(1)
  check("and zaps it then: thrown up and electrified", ball.zapped and ball.vy <= -5
    and ball.vy >= -10, tostring(ball.vy))
  tick(60)
  check("the chain goes on through the ball", after.hp == 76)
  local x0, y0 = ball.x, ball.y
  spec.on_explode({ worm = owner, x = x0, y = y0 })
  tick(25)
  check("an electrified ball zapped again is thrown at 0.8 (Zap(1))", ball.vy <= -4 and ball.vy >= -8,
    tostring(ball.vy))
  -- The thrower: as PX's, the arc never zaps the worm that fired the
  -- grenade, whichever worm the explosion names.
  spec, owner = setup()
  owner.weapon = "earthquake"
  M.message(owner, wa.msg.FIRE_WEAPON)
  first = worm(17)
  first.x, first.y = 5, 0
  spec.on_explode({ worm=worm(32), x=0, y=0 })
  tick(50)
  check("the arc spares the worm that threw the grenade", owner.hp == 100 and first.hp == 76,
    tostring(owner.hp) .. " " .. tostring(first.hp))
  -- The trail: every point stays from the grenade on, links included.
  spec, owner = setup()
  first = worm(17)
  first.x, first.y = 60, 0
  spec.on_explode({ worm=owner, x=0, y=0 })
  local function drawn_points()
    M.quads, M.ribbons = {}, {}
    M.draw()
    local r = M.ribbons[#M.ribbons]
    return r and #r.points or 0
  end
  local before, after = drawn_points(), nil
  for _ = 1, 30 do
    tick(1)
    if first.taken then after = drawn_points(); break end
    before = drawn_points()
  end
  check("linking to a worm keeps the trail it came along", after and before >= 3 and after == before + 1,
    tostring(before) .. " -> " .. tostring(after))
  spec, owner = setup()
  local mine = { id=800, kind="mine", x=5, y=0 }
  function mine:arm(fuse) self.fuse = fuse end
  M.mines = {mine}
  spec.on_explode({ worm=owner, x=0, y=0 })
  tick(25)
  check("chained mine arms on a 400 ms fuse", mine.fuse == 400)
  spec, owner = setup()
  local crate = { id=801, kind="crate", x=5, y=0 }
  function crate:hit(damage) self.damage = damage end
  M.crates = {crate}
  spec.on_explode({ worm=owner, x=0, y=0 })
  tick(25)
  check("object zap passes 12 damage", crate.damage == 12)
  -- Two arcs hold one worm and the first zap kills it. The engine's worm
  -- lists leave dead worms out; the second zap must release it anyway, or
  -- the engine holds a dead worm, which never comes to rest, and the turn
  -- the hold froze never ends.
  spec, owner = setup()
  local held = worm(17)
  held.x, held.y, held.hp = 5, 0, 20
  local listed = wa.worms.all
  wa.worms.all = function()
    local alive = {}
    for _, w in ipairs(listed()) do if w.hp > 0 then alive[#alive + 1] = w end end
    return alive
  end
  M.spawned = {}
  spec.on_explode({ worm=owner, x=0, y=0 })
  spec.on_explode({ worm=owner, x=0, y=0 })
  for _ = 1, 30 do
    for _, a in ipairs(M.spawned) do if not a.dead then a.on(a) end end
  end
  wa.worms.all = listed
  check("a worm killed while two arcs hold it is still released", held.hp == 0 and held.taken == nil
    and held.body_visible == true)
  spec, owner = setup()
  M.trace_hit = { x=0, y=-5, nx=1, ny=0, tx=0, ty=1, starts_solid=false }
  spec.on_explode({ worm=owner, x=0, y=0 })
  tick(1)
  check("terrain trace can redirect the arc", #M.spawned > 0 and not M.spawned[#M.spawned].dead)
  -- An explosion WA reports without a worm: the turn's worm owns the arc's
  -- driver, not the exploding grenade (which lends no collision helper).
  spec, owner = setup()
  for _, w in ipairs(worms) do w.turn = false end
  owner.turn = true
  M.spawned = {}
  spec.on_explode({ x=0, y=0 })
  check("an explosion without a worm: the turn's worm owns the arc", M.spawned[1] and M.spawned[1].owner == owner)
end

print("Javelin: ordered thrusts and terrain stamps")
do
  new_match()
  local spec
  for _, r in ipairs(replaced) do if r.weapon == "prod" then spec = r end end
  check("prod uses Javelin's record and GPU art", spec.wep == "weps/prod.wep"
    and spec.params.gpu_prefix == "sprites/javelin/" and type(spec.on_explode) == "function")
  local owner = worms[1]
  owner.x, owner.y, owner.turn = 1000, 1000, true
  local nearby = {}
  wa.world.electrical_nearby = function(x, y, r, graves)
    assert(r == 29 and not graves)
    return nearby
  end
  local id = 0
  local function impact(vx, vy)
    id = id + 1
    M.missile({ weapon = "prod", id = id, uid = id + 1000, phase = "pre", vx = vx, vy = vy })
    -- WA's explosion reports the missile's owner, which is not a worm.
    spec.on_explode({ x = 100, y = 100, missile = id, worm = { owner_object = true } })
  end
  local a, b = worms[2], worms[3]
  a.x, a.y, b.x, b.y = 119, 119, 100, 100
  nearby = { a, b }
  impact(8, -4)
  check("first target wins, including square corners outside a 20px circle", a.hp == 80 and b.hp == 100)
  check("worm thrust uses quarter incoming velocity", a.vx == 2 and a.vy == -1)
  check("hitting an object never stamps", M.stamps == nil)
  a.x, a.y = 120, 100
  nearby = { a }
  impact(1, 0)
  check("20px boundary is excluded", a.hp == 80 and #M.stamps == 1)
  nearby = {}
  owner.x, owner.y = 124, 124
  impact(-7, 7)
  check("active worm has PX's 25px fallback and retains fractional thrust", owner.hp == 80
    and owner.vx == -1.75 and owner.vy == 1.75 and #M.stamps == 1)
  owner.x, owner.y = 125, 100
  impact(0, 0)
  check("25px fallback boundary is excluded; zero speed points up", owner.hp == 80 and M.stamps[2].frame == 0)
  owner.x, owner.y = 1000, 1000
  for _, kind in ipairs({"mine", "crate", "oil"}) do
    local o = { kind = kind, x = 100, y = 100 }
    function o:hit(damage, vx, vy, mode) self.hit_args = { damage, vx, vy, mode } end
    nearby = { o }
    impact(-8, 4)
    check(kind .. " receives 20 projectile damage and thrust", o.hit_args[1] == 20
      and o.hit_args[2] == -4 and o.hit_args[3] == 2 and o.hit_args[4] == "projectile"
      and o.vx == -2 and o.vy == 1 and #M.stamps == 2)
  end
  nearby = {}
  local cases = { {0,-1,0}, {1,0,8}, {0,1,16}, {-1,0,24}, {1,-1,3}, {1,1,11},
    {-1,1,19}, {-1,-1,27}, {100,-1,7}, {1,100,15}, {-100,1,23}, {-1,-100,31} }
  local good = true
  for _, c in ipairs(cases) do
    impact(c[1], c[2])
    local stamp = M.stamps[#M.stamps]
    good = good and stamp.frame == c[3] and stamp.sprite == "sprites/javelin/stamp"
      and stamp.x == 100 and stamp.y == 100
  end
  check("cardinals, ratio bins and clamps choose PX's centered 60px stamp", good)
  local last = M.stamps[#M.stamps]
  check("the half in the land fades into it", last.buried and last.buried.soften == 3
    and last.buried.blend == "mix")
  check("sticking plays the registered impact sound on the turn's worm, never the missile's owner",
    M.sounds[#M.sounds] == "sounds/javelin_impact.wav" and M.sound_targets[#M.sound_targets] == owner)
  local n = #M.stamps
  M.draw()
  check("drawing never writes terrain", #M.stamps == n)
  -- Sentries are absent from the native electrical object list.
  nearby = {}
  for _, w in ipairs(worms) do w.x, w.y = 5000, 5000 end
  owner.x, owner.y = 100, 108
  M.solid = function() return false end
  local t = require("lib/shared").sentry_gun
  local a, state = t.place({ worm = owner })
  owner.x, owner.y = 5000, 5000
  local hp, stamps = state.health, #M.stamps
  impact(8, -4)
  check("Javelin finds scripted sentry bodies and deals 20 damage without a terrain stamp",
    state.health == hp - 20 and state.disabled and #M.stamps == stamps)
  check("Javelin gives the sentry quarter incoming velocity", state.vx == 2 and state.vy == -1)
  a.contact(a, { other = { kind = "missile", uid = id + 1000, alive = false }, vx = 8, vy = -4 })
  check("the same native Javelin contact cannot double the push", state.vx == 2 and state.vy == -1)
  M.solid = nil

end

print("pack sounds: every WAV registered")
do
  local missing = {}
  for name in pairs(unregistered_sounds) do missing[#missing + 1] = name end
  table.sort(missing)
  check("every pack sound the rules played is registered", #missing == 0, table.concat(missing, ", "))
  -- And every WAV in the pack, where the suite can list its folder.
  local ls = io and io.popen and io.popen("find mods/px/sounds -name '*.wav' 2>/dev/null")
  if ls then
    new_match()
    local registered, unlisted = {}, {}
    for _, r in ipairs(replaced) do
      for _, snd in ipairs(r.sounds or {}) do registered[snd] = true end
    end
    local found = 0
    for line in ls:lines() do
      local rel = line:match("mods/px/(.*)")
      found = found + 1
      if rel and not registered[rel] then unlisted[#unlisted + 1] = rel end
    end
    ls:close()
    if found > 0 then
      table.sort(unlisted)
      check("every WAV in sounds/ is registered by an entry", #unlisted == 0, table.concat(unlisted, ", "))
    end
  end
end

-- ------------------------------------------------------------ baseline

-- A value as text: tables with their keys sorted, functions as <function>.
local function serialize(v, seen)
  local t = type(v)
  if t == "string" then
    return string.format("%q", v)
  elseif t == "number" then
    return math.type(v) == "integer" and tostring(v) or string.format("%.17g", v)
  elseif t ~= "table" then
    return t == "function" and "<function>" or tostring(v)
  end
  seen = seen or {}
  if seen[v] then
    return "<cycle>"
  end
  seen[v] = true
  local keys = {}
  for k in pairs(v) do
    keys[#keys + 1] = k
  end
  table.sort(keys, function(a, b)
    if type(a) == type(b) and type(a) ~= "table" then
      return a < b
    end
    return type(a) < type(b)
  end)
  local parts = {}
  for _, k in ipairs(keys) do
    local key = type(k) == "string" and k:match("^[%a_][%w_]*$") and k or "[" .. serialize(k, seen) .. "]"
    parts[#parts + 1] = key .. " = " .. serialize(v[k], seen)
  end
  seen[v] = nil
  return "{ " .. table.concat(parts, ", ") .. " }"
end

local function baseline()
  local out = {}
  local function add(line)
    out[#out + 1] = line
  end

  new_match()
  add("# claims, in wa.weapons.replace order")
  for _, spec in ipairs(replaced) do
    add(spec.weapon .. " " .. serialize(spec))
  end

  add("")
  add("# hooks registered, by event")
  local hooks = {
    worm_message = M.handlers, turn_start = M.turn_starts, turn_end = M.turn_ends,
    missile_frame = M.missile_handlers, draw = M.draws, contact = M.contacts, hurt = M.hurt_handlers,
  }
  for _, name in ipairs({
  "contact", "death", "draw", "hud", "hurt", "missile_frame", "body_move",
    "turn_end", "turn_start", "worm_message",
  }) do
    local n = hooks[name] and #hooks[name] or (M[name] and 1 or 0)
    add(("%s %d"):format(name, n))
  end

  add("")
  add("# globals the pack defines")
  local globals = {}
  for k in pairs(_G) do
    if not PRISTINE[k] and k ~= "wa" then
      globals[#globals + 1] = tostring(k)
    end
  end
  table.sort(globals)
  for _, k in ipairs(globals) do
    add(k)
  end

  -- What each hand position can be dealt: 200 worms, open and cavern.
  for _, map in ipairs({ "open", "cavern" }) do
    add("")
    add("# hands dealt at match start, " .. map .. " map (4 worms, fixed RNG)")
    new_match({ cavern = map == "cavern" })
    frame()
    for _, id in ipairs({ 16, 17, 32, 33 }) do
      add(("%d %s"):format(id, table.concat(hand(id) or {}, ", ")))
    end
    add("")
    add("# what each hand position can be dealt, " .. map .. " map (200 worms)")
    new_match({ cavern = map == "cavern", per_team = 100, seed = 4242 })
    frame()
    local seen = {}
    for _, w in ipairs(worms) do
      for i, name in ipairs(hand(w.id) or {}) do
        seen[i] = seen[i] or {}
        seen[i][name] = true
      end
    end
    for i = 1, #seen do
      add(("%d %s"):format(i, table.concat(wa.sorted(seen[i]), ", ")))
    end
  end
  return table.concat(out, "\n") .. "\n"
end

local BASELINE = "mods/px/baseline.txt"
print("worm_message: every handler names its messages")
do
  new_match()
  local open = 0
  for i = 1, #M.handlers do
    if not M.handler_msgs[i] then open = open + 1 end
  end
  -- One handler without a filter makes the engine call into Lua for every
  -- message every worm gets, several a frame each.
  check("no handler takes every message", open == 0, open .. " of " .. #M.handlers)
end

print("baseline: the pack's claims, hooks, globals and deals")
do
  local now = baseline()
  if arg and arg[1] == "--baseline" then
    local f = assert(io.open(BASELINE, "w"))
    f:write(now)
    f:close()
    print("  wrote " .. BASELINE)
  else
    -- A host that runs this suite from elsewhere (lua-host's test, from the
    -- crate's folder) hands the file's text in as HIGHLANDER_BASELINE.
    local was = HIGHLANDER_BASELINE
    if was == nil then
      local f = io.open(BASELINE, "r")
      was = f and f:read("a")
      if f then f:close() end
    end
    -- A Windows checkout may hand the file back with CRLF line endings.
    was = was and was:gsub("\r\n", "\n")
    local differs
    if was and was ~= now then
      local a, b = {}, {}
      for line in was:gmatch("[^\n]*") do a[#a + 1] = line end
      for line in now:gmatch("[^\n]*") do b[#b + 1] = line end
      for i = 1, math.max(#a, #b) do
        if a[i] ~= b[i] then
          differs = ("line %d:\n    was: %s\n    now: %s"):format(i, tostring(a[i]), tostring(b[i]))
          break
        end
      end
    end
    check("matches baseline.txt (rewrite with --baseline when intended)", was == now,
      was == nil and "no baseline.txt" or differs)
  end
end

print("components: weapons by id, Highlander's own by their home")
do
  new_match()
  -- A fresh loader: the match's own has placed rules.lua's whole layout.
  local root = HIGHLANDER_ROOT or "mods/px/"
  local loader = assert(loadfile(root .. "components/loader.lua", "t", setmetatable({}, { __index = _G })))()
  local shared = require("lib/shared")
  local homes = loader.place({ weapons = {
    ["px.swim_suit"] = {}, ["px.super_tele"] = {}, ["px.nuke_rocket"] = {},
    ["stock.fast_walk"] = {}, ["stock.flame_thrower"] = {}, ["stock.teleport"] = {}, ["stock.mine"] = {},
  } })
  check("only Highlander's weapons load code", same(homes, { "laser_sight", "mine", "teleport" }),
    table.concat(homes, ","))
  check("a Highlander weapon's home", shared.home("px.super_tele") == "teleport")
  check("WA's own weapon is its stock name", shared.home("stock.fast_walk") == "fast_walk")
  check("WA's own weapon never takes a Highlander weapon's home",
    shared.home("stock.teleport") == nil and shared.home("stock.mine") == nil)
end

print("")
if fails == 0 then
  print("ALL PASS")
else
  print(("%d FAILED"):format(fails))
  os.exit(1)
end
