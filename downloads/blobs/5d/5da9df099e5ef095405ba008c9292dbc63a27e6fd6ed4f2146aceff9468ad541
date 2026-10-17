-- Highlander: Sentry Laser (PX weapon_sentry_laser: SentryLaser.txt's
-- PxSentryLaser and CLaserRayS, by rafa``2), on the Dragon Ball slot as
-- PX's Highlander scheme has it. Projectile defence: the turret of
-- lib/turret.lua, aimed not at worms but at the nearest moving missile, mine
-- or Bowling Ball of another colour within 300 px, in sight beyond its barrel-sweep grace area. Each of
-- its 4 shots a turn is a short laser in its owner's colour that
-- disintegrates the target (gone, no explosion) and burns what is in
-- between: worms 10, crates and oil drums 20, a mine armed, a 4 px hole
-- where it stops. It fires on any colour's turn.
--
-- Differences: WA's arrows (PX also shot them) are not listed to Lua, so it
-- ignores them; a mine the beam crosses is armed on its fuse, as the Laser
-- Gun's beam does, rather than sent PX's gun damage.
local shared = require("lib/shared")
local turret = require("lib/turret")
local laser = require("lib/laser")
local ART = "sprites/sentry_laser/"
local SND = "sounds/sentry_laser/"
local RAY_LIFE = 10          -- CLaserRayS LifeTime: frames the beam shows
-- PX's ray starts at the barrel's centre (BarrelOffsetX 17, scaled 0.8) and
-- 6 px on.
local MUZZLE_OUT = 17 * 0.8 + 6
-- PX rocks the barrel (2 px either way) while it fires; here for this long
-- after each shot.
local RECOIL_FRAMES = 12
local HOLE = 4               -- MakeHole(4) where the beam stops
local WORM_DAMAGE, OBJECT_DAMAGE = 10, 20
-- The circles the beam touches things within (as the Laser Gun's).
local RADIUS = { worm = 6, mine = 5, crate = 9, oil = 9 }

-- The body's tint (as the Sentry Gun's housing, red to cyan) and the beam's
-- colour, PX's pure team colours.
local TEAM_TINT = shared.sentry_team_tint or { 0xFF6447, 0x4764FF, 0x47FF64, 0xE6E647, 0xE647E6, 0x47E6E6 }
local BEAM_RGB = {
  { 255, 0, 0 }, { 0, 0, 255 }, { 0, 255, 0 }, { 255, 255, 0 }, { 255, 0, 255 }, { 0, 255, 255 },
}

local rays = {} -- every ray still showing, in the order fired

-- What it shoots at: WA's missiles and mines (their team's colour), then the
-- Bowling Balls, each in its list's order, which every machine shares.
local function targets()
  local out = {}
  for _, group in ipairs({ wa.missiles, wa.mines }) do
    for _, o in ipairs(group.all()) do
      out[#out + 1] = { key = o.id, x = o.x, y = o.y, alliance = o.alliance,
        moving = o.vx ~= 0 or o.vy ~= 0, obj = o }
    end
  end
  if shared.bowling_ball_targets then
    for _, b in ipairs(shared.bowling_ball_targets()) do
      out[#out + 1] = { key = "ball:" .. b.id, x = b.x, y = b.y, alliance = b.alliance,
        moving = b.moving, ball = b.id }
    end
  end
  return out
end

