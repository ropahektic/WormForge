-- Highlander: Laser Gun. Split from rules.lua by tools/split_highlander.py.
-- Squares by multiplication: `^` calls the C runtime's pow, whose last bit
-- may differ between machines.
local function sq(v) return v * v end

local shared = require("lib/shared")
local laser = require("lib/laser")
local fires = shared.fires

-- ------------------------------------------------------------- Laser Gun
--
-- PX's lasergun (CLaserRay). The record is an uzi firing one bullet; PX
-- fires none (FireFinal without super), and each frame sets the worm's shot
-- counters to 0 of 1, so WA keeps the worm in its repeat-fire state, aim
-- live, while a beam burns for 5 s (250 frames) from the worm along its aim.
-- Every fourth frame the beam traces: to the first land, 2048 px at most,
-- cutting 4 px holes there (along the cut when the aim held still); and
-- every worm, mine, crate and oil drum within 5 px of it takes fire damage:
-- a worm 2, then 1 once it has taken 10, and no more after 45 from this beam;
-- an oil drum 4, a crate 1. Drawn: a red strip, its width pulsing from 1.0
-- to 0.5, and glows at the muzzle and where it hits; red sparks from the
-- muzzle, glows rising from the cut, yellow sparks where it touches things.
--
-- Here the engine hands each of WA's shots to on_fire and skips WA's bullet
-- (a gun slot with an on_fire), and the pack holds worm.shots_fired and
-- worm.shots_to_fire as PX does.
--
-- Differences: a mine the beam touches is armed on its fuse, once, rather
-- than sent PX's gun damage (object:hit takes crates and oil drums); the
-- beam's loop sound is played again every 51 frames, not looped.

