-- Highlander: Javelin. Split from rules.lua by tools/split_highlander.py.
local shared = require("lib/shared")
local current_worm = shared.current_worm
local fires = shared.fires
local trunc = shared.trunc
local turrets = require("lib/turret")

-- ---------------------------------------------------------------- Javelin

do
  local speed = {}
  -- Pre keeps the incoming speed even when this frame's stock collision
  -- destroys the missile. Post keeps acceleration for the following frame.
  wa.on.missile_frame(function(m)
    if m.weapon == "px.javelin" then speed[m.id] = { m.vx, m.vy, uid = m.uid } end
  end)

  -- How the part of the stamp inside the land fades: over 3 pixels from the
  -- spear's outline, its colour mixed with the earth's. Tuned by eye in game.
  local JAVELIN_BURIED = { soften = 3, blend = "mix" }

  local function trunc(n) return n < 0 and math.ceil(n) or math.floor(n) end
  local function orientation(vx, vy)
    if vx == 0 then return vy > 0 and 16 or 0 end
    if vy == 0 then return vx > 0 and 8 or 24 end
    -- PX uses ratio bins, not evenly spaced atan2 angles.
    if vx > 0 and vy < 0 then return math.min(trunc(3 * vx / -vy), 7) end
    if vx > 0 then return math.min(trunc(8 + 3 * vy / vx), 15) end
    if vy > 0 then return math.min(trunc(16 + 3 * -vx / vy), 23) end
    return math.min(trunc(24 + 3 * -vy / -vx), 31)
  end
  local function within(o, x, y, r)
    return o and math.abs(x - o.x) < r and math.abs(y - o.y) < r
  end
  fires.javelin = function(ev)
    local v = ev.missile and speed[ev.missile]
    if ev.missile then speed[ev.missile] = nil end
    local vx, vy = v and v[1] or 0, v and v[2] or 0
    local target
    -- The circle encloses PX's strict 20px square. Keep native traversal
    -- order, including the shooter; PX stops at the first eligible object.
    for _, o in ipairs(wa.world.electrical_nearby(ev.x, ev.y, 29, false)) do
      if (o.kind == "worm" or o.kind == "mine" or o.kind == "crate" or o.kind == "oil")
        and within(o, ev.x, ev.y, 20) then target = o; break end
    end
    if not target then
      local sentry = turrets.projectile_target(ev.x, ev.y)
      if sentry and turrets.projectile_hit(sentry, 20, vx / 4, vy / 4, v and v.uid) then return end
    end
    if not target then
      local active = current_worm()
      if within(active, ev.x, ev.y, 25) then target = active end
    end
    if target then
      target.vx, target.vy = vx / 4, vy / 4
      if target.kind == "worm" then target:hurt(20)
      else target:hit(20, vx / 2, vy / 2, "projectile") end
      return
    end
    -- Centred on the impact, as PX's, so its front half lies in the land:
    -- that half fades into the earth (the engine's buried stamp) instead of
    -- being drawn over it, and the javelin looks stuck.
    wa.land.stamp{
      sprite = "sprites/javelin/stamp", frame = orientation(vx, vy), x = ev.x, y = ev.y,
      buried = JAVELIN_BURIED,
    }
    -- PX plays it unplaced. On the turn's worm: an explosion's ev.worm is the
    -- missile's owner, which need not be a worm and has no sound of its own.
    local shooter = current_worm()
    if shooter then wa.sound.play(shooter, "sounds/javelin_impact.wav") end
  end
end
