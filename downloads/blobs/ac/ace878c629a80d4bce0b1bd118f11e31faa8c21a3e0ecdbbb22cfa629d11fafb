-- Highlander: the electrical weapons. Split from rules.lua by tools/split_highlander.py.
-- Squares by multiplication: `^` calls the C runtime's pow, whose last bit
-- may differ between machines.
local function sq(v) return v * v end

local shared = require("lib/shared")
local turret = require("lib/turret")
local current_worm = shared.current_worm
local held = shared.held
-- Highlander's rules (scheme/state.lua) and the Lightning Strike share it; the
-- strike also works without the rules, as a weapon of another scheme.
shared.revived_by_lightning = shared.revived_by_lightning or {}
local revived_by_lightning = shared.revived_by_lightning

-- --------------------------------------------------------- electrical weapons
do
-- PX's lightningstrike.txt and tazer.txt share these target classes and beam
-- textures. Only gameplay advances in the actor brains. Drawing below may run
-- at any frame rate and consumes only wa.draw.random(), never WA's sim RNG.
local ELECTRIC_DEPTH = wa.depth.BEHIND_TERRAIN -- behind WA terrain, in the GPU occlusion mask
local BEAM = "sprites/lightning/beam.png"
local GLOW = "sprites/lightning/glow.png"
local CLOUD = "sprites/lightning/cloud.png" -- a puff made for the pack, in place of WA's cloudl
local CLOUD_DEPTH = ELECTRIC_DEPTH - 0x1000  -- in front of the beam's top, behind the terrain
local GRENADE_BURST = "sprites/electric_grenade/explosion"
local strikes, arcs, tazed = {}, {}, {}

local function effect_actor(x, y, owner, frame)
  return wa.actors.spawn({
    sprite = GLOW, visible = false, gravity = false, collide = false,
    owner = owner, x = x, y = y, on = frame,
  })
end

