-- Highlander: Bowling Ball Strike (PX weapon_bowlingball: bbstrike.txt and
-- bowlingball.txt's CBowlingBall).
local shared = require("lib/shared")
local fires = shared.fires

-- The strike: PX's plane drops three balls 48 pixels apart from 128 above
-- the map, moving 5 a frame the way it flies. Here they drop together, the
-- way WA's strike arrow points: the sign of the shot's x speed (ev.vx), which
-- PX's PxAirstrike reads, from the left unless the arrow keys turned it. As
-- PX's plane drops them early by how far they drift on the way down (its
-- SpeedCompensation), the drop line is set back by the middle ball's own
-- drift down to the click, so it lands on the click. PX's plane is not drawn.
local STRIKE_BALLS = 3
local STRIKE_SPACING = 48
local STRIKE_SPEED = 5
local STRIKE_Y = -128         -- PX's PlaneAppearYOffset

-- PX's CBowlingBall numbers.
local RADIUS = 16             -- MakeCircleMask(16): the ball's art is 32 across
local BOUNCE, FRICTION = 0.03, 0.02
local INERTIA_X, INERTIA_Y = 0.8, 0.4
local LOW_SPEED = 4.0         -- below this for LOW_FRAMES frames: "low speed"
local LOW_FRAMES = 100
local LOW_BOUNCE, LOW_FRICTION = 0.03, 0.03
local LOW_INERTIA_X, LOW_INERTIA_Y = 0.0, 0.0
local SLEEP_DISTANCE = 2      -- moved less than this over SLEEP_PERIOD frames: asleep
local SLEEP_PERIOD = 80
local FAST = 4.0              -- MinDamageSpeed: faster, it rolls through worms and hurts
local SPIN_X, SPIN_Y, MAX_SPIN = 0.06, 0.02, 0.6
local SHEET = "sprites/bowling_ball/ball.png"

-- PX's damage (ProcessBallOnOtherCollision): faster than FAST, whatever the
-- ball overlaps takes 5 at that speed up to 60 at 15 and more; crates and oil
-- drums 100. A worm then takes nothing more for 12 frames (PX's
-- DamageRecoverTime). Balls push each other apart (ProcessBallOnBallCollision)
-- by 0.6 * sqrt(speed), of which the pushed ball keeps 0.7 (GunForceMultiplier).
local MAX_DAMAGE_SPEED = 15.0
local MIN_DAMAGE, MAX_DAMAGE = 5.0, 60.0
local OBJECT_DAMAGE = 100
local DAMAGE_FORCE = 0.7      -- DamageForceMultiplier
local RECOVER_FRAMES = 12
local PUSH_SPEED = 4.0        -- MinPushSpeed
local PUSH_FORCE, PUSH_KEEP = 0.6, 0.7
local SOUND_CRUSH, SOUND_HIT = 33, 101
-- A ball counts as hitting what it touches: PX traces it with a smaller
-- mask than the 16-pixel circle it hits with, so it overlaps a drum or
-- crate it stops against; ours traces with the circle, which stops it a
-- touch away from them.
local TOUCH = 2

-- PX's Zap(0), the Lightning Strike's "overcharge": the ball wakes and is
-- thrown up, 5 to 10 a frame within 0.1 of straight up, and is electrified
-- for good (PX never counts its ZapTurnsRemaining down): awake and not slow,
-- its friction is negative, so it speeds up along what it rolls on. PX's
-- strike reaches it within its 12-pixel hit circle of the ball's 16.
-- What WA hits the ball with. It is in WA's object layer (`as_object`), as
-- PX's ball is in the oil drums' (SetLayerOverride(LAYER_OILDRUM)), so WA's
-- fires, guns and blasts reach it. As PX's Message: any hit wakes it, a
-- blast's push is taken whole (ExplosionForceMultiplier) and any other's,
-- a fire's among them, at 0.7 (GunForceMultiplier).
local BLAST_FORCE, GUN_FORCE = 1.0, 0.7
local ZAPPED_FRICTION = -0.05
local ZAP_REACH = 12

