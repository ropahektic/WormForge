-- Highlander: the Sniper Rifle's laser sight. Split from rules.lua by tools/split_highlander.py.
local shared = require("lib/shared")

-- The Sniper Rifle's sight remains a draw callback. Keep only its last aim
-- through its firing poses; the rifle and flash themselves are engine draws.
local held = {}
wa.on.worm_message(function(worm, msg)
  local h = held[worm.id]
  if msg == wa.msg.FIRE_WEAPON and h then h.firing = true end
  if msg ~= wa.msg.FRAME_FINISH then return end
  if worm.weapon == "px.sniper_rifle" and worm.aiming and shared.owns("handgun") then
    held[worm.id] = { slot = "handgun", aim = worm.aim }
  elseif not (h and h.firing and worm.weapon == "px.sniper_rifle"
      and (worm.state == "firing" or worm.state == "fired")) then
    held[worm.id] = nil
  end
end, { msgs = { wa.msg.FIRE_WEAPON, wa.msg.FRAME_FINISH } })

-- ------------------------------------------ the Sniper Rifle's laser sight
-- Shared with later sections; the rest of this section is local to it.
local STOPPERS
do
--
-- PX's LaserSight (weapon_gun_sniper_rifle_sb, on utility_laser_pointer's
-- laserray): while the current worm aims the rifle, a red ray from 12 pixels
-- out along the aim to the first thing in its way, drawn every rendered
-- frame as 100-pixel quads of laser.png, added to the scene, narrowing along
-- the ray, with a faint 7-pixel tip. It is drawing only: wa.on.draw, never
-- the simulation.

local LASER_LEN = 15000
local LASER_WIDTH = 2
local LASER_STEP = 5 -- PX's Trace tests every 5 pixels
-- PX starts the ray on the worm's centre line, but the rifle art's barrel
-- runs 2 pixels to its left (columns 26-29 of 60), so the ray ran that far
-- under the barrel. It starts on the barrel instead.
local LASER_BARREL = 2
local function argb(a, r, g, b)
  return ((a * 256 + r) * 256 + g) * 256 + b
end
local LASER_RED, LASER_START, LASER_TIP =
  argb(255, 255, 48, 48), argb(192, 255, 96, 96), argb(16, 255, 48, 48)
-- PX's Trace stops at anything its 2x2 mask touches. Terrain is traced
-- exactly; objects by these radii in pixels, an estimate of their masks.
STOPPERS = { { wa.worms, 6 }, { wa.mines, 4 }, { wa.crates, 10 }, { wa.oil, 9 } }

local function laser_length(x, y, dx, dy, shooter)
  local len = LASER_LEN
  local hit = wa.land.trace(x, y,
    (x + dx * LASER_LEN), (y + dy * LASER_LEN))
  if hit then
    len = math.sqrt(((hit.x - x) * (hit.x - x)) + ((hit.y - y) * (hit.y - y)))
  end
  for _, s in ipairs(STOPPERS) do
    local list, r = s[1], s[2]
    if list and list.all then
      for _, o in ipairs(list.all()) do
        if o.id ~= shooter then
          local ox, oy = (o.x - x), (o.y - y)
          local t = ox * dx + oy * dy
          if t > 0 and t < len and math.abs(ox * dy - oy * dx) < r then
            len = t
          end
        end
      end
    end
  end
  return math.floor(len / LASER_STEP) * LASER_STEP
end

-- laserray's MakeLaserRayF, point for point.
local function laser_ray(x, y, ang, len)
  local rdx, rdy = wa.math.sin(ang - 1.57), -wa.math.cos(ang - 1.57)
  local dx, dy = wa.math.sin(ang), -wa.math.cos(ang)
  local tx, ty = x, y
  local nparts = math.floor(len / 100)
  local w = (wa.draw.random() / 4 + 0.85) * LASER_WIDTH / 2
  local wdx, wdy = w * rdx, w * rdy
  local wscale = 1
  local lastl = len - nparts * 100
  local colors
  for i = 0, nparts do
    local l = i == nparts and lastl or 100
    if l <= 0 then break end
    local p0, p3 = { tx + wdx, ty + wdy }, { tx - wdx, ty - wdy }
    w = wscale * (wa.draw.random() / 3 + 0.82) * LASER_WIDTH
    wdx, wdy = w * rdx, w * rdy
    wscale = wscale - 0.75 / (nparts + 1)
    local ex, ey = tx + dx * l, ty + dy * l
    colors = { LASER_RED, LASER_RED, LASER_RED, LASER_RED }
    if i == 0 then
      colors[1], colors[4] = LASER_START, LASER_START
    end
    wa.draw.quad({
      points = { p0, { ex + wdx, ey + wdy }, { ex - wdx, ey - wdy }, p3 },
      colors = colors, sprite = "sprites/sniper_rifle/laser", blend = "add",
    })
    tx, ty = ex, ey
  end
  local ex, ey = tx + dx * 7, ty + dy * 7
  wa.draw.quad({
    points = { { tx + wdx, ty + wdy }, { ex + wdx, ey + wdy }, { ex - wdx, ey - wdy }, { tx - wdx, ty - wdy } },
    colors = { LASER_RED, LASER_TIP, LASER_TIP, LASER_RED },
    sprite = "sprites/sniper_rifle/laser", blend = "add",
  })
end

if wa.on.draw then
  wa.on.draw(function()
    for _, worm in ipairs(wa.worms.all()) do
      -- The aim the rifle was drawn with, so the ray leaves along it; while
      -- the worm aims or fires the rifle, not while it puts it away.
      local h = worm.turn and held[worm.id]
      local aim = h and h.slot == "handgun" and h.aim
      if aim then
        local ang = (1 - aim) * 3.14159
        if worm.facing < 0 then
          ang = 6.28318 - ang
        end
        local side = LASER_BARREL * worm.facing
        local x = worm.x + wa.math.sin(ang) * 12 - wa.math.cos(ang) * side
        local y = worm.y - wa.math.cos(ang) * 12 - wa.math.sin(ang) * side
        laser_ray(x, y, ang, laser_length(x, y, wa.math.sin(ang), -wa.math.cos(ang), worm.id))
      end
    end
  end)
end
end

shared.STOPPERS = STOPPERS
shared.held = held
