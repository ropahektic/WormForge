-- Highlander: Sentry Gun (PX weapon_sentry_gun: sentrygun.txt's PxSentryGun),
-- on the Kamikaze slot as PX's Highlander scheme has it. The turret itself
-- (placing, planting, aiming, reloading, damage) is lib/turret.lua; this is
-- what it fires: stock Uzi rounds with PX's damage and spread, ejecting
-- casings. Ported from the standalone sentry_gun pack
-- (mods/examples/sentry_gun_old).
local shared = require("lib/shared")
local turret = require("lib/turret")
local ART = "sprites/sentry_gun/"
local SND = "sounds/sentry_gun/"
local DAMAGE = 2           -- per round
local MUZZLE_OUT = 11      -- pixels from the pivot along the bore
-- PX rolls a barrel deviation for each round and keeps every 5th one
-- pin-point: tenths of a degree, from WA's shared RNG.
local SPREAD_TENTHS = 20   -- +-2.0 degrees
-- PX ejects a shell casing (WA's "uzicase" frames) on every shot, sideways
-- from the barrel to the side the turret faces, with a little random angle
-- and speed, gravity and no bounce, gone after 100 frames.
local CASING = ART .. "casing"
local CASING_FRAMES, CASING_LIFE = 16, 100
local CASING_JITTER_DEG = 17                  -- PX's RandomFloat(-0.3, 0.3) rad
local CASING_SPEED_MIN, CASING_SPEED_MAX = 200, 300 -- PX's 2.0 to 3.0, hundredths

-- Tints for the grey head, from PX's own render (G/R about 0.39 and B/R
-- about 0.28 on its red housing), the dominant channel pinned at 255: a
-- vertex tint only scales down. Red to cyan, as worm.alliance + 1. The same
-- colours tint the housing the worm carries (worm_sprites_team_tint).
local TEAM_TINT = { 0xFF6447, 0x4764FF, 0x47FF64, 0xE6E647, 0xE647E6, 0x47E6E6 }
shared.sentry_team_tint = TEAM_TINT

local function casing(t, a, s, rad)
  local jitter = wa.random(-CASING_JITTER_DEG, CASING_JITTER_DEG)
  local eject = rad + math.rad(90 * s.side + jitter)
  local speed = wa.random(CASING_SPEED_MIN, CASING_SPEED_MAX) / 100
  local life, spin = CASING_LIFE, 0
  wa.actors.spawn({
    sprite = CASING, x = a.x, y = a.y - t.muzzle_up,
    vx = (wa.math.sin(eject) * speed), vy = (wa.math.cos(eject) * speed),
    gravity = false, collide = false, owner = t.owner(a, s), kind = "casing",
    on = function(c)
      life = life - 1
      if life <= 0 then c:despawn(); return end
      c:gravity()
      c:move({ terrain = false, worms = false })
      spin = (spin + 1) % CASING_FRAMES
      c:frame(spin)
    end,
  })
end

-- WA traces and handles each impact exactly as a stock Uzi round, including
-- directional push and its small hit graphics. Ignore only the emitting
-- sentry's body/feet during tracing. WA handles intervening worms/objects,
-- friendly fire and nearby hits; no synthetic explosions or impact actors.
local function fire(t, a, s)
  local owner = t.owner(a, s)
  -- The native gun needs a living worm parent. An eliminated coalition's
  -- sentry retains its colour/ammo, and can fire again after capture/revival.
  if owner == a then t.stop_firing(a, s); return end
  s.shots = s.shots + 1
  local dev = 0
  if s.shots % 5 ~= 0 then dev = wa.random(-SPREAD_TENTHS, SPREAD_TENTHS) / 10 end
  local rad = math.rad(s.angle + dev)
  local dx, dy = wa.math.sin(rad), wa.math.cos(rad)
  local mx, my = turret.muzzle(t, a, s.angle)
  casing(t, a, s, rad)
  wa.weapons.fire_bullet {
    weapon = "stock.uzi", owner = owner,
    x = mx, y = my, dx = dx, dy = dy, damage = DAMAGE, ignore = { a },
  }
  s.ammo = s.ammo - 1
  if s.ammo <= 0 then
    s.active = false
    t.stop_firing(a, s)
  end
end

local gun = turret.new({
  kind = "sentry", weapon = "px.sentry_gun",
  muzzle_out = MUZZLE_OUT,
  art = { base = ART .. "turret_base", mask = ART .. "turret_mask.png", gun = ART .. "turret_gun", flare = ART .. "turret_flare", light = ART .. "turret_light.png" },
  sounds = {
    place = SND .. "sentryplace.wav", beep = SND .. "sentrybeeps2.wav",
    fire_loop = SND .. "sentryfireloop.wav", fire_end = SND .. "sentryfireend.wav",
    servo_start = SND .. "sentryservostart.wav", servo_loop = SND .. "sentryservoloop.wav",
    servo_end = SND .. "sentryservoend.wav",
  },
  tints = TEAM_TINT,
  fire = fire,
})

shared.fires.sentry_gun = function(fire_ev) gun.place(fire_ev) end
shared.sentry_gun = gun -- for the Highlander mock