-- PX's electrified look (CBowlingBall::Render and UpdateZPlane), PX's own
-- art: its lightning glow, 0.3 to 0.4 of its 128 pixels across, added three
-- times in RGB(80, 110, 128); its 10-frame spark, turning with the ball,
-- played over 50 frames then paused 20 (SparkCycle, 0.02 a frame to 1.4);
-- and while awake a glow left behind every frame, 30 frames fading to
-- black, 0.3 to 0.5 across, drifting up to 0.3 a frame. Drawn where the
-- ball's sprite is: the glows behind the ball (a halo; PX draws them over
-- it, which washes the ball out to white), the spark in front. Our own on
-- top of PX's: the ball itself turns electric blue, darkened (its sprite's
-- tint) and given a blue sheen that follows its shading (sheen.png, the
-- ball in grey, added in front of it).
local GLOW_SHEET = "sprites/bowling_ball/glow.png"
local SPARK_SHEET = "sprites/bowling_ball/spark.png"
local SHEEN_SHEET = "sprites/bowling_ball/sheen.png"
local ZAPPED_TINT = 0x405980  -- the ball's colours times (0.25, 0.35, 0.5)
local SHEEN_COLOR = 0xFF3C96FF -- RGB(60, 150, 255), added
local GLOW_SIZE = 128
local SPARK_SIZE, SPARK_FRAMES = 60, 10
local SPARK_SPEED, SPARK_CYCLE = 0.02, 1.4
local ZAP_R, ZAP_G, ZAP_B = 80, 110, 128
local TRAIL_LIFE = 30
-- The ball is drawn this far below where its circle is, in pixels: at the
-- circle's own place it looked to float over the ground. In front of the
-- terrain (actors are behind it by default), behind the worms (0xD0000).
local SPRITE_DROP = 4
local LIFT = 0.5           -- half a pixel
local BALL_DEPTH = wa.depth.OBJECTS
local GLOW_DEPTH, SHEEN_DEPTH, SPARK_DEPTH = BALL_DEPTH + 1, BALL_DEPTH - 1, BALL_DEPTH - 2
-- ball flung that far off the map (it flies on, WA drawing its arrow at the
-- edge) is gone once its next move would leave that range.
local EDGE = 32000

-- What the ball rolls on: PX's DefaultColGroup, and without worms when fast
-- (NoWormsColGroup).
local SOLID = { "terrain", "worms", "crates", "oil" }
local SOLID_FAST = { "terrain", "crates", "oil" }

local function trunc(v) return v >= 0 and math.floor(v) or -math.floor(-v) end

-- The circles PX's masks give what the ball can hit (as wa.world.trace's).
local function target_radius(obj)
  if obj.kind == "worm" then return 6 end
  if obj.kind == "mine" then return 5 end
  return 9
end

local function sleep(b)
  if b.asleep then return end
  b.asleep, b.low = true, false
  b.sleep_x, b.sleep_y = b.x, b.y
  b.vx, b.vy, b.lvx, b.lvy = 0, 0, 0, 0
  b.rvx, b.rvy = 0, 0
end

-- PX's Wake: moving again, its timers restarted.
local function wake(b)
  if not b.asleep and not b.low then return end
  b.asleep, b.low = false, false
  b.low_timer, b.sleep_timer = 200, 200
  b.rec_x, b.rec_y = b.x, b.y
end

-- PX's UpdateRotation: spin from the ball's real motion, towards it.
local function spin(b)
  local rot = math.min(MAX_SPIN, SPIN_X * math.abs(b.rvx) + SPIN_Y * math.abs(b.rvy))
  if b.rvx < 0 then rot = -rot end
  b.rot = b.rot + rot
  while b.rot > math.pi do b.rot = b.rot - 2 * math.pi end
  while b.rot <= -math.pi do b.rot = b.rot + 2 * math.pi end
end