-- Everything the beam from (x0, y0) along (dx, dy), `length` px, touches:
-- worms, mines, crates and oil drums, in that order.
local function touched(x0, y0, dx, dy, length, skip)
  local out = {}
  for _, group in ipairs({ wa.worms, wa.mines, wa.crates, wa.oil }) do
    for _, obj in ipairs(group.all()) do
      if obj.id ~= skip then
        local ox, oy = (obj.x - x0), (obj.y - y0)
        local along = ox * dx + oy * dy
        local across = math.abs(ox * dy - oy * dx)
        if along >= 0 and along <= length and across <= (RADIUS[obj.kind] or 6) then
          out[#out + 1] = obj
        end
      end
    end
  end
  return out
end

-- FX_HitObject: a yellow flash and three sparks.
local function fx_hit_object(r, x, y)
  local tone = math.floor(laser.between(r, 0, 50))
  laser.particle(r, { x = x, y = y, life = 10, drag = 0, grav = 0,
    s0 = laser.between(r, 0.4, 0.8), s1 = 0.01, c0 = { 210, 210 - tone, 0 }, c1 = { 210, 50 - tone, 0 } })
  for _ = 1, 3 do
    local a, v = laser.between(r, 0, 2 * math.pi), laser.between(r, 0.5, 1.8)
    tone = math.floor(laser.between(r, 0, 50))
    laser.particle(r, { x = x, y = y, vx = v * wa.math.cos(a), vy = v * wa.math.sin(a),
      life = 50, drag = 0.05, grav = 1, jitter = 0.2, s0 = laser.between(r, 0.5, 0.7), s1 = 0.01,
      c0 = { 255, 255 - tone, 0 }, c1 = { 255, 80 - tone, 0 } })
  end
end

-- PX's Disintegrate: bursts at the muzzle and where the target was.
local function fx_disintegrate(r, x, y)
  local c, dim = r.rgb, { r.rgb[1] * 0.2, r.rgb[2] * 0.2, r.rgb[3] * 0.2 }
  for _ = 1, 5 do -- FX_InitialBurst
    local v = laser.between(r, 5, 8)
    local ang = r.ang + laser.between(r, -0.25, 0.25)
    laser.particle(r, { x = r.x, y = r.y, vx = -v * wa.math.sin(ang), vy = -v * wa.math.cos(ang),
      life = 40, drag = 0.1, grav = 0.4, jitter = 0.5, s0 = laser.between(r, 0.4, 0.7), s1 = 0.01,
      c0 = c, c1 = dim, alpha = 215 })
  end
  laser.particle(r, { x = r.x, y = r.y, life = 25, drag = 0, grav = 0, s0 = 0.6, s1 = 0.01,
    c0 = c, c1 = dim, alpha = 225 }) -- FX_BarrelFlash
  local tone = math.floor(laser.between(r, 0, 50))
  local v = laser.between(r, 2, 5)
  laser.particle(r, { x = r.x, y = r.y, vx = v * wa.math.sin(r.ang), vy = -v * wa.math.cos(r.ang),
    life = 30, drag = 0.3, grav = 0.8, jitter = 0.8, s0 = laser.between(r, 0.2, 0.5), s1 = 0.01,
    c0 = { 255, 255 - tone, 0 }, c1 = { 255, 80 - tone, 0 } }) -- FX_MuzzleSparks
  for i = 0, 3 do -- FX_Disintegrate
    local a = math.pi / 4 + math.pi / 2 * i
    laser.particle(r, { x = x, y = y, vx = 1.5 * wa.math.sin(a), vy = 1.5 * wa.math.cos(a),
      life = 60, drag = 0.05, grav = 0, s0 = 0.5, s1 = 0.01, c0 = c, c1 = dim })
  end
  fx_hit_object(r, x, y)
  -- FX_HitTerrain
  laser.particle(r, { x = x, y = y, life = 40, drag = 0.2, grav = -0.4, jitter = 0.6,
    s0 = laser.between(r, 0.6, 0.9), s1 = 0.01, c0 = c, c1 = c })
  laser.particle(r, { x = x, y = y, life = 50, drag = 0, grav = 0, s0 = 0.6, s1 = 0.1,
    c0 = c, c1 = { c[1] * 0.3, c[2] * 0.3, c[3] * 0.3 } })
end

-- The ray shows for RAY_LIFE frames and its particles live on after it.
local function ray_actor(r, body)
  wa.actors.spawn({
    sprite = false, x = r.x, y = r.y, gravity = false, collide = false, owner = body,
    on = function(a)
      laser.step(r)
      r.life = r.life - 1
      r.size = r.size - 0.07
      if r.size < 0.5 then r.size = 1.0 end
      if r.life == 0 then a:sound("sounds/laser_gun/laser_end.wav") end
      if r.life <= 0 and #r.fx == 0 then
        for i, other in ipairs(rays) do
          if other == r then table.remove(rays, i) break end
        end
        a:despawn()
      end
    end,
  })
end

-- One shot (CLaserRayS): from the muzzle to the target, or to the land or
-- object before it; burns what is in between, cuts a hole where it stops,
-- and disintegrates the target.
local function fire(t, a, s, target)
  local ang = math.rad(s.angle)
  local x0, y0 = turret.muzzle(t, a, s.angle)
  local hx, hy = target.x, target.y
  local land = turret.trace(a, x0, y0, hx, hy)
  if land then hx, hy = land.x, land.y end
  local lx, ly = (hx - x0), (hy - y0)
  local length = math.sqrt(lx * lx + ly * ly)
  local dx, dy = 0, 0
  if length > 0 then dx, dy = lx / length, ly / length end

  local r = { x = x0, y = y0, hx = hx, hy = hy, life = RAY_LIFE, size = 1.0, fx = {},
    ang = ang, rgb = BEAM_RGB[s.alliance + 1] or { 125, 125, 125 },
    seed = (x0 // 1 * 7919 + y0 // 1) % 0x80000000 }
  rays[#rays + 1] = r
  a:sound("sounds/laser_gun/laser_start.wav")

  wa.land.cut({ x = hx, y = hy, shape = "circle", radius = HOLE })
  for _, obj in ipairs(touched(x0, y0, dx, dy, length, target.obj and target.obj.id)) do
    if obj.kind == "worm" then
      if obj.hp > 0 then obj:hurt(WORM_DAMAGE) end
    elseif obj.kind == "crate" or obj.kind == "oil" then
      obj:hit(OBJECT_DAMAGE, dx, dy)
    elseif obj.kind == "mine" and not s.armed[obj.id] then
      s.armed[obj.id] = true
      obj:arm(obj.fuse < 0 and wa.random(1000, 5000) or obj.fuse)
    end
    fx_hit_object(r, obj.x + (3 * dx), obj.y + (3 * dy))
  end

  -- A shot stopped by intervening terrain cannot destroy a target beyond it.
  if not land then
    if target.ball then
      shared.remove_bowling_ball(target.ball)
    elseif target.obj then
      target.obj:remove()
    end
    fx_disintegrate(r, target.x, target.y)
    a:sound(SND .. "sentrylaserdisin.wav")
    -- The target is gone: acquire the next one with its own beep and delay.
    s.tid, s.had_target = nil, false
  end
  ray_actor(r, a)

  t.stop_firing(a, s)
  s.recoil = RECOIL_FRAMES
  s.ammo = s.ammo - 1
  if s.ammo <= 0 then s.active = false end
end

local sentry = turret.new({
  kind = "sentry_laser", weapon = "px.sentry_laser",
  muzzle_out = MUZZLE_OUT,
  sensor_px = 300, ammo = 4, shot_frames = 6, activate = 20, beep_frames = 20,
  rot_active = 5.0, aim_tolerance = 5.0, health = 35, hold_own_turn = false,
  art = { base = ART .. "turret_base", mask = ART .. "turret_mask.png", gun = ART .. "turret_body", barrel = ART .. "turret_barrel", light = ART .. "turret_light.png" },
  sounds = {
    place = SND .. "sentrylaserplace.wav", beep = SND .. "sentrylaserbeep.wav",
    servo_start = SND .. "sentrylaserstart.wav", servo_loop = SND .. "sentrylaserloop.wav",
    servo_end = SND .. "sentrylaserend.wav",
  },
  tints = TEAM_TINT,
  targets = targets,
  fire = fire,
})

-- A mine the beam has armed stays armed: once per turret, not per shot.
local place = sentry.place
sentry.place = function(fire_ev)
  local body, s = place(fire_ev)
  if s then s.armed = {} end
  return body, s
end

shared.fires.sentry_laser = function(fire_ev) sentry.place(fire_ev) end
shared.sentry_laser = sentry -- for the Highlander mock

if wa.on.draw and wa.draw.ribbon then
  wa.on.draw(function()
    for _, r in ipairs(rays) do
      laser.draw_particles(r)
      if r.life > 0 then
        local c = laser.argb(255, r.rgb)
        laser.beam(r.x, r.y, r.hx, r.hy, 2 * 4 * r.size, c)
        laser.glow(r.hx, r.hy, 32 * 0.4 * r.size, c)
      end
    end
  end)
end
