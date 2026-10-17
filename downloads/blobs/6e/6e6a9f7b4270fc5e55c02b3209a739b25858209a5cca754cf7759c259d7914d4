-- Highlander: Ferret (PX weapon_ferrets: ferret_s.txt, rafa``2's CFerret).
local shared = require("lib/shared")
local fires = shared.fires

-- Thrown, a Ferret falls until the land is 3 pixels under it, then follows
-- the terrain's outline and never falls off it: PX's square contour tracing,
-- 3-pixel steps, up to 12 traced a frame and 2 walked. It explodes on a worm
-- (the turn's worm is spared for its first 60 frames), on an oil drum, at the
-- water, or when its trace finds no land 4 steps running. It flicks mines
-- and Bowling Balls up (PX's ball is a mine) and walks on. At most 10 walk:
-- a new one makes the oldest vanish. PX's IsMoving says no, so WA doesn't
-- wait for a Ferret, and Ferrets walk on through later turns.
local STEP = 3           -- frt_maxdist
local MAX_FAILS = 4         -- frt_maxfails
local MAX_OPS = 12          -- frt_maxoper
local GRACE = 60            -- frt_framesdam
local TURN_EVERY = 6        -- frt_pixrotat: steps between turns of the sprite
local MAX_ALIVE = 10        -- frt_maxfrtalw
-- Not PX's: a Ferret goes off by itself 15 seconds after it was placed,
-- if nothing set it off before (750 of WA's 50 frames a second).
local FUSE = 15 * 50
-- It touches the land with WA's missile shape, the Skunk's (shape =
-- "missile", a:fits). PX draws its 64-pixel frame centred with the feet 16
-- below the centre: the body is drawn this far from the traced point, away
-- from the land, so the feet meet it.
local LIFT = 13
-- What it runs into is its body: 8 pixels about the body's centre.
local BODY = 8
local SCALE = 0.95          -- frt_sprscale
local DEPTH = wa.depth.OBJECTS       -- in front of the terrain, as the Bowling Ball
local WALK = "sprites/ferret/walk"
local FRAMES = 10
local SOUND = "sounds/ferret/walk.wav"
-- The scheme record's explosion (ExplodeAt): damage 100, blast 50.
local BOOM = { damage = 100, id = 50 }
-- A worm it runs into is thrown first (SpX = TurnSide, SpY = -5), a mine or a
-- ball flicked (SpX = TurnSide, SpY = -7).
local WORM_UP, MINE_UP = -5, -7

local UP, RIGHT, DOWN, LEFT = 1, 2, 4, 8
-- frt_moveto: from where it looks, a turn left or right is a step and a new
-- direction to look in.
local MOVES = {
  [DOWN] = { [LEFT] = { 1, 0, RIGHT }, [RIGHT] = { -1, 0, LEFT } },
  [UP] = { [LEFT] = { -1, 0, LEFT }, [RIGHT] = { 1, 0, RIGHT } },
  [LEFT] = { [LEFT] = { 0, 1, DOWN }, [RIGHT] = { 0, -1, UP } },
  [RIGHT] = { [LEFT] = { 0, -1, UP }, [RIGHT] = { 0, 1, DOWN } },
}

local alive = {} -- the Ferrets walking, oldest first
-- WA places a Ferret at its worm, where its circle overlaps the ground:
-- traced from inside the land, it would turn on the spot for ever. It rises
-- until its circle is clear of the land, at most this far, and walks from
-- the surface.
local MAX_RISE = 64

local function land_at(f, x, y)
  return not f.a:fits(x, y)
end

local function rise_clear(f)
  for _ = 1, MAX_RISE do
    if not land_at(f, f.x, f.y) then return end
    f.y = f.y - 1
  end
end

local function move(f, dir)
  local m = MOVES[f.looking][dir]
  f.ax, f.ay, f.looking = f.ax + m[1] * STEP, f.ay + m[2] * STEP, m[3]
end

-- frt_square_tracing: from the last outline point, turn towards the land
-- while there is land, away from it while there is none, adding each new
-- land point to the outline to walk.
local function trace(f)
  f.ax, f.ay = f.px, f.py
  f.looking = f.looking_bk
  while true do
    if f.ops <= 0 then
      f.tracing, f.walking, f.fails, f.ops = false, true, 0, MAX_OPS
      return
    end
    if f.fails >= MAX_FAILS then
      f.tracing, f.walking, f.boom, f.fails, f.why = false, false, true, 0, "a dead end"
      return
    end
    if land_at(f, f.ax, f.ay) then
      f.fails = 0
      if f.ax ~= f.px or f.ay ~= f.py then
        f.looking_bk = f.looking
        f.px, f.py = f.ax, f.ay
        f.outline[#f.outline + 1] = { f.ax, f.ay }
      end
      move(f, f.side < 0 and RIGHT or LEFT)
    else
      f.fails = f.fails + 1
      move(f, f.side < 0 and LEFT or RIGHT)
    end
    f.ops = f.ops - 1
  end
end

-- Its body's centre, LIFT from the traced point along the land's normal.
local function body(f, x, y)
  return x + (f.ux * LIFT), y + (f.uy * LIFT)
end

-- frt_checkinteract, at a point of its way: what its body touches.
local function interact(f, x, y)
  x, y = body(f, x, y)
  local _, obj = wa.world.collides({ x = x, y = y, radius = BODY, with = { "worms", "mines", "oil" } })
  if obj then
    if obj.kind == "worm" then
      local current = shared.current_worm()
      if f.grace > 0 and current and current.id == obj.id then return end
      obj.vx, obj.vy = f.side, WORM_UP
      f.boom, f.walking, f.tracing, f.why = true, false, false, "a worm"
    elseif obj.kind == "oil" then
      f.boom, f.walking, f.tracing, f.why = true, false, false, "an oil drum"
    elseif obj.kind == "mine" then
      obj.vx, obj.vy = f.side, MINE_UP
    end
  end
  if shared.kick_bowling_balls then
    shared.kick_bowling_balls(x, y, BODY, f.side, MINE_UP)
  end
end

-- frt_calc_rotation: every few steps, the Ferret turns to the way walked
-- since its last turn, its up the land's normal (from the steps, one square
-- root: the same on every machine; the angle is only drawn).
local function turn(f, x, y)
  f.steps = f.steps + 1
  if f.steps % TURN_EVERY ~= 0 then return end
  local dx, dy = (x - f.rx), (y - f.ry)
  local len = math.sqrt(dx * dx + dy * dy)
  if len > 0 then
    f.ux, f.uy = f.side * dy / len, -f.side * dx / len
  end
  f.angle = wa.math.atan(dx, -dy) - math.pi / 2 * f.side
  f.rx, f.ry = x, y
end

-- frt_perform_trace: one step along the outline; at its end, trace on.
local function walk(f)
  if f.boom then return false end
  local p = f.outline[f.next]
  if not p then
    f.walking, f.tracing = false, true
    f.outline, f.next = {}, 1
    f.x, f.y = f.lx, f.ly
    return false
  end
  f.next = f.next + 1
  f.x, f.y = p[1], p[2]
  interact(f, f.x, f.y)
  turn(f, f.x, f.y)
  f.lx, f.ly = f.x, f.y
  return true
end

-- Before it lands, it falls (or flies as thrown), a pixel at a time, and
-- stops where its shape would touch the land.
local function fly(f)
  f.vy = f.vy + wa.world.gravity()
  local n = math.min(64, math.max(math.abs(f.vx), math.abs(f.vy)) // 1 + 1)
  local sx, sy = f.vx / n, f.vy / n
  for _ = 1, n do
    if land_at(f, f.x + sx, f.y + sy) then
      f.vx, f.vy = 0, 0
      return
    end
    f.x, f.y = f.x + sx, f.y + sy
  end
end

-- frt_firstcollision: land 3 pixels under it plants it, and its outline
-- starts there.
local function try_plant(f, a)
  local x, y = f.x, f.y + STEP
  if land_at(f, x, y) then
    f.planted, f.tracing = true, true
    f.px, f.py, f.ax, f.ay, f.lx, f.ly, f.rx, f.ry = x, y, x, y, x, y, x, y
    wa.sound.play(a, SOUND)
  end
  interact(f, f.x, f.y)
end

local function forget(f)
  for i, other in ipairs(alive) do
    if other == f then table.remove(alive, i); return end
  end
end

local function explode(f, a)
  wa.log(string.format("Ferret explodes on %s at (%d, %d), %d frames after it was placed",
    f.why or "?", f.x // 1, f.y // 1, f.age))
  f.dead = true
  forget(f)
  a:explode(BOOM)
  if a.id ~= 0 then a:despawn() end
end

local function frame(f, a)
  if f.dead then return end
  f.age = f.age + 1
  if f.gone then
    f.dead = true
    a:despawn()
    return
  end
  if not f.planted then
    fly(f)
    try_plant(f, a)
  end
  if f.y >= wa.world.water() - STEP then f.boom, f.why = true, f.why or "the water" end
  if f.age >= FUSE then f.boom, f.why = true, f.why or "its 15 s fuse" end
  if f.boom then
    explode(f, a)
    return
  end
  if f.tracing then trace(f) end
  if f.walking and walk(f) then walk(f) end
  if f.boom then
    explode(f, a)
    return
  end
  f.grace = f.grace - 1
  local bx, by = f.x, f.y
  if f.planted then bx, by = body(f, f.x, f.y) end
  a.x, a.y, a.vx, a.vy = bx, by, 0, 0
  a:frame((f.steps // 2) % FRAMES)
  a:gfx({ angle = math.deg(f.angle) % 360, depth = DEPTH, scale = SCALE })
end

fires.ferret = function(fire)
  local worm = fire.worm
  -- PX lets at most 10 walk: the oldest goes, without a bang.
  while #alive >= MAX_ALIVE do
    local oldest = table.remove(alive, 1)
    oldest.gone = true
  end
  local f = {
    x = fire.x, y = fire.y, vx = fire.vx, vy = fire.vy, ux = 0, uy = -1,
    side = (worm.facing or 1) < 0 and -1 or 1,
    looking = DOWN, looking_bk = DOWN, ops = MAX_OPS, fails = 0,
    outline = {}, next = 1, steps = 0, angle = 0, grace = GRACE, age = 0,
    planted = false, tracing = false, walking = false, boom = false,
  }
  alive[#alive + 1] = f
  local a = wa.actors.spawn({
    sprite = WALK, x = f.x, y = f.y, gravity = false, collide = false, owner = worm,
    shape = "missile", on = function(actor) frame(f, actor) end,
  })
  f.a = a
  rise_clear(f)
  a.facing = f.side
  a:frame(0)
end

shared.ferrets = alive