-- PX's PhysicsThink, a frame: the move traced with the ball's circle, a hit
-- turned into bounce along the surface's normal and friction along it, then
-- PX's inertia (a share of the speed's last change again), the low-speed
-- state and sleep. The ball's place is b.x, b.y; the actor only draws it.
-- Returns the speed the frame started with, which the hits below go by.
local function think(b)
  if b.asleep then
    -- No real speed asleep, as PX's: it stops turning too.
    b.x, b.y = b.sleep_x, b.sleep_y
    b.rvx, b.rvy = 0, 0
    return 0
  end
  local speed = math.sqrt(b.rvx * b.rvx + b.rvy * b.rvy)
  local vx2, vy2 = b.vx, b.vy + wa.world.gravity()
  local bounce, friction, ix, iy = BOUNCE, FRICTION, INERTIA_X, INERTIA_Y
  if b.low then
    bounce, friction, ix, iy = LOW_BOUNCE, LOW_FRICTION, LOW_INERTIA_X, LOW_INERTIA_Y
  elseif b.zapped then
    friction = ZAPPED_FRICTION
  end
  if vx2 == 0 and vy2 == 0 then vy2 = b.vy + 0.1 end
  local with = speed > FAST and SOLID_FAST or SOLID
  local x, y = b.x, b.y
  local dx, dy = vx2, vy2
  if math.abs(x + dx) > EDGE or math.abs(y + dy) > EDGE then
    b.gone = true
    return 0
  end
  local function trace_from(sx, sy, k)
    -- Eight moves backwards may not fit where one forward does: no trace.
    if math.abs(sx + k * dx) > EDGE or math.abs(sy + k * dy) > EDGE then return nil end
    return wa.world.trace({
      x0 = sx, y0 = sy, x1 = sx + k * dx, y1 = sy + k * dy, radius = RADIUS, with = with,
    })
  end
  local res = trace_from(x, y, 1)
  if res and res.starts_solid then
    -- Stuck in something (another ball can push it in): carry on from where
    -- the path comes free; else, as PX's unblocking, back out along the move
    -- eight times its length and come forward from there; else sleep where
    -- it is, as PX does.
    if not res.left_x then
      res = trace_from(x, y, -8)
      if not (res and res.left_x) then
        sleep(b)
        return 0
      end
    end
    x, y = res.left_x, res.left_y
    res = trace_from(x, y, 1)
  end
  if res and res.hit then
    local spt = vx2 * res.tx + vy2 * res.ty
    local spn = vx2 * res.nx + vy2 * res.ny
    b.vx = vx2 - spn * res.nx * (bounce + 1) - spt * res.tx * friction
    b.vy = vy2 - spn * res.ny * (bounce + 1) - spt * res.ty * friction
    x, y = res.x, res.y
    -- Rest half a pixel off the surface, as PX's ball does (it stops a
    -- step short, up to a pixel): touching it, a ball gliding along would
    -- hit it at once every frame and stand still at speed.
    local lx, ly = x + res.nx * LIFT, y + res.ny * LIFT
    local lift = wa.world.trace({ x0 = x, y0 = y, x1 = lx, y1 = ly, radius = RADIUS, with = with })
    if not (lift and (lift.hit or lift.starts_solid)) then x, y = lx, ly end
  else
    b.vx, b.vy = vx2, vy2
    x, y = x + vx2, y + vy2
  end
  b.vx = b.vx + ix * (b.vx - b.lvx)
  b.vy = b.vy + iy * (b.vy - b.lvy)
  b.lvx, b.lvy = b.vx, b.vy
  b.rvx, b.rvy = (x - b.lx), (y - b.ly)
  b.lx, b.ly = x, y
  b.x, b.y = x, y
  -- Slow for long enough: low speed, no inertia, so it settles.
  if speed < LOW_SPEED then
    b.low_timer = b.low_timer - 1
    if b.low_timer <= 0 then b.low, b.low_timer = true, LOW_FRAMES end
  else
    b.low, b.low_timer = false, LOW_FRAMES
  end
  b.sleep_timer = b.sleep_timer - 1
  if b.sleep_timer <= 0 then
    local dx, dy = (x - b.rec_x), (y - b.rec_y)
    if math.sqrt(dx * dx + dy * dy) < SLEEP_DISTANCE then sleep(b) end
    b.sleep_timer, b.rec_x, b.rec_y = SLEEP_PERIOD, x, y
  end
  return speed
end

shared.bowling_balls = {} -- actor id -> ball

