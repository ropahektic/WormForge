-- Highlander's Electromagnet, on the Baseball Bat slot (PX weapon_magnet:
-- magnet.txt's CMagnet). Placed, it stays: for four of its owner's turns
-- its field pushes (repel) or pulls (attract) WA's own mines and missiles
-- and the Bowling Balls, and it triggers the mines it catches. The objects
-- it moves stay WA's, so their own flight, collisions and fuses run. It is
-- an object in the oil-drum layer: blasts, guns and fires hit it, and at
-- 0 health it explodes.
-- Squares by multiplication: `^` calls the C runtime's pow, whose last bit
-- may differ between machines.
local function sq(v) return v * v end

local shared = require("lib/shared")
local RANGE2 = 170 * 170           -- MaxRange
local SYNC2 = RANGE2 // 4          -- MaxSyncRange: MaxRange * 0.25
local FORCE, COEFFICIENT = 12, 14000
local ATTRACT_OFFSET, REPEL_OFFSET = 10 * 10, 5 * 5
local TURNS, HEALTH, LOW_HEALTH = 4, 80, 30
local BOOM = { id = 100, damage = 50, below = false } -- ExplosionBlast, ExplosionDamage
local BALL_SHARE = 0.25            -- a Bowling Ball gets a quarter of the force
-- Not PX's: PX explodes the missiles still in a field 300 frames after the
-- turn ended, so none circles a magnet for ever. With no way to burst a
-- stock missile from Lua, the field lets go of them instead, and each ends
-- on its own fuse or impact. It lets go of the mines then too: a dud mine
-- (the scheme's) never goes off, and held against a magnet it never comes
-- to rest either, so WA would wait for it and the turn would never end.
local RELEASE_AFTER = 300
-- The grenades that go off only once they stop slow down in a field (PX
-- damps its Hellish Hand-Grenade there by 0.985 a frame).
local DAMPED = { ["px.hellish_hand_grenade"] = true }
local DAMPING = 0.985
-- Its body: PX's magnet is a mine (CMine) and moves as one. Here it is a
-- circle traced against the land (the art is 26 pixels across), bouncing
-- a little and rubbing along what it lands on until it rests.
local RADIUS = 8
local BOUNCE, FRICTION = 0.3, 0.3
local REST = (1 / 8)                -- slower on contact than 1/8 pixel a frame: at rest
local SINK = (1 / 2)                -- in the water it sinks half a pixel a frame
local SUNK = 200                -- and is gone this far below the surface
local BODY = "sprites/electromagnet/"
local magnets = {}
local polarity = {} -- worm id -> +1 repel, -1 attract (PX's MagnetPolarity)
local plus_held = {} -- worm id -> the synchronized + key last frame

local function trunc(x) return x >= 0 and math.floor(x) or -math.floor(-x) end

-- PX's CalculateMagneticForce at (x, y), pixels: the push in pixels/frame,
-- or nil out of range or discharged. Distances in pixels, as PX's.
local function force(m, x, y, scale)
  if m.turns <= 0 or not m.alive then return nil end
  local dx, dy = (x - m.x), (y - m.y)
  local r2 = dx * dx + dy * dy + (m.pol < 0 and ATTRACT_OFFSET or REPEL_OFFSET)
  if r2 > RANGE2 then return nil end
  local strength = math.min(FORCE, COEFFICIENT / r2) * (scale or 1) * m.pol
  local r = math.sqrt(r2)
  return (dx / r * strength), (dy / r * strength)
end

-- PX's TriggerMine: a random-fuse mine gets 1 to 5 seconds; an attracting
-- magnet sets it close to the longest fuse among the mines it already holds,
-- so they go off together. Then the mine is armed.
local function trigger_mine(m, mine, mines)
  local fuse = mine.fuse
  if fuse < 0 then
    fuse = wa.random(1000, 4999)
    if m.pol < 0 then
      local longest = 1000
      for _, other in ipairs(mines) do
        if other.id ~= mine.id then
          local dx, dy = (other.x - m.x), (other.y - m.y)
          if dx * dx + dy * dy < SYNC2 then longest = math.max(longest, other.fuse) end
        end
      end
      if longest > 1000 then fuse = longest + wa.random(-200, 199) end
    end
  end
  mine:arm(fuse)
end

-- PX's DoMagneticField: `scale` 1 pushes, 0 only triggers mines and wakes
-- balls (a discharging or exploding magnet). A moving magnet wakes what it
-- reaches, as PX's.
local function field(m, scale, wake)
  wake = wake or m.vx ~= 0 or m.vy ~= 0
  if not (m.ended_at and m.age - m.ended_at > RELEASE_AFTER) then
    local mines = wa.mines.all()
    for _, mine in ipairs(mines) do
      local dx, dy = force(m, mine.x, mine.y, scale)
      if dx then
        trigger_mine(m, mine, mines)
        if dx ~= 0 or dy ~= 0 then mine:impulse(dx, dy) end
      end
    end
    for _, missile in ipairs(wa.missiles.all()) do
      local dx, dy = force(m, missile.x, missile.y, scale)
      if dx and (dx ~= 0 or dy ~= 0) then missile:impulse(dx, dy) end
    end
  end
  if shared.magnet_bowling_balls then
    shared.magnet_bowling_balls(function(x, y) return force(m, x, y, scale * BALL_SHARE) end, wake)
  end
end

local function sprite(m)
  local name = m.pol < 0 and "magnet" or "magnet2"
  if m.health <= LOW_HEALTH then name = name .. "_damaged" end
  return BODY .. name .. ".png"
end

local function remove(m)
  m.alive = false
  for i, other in ipairs(magnets) do
    if other == m then table.remove(magnets, i); break end
  end
end

local function discharge(m)
  if m.turns <= 0 then return end
  field(m, 0, true)
  m.turns = 0
end

-- Where a body inside the land may go, nearest first: in rings a pixel
-- apart, out to UNSTICK_REACH, below and to the sides before above, as
-- gravity would take it. Placed under a ceiling, the magnet's circle
-- overlaps the rock above the worm: it belongs in the tunnel below, not on
-- top of the rock.
local UNSTICK_REACH = 24
local UNSTICK = {}
for d = 1, UNSTICK_REACH do
  for _, v in ipairs({ { 0, 1 }, { -1, 1 }, { 1, 1 }, { -1, 0 }, { 1, 0 }, { -1, -1 }, { 1, -1 }, { 0, -1 } }) do
    UNSTICK[#UNSTICK + 1] = { v[1] * d, v[2] * d }
  end
end

-- The nearest place out of the land, or nil: then it stays put, as PX's
-- magnet (a mine) does, rather than tunnel through the land.
local function unstick(m)
  for _, o in ipairs(UNSTICK) do
    local x, y = m.x + o[1], m.y + o[2]
    if not wa.world.collides({ x = x, y = y, radius = RADIUS, with = { "terrain" } }) then
      return x, y
    end
  end
end

-- One frame of the body: gravity, then the move traced against the land.
local function move(m)
  local vx, vy = m.vx, m.vy + wa.world.gravity()
  local function trace()
    return wa.world.trace({ x0 = m.x, y0 = m.y, x1 = m.x + vx, y1 = m.y + vy, radius = RADIUS })
  end
  local res = trace()
  if res and res.starts_solid then
    -- Inside the land (placed under a ceiling, or the land moved): out
    -- where the path comes free, else at the nearest free place.
    if res.left_x then
      m.x, m.y = res.left_x, res.left_y
    else
      local x, y = unstick(m)
      m.vx, m.vy = 0, 0
      if x then m.x, m.y = x, y end
      return
    end
    res = trace()
  end
  if res and res.hit then
    local spn = vx * res.nx + vy * res.ny
    local spt = vx * res.tx + vy * res.ty
    vx = vx - spn * res.nx * (1 + BOUNCE) - spt * res.tx * FRICTION
    vy = vy - spn * res.ny * (1 + BOUNCE) - spt * res.ty * FRICTION
    if math.abs(vx) < REST and math.abs(vy) < REST then vx, vy = 0, 0 end
    m.x, m.y = res.x, res.y
  else
    m.x, m.y = m.x + vx, m.y + vy
  end
  m.vx, m.vy = vx, vy
end

local function frame(m, a)
  m.age = m.age + 1
  if m.y >= wa.world.water() then
    -- In the water: it stops working and sinks out of sight.
    discharge(m)
    m.vx, m.vy, m.y = 0, 0, m.y + SINK
    if m.y >= wa.world.water() + SUNK then
      remove(m)
      a:despawn()
      return
    end
  else
    move(m)
  end
  a.x, a.y, a.vx, a.vy = m.x, m.y, 0, 0
  if m.health <= 0 then
    field(m, 0, true)
    remove(m)
    a.y = m.y - 20
    a:explode(BOOM)
    a:despawn()
    return
  end
  if m.turns > 0 then
    field(m, 1)
    m.spark = (m.spark + 0.02) % 1.4
  end
  -- PX's UpdateRotation: spun by its speed, at most half a radian a frame.
  local speed = math.sqrt(sq(m.vx) + sq(m.vy))
  m.angle = m.angle + (m.vx < 0 and -1 or 1) * math.min(0.5, 0.04 * speed)
  local s = sprite(m)
  if s ~= m.sprite then a:look(s); m.sprite = s end
  a:gfx({ angle = math.deg(m.angle + math.pi) % 360, depth = wa.depth.OBJECTS })
end

-- PX's TakeExplosionDamage (less the further off: dmg * (1 - (d * d) / (4 (dmg * dmg))))
-- and TakeDamage (type 10, the Battle Axe's, takes that share of its health).
local function hit(m, a, event)
  local damage = math.max(0, event.damage or 0)
  if event.kind == "blast" and damage > 0 then
    local dx, dy = (a.x - (event.x or a.x)), (a.y - (event.y or a.y))
    damage = trunc((1 - (dx * dx + dy * dy) / (damage * damage * 4)) * damage)
  elseif event.hit_kind == 10 then
    damage = trunc(m.health * damage / 100)
  end
  if damage > 0 then m.health = m.health - damage end
  m.vx = m.vx + (event.vx or 0)
  m.vy = m.vy + (event.vy or 0)
end

-- CWorm::FireFinal's Electromagnet: dropped where it is fired (at the
-- worm), nudged the way the worm faces (0.3) and up (0.15), in the worm's
-- mode. A script firing it (wa.weapons.fire, the stress test) may choose
-- the mode with `polarity` (1 repel, -1 attract).
shared.fires.electromagnet = function(fire)
  local worm = fire.worm
  local pol = (fire.polarity == 1 or fire.polarity == -1) and fire.polarity or polarity[worm.id] or 1
  local m = { pol = pol, turns = TURNS, health = HEALTH, age = 0, angle = 0, spark = 0, alive = true,
    x = fire.x or worm.x, y = fire.y or worm.y,
    vx = worm.vx + (worm.facing < 0 and -1 or 1) * 0.3,
    vy = worm.vy - 0.15 }
  local a = wa.actors.spawn({
    sprite = BODY .. (pol < 0 and "magnet.png" or "magnet2.png"),
    x = m.x, y = m.y, gravity = false, collide = false, owner = worm,
    as_object = true, on = {
      frame = function(actor) frame(m, actor) end,
      hit = function(actor, event) hit(m, actor, event) end,
    },
  })
  m.a, m.team = a, worm.team
  m.sprite = sprite(m)
  magnets[#magnets + 1] = m
end

-- PX's OnTurnBegin: each start of its owner's team's turn uses one up; the
-- last wakes and triggers what is in range.
wa.on.turn_start(function(event)
  local team = event.worm and event.worm.team
  for _, m in ipairs(magnets) do
    m.ended_at = nil
    if m.alive and m.team == team and m.turns > 0 then
      if m.turns == 1 then discharge(m) else m.turns = m.turns - 1 end
    end
  end
end)

wa.on.turn_end(function()
  for _, m in ipairs(magnets) do m.ended_at = m.age end
end)

-- The Hellish Hand-Grenade slows down in a live field.
wa.on.missile_frame(function(missile)
  if missile.phase ~= "pre" or not DAMPED[missile.weapon] then return end
  for _, m in ipairs(magnets) do
    if force(m, missile.x, missile.y) then
      missile.vx, missile.vy = missile.vx * DAMPING, missile.vy * DAMPING
      return
    end
  end
end)

-- PX switches with WA's bounce keys; here the synchronized + key toggles
-- the turn's worm between repel and attract, kept per worm. The engine
-- flips the worm's red/blue magnet by the same rule (worm_sprites_toggle in
-- the claim), so the two stay in step.
wa.on.worm_message(function(worm)
  local id = worm.id
  local pressed = worm.turn and worm.weapon == "px.electromagnet" and wa.world.keys().plus_key or false
  if pressed and not plus_held[id] then polarity[id] = -(polarity[id] or 1) end
  plus_held[id] = pressed
end, { msgs = { wa.msg.FRAME_FINISH } })

-- The panel's icon shows the turn worm's mode, as the magnet it drops will
-- be: red attracting (icon 0, PX's), blue repelling (icon 1). Only the
-- panel changes, so this runs in the HUD hook, every frame; showing the
-- icon already shown does nothing.
local icon_shown = true
local function show_mode_icon(worm)
  if not (icon_shown and wa.weapons.panel_icon and shared.owns("baseball_bat")) then return end
  local attract = worm and (polarity[worm.id] or 1) < 0
  local ok, err = pcall(wa.weapons.panel_icon, "px.electromagnet", attract and 0 or 1)
  if not ok then
    icon_shown = false -- no icons of ours on the slot: say so once, then leave it
    wa.log("electromagnet: mode icon: " .. tostring(err))
  end
end

if wa.on.hud then
  wa.on.hud(function()
    local worm = shared.current_worm()
    show_mode_icon(worm)
    if worm and worm.weapon == "px.electromagnet" then
      wa.hud.line((polarity[worm.id] or 1) < 0 and "Electromagnet: ATTRACT mode (+ to repel)"
        or "Electromagnet: REPEL mode (+ to attract)")
    end
  end)
end

if wa.on.draw and wa.draw.quad then
  -- Refill one spec; the engine copies it before the next submission.
  local QUAD = { blend = "add", points = { {0, 0}, {0, 0}, {0, 0}, {0, 0} } }
  local RING_IN, RING_OUT, SPARKS = BODY .. "ring_in.png", BODY .. "ring_out.png", BODY .. "magnetsparks"
  local function square(sprite, frame, color, depth, x, y, h, angle)
    QUAD.sprite, QUAD.frame, QUAD.color, QUAD.depth = sprite, frame, color, depth
    local c, s = wa.math.cos(angle) * h, wa.math.sin(angle) * h
    local p = QUAD.points
    p[1][1], p[1][2] = x - c + s, y - s - c
    p[2][1], p[2][2] = x + c + s, y + s - c
    p[3][1], p[3][2] = x + c - s, y + s + c
    p[4][1], p[4][2] = x - c - s, y - s + c
    wa.draw.quad(QUAD)
  end
  wa.on.draw(function()
    for _, m in ipairs(magnets) do
      if m.alive and m.turns > 0 then
        local x, y = m.x, m.y
        local ring = m.pol < 0 and RING_IN or RING_OUT
        -- PX starts a ring every 65 frames, 5 to 120 pixels, 0.8 a frame:
        -- outwards repelling, inwards attracting, fading as it grows.
        for phase = 0, 2 do
          local t = (m.age - phase * 65) % 195
          local radius = m.pol < 0 and 120 - 0.8 * t or 5 + 0.8 * t
          if radius >= 5 and radius <= 120 then
            local alpha = math.max(0, math.min(255, math.floor((120 - radius) * 255 / 120)))
            square(ring, nil, (alpha << 24) | 0xFFFFFF, wa.depth.OBJECTS + 1, x, y, radius, 0)
          end
        end
        if m.spark <= 1 then
          square(SPARKS, math.min(9, math.floor(m.spark * 10)), nil, wa.depth.OBJECTS - 1, x, y, 13, m.angle)
        end
      end
    end
  end)
end

shared.magnet_force = force -- for the Highlander mock