local function electrical_targets(graves)
  local out = {}
  for _, group in ipairs({ wa.worms, wa.mines, wa.crates, wa.oil }) do
    for _, obj in ipairs(group.all()) do out[#out + 1] = obj end
  end
  if graves and wa.graves then
    for _, obj in ipairs(wa.graves.all()) do out[#out + 1] = obj end
  end
  return out
end

local function target_radius(obj)
  if obj.kind == "worm" then return 6 end
  if obj.kind == "grave" then return 8 end
  if obj.kind == "mine" then return 5 end
  return 9
end

-- A ray against terrain and the objects PX's collision mask names. Projection
-- and the chosen endpoint both use world pixels.
-- Equal-distance objects retain the engine's entity traversal order.
local function electrical_trace(x0, y0, dx, dy)
  local far = 10000
  if wa.world.electrical_trace then
    return wa.world.electrical_trace(x0, y0,
      (x0 + dx * far), (y0 + dy * far))
  end
  local land = wa.land.trace(x0, y0,
    (x0 + dx * far), (y0 + dy * far))
  local best = land and math.sqrt(sq(land.x - x0) + sq(land.y - y0)) or far
  local hit = land and { x = land.x, y = land.y, obj = nil } or nil
  for _, obj in ipairs(electrical_targets(true)) do
    local ox, oy = (obj.x - x0), (obj.y - y0)
    local along = ox * dx + oy * dy
    local across = math.abs(ox * dy - oy * dx)
    if along > 0 and along < best and across <= target_radius(obj) then
      best = along
      hit = { x = obj.x, y = obj.y, obj = obj }
    end
  end
  return hit
end

local function strike_hit(s)
  if shared.zap_bowling_balls then shared.zap_bowling_balls(s.ex, s.ey) end
  if not s.hit then return end
  turret.capture_hit(s.sentry, s.ex, s.ey, s.alliance)
  local radius2 = sq(6)
  local targets = wa.world.electrical_nearby
    and wa.world.electrical_nearby(s.ex, s.ey, 24, true) or electrical_targets(true)
  for _, obj in ipairs(targets) do
    local dx, dy = obj.x - s.ex, obj.y - s.ey
    local r = (target_radius(obj) + 6)
    if dx * dx + dy * dy <= math.max(radius2, r * r) then
      if obj.kind == "worm" then
        if not revived_by_lightning[obj.id] then obj:heal(25) end
      elseif obj.kind == "grave" then
        if obj.worm_id ~= 0 then
          local id = obj.worm_id
          local worm = obj:revive(id, 10)
          if worm then
            revived_by_lightning[worm.id] = true
            if shared.restore_lightning_inventory then
              shared.restore_lightning_inventory(worm)
            end
          else
            -- Refused: a living worm holds its place (a Reinforcement takes a
            -- dead worm's), as when the team has eight. Reinforcement's error
            -- sound, from the grave: the strike's thrower may be gone by now.
            wa.sound.play(obj, "sounds/gravity_control/error.wav")
          end
        end
      elseif obj.kind == "mine" then
        obj:arm(obj.fuse < 0 and wa.random(1000, 5000) or obj.fuse)
      elseif obj.kind == "crate" or obj.kind == "oil" then
        obj:hit(100, 0, 0)
      end
    end
  end
end

-- PX's cloud: every second frame of the strike's life a puff of WA's large
-- cloud, tinted a dark bluish grey, is thrown out from the top of the beam
-- and slowed by the air; a core puff (100 frames, 1.2x to 0.6x) until the
-- strike is spent, a surrounding one (140 frames, 1x to nothing) until the
-- strike is gone. Each fades in from nothing. Also PX's sparks: while the
-- beam holds, a glow thrown from where it hit, falling. Both are advanced
-- here, once per game frame, from the strike's own generator, and only drawn
-- below; nothing else reads them.
local function strike_rand(s)
  s.seed = (s.seed * 1103515245 + 12345) % 0x80000000
  return s.seed / 0x80000000
end

local function strike_puff(s, life, drag, s0, s1)
  local xvel = strike_rand(s) * 2 - 1
  local yvel = 1 - xvel * xvel
  s.cloud[#s.cloud + 1] = { x = s.sx, y = s.sy, vx = 16 * xvel,
    vy = (strike_rand(s) * 9 - 8) * yvel, drag = drag, age = 0, life = life, s0 = s0, s1 = s1 }
end

local function strike_particles(s)
  if s.tail > 0 then
    s.cloud_timer = s.cloud_timer - 1
    if s.cloud_timer <= 0 then
      if s.life > 0 then strike_puff(s, 100, 0.3, 1.2, 0.6) end
      strike_puff(s, 140, 0.15, 1.0, 0.01)
      s.cloud_timer = 2
    end
    if s.delay == 0 and s.life > 0 and s.hit then
      local a = strike_rand(s) * 2 * math.pi
      local v = (1 + strike_rand(s) * 2)
      s.sparks[#s.sparks + 1] = { x = s.ex, y = s.ey, vx = wa.math.cos(a) * v, vy = wa.math.sin(a) * v, age = 0 }
    end
  end
  for i = #s.cloud, 1, -1 do
    local p = s.cloud[i]
    p.age = p.age + 1
    if p.age >= p.life then
      table.remove(s.cloud, i)
    else
      p.x, p.y = p.x + p.vx, p.y + p.vy
      p.vx, p.vy = p.vx * (1 - p.drag), p.vy * (1 - p.drag)
    end
  end
  for i = #s.sparks, 1, -1 do
    local p = s.sparks[i]
    p.age = p.age + 1
    if p.age >= 50 then
      table.remove(s.sparks, i)
    else
      p.x, p.y, p.vy = p.x + p.vx, p.y + p.vy, p.vy + 1 / 8
    end
  end
end

shared.lightning_click = function(ev)
  -- PX's direction: from the left unless the shot's x speed, which WA's
  -- arrow keys set, is negative (lightningstrike.txt: SpX < 0 -> -DirX).
  local dirx = 0.5 * ((ev.vx or 0) < 0 and -1 or 1)
  local diry = math.sqrt(3) / 2
  local sy = -270
  local sx = (ev.x - (ev.y - sy) * dirx / diry)
  local hit = electrical_trace(sx, sy, dirx, diry)
  local ex, ey = hit and hit.x or sx + (300 * dirx),
    hit and hit.y or sy + (300 * diry)
  -- A bowling ball on the way stops the beam, as PX's does.
  local bx, by = nil, nil
  if shared.bowling_ball_on_beam then
    local reach = math.sqrt(sq(ex - sx) + sq(ey - sy))
    bx, by = shared.bowling_ball_on_beam(sx, sy, dirx, diry, reach)
  end
  if bx then ex, ey, hit = bx, by, { x = bx, y = by } end
  -- With no stock hit, scripted sentries can still stop the full ray.
  local reach = hit and math.sqrt(sq(ex - sx) + sq(ey - sy)) or 10000
  local tx, ty, sentry = turret.on_beam(sx, sy, dirx, diry, reach)
  if tx then ex, ey, hit = tx, ty, { x = tx, y = ty } end
  local distance = math.sqrt(sq(ex - sx) + sq(ey - sy))
  if hit and distance > 300 then
    sx, sy = ex - (300 * dirx), ey - (300 * diry)
  end
  local s = { sx = sx, sy = sy, ex = ex, ey = ey, hit = hit, dirx = dirx, diry = diry,
    delay = 150, life = 16, tail = 60, owner = ev.worm, alliance = ev.worm.alliance,
    sentry = sentry, ticks = 0,
    seed = (ex // 1 * 7919 + ey // 1) % 0x80000000, cloud_timer = 0, cloud = {}, sparks = {} }
  strikes[#strikes + 1] = s
  wa.sound.play(ev.worm, "sounds/lightning/thunder.wav")
  effect_actor(ex, ey, ev.worm, function(a)
    s.ticks = s.ticks + 1
    strike_particles(s)
    if s.delay > 0 then
      s.delay = s.delay - 1
      if s.delay == 0 then wa.sound.play(a, "sounds/lightning/hit.wav") end
    elseif s.life > 0 then
      s.life = s.life - 1
      if s.life == 0 then strike_hit(s) end
    elseif s.tail > 0 then
      s.tail = s.tail - 1
    elseif #s.cloud == 0 and #s.sparks == 0 then
      for i, held in ipairs(strikes) do
        if held == s then table.remove(strikes, i); break end
      end
      a:despawn()
    end
  end)
end

local function target_key(obj)
  return obj.kind .. ":" .. obj.id
end

local function find_target(key)
  local ball = key:match("^ball:(%d+)$")
  if ball then
    return shared.bowling_ball_target and shared.bowling_ball_target(tonumber(ball))
  end
  for _, obj in ipairs(electrical_targets(false)) do
    if target_key(obj) == key then return obj end
  end
end

local function closest_target(arc)
  local best, distance = nil, sq(200)
  local targets = wa.world.electrical_nearby
    and wa.world.electrical_nearby(arc.x, arc.y, 200, false) or electrical_targets(false)
  local function consider(obj)
    local key = target_key(obj)
    if not arc.ignore[key] and (obj.kind ~= "worm" or obj.hp > 0) then
      local dx, dy = obj.x - arc.x, obj.y - arc.y
      local d = dx * dx + dy * dy
      if d < distance then best, distance = obj, d end
    end
  end
  for _, obj in ipairs(targets) do consider(obj) end
  -- PX's Tazer takes Bowling Balls too.
  if shared.bowling_ball_targets then
    for _, obj in ipairs(shared.bowling_ball_targets()) do consider(obj) end
  end
  return best, distance
end

local function release_taze(key)
  local hold = tazed[key]
  if not hold then return end
  hold.count = hold.count - 1
  if hold.count > 0 then return end
  -- The worm the hold took, not a fresh lookup: an earlier zap may have
  -- killed it, and the worm lists leave dead worms out. Left held, a dead
  -- worm never comes to rest, so WA never runs its death and the turn,
  -- frozen by the hold, never ends.
  local worm = hold.worm
  -- Knocked flying meanwhile, the engine has already let it go.
  if worm.taken then worm:release(0, 0) end
  worm.body_visible = true
  tazed[key] = nil
end

-- The worm that last fired the Electric Grenade, as PX keeps it at the
-- fire: the grenade's arc never zaps its thrower. The explosion's own
-- worm (ev.worm) need not be the thrower.
local thrower

-- A tazed worm is the pack's (worm:take): the engine eats its moves and
-- jumps; it cannot start a shot either.
wa.on.worm_message(function(worm, msg)
  if msg ~= wa.msg.FIRE_WEAPON then return end
  if tazed[target_key(worm)] then return "eat" end
  if worm.weapon == "px.electric_grenade" then thrower = worm end
end, { msgs = { wa.msg.FIRE_WEAPON } })

local function zap_target(arc, pending)
  local obj = find_target(pending.key)
  release_taze(pending.key)
  if not obj then return end
  if obj.kind == "worm" then
    obj:hurt(24)
    obj.vx, obj.vy = pending.side * 1.2, -4
  elseif obj.kind == "mine" then
    obj:arm(400)
  elseif obj.kind == "crate" or obj.kind == "oil" then
    obj:hit(12, pending.side * 1.2, -4)
  elseif obj.kind == "ball" then
    shared.zap_bowling_ball(obj.id)
  end
end

-- The arc keeps every point it passed, from the grenade to where it ends,
-- links included: the whole chain stays drawn until the arc dies.
-- wa.draw.ribbon draws at most 256.
local ARC_MAX_POINTS = 256
local function add_point(arc)
  arc.points[#arc.points + 1] = { arc.x, arc.y }
  if #arc.points > ARC_MAX_POINTS then table.remove(arc.points, 1) end
end

local function progress_arc(arc)
  arc.explosion = arc.explosion + 1
  for i = #arc.pending, 1, -1 do
    local p = arc.pending[i]
    p.time = p.time - 1
    if p.time <= 0 then
      zap_target(arc, p)
      table.remove(arc.pending, i)
    end
  end
  if arc.pause > 0 then arc.pause = arc.pause - 1; return end
  if arc.life <= 0 then
    if #arc.points > 0 then table.remove(arc.points, 1) end
    return
  end
  arc.life = arc.life - 1
  local target, distance = closest_target(arc)
  if target then
    local dx, dy = target.x - arc.x, target.y - arc.y
    local d = math.sqrt(distance)
    if d <= 10 then
      local key = target_key(target)
      arc.ignore[key] = true
      arc.pending[#arc.pending + 1] = { key = key, side = dx < 0 and -1 or 1, time = 24 }
      if target.kind == "worm" then
        if tazed[key] then
          tazed[key].count = tazed[key].count + 1
        else
          tazed[key] = { x = target.x, y = target.y, count = 1, worm = target,
            sheet = wa.random(1, 2) == 1 and "sprites/electric_grenade/tazed1" or "sprites/electric_grenade/tazed2" }
        end
        target.body_visible = false
        -- Held where it stands, the turn stopped, until the zap.
        target:take{ turn = "freeze" }
      end
      arc.x, arc.y = target.x, target.y
      arc.life = 20
      arc.pause = 14
      add_point(arc)
      return
    end
    local pull = math.min(1, math.sqrt(10 / d))
    arc.dx = arc.dx + ((dx / d) - arc.dx) * pull
    arc.dy = arc.dy + ((dy / d) - arc.dy) * pull
  else
    arc.dx = arc.dx + wa.random(-100, 100) / 100
    arc.dy = arc.dy + wa.random(-100, 100) / 100
  end
  local norm = math.sqrt(arc.dx * arc.dx + arc.dy * arc.dy)
  if norm < 0.01 then arc.dx, arc.dy = 0, -1 else arc.dx, arc.dy = arc.dx / norm, arc.dy / norm end
  local nx, ny = arc.x + arc.dx * 20, arc.y + arc.dy * 20
  local land = wa.land.trace(arc.x, arc.y, nx, ny)
  if land then
    if land.starts_solid then arc.life = 0; return end
    -- Follow the tangent that moves closer to the target, as PX's arc does.
    local tx, ty = land.tx or 1, land.ty or 0
    if target then
      local a = sq(target.x - (land.x + tx * 10)) + sq(target.y - (land.y + ty * 10))
      local b = sq(target.x - (land.x - tx * 10)) + sq(target.y - (land.y - ty * 10))
      if b < a then tx, ty = -tx, -ty end
    end
    arc.dx, arc.dy = tx, ty
    arc.x, arc.y = land.x + (land.nx or 0) * 10 + tx * 10,
      land.y + (land.ny or -1) * 10 + ty * 10
  else
    arc.x, arc.y = arc.x + arc.dx * 10, arc.y + arc.dy * 10
  end
  add_point(arc)
end

shared.electric_grenade_explode = function(ev)
  local arc = { x = ev.x, y = ev.y, dx = 0, dy = -1, life = 16, pause = 0,
    points = { { ev.x, ev.y } }, ignore = {}, pending = {}, explosion = 0,
    burst_x = ev.x, burst_y = ev.y, sound_age = 0 }
  if thrower then arc.ignore[target_key(thrower)] = true end
  if ev.worm then arc.ignore[target_key(ev.worm)] = true end
  arcs[#arcs + 1] = arc
  -- An explosion without a worm would leave the driver owned by the exploding
  -- grenade: the turn's worm owns it then, as every other effect's.
  local driver = effect_actor(ev.x, ev.y, ev.worm or current_worm(), function(a)
    arc.sound_age = arc.sound_age + 1
    if arc.life > 0 and arc.sound_age % 46 == 0 then
      wa.sound.play(a, "sounds/lightning/tazer_loop.wav")
    end
    progress_arc(arc)
    if arc.life <= 0 and #arc.points == 0 and #arc.pending == 0 then
      for i, held in ipairs(arcs) do
        if held == arc then table.remove(arcs, i); break end
      end
      a:despawn()
    end
  end)
  wa.sound.play(driver, "sounds/lightning/tazer_loop.wav")
end

if wa.on.draw and wa.draw.ribbon then
  -- Resolve the pack namespace once for the many glow/beam submissions.
  local beam_sprite = wa.sprites.key(BEAM)
  local glow_sprite = wa.sprites.key(GLOW)
  local cloud_sprite = wa.sprites.key(CLOUD)
  local burst_sprite = wa.sprites.key(GRENADE_BURST)
  local function colour(a, r, g, b)
    return (math.floor(a) << 24) | (r << 16) | (g << 8) | b
  end
  -- wa.draw.quad and wa.draw.ribbon copy their table before returning, so
  -- one spec is refilled for every quad and every ribbon. A frame with
  -- dozens of arcs draws about a thousand glows: new tables for each made
  -- enough garbage to run Lua's GC inside the draw on most frames.
  local QUAD = { points = { {0, 0}, {0, 0}, {0, 0}, {0, 0} } }
  -- An axis-aligned square of half size hw by hh around x, y.
  local function square(sprite, frame, blend, color, depth, x, y, hw, hh)
    QUAD.sprite, QUAD.frame, QUAD.blend, QUAD.color, QUAD.depth = sprite, frame, blend, color, depth
    local p = QUAD.points
    p[1][1], p[1][2] = x - hw, y - hh
    p[2][1], p[2][2] = x + hw, y - hh
    p[3][1], p[3][2] = x + hw, y + hh
    p[4][1], p[4][2] = x - hw, y + hh
    wa.draw.quad(QUAD)
  end
  local function glow(x, y, size, color)
    local h = size / 2
    square(glow_sprite, 0, "add", color, ELECTRIC_DEPTH, x, y, h, h)
  end
  -- One ribbon's points, refilled: point(i, ...) sets the i-th, ribbon(n)
  -- draws the first n.
  local RIBBON = { sprite = beam_sprite, blend = "add", depth = ELECTRIC_DEPTH, points = {} }
  -- Keep shortened ribbons' point tables: the next arc may be longer again.
  local POINTS = {}
  local function point(i, x, y, width, u, color)
    local p = POINTS[i]
    if not p then p = {}; POINTS[i] = p end
    RIBBON.points[i] = p
    p.x, p.y, p.width, p.u, p.color = x, y, width, u, color
  end
  local function ribbon(n)
    local pts = RIBBON.points
    for i = #pts, n + 1, -1 do pts[i] = nil end
    wa.draw.ribbon(RIBBON)
  end
  -- PX's lightningstrike RenderLightning. Its shape is fractal noise, made
  -- afresh each game frame while the beam holds: each point is the middle of
  -- its two neighbours plus a random nudge, halving the span each pass. A
  -- look, so from wa.draw.random, never WA's generator.
  local LR, LG, LB = 120, 140, 255
  local function lerp(t, a, b) return a + (b - a) * t end
  local function noise_span(noise, off, divs, scale, first, last)
    for i = 0, divs - 1 do noise[off + i] = 0 end
    noise[off], noise[off + divs - 1] = first, last
    local k = divs
    local l = k >> 1
    while l > 0 do
      for i = l, divs - 1 - l, k do
        noise[off + i] = (noise[off + i - l] + noise[off + i + l]) * 0.5 + (wa.draw.random() * 2 - 1) * scale
      end
      k = l
      l = k >> 1
    end
  end
  -- The main beam's 9 points, and 6 branches of 9 at random points on it.
  local function new_shape(s)
    s.noise, s.attach = s.noise or {}, s.attach or {}
    for i = 1, 8 do s.attach[i] = nil end
    noise_span(s.noise, 0, 9, 1.0, 0, 0)
    for _ = 1, 6 do s.attach[1 + math.floor(wa.draw.random() * 8)] = true end
    for i = 0, 5 do
      local off = 2 + wa.draw.random() * 4
      if wa.draw.random() < 0.5 then off = -off end
      noise_span(s.noise, 9 + 9 * i, 9, 0.5, 0, off)
    end
    s.ground = 0.5 + wa.draw.random() * 0.3
    s.shape_tick = s.ticks
  end
  -- PX's RenderBeam: one textured strip through the noise, `width` (a half
  -- width, as PX's) tapering to `endwidth`, and a glow at every point fading
  -- towards the end.
  local function beam(noise, off, divs, width, endwidth, scale, x1, y1, x2, y2, glowalpha)
    if divs < 2 then return end
    local dx, dy = (x2 - x1), (y2 - y1)
    local dd = math.sqrt(dx * dx + dy * dy)
    if dd <= 0 then return end
    dx, dy = dx / dd, dy / dd
    local d = divs - 1
    for i = 0, divs - 1 do
      local f = i / d
      local n = noise[off + i] or 0
      local x = lerp(f, x1, x2) + scale * dy * n
      local y = lerp(f, y1, y2) - scale * dx * n
      point(i + 1, x, y, 2 * lerp(f, width, endwidth), f, colour(255, LR, LG, LB))
      local a = 255 * glowalpha * (1 - f)
      if a >= 1 then glow(x, y, 64, colour(a, LR, LG, LB)) end
    end
    ribbon(divs)
  end
  local function draw_strike(s)
    -- The cloud, dark and alpha-blended over the sky.
    for _, p in ipairs(s.cloud) do
      local t = p.age / p.life
      local size = lerp(t, p.s0, p.s1)
      square(cloud_sprite, 0, "alpha", colour(255 * t, 45, 40, 60), CLOUD_DEPTH, p.x, p.y, 64 * size, 40 * size)
    end
    for _, p in ipairs(s.sparks) do
      local t = p.age / 50
      glow(p.x, p.y, 13 * (1 - t) + 1, colour(255, LR, LG, LB))
    end
    if s.life <= 0 or s.delay >= 8 then return end
    if not s.noise or (s.delay == 0 and s.shape_tick ~= s.ticks) then new_shape(s) end
    -- Before it lands the beam grows down from the cloud over 8 frames.
    local divs, ex, ey = 9, s.ex, s.ey
    if s.delay > 0 then
      local fr = (8 - s.delay) / 8
      divs = math.floor(9 * fr)
      ex, ey = lerp(fr, s.sx, s.ex), lerp(fr, s.sy, s.ey)
    end
    beam(s.noise, 0, divs, 35, 3, 15, s.sx, s.sy, ex, ey, 1.0)
    local sub, d = 0, divs - 1
    for i = 0, divs - 1 do
      if s.attach[i] and d > 0 then
        local f = i / d
        local x = lerp(f, s.sx, ex) + 10 * s.diry * s.noise[i]
        local y = lerp(f, s.sy, ey) - 10 * s.dirx * s.noise[i]
        beam(s.noise, 9 + 9 * sub, 9, lerp(f, 10, 1), 0.1, 15 * (1 - f), x, y,
          x + s.dirx * 100 * (1 - f), y + s.diry * 100 * (1 - f), 0.5 * (1 - f))
        sub = sub + 1
      end
    end
    glow(s.sx + 10 * s.dirx, s.sy + 10 * s.diry, 230, colour(255, LR, LG, LB))
    if s.delay == 0 and s.hit then glow(s.ex, s.ey, 128 * s.ground, colour(255, LR, LG, LB)) end
  end
  wa.on.draw(function()
    for _, s in ipairs(strikes) do
      draw_strike(s)
    end
    for _, arc in ipairs(arcs) do
      if arc.explosion < 10 then
        local h = 75
        square(burst_sprite, arc.explosion, "add", 0x551E14EB, ELECTRIC_DEPTH, arc.burst_x, arc.burst_y, h, h)
      end
      if #arc.points >= 2 then
        -- PX's CTazerShot: one strip through the arc's points, thickest in
        -- the middle (9, a half width, as PX's), wobbling up to 10 px across
        -- its path by fractal noise made afresh each game frame, a glow at
        -- every point and a big one at the tip; all fading as the arc dies.
        if arc.shape_tick ~= arc.sound_age then
          -- One noise value per point; PX's fractal noise needs a power of
          -- two plus one values.
          local divs = 33
          while divs < #arc.points do divs = 2 * divs - 1 end
          arc.noise = arc.noise or {}
          noise_span(arc.noise, 0, divs, 1.0, 0, 0)
          arc.shape_tick = arc.sound_age
        end
        local num = #arc.points - 1
        local fade = math.min(1, arc.life / 6)
        for i = 0, num do
          local t = i / num
          local x, y = arc.points[i + 1][1], arc.points[i + 1][2]
          if i > 0 and i < num then
            local px, py = arc.points[i][1], arc.points[i][2]
            local nx, ny = (y - py), (px - x)
            local d = math.sqrt(nx * nx + ny * ny)
            if d > 0 then
              local n = 10 * (arc.noise[i - 1] or 0) / d
              x, y = x + n * nx, y + n * ny
            end
          end
          local f = math.min(1, 4 * t * (1 - t) + 0.1)
          local f2 = f * fade
          local c = colour(255, math.floor(80 * f2), math.floor(100 * f2), math.floor(255 * f2))
          point(i + 1, x, y, 2 * 9 * f, t, c)
          glow(x, y, i == num - 1 and 115 or 38, c)
        end
        ribbon(num + 1)
      end
    end
    -- PX's CTazerDamage glow on a linked Bowling Ball until it is zapped.
    for _, arc in ipairs(arcs) do
      for _, p in ipairs(arc.pending) do
        if p.key:sub(1, 5) == "ball:" then
          local ball = find_target(p.key)
          if ball then glow(ball.x, ball.y, 128 * (0.4 + 0.3 * wa.draw.random()), colour(255, 80, 100, 255)) end
        end
      end
    end
    for key, hold in pairs(tazed) do
      local worm = find_target(key)
      if worm then
        local x, y = worm.x, worm.y
        local h = 30
        square(hold.sheet, math.floor(wa.draw.random() * 4), "alpha", 0xFFFFFFFF, ELECTRIC_DEPTH, x, y, h, h)
        -- PX's tazed worm: a glow 0.4 to 0.7 of the sheet, flickering.
        glow(x, y, 128 * (0.4 + 0.3 * wa.draw.random()), colour(255, 80, 100, 255))
      end
    end
  end)
end
end