-- Frames counted by the oldest ball still rolling: the worms' 12-frame
-- recovery needs a clock, and only balls hit.
local clock, clock_ball = 0, nil
local recover = {} -- worm id -> clock at which it can be hurt again

local function tick(id)
  if clock_ball == nil or not shared.bowling_balls[clock_ball] then clock_ball = id end
  if clock_ball == id then clock = clock + 1 end
end

local function overlaps(b, obj)
  local dx, dy = (obj.x - b.x), (obj.y - b.y)
  local r = RADIUS + target_radius(obj) + TOUCH
  return dx * dx + dy * dy <= r * r
end

-- PX's ProcessBallOnBallCollision: every other ball this one overlaps is
-- pushed away from it, and wakes.
local function push_balls(id, b, speed)
  local push = PUSH_FORCE * math.sqrt(speed)
  for other_id, o in pairs(shared.bowling_balls) do
    if other_id ~= id then
      local dx, dy = (o.x - b.x), (o.y - b.y)
      local d2 = dx * dx + dy * dy
      if d2 > 0 and d2 <= (2 * RADIUS) * (2 * RADIUS) then
        local d = math.sqrt(d2)
        wake(o)
        o.vx = o.vx + PUSH_KEEP * push * dx / d
        o.vy = o.vy + PUSH_KEEP * push * dy / d
      end
    end
  end
end

-- A standing worm hit from above, straight down, is crushed (PX's
-- "crushable" states, the ones a worm stands in).
local CRUSHABLE = { standing = true, firing = true, fired = true, prefiring = true }

-- PX's ProcessBallOnOtherCollision: the hit's damage from the ball's speed,
-- and its push from how the ball really moved this frame.
local function hit_others(a, b, speed)
  local dmg = MIN_DAMAGE + (MAX_DAMAGE - MIN_DAMAGE)
    * (math.min(speed, MAX_DAMAGE_SPEED) - FAST) / (MAX_DAMAGE_SPEED - FAST)
  local function hit(obj)
    if not overlaps(b, obj) then return end
    local damage = 0
    if obj.kind == "worm" then
      if obj.hp <= 0 or (recover[obj.id] or 0) > clock then return end
      damage = dmg
      recover[obj.id] = clock + RECOVER_FRAMES
    elseif obj.kind == "crate" or obj.kind == "oil" then
      damage = OBJECT_DAMAGE
    else
      damage = dmg
    end
    damage = trunc(damage)
    if damage <= 0 then return end
    local fx, fy = b.rvx, b.rvy
    local ax = math.abs(fx)
    local crushed = obj.kind == "worm" and CRUSHABLE[obj.state] and fy > FAST and ax / fy < 0.2
    if crushed then
      fx, fy = 0, 10
    else
      fy = fy < 0 and fy - ax or fy - 2 * ax
      fx, fy = fx * DAMAGE_FORCE, fy * DAMAGE_FORCE
    end
    if obj.kind == "worm" then
      obj:hurt({ amount = damage, vx = fx, vy = fy })
    else
      obj:hit(damage, fx, fy)
    end
    a:sound(crushed and SOUND_CRUSH or SOUND_HIT)
  end
  for _, group in ipairs({ wa.worms, wa.mines, wa.crates, wa.oil }) do
    for _, obj in ipairs(group.all() or {}) do hit(obj) end
  end
end

