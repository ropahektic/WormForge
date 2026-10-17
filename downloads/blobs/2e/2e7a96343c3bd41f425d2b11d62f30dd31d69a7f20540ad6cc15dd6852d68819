-- PX p_portalgun2 DoTrailEffects/DoSpark/DoFlash and p_portal2
-- DoPortalEffects/DoTeleportationEffects, using the existing GPU draw API.
-- This local random stream drives looks only, never WA's gameplay RNG.
local Effects = {}
Effects.__index = Effects
local TAU = 2 * math.pi
local function trunc(x) return x >= 0 and math.floor(x) or -math.floor(-x) end
local function palette(colour, shift)
  if colour == 1 then return {255,255-shift,0}, {255,80-shift,0} end
  return {0,120-shift,255}, {0,80-shift,255}
end

function Effects.new()
  return setmetatable({ particles = {}, seed = 0x504F5254 }, Effects)
end
function Effects:random(lo, hi)
  local s = self.seed
  s = (s ~ (s << 13)) & 0xFFFFFFFF
  s = (s ~ (s >> 17)) & 0xFFFFFFFF
  s = (s ~ (s << 5)) & 0xFFFFFFFF
  self.seed = s
  return lo + (hi-lo) * (s / 0x100000000)
end
function Effects:particle(x, y, spec)
  -- Twelve endpoints emit at most 180 ambient particles at once. Bound
  -- bursts too, so repeated transport cannot accumulate an unbounded list.
  if #self.particles >= 1024 then return end
  local angle, speed = self:random(0, TAU), self:random(spec.speed[1], spec.speed[2])
  self.particles[#self.particles+1] = {
    x = x, y = y, vx = wa.math.cos(angle)*speed, vy = wa.math.sin(angle)*speed,
    age = 0, life = spec.life, sprite = spec.sprite or "lightning_glow.png",
    pixels = spec.pixels or 128, size = spec.size, end_size = spec.end_size or 0.01,
    start = spec.start, finish = spec.finish, alpha = spec.alpha or 255,
    resistance = 1/(1+(spec.resistance or 0)), gravity = spec.gravity or 0,
    randomness = spec.randomness or 0, angle = spec.angle or 0, spin = spec.spin or 0,
  }
end
function Effects:ambient(p)
  local first, last = palette(p.colour, math.floor(self:random(0, 51)))
  self:particle(p.x, p.y, { life=15, speed={2.5,4}, resistance=0.5, gravity=-0.5,
    randomness=1, size=self:random(0.1,0.4), start=first, finish=last,
    angle=p.colour==1 and 12 or 0.9, spin=p.colour==1 and 50 or 10 })
end
function Effects:transport(p)
  for _=1,5 do
    local first, last = palette(p.colour, math.floor(self:random(0, 51)))
    self:particle(p.x, p.y, { life=40, speed={3.5,8}, resistance=0.5, gravity=-0.5,
      randomness=3, size=self:random(0.3,1), start=first, finish=last })
  end
end
function Effects:impact(x, y, failed)
  -- PX's ExplodeAt emits 7 + 10 sparks; a rejected portal adds 30.
  for _=1,(failed and 47 or 17) do
    local shift = math.floor(self:random(0,51))
    self:particle(x, y, { sprite="portal_glow.png", pixels=32, life=40,
      speed={1.5,3.8}, resistance=0.05, gravity=1, randomness=0.2,
      size=self:random(0.2,0.4), start={255,255-shift,0}, finish={255,80-shift,0},
      angle=1.23, spin=25 })
  end
  local shift = math.floor(self:random(0,51))
  self:particle(x, y, { life=3, speed={0,0}, alpha=150, randomness=0.2,
    size=self:random(2,3.2), end_size=0.11,
    start={255,255-shift,255}, finish={200,225-shift,125} })
end
function Effects:trail(x, y, colour)
  local first = colour==1 and {45,10,4} or {4,10,45}
  local last = colour==1 and {45,25,4} or {4,25,45}
  self:particle(x, y, { life=15, speed={0,0}, size=0.5, end_size=0.35,
    start=first, finish={0,0,0} })
  self:particle(x, y, { life=40, speed={0,0.8}, size=0.3, end_size=0.35,
    start=last, finish={0,0,0} })
end
function Effects:tick(gravity)
  for i=#self.particles,1,-1 do
    local p = self.particles[i]
    p.age = p.age+1
    if p.age >= p.life then table.remove(self.particles,i)
    else
      p.angle = (p.angle+p.spin+math.pi) % TAU-math.pi
      p.x, p.y = p.x+p.vx, p.y+p.vy
      p.vx, p.vy = p.vx*p.resistance, p.vy*p.resistance+p.gravity*gravity
      if p.randomness > 0 then
        local angle, speed = self:random(0,TAU), self:random(0,p.randomness)
        p.vx, p.vy = p.vx+wa.math.cos(angle)*speed, p.vy+wa.math.sin(angle)*speed
      end
    end
  end
end
function Effects:draw(quad)
  for _, p in ipairs(self.particles) do
    local t = p.age/p.life
    local rgb = {}
    for i=1,3 do rgb[i]=trunc(p.start[i]+t*(p.finish[i]-p.start[i])) end
    local size = p.pixels*(p.size+t*(p.end_size-p.size))
    local colour = (p.alpha << 24) | (rgb[1] << 16) | (rgb[2] << 8) | rgb[3]
    quad(p.sprite, p.x, p.y, size, size, p.angle, colour, "add", wa.depth.EFFECTS - 1)
  end
end
return Effects