-- Its own block: the file is at Lua's 200 locals for one chunk.
do
  local LASER_LIFE = 250
  local LASER_REACH = 2048
  local LASER_LOOP_FRAMES = 51 -- laser_loop.wav is 1.02 s
  -- States a worm is not firing in: the beam stops (PX keeps it only in
  -- repeat fire, firing, aiming and fired).
  local LASER_STOPS = { standing = true, sliding = true, jetpacking = true, parachuting = true,
    bungee = true, tumbling = true, teleporting = true, drilling = true, punching = true }
  local lasers = {} -- worm id -> the beam

  local laser_between, laser_particle = laser.between, laser.particle

  -- UpdatePosDir: the beam's direction from the worm's aim (0 down, 1 up)
  -- and side; it starts at the worm and draws from 24 px out.
  local function laser_aim(r, w)
    local ang = (1 - w.aim) * math.pi
    if w.facing < 0 then ang = 2 * math.pi - ang end
    r.dx, r.dy = wa.math.sin(ang), -wa.math.cos(ang)
    r.x = w.x + (2 * w.facing * r.dy - r.dx)
    r.y = w.y + (-2 - r.dy)
    r.gx = r.x + (24 * r.dx)
    r.gy = r.y + (24 * r.dy)
  end

  local function laser_sparks(r, n, v0, v1, s0, s1)
    local base = (1 - r.aim) * math.pi
    if r.facing < 0 then base = 2 * math.pi - base end
    for _ = 1, n do
      local ang = base + laser_between(r, -0.8, 0.8)
      local v = laser_between(r, v0, v1)
      local s = laser_between(r, s0, s1)
      laser_particle(r, { x = r.gx, y = r.gy, vx = v * wa.math.sin(ang),
        vy = -v * wa.math.cos(ang), life = 30, drag = 0.3, grav = 0.8,
        s0 = s, s1 = 0.01, c0 = { 255, 0, 0 }, c1 = { 80, 0, 0 } })
    end
  end

  local function laser_objects()
    local out = {}
    for _, group in ipairs({ wa.worms, wa.mines, wa.crates, wa.oil }) do
      if group then
        for _, obj in ipairs(group.all()) do out[#out + 1] = obj end
      end
    end
    return out
  end

  local LASER_RADIUS = { worm = 6, mine = 5, crate = 9, oil = 9 }

  -- PerformTrace with damage: the cut, then everything touching the beam.
  local function laser_trace(r, w)
    local x1 = r.x + (LASER_REACH * r.dx)
    local y1 = r.y + (LASER_REACH * r.dy)
    local land = wa.land.trace(r.x, r.y, x1, y1)
    local hx, hy = land and land.x or x1, land and land.y or y1
    if land then
      if r.hit and r.dx == r.last_dx and r.dy == r.last_dy then
        -- The aim held: a clean cut from the last hit to this one.
        local steps = math.max(1, math.floor(math.sqrt(sq(hx - r.hx) + sq(hy - r.hy)) / 2))
        for i = 0, steps do
          wa.land.cut({ x = r.hx + (hx - r.hx) * i / steps, y = r.hy + (hy - r.hy) * i / steps, shape = "circle", radius = 4 })
        end
      else
        wa.land.cut({ x = hx, y = hy, shape = "circle", radius = 4 })
      end
      local s = laser_between(r, 0.6, 0.9)
      laser_particle(r, { x = hx, y = hy, life = 60, drag = 0.2, grav = -0.4, jitter = 0.6,
        s0 = s, s1 = 0.01, c0 = { 255, 0, 0 }, c1 = { 255, 0, 0 } })
      laser_particle(r, { x = hx, y = hy, life = 80, drag = 0, grav = 0,
        s0 = 0.6, s1 = 0.1, c0 = { 200, 0, 0 }, c1 = { 0, 0, 0 } })
    end
    r.hx, r.hy, r.hit = hx, hy, land ~= nil
    local lx, ly = (hx - r.x), (hy - r.y)
    r.draw_beam = lx * lx + ly * ly > 24 * 24
    local length = math.sqrt(lx * lx + ly * ly)
    for _, obj in ipairs(laser_objects()) do
      local ox, oy = (obj.x - r.x), (obj.y - r.y)
      local along = ox * r.dx + oy * r.dy
      local across = math.abs(ox * r.dy - oy * r.dx)
      if along >= 0 and along <= length and across <= 5 + (LASER_RADIUS[obj.kind] or 6)
          and not (obj.kind == "worm" and obj.id == w.id) then
        local key = obj.kind .. ":" .. obj.id
        if obj.kind == "worm" then
          if obj.hp > 0 then
            local taken = r.taken[key] or 0
            local amount = taken >= 45 and 0 or taken >= 10 and 1 or 2
            if amount > 0 then obj:hurt(amount) end
            r.taken[key] = taken + amount
          end
        elseif obj.kind == "oil" or obj.kind == "crate" then
          obj:hit(obj.kind == "oil" and 4 or 1, r.dx, r.dy)
        elseif obj.kind == "mine" and not r.armed[key] then
          r.armed[key] = true
          obj:arm(obj.fuse < 0 and wa.random(1000, 5000) or obj.fuse)
        end
        -- FX_HitObject: a yellow flash and two sparks.
        local px, py = obj.x - (3 * r.dx), obj.y - (3 * r.dy)
        local tone = math.floor(laser_between(r, 0, 50))
        laser_particle(r, { x = px, y = py, life = 10, drag = 0, grav = 0,
          s0 = laser_between(r, 0.4, 0.8), s1 = 0.01, c0 = { 210, 210 - tone, 0 }, c1 = { 210, 50 - tone, 0 } })
        for _ = 1, 2 do
          local a, v = laser_between(r, 0, 2 * math.pi), laser_between(r, 0.5, 1.8)
          laser_particle(r, { x = px, y = py, vx = v * wa.math.cos(a), vy = v * wa.math.sin(a),
            life = 30, drag = 0.05, grav = 1, s0 = laser_between(r, 0.2, 0.4), s1 = 0.01,
            c0 = { 255, 255 - tone, 0 }, c1 = { 255, 80 - tone, 0 } })
        end
      end
    end
  end

  local function laser_stop(r, w)
    r.dead = true
    if w then
      -- WA ends the repeat fire, as when its shots run out.
      w.shots_fired = w.shots_to_fire
      wa.sound.play(w, "sounds/laser_gun/laser_end.wav")
    end
  end

  fires.laser = function(fire)
    local w = fire.worm
    -- Each of WA's shots comes here; one beam per worm, as PX's LaserRayObj.
    if lasers[w.id] then return end
    local r = { worm_id = w.id, life = LASER_LIFE, counter = 0, size = 1.0, first = true,
      taken = {}, armed = {}, fx = {}, seed = (w.x // 1 * 7919 + w.y // 1) % 0x80000000 }
    r.aim, r.facing = w.aim, w.facing
    laser_aim(r, w)
    r.hx, r.hy, r.last_dx, r.last_dy = r.x, r.y, r.dx, r.dy
    lasers[w.id] = r
    wa.sound.play(w, "sounds/laser_gun/laser_start.wav")
    wa.sound.play(w, "sounds/laser_gun/laser_loop.wav")
    wa.actors.spawn({
      sprite = false, x = w.x, y = w.y, gravity = false, collide = false, owner = w,
      on = function(a)
        r.life = r.life - 1
        laser.step(r)
        if r.dead then
          if r.life <= -10 and #r.fx == 0 then
            lasers[r.worm_id] = nil
            a:despawn()
          end
          return
        end
        if r.life <= 0 or w.hp <= 0 or not w.turn or w.weapon ~= "px.laser_gun" or LASER_STOPS[w.state or ""] then
          laser_stop(r, w.hp > 0 and w or nil)
          return
        end
        w.shots_fired, w.shots_to_fire = 0, 1
        r.size = r.size - 0.07
        if r.size < 0.5 then r.size = 1.0 end
        r.aim, r.facing = w.aim, w.facing
        laser_aim(r, w)
        if r.first then
          r.first = false
          laser_sparks(r, 8, 5, 9, 0.4, 0.7) -- FX_InitialBurst
        end
        if (LASER_LIFE - r.life) % LASER_LOOP_FRAMES == 0 then
          wa.sound.play(w, "sounds/laser_gun/laser_loop.wav")
        end
        if r.counter <= 0 then
          r.counter = 3
          laser_trace(r, w)
          laser_sparks(r, 1, 2, 5, 0.2, 0.5) -- FX_MuzzleSparks
        else
          r.counter = r.counter - 1
        end
        r.last_dx, r.last_dy = r.dx, r.dy
      end,
    })
  end

  if wa.on.draw and wa.draw.ribbon then
    wa.on.draw(function()
      for _, r in pairs(lasers) do
        laser.draw_particles(r)
        if not r.dead then
          local c = laser.argb(255, { 255, 0, 0 })
          laser.glow(r.gx, r.gy, 32 * 0.5 * r.size, c)
          if r.draw_beam then laser.beam(r.gx, r.gy, r.hx, r.hy, 2 * 8 * r.size, c) end
          if r.hit then laser.glow(r.hx, r.hy, 32 * 0.75 * r.size, c) end
        end
      end
    end)
  end
end