-- The balls by id, in id order: whatever draws from WA's RNG for them does
-- so in the same order on every machine.
local function balls_in_order()
  local ids = {}
  for id in pairs(shared.bowling_balls) do ids[#ids + 1] = id end
  table.sort(ids)
  return ids
end

-- PX's Zap: Zap(0) electrifies (mul 1), Zap(1), for a ball already
-- electrified, throws it at 0.8 and changes nothing else.
local function zap(b, mul)
  if not b.zapped then b.spark, b.trail, b.seed = 0, {}, b.trail_seed end
  b.zapped = true
  wake(b)
  local ang = (wa.random(0, 2000) - 1000) / 10000
  local speed = (5 + wa.random(0, 1000) / 200) * (mul or 1)
  -- sin and cos by their series: |ang| <= 0.1, so exact to 1e-7, and no
  -- trig in the simulation.
  local a2 = ang * ang
  b.vx = (ang - ang * a2 / 6) * speed
  b.vy = -(1 - a2 / 2 + a2 * a2 / 24) * speed
end

-- The Lightning Strike: every ball within reach of where it hit.
-- PX's Ferret flicks a ball as it flicks a mine (the ball is one): a ball
-- whose circle touches the Ferret's, radius `reach` at (x, y), wakes and is
-- thrown at (vx, vy), pixels a frame. Balls in id order.
shared.kick_bowling_balls = function(x, y, reach, vx, vy)
  local r = reach + RADIUS
  for _, id in ipairs(balls_in_order()) do
    local b = shared.bowling_balls[id]
    local dx, dy = (b.x - x), (b.y - y)
    if dx * dx + dy * dy <= r * r then
      wake(b)
      b.vx, b.vy = vx, vy
    end
  end
end

-- PX's magnet (CMagnet::ApplyForce): a ball in its field gets its push
-- (pixels/frame). A sleeping ball is left
-- alone unless `waking` (the magnet moving, discharging or exploding).
shared.magnet_bowling_balls = function(force, waking)
  for _, id in ipairs(balls_in_order()) do
    local b = shared.bowling_balls[id]
    local dx, dy = force(b.x, b.y)
    if dx and (waking or not b.asleep) then
      if waking then wake(b) end
      b.vx = b.vx + dx
      b.vy = b.vy + dy
    end
  end
end

shared.zap_bowling_balls = function(x, y)
  local reach = (ZAP_REACH + RADIUS) * (ZAP_REACH + RADIUS)
  for _, id in ipairs(balls_in_order()) do
    local b = shared.bowling_balls[id]
    local dx, dy = (b.x - x), (b.y - y)
    if dx * dx + dy * dy <= reach then zap(b) end
  end
end

-- The Electric Grenade's arc (PX's Tazer, whose targets include the ball):
-- the balls as targets, at the middle of the drawn ball, in id order.
local function as_target(id, b)
  return { kind = "ball", id = id, x = b.x, y = b.y + SPRITE_DROP,
    alliance = b.alliance, moving = b.vx ~= 0 or b.vy ~= 0 }
end

-- The Sentry Laser's disintegration (PX: Sleep, then Free): gone at once,
-- its actor at its next frame.
shared.remove_bowling_ball = function(id)
  local b = shared.bowling_balls[id]
  if not b then return end
  sleep(b)
  b.gone = true
  shared.bowling_balls[id] = nil
end

shared.bowling_ball_targets = function()
  local out = {}
  for _, id in ipairs(balls_in_order()) do out[#out + 1] = as_target(id, shared.bowling_balls[id]) end
  return out
end

shared.bowling_ball_target = function(id)
  local b = shared.bowling_balls[id]
  return b and as_target(id, b)
end

-- The arc's zap (PX's CTazerDamage::Zap): Zap(0) the first time, Zap(1)
-- once electrified. No damage, no push besides.
shared.zap_bowling_ball = function(id)
  local b = shared.bowling_balls[id]
  if b then zap(b, b.zapped and 0.8 or 1) end
end

-- Where a beam from (x0, y0) along the unit (dx, dy), at most len pixels,
-- first meets a ball's circle (PX's ball is an oil drum to the strike's
-- trace), or nil.
shared.bowling_ball_on_beam = function(x0, y0, dx, dy, len)
  local best
  for _, id in ipairs(balls_in_order()) do
    local b = shared.bowling_balls[id]
    local cx, cy = (b.x - x0), (b.y - y0)
    local along = cx * dx + cy * dy
    local miss = cx * cx + cy * cy - along * along
    if miss <= RADIUS * RADIUS then
      local t = along - math.sqrt(RADIUS * RADIUS - miss)
      if t > 0 and t < len and (not best or t < best) then best = t end
    end
  end
  if best then return x0 + (best * dx), y0 + (best * dy) end
end

