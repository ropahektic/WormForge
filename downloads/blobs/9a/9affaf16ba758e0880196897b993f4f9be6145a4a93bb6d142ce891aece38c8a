-- Highlander: Kamikaze Rocket (PX weapon_kamikaze_rocket: KamikazeRocket.txt,
-- by Pablo, updated by rafa``2), on the Suicide Bomber slot as PX's
-- Highlander scheme has it. Its record is WA's Kamikaze's: WA's own
-- Kamikaze flies the worm, digs its way and hits the worms it passes. As PX
-- does, the pack sets where the worm is before each of WA's frames: a rocket
-- at 8 px a frame from the worm along its aim, turned 9 degrees a frame by
-- left and right, digging, for 4 seconds; then it blows up (damage 30,
-- blast 100) and the worm goes into the water. Fired only with Ctrl held
-- (Ctrl + Space); without, nothing is used.
local shared = require("lib/shared")
local SPEED = 8             -- px a frame (kRocketSpeed)
local TURN = 0.05           -- PX angle units (times pi) a frame
local LIFE = 4000           -- ms, less 20 a frame: 200 frames
local HOLE = 8              -- MakeHole(8) each frame
local BOOM = { damage = 30, id = 100 }
local HINT_FRAMES = 150
local STALE = 200           -- other worms' frames without one of its own
local FLY = "sprites/kamikaze_rocket/fly"
local FLY_FRAMES, FLY_HALF_W, FLY_HALF_H = 5, 30, 40
local DEPTH = wa.depth.FRONT

local rockets = {} -- worm id -> its rocket
local armed = {}   -- worm id -> fired with Ctrl, its flight not yet begun
local hint = 0     -- frames left of the "hold Ctrl" line

-- PX's FireFinal: from the worm, at its aim (FireAngle, 0 down to 1 up)
-- on its side.
local function launch(worm)
  rockets[worm.id] = {
    x = worm.x, y = worm.y, angle = worm.aim * worm.facing, life = LIFE, age = 0,
    facing = worm.facing, stale = 0,
  }
  worm.visible = false
end

local function finish(worm)
  rockets[worm.id] = nil
  worm.visible = true
end

-- One of WA's frames, before WA's Kamikaze runs it.
local function fly(worm, r)
  local keys = wa.world.keys()
  if keys.left then r.angle = r.angle + TURN end
  if keys.right then r.angle = r.angle - TURN end
  local a = r.angle * math.pi
  r.x = r.x + (SPEED * wa.math.sin(a))
  r.y = r.y + (SPEED * wa.math.cos(a))
  worm.x, worm.y = r.x, r.y
  r.age = r.age + 1
  r.life = r.life - 20
  if r.life <= 0 then
    -- The blast, then the worm out of the map into the water, where WA's
    -- Kamikaze ends it (0x85, drowning).
    local boom = wa.actors.spawn({
      sprite = false, x = r.x, y = r.y, gravity = false, collide = false, owner = worm,
      on = function() end,
    })
    boom:explode(BOOM)
    boom:despawn()
    worm.x, worm.y = -2500, wa.world.water() + 1000
    r.done = true
    return
  end
  wa.land.cut({ x = r.x, y = r.y, shape = "circle", radius = HOLE })
end

wa.on.worm_message(function(worm, msg)
  if msg == wa.msg.FIRE_WEAPON then
    if worm.weapon ~= "px.kamikaze_rocket" then return end
    if not wa.world.keys().ctrl then
      hint = HINT_FRAMES
      return "eat"
    end
    armed[worm.id] = true
    return
  end
  -- FRAME_FINISH
  if worm.turn and hint > 0 then hint = hint - 1 end
  -- Leaving the map sideways, WA's Kamikaze blows the worm up and frees it:
  -- its frames stop, so its rocket goes once the other worms have had a few.
  for id, other in pairs(rockets) do
    if id ~= worm.id then
      other.stale = other.stale + 1
      if other.stale > STALE then rockets[id] = nil end
    end
  end
  local r = rockets[worm.id]
  if r then r.stale = 0 end
  if worm.state == "kamikaze" then
    if not r and armed[worm.id] then
      armed[worm.id] = nil
      launch(worm)
      r = rockets[worm.id]
    end
    if r and not r.done then fly(worm, r) end
  elseif r then
    finish(worm)
  end
end, { msgs = { wa.msg.FIRE_WEAPON, wa.msg.FRAME_FINISH } })

-- A worm armed but never flying (its fire cancelled) is not armed next turn.
wa.on.turn_start(function()
  armed = {}
end)

if wa.on.hud then
  wa.on.hud(function()
    for _, id in ipairs(wa.sorted(rockets)) do
      local r = rockets[id]
      if not r.done then
        wa.hud.line(string.format("Kamikaze Rocket: %.2f", math.max(0, r.life) / 1000))
      end
    end
    if hint > 0 then
      wa.hud.line("Hold Ctrl and press Space to use the Kamikaze Rocket.")
    end
  end)
end

-- The rocket, drawn as PX's: its art faces down, turned to its heading and
-- mirrored for a worm facing right.
if wa.on.draw and wa.draw.quad then
  local QUAD = { sprite = FLY, blend = "alpha", color = 0xFFFFFFFF, depth = DEPTH,
    points = { { 0, 0 }, { 0, 0 }, { 0, 0 }, { 0, 0 } } }
  local CORNERS = { { -1, -1 }, { 1, -1 }, { 1, 1 }, { -1, 1 } }
  wa.on.draw(function()
    for _, id in ipairs(wa.sorted(rockets)) do
      local r = rockets[id]
      if not r.done then
        local t = -r.angle * math.pi
        local c, s = wa.math.cos(t), wa.math.sin(t)
        local flip = r.facing > 0 and -1 or 1
        QUAD.frame = (r.age // 10) % FLY_FRAMES
        for i, k in ipairs(CORNERS) do
          local dx, dy = k[1] * flip * FLY_HALF_W, k[2] * FLY_HALF_H
          QUAD.points[i][1] = r.x + (dx * c - dy * s)
          QUAD.points[i][2] = r.y + (dx * s + dy * c)
        end
        wa.draw.quad(QUAD)
      end
    end
  end)
end

shared.kamikaze_rockets = rockets -- for the Highlander mock
