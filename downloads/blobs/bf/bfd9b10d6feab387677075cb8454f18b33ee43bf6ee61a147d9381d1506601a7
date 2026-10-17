-- Highlander: the slot claims. Split from rules.lua by tools/split_highlander.py.
local shared = require("lib/shared")
local PORTED = shared.PORTED
local PX_ART = shared.PX_ART
local PX_HOLDS = shared.PX_HOLDS
local WEP_NAME = shared.WEP_NAME
local WEP_FIELDS = shared.WEP_FIELDS
local fires = shared.fires

-- WA's muzzle can be inside a wall when a worm fires from beside it. A stock
-- Old Woman constructed there explodes before her first frame. Dispatch the
-- shot to Lua so she can be launched from a clear point the worm can see,
-- keeping WA's own Old Woman movement and five-second fuse.
local OLD_WOMAN_LAUNCHER = {
  fires = {
    subtype = 3, -- bazooka aim sheet, not the Sheep Launcher hold
    type = 1,
    method = 3, -- CreateWeaponProjectile, intercepted by on_fire
  },
}

-- Our own changes over the generated record fields (tools/embed_weps.py),
-- kept here so WEP_FIELDS can be generated again.
local FIXES = {
  -- S.M.A.R.T Bomb: homing bits leave the bomb's red trail circles (stock 250,
  -- drawn as sprites/smart_bomb/trail), not WA's green gas cloud (608) the
  -- record named.
  mortar = { clusters = { bit = { homing = { trail = { sprite = 250 } } } } },
  -- Skunk: Space lets the gas out, as WA's own Skunk; PX's record left the
  -- flag at the Double Damage's (off), so the walker never told the team it
  -- could be set off, and its shot never ended. The walker it bursts into
  -- (its one cluster) has its own flag, off too: Space sets it off.
  damage_x2 = { missile = { explode_on_space = true }, clusters = { bit = { explode_on_space = true } } },
  -- Helicopter: its fuel is its record's, PX's FuelAmount (its script's 100,
  -- not the record's 255, which the script always replaced).
  jet_pack = { jet_pack = { fuel = 100 } },
}

-- `t` laid over `into`, nested tables field by field: a new table, neither
-- of the two changed (WEP_FIELDS' tables are shared by every match).
local function merged(into, t)
  local out = {}
  for k, v in pairs(into or {}) do out[k] = v end
  for k, v in pairs(t) do
    if type(v) == "table" and type(out[k]) == "table" then
      out[k] = merged(out[k], v)
    else
      out[k] = v
    end
  end
  return out
end

-- Whether a weapon ends the turn is a profile's setting ("Ends the turn":
-- the Highlander profile turns it off, so a worm can fire its whole hand).
-- PX's records have it off on almost every weapon; each claim puts back the
-- weapon's own instead: it ends the turn, as WA's do, except these, which
-- never do (WA's rope, bungee, parachute, jet pack and the like, and the
-- Portal Gun, so both portals go down in one turn).
local KEEPS_TURN = {
  ninja_rope = true, bungee = true, parachute = true, select_worm = true, jet_pack = true,
  low_gravity = true, fast_walk = true, laser_sight = true, crate_spy = true, crate_shower = true,
  scales_of_justice = true,
}

-- The weapons Highlander claimed this match, by home slot. Code that acts on
-- a weapon it looks up by slot (a missile's sprite, a held weapon's sight)
-- asks first: as a component bundle only the placed weapons claim, and
-- another scheme may put WA's own weapon, or another bundle's, on the rest.
local owned = {}
shared.owns = function(home)
  return home ~= nil and owned[home] == true
end

-- One weapon's claim of the slot the profile placed it on (`w.weapon` is its
-- home slot, the pack's key for it, whose stock record it builds on).
local function claim(w)
  owned[w.weapon] = true
  -- copy_from + name + the record's fields (stock base); was weps/<slot>.wep
  local spec = w.wep and { wep = w.wep } or { copy_from = "stock." .. w.weapon, name = WEP_NAME[w.weapon] }
  if w.weapon == "old_woman" then
    spec = merged(spec, OLD_WOMAN_LAUNCHER)
    spec.on_fire = function(fire) fires.old_woman(fire) end
  elseif not w.wep and WEP_FIELDS[w.weapon] then
    spec = merged(spec, WEP_FIELDS[w.weapon])
  end
  if FIXES[w.weapon] then
    spec = merged(spec, FIXES[w.weapon])
    -- A field named here takes the place of the generated raw byte under it.
    if spec.jet_pack and spec.jet_pack.fuel ~= nil and spec.raw then
      spec.raw = merged(spec.raw, {})
      spec.raw[0x038] = nil
    end
  end
  for key, value in pairs(w) do
    spec[key] = value
  end
  spec.handling = merged(spec.handling, { ends_turn = not KEEPS_TURN[w.weapon] })
  -- No slot: a weapon component claims the one it was placed on.
  spec.weapon = nil
  spec.hold = PX_HOLDS[w.weapon]
  wa.weapons.replace(spec)
end

-- A weapon component claims only the slot it was placed on: the weapon with
-- home slot `home`.
shared.claim = function(home)
  for _, list in ipairs({ PORTED, PX_ART }) do
    for _, w in ipairs(list) do
      if w.weapon == home then
        claim(w)
        return true
      end
    end
  end
  return false
end

do
  -- reddaz's launch point search, playtested by him. A point is clear when
  -- it and 8 points on a 3-pixel circle around it are free of land, and the
  -- worm can see it (nothing between them, so never the far side of a thin
  -- wall the muzzle poked through). The muzzle is tried first, then rings
  -- every 4 pixels out to 40, at finer angles the wider the ring; failing
  -- all, she starts at the worm.
  local CLEAR = 3
  local REACH = 40
  local RING = 4

  local function clear(x, y)
    if wa.land.solid(x, y) then return false end
    for i = 0, 7 do
      local a = (i / 8) * 2 * math.pi
      if wa.land.solid(x + (CLEAR * wa.math.cos(a)), y + (CLEAR * wa.math.sin(a))) then
        return false
      end
    end
    return true
  end

  local function launch_point(x, y, w)
    local r = 0
    while r <= REACH do
      local step = (r == 0) and 360 or math.max(15, math.floor(360 / (r / 2)))
      local deg = 0
      while deg < 360 do
        local a = deg * math.pi / 180
        local tx, ty = x + (r * wa.math.cos(a)), y + (r * wa.math.sin(a))
        if clear(tx, ty) then
          local hit = wa.land.trace(tx, ty, w.x, w.y)
          if not hit or not hit.hit then return tx, ty end
        end
        deg = deg + step
      end
      r = r + RING
    end
    return w.x, w.y
  end

  fires.old_woman = function(fire)
    local w = fire.worm
    local x, y = launch_point(fire.x, fire.y, w)
    wa.weapons.launch({ weapon = "px.old_woman_launcher", owner = w,
      x = x, y = y, vx = fire.vx, vy = fire.vy, missile = { fuse = 5000 } })
  end
end