-- The electrified look, a game frame on: the spark's cycle, and the trail
-- left behind, from the ball's own generator (looks only: nothing reads it,
-- and WA's RNG is not drawn).
local function electrified_frame(b)
  b.spark = b.spark + SPARK_SPEED
  if b.spark > SPARK_CYCLE then b.spark = b.spark - SPARK_CYCLE end
  for i = #b.trail, 1, -1 do
    local p = b.trail[i]
    p.age = p.age + 1
    if p.age >= TRAIL_LIFE then
      table.remove(b.trail, i)
    else
      p.x, p.y = p.x + p.vx, p.y + p.vy
    end
  end
  if not b.asleep then
    b.seed = (b.seed * 1103515245 + 12345) % 0x80000000
    local a = b.seed / 0x80000000 * 2 * math.pi
    b.seed = (b.seed * 1103515245 + 12345) % 0x80000000
    local v = b.seed / 0x80000000 * 0.3
    b.trail[#b.trail + 1] = { x = b.x, y = b.y, vx = wa.math.cos(a) * v, vy = wa.math.sin(a) * v, age = 0 }
  end
end

local function take_hit(b, hit)
  wake(b)
  local k = hit.kind == "blast" and BLAST_FORCE or GUN_FORCE
  b.vx = b.vx + k * hit.vx
  b.vy = b.vy + k * hit.vy
end

local function spawn_ball(owner, x, y, vx, vy)
  local b = {
    x = x, y = y, vx = vx, vy = vy, lvx = vx, lvy = vy, rvx = 0, rvy = 0, lx = x, ly = y,
    rot = 0, low = false, low_timer = 200, sleep_timer = 200, rec_x = x, rec_y = y,
    asleep = false, alliance = owner and owner.alliance,
  }
  local a = wa.actors.spawn({
    sprite = SHEET, x = x, y = y + SPRITE_DROP, gravity = false, collide = false, owner = owner,
    as_object = true,
    on = {
      hit = function(_, hit) take_hit(b, hit) end,
      frame = function(a)
        if b.gone then
          a:despawn()
          return
        end
        if b.y >= wa.world.water() then
          shared.bowling_balls[a.id] = nil
          a:despawn()
          return
        end
        tick(a.id)
        if b.zapped then electrified_frame(b) end
        spin(b)
        -- Before its Lua terrain sweep, using the actual ball centre and
        -- velocity rather than the display actor's deliberately zero speed.
        if shared.portals and next(shared.portals.pairs) then
          local proxy = {
            id = a.id, kind = "actor", x = b.x, y = b.y,
            vx = b.vx, vy = b.vy,
            fits = function(_, x, y)
              return not wa.world.collides({ x = x, y = y, radius = RADIUS, with = {"terrain"} })
            end,
            warp = function(_, spec)
              b.x, b.y, b.vx, b.vy = spec.x, spec.y, spec.vx, spec.vy
              wake(b)
              b.lvx, b.lvy, b.rvx, b.rvy = b.vx, b.vy, b.vx, b.vy
              a:warp({ x = b.x, y = b.y + SPRITE_DROP, vx = 0, vy = 0 })
              return true
            end,
          }
          shared.portals:move(proxy)
        end
        local speed = think(b)
        if b.gone then
          shared.bowling_balls[a.id] = nil
          a:despawn()
          return
        end
        if speed > PUSH_SPEED then push_balls(a.id, b, speed) end
        if speed > FAST then hit_others(a, b, speed) end
        a.x, a.y, a.vx, a.vy = b.x, b.y + SPRITE_DROP, 0, 0
        a:gfx({ angle = math.deg(b.rot) % 360, depth = BALL_DEPTH, tint = b.zapped and ZAPPED_TINT or 0xFFFFFF })
      end,
    },
  })
  shared.bowling_balls[a.id] = b
  b.trail_seed = a.id * 7919 % 0x80000000
  return a, b
end
shared.spawn_bowling_ball = spawn_ball

-- How far a ball dropped at y0 moving vx drifts sideways before its centre
-- falls to y1: think's flight through the air, gravity and PX's inertia,
-- frame by frame (no trig, the same on every machine).
local function drift(y0, y1, vx)
  local g = wa.world.gravity()
  if g <= 0 then return 0 end
  local x, y, vy, lvy = 0, y0, 0, 0
  for _ = 1, 3000 do
    if y >= y1 then break end
    local vy2 = vy + g
    x, y = x + vx, y + vy2
    vy = vy2 + INERTIA_Y * (vy2 - lvy)
    lvy = vy
  end
  return x
end

fires.bowling_strike = function(ev)
  local dir = (ev.vx or 0) < 0 and -1 or 1
  local y0 = STRIKE_Y
  local back = drift(y0, ev.y - RADIUS, STRIKE_SPEED * dir)
  for i = 1, STRIKE_BALLS do
    local offset = (i - (STRIKE_BALLS + 1) / 2) * STRIKE_SPACING
    spawn_ball(ev.worm, ev.x - back + offset, y0, STRIKE_SPEED * dir, 0)
  end
end

if wa.on.draw and wa.draw.quad then
  -- Resolve the pack namespace once, rather than on every submission.
  local glow_sheet = wa.sprites.key(GLOW_SHEET)
  local spark_sheet = wa.sprites.key(SPARK_SHEET)
  local sheen_sheet = wa.sprites.key(SHEEN_SHEET)
  -- One spec refilled for every quad (the engine copies it).
  local QUAD = { points = { { 0, 0 }, { 0, 0 }, { 0, 0 }, { 0, 0 } } }
  local function quad(sheet, frame, color, depth, x, y, half, c, s)
    QUAD.sprite, QUAD.frame, QUAD.blend, QUAD.color, QUAD.depth = sheet, frame, "add", color, depth
    local p = QUAD.points
    if not c then
      -- Unrotated: the corners are half either way.
      p[1][1], p[1][2] = x - half, y - half
      p[2][1], p[2][2] = x + half, y - half
      p[3][1], p[3][2] = x + half, y + half
      p[4][1], p[4][2] = x - half, y + half
    else
      p[1][1], p[1][2] = x + ((-c + s) * half), y + ((-s - c) * half)
      p[2][1], p[2][2] = x + (( c + s) * half), y + (( s - c) * half)
      p[3][1], p[3][2] = x + (( c - s) * half), y + (( s + c) * half)
      p[4][1], p[4][2] = x + ((-c - s) * half), y + ((-s + c) * half)
    end
    wa.draw.quad(QUAD)
  end
  local function zap_color(k)
    return 0xFF000000 | (math.floor(ZAP_R * k) << 16) | (math.floor(ZAP_G * k) << 8) | math.floor(ZAP_B * k)
  end
  local FULL = zap_color(1)
  local DRAW_IDS = {}
  wa.on.draw(function()
    local n = 0
    for id in pairs(shared.bowling_balls) do n = n + 1; DRAW_IDS[n] = id end
    for i = #DRAW_IDS, n + 1, -1 do DRAW_IDS[i] = nil end
    table.sort(DRAW_IDS)
    for _, id in ipairs(DRAW_IDS) do
      local b = shared.bowling_balls[id]
      if b.zapped then
        local drop = SPRITE_DROP
        for _, t in ipairs(b.trail) do
          local k = t.age / TRAIL_LIFE
          quad(glow_sheet, 0, zap_color(1 - k), GLOW_DEPTH, t.x, t.y + drop, (0.3 + 0.2 * k) * GLOW_SIZE / 2)
        end
        local x, y = b.x, b.y + drop
        local glow = (0.3 + 0.1 * wa.draw.random()) * GLOW_SIZE / 2
        for _ = 1, 3 do quad(glow_sheet, 0, FULL, GLOW_DEPTH, x, y, glow) end
        local c, s = wa.math.cos(b.rot), wa.math.sin(b.rot)
        quad(sheen_sheet, 0, SHEEN_COLOR, SHEEN_DEPTH, x, y, SPARK_SIZE / 2, c, s)
        if b.spark <= 1 then
          local frame = math.min(SPARK_FRAMES - 1, math.floor(b.spark * SPARK_FRAMES))
          quad(spark_sheet, frame, 0xFFFFFFFF, SPARK_DEPTH, x, y, SPARK_SIZE / 2, c, s)
        end
      end
    end
  end)
end

-- Live adapter identities for the portal return-cache cleanup.
shared.portal_bowling_balls = function()
  local out = {}
  for _, id in ipairs(balls_in_order()) do out[#out + 1] = { id = id } end
  return out
end
