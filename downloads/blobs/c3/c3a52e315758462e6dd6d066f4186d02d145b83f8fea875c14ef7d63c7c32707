-- Highlander: what Project X's two lasers share (weapon_gun_lasergun's
-- CLaserRay, which weapon_sentry_laser's CLaserRayS copies): their art, PX's
-- glow particles (PxParticle) and how both are drawn. A ray `r` carries its
-- own particles in `r.fx` and its own random sequence in `r.seed`, so the
-- effects come out the same on every machine.
local laser = {}

laser.GLOW = "sprites/laser_gun/laser_glow.png"
laser.BEAM = "sprites/laser_gun/laser_beam.png"
laser.DEPTH = wa.depth.FRONT

function laser.rand(r)
  r.seed = (r.seed * 1103515245 + 12345) % 0x80000000
  return r.seed / 0x80000000
end

function laser.between(r, lo, hi)
  return lo + (hi - lo) * laser.rand(r)
end

-- A PX particle: moved, pulled and slowed each game frame, drawn additive.
-- { x, y (pixels), vx, vy (pixels/frame), life, drag, grav, jitter, s0, s1 (sizes, 1 = 32
-- px), c0, c1 ({ r, g, b } at birth and death), alpha (255) }.
function laser.particle(r, p)
  p.age, p.vx, p.vy = 0, p.vx or 0, p.vy or 0
  r.fx[#r.fx + 1] = p
end

-- One game frame of the ray's particles.
function laser.step(r)
  for i = #r.fx, 1, -1 do
    local p = r.fx[i]
    p.age = p.age + 1
    if p.age >= p.life then
      table.remove(r.fx, i)
    else
      if p.jitter then
        p.vx = p.vx + (laser.between(r, -p.jitter, p.jitter))
      end
      p.vy = p.vy + (p.grav / 10)
      p.vx, p.vy = p.vx * (1 - p.drag), p.vy * (1 - p.drag)
      p.x, p.y = p.x + p.vx, p.y + p.vy
    end
  end
end

-- An ARGB word from an alpha and { r, g, b }.
function laser.argb(a, rgb)
  return (math.floor(math.max(0, math.min(255, a))) << 24)
    | (math.floor(rgb[1]) << 16) | (math.floor(rgb[2]) << 8) | math.floor(rgb[3])
end

-- The glow sprite, `px` across, centred on (x, y).
function laser.glow(x, y, px, color)
  local h = px / 2
  wa.draw.quad({ sprite = laser.GLOW, blend = "add", color = color, depth = laser.DEPTH,
    points = { { x - h, y - h }, { x + h, y - h }, { x + h, y + h }, { x - h, y + h } } })
end

-- The ray's particles, each fading from its birth size and colour to its
-- death ones.
function laser.draw_particles(r)
  for _, p in ipairs(r.fx) do
    local t = p.age / p.life
    local c = { p.c0[1] + (p.c1[1] - p.c0[1]) * t, p.c0[2] + (p.c1[2] - p.c0[2]) * t,
      p.c0[3] + (p.c1[3] - p.c0[3]) * t }
    laser.glow(p.x, p.y, 32 * (p.s0 + (p.s1 - p.s0) * t), laser.argb(p.alpha or 255, c))
  end
end

-- The beam: a strip of the beam texture `width` px wide from (x0, y0) to
-- (x1, y1).
function laser.beam(x0, y0, x1, y1, width, color)
  wa.draw.ribbon({ sprite = laser.BEAM, blend = "add", depth = laser.DEPTH, points = {
    { x = x0, y = y0, width = width, u = 0, color = color },
    { x = x1, y = y1, width = width, u = 1, color = color },
  } })
end

return laser
