-- Reusable portal pairs. The gun supplies placement/controls/art; a pair
-- owns traversal, return suppression, clearance and its velocity strategy.
local default_velocity = require("lib/portal_velocity")
local Network = {}
Network.__index = Network
local OFFSET = { {0,1}, {-1,1}, {-1,0}, {-1,-1}, {0,-1}, {1,-1}, {1,0}, {1,1} }
local function trunc(x) return x >= 0 and math.floor(x) or -math.floor(-x) end

-- PX's GetHitAngle: eight surface directions, using the outward normal.
local function direction(nx, ny)
  if ny >= 0.95 then return 1 end
  if nx < 0 and ny > 0.25 and ny < 0.97 then return 2 end
  if nx <= -0.90 then return 3 end
  if nx < 0 and ny < -0.20 and ny > -0.97 then return 4 end
  if ny <= -0.97 then return 5 end
  if nx > 0 and ny < -0.20 and ny > -0.97 then return 6 end
  if nx >= 0.97 then return 7 end
  if nx > 0 and ny > 0.25 and ny < 0.97 then return 8 end
end
local function inside(p, x, y)
  return x > p.x - p.w / 2 and x < p.x + p.w / 2
     and y > p.y - p.h / 2 and y < p.y + p.h / 2
end
-- Centre crossing, extended to a swept segment for shots faster than the
-- opening. Called before WA collides, so a missile survives the entry wall.
local function crossing(p, x, y, vx, vy)
  if inside(p, x, y) then return 0 end
  local lo, hi = 0, 1
  for _, axis in ipairs({ {x, vx, p.x, p.w}, {y, vy, p.y, p.h} }) do
    local a, v, centre, size = table.unpack(axis)
    local left, right = centre - size / 2, centre + size / 2
    if v == 0 then
      if a <= left or a >= right then return nil end
    else
      local t0, t1 = (left - a) / v, (right - a) / v
      if t0 > t1 then t0, t1 = t1, t0 end
      lo, hi = math.max(lo, t0), math.min(hi, t1)
      if lo >= hi then return nil end
    end
  end
  return lo < 1 and lo or nil
end
local function identity(body)
  local kind = body.kind or "worm"
  return kind .. ":" .. tostring((kind == "worm" or kind == "actor") and body.id or body.uid)
end

function Network.new(options)
  options = options or {}
  return setmetatable({ pairs = {}, last_exit = {}, age = 0,
    width = (options.width or 40), height = (options.height or 50),
    offset = (options.offset or 10),
    velocity = options.velocity or default_velocity,
    clearance = options.clearance,
    on_transport = options.on_transport,
    grace = options.grace or 150,
  }, Network)
end

function Network:place(group, colour, x, y, nx, ny, team_colour)
  local dir = direction(nx, ny)
  if not dir then return nil end
  assert(colour == 1 or colour == 2)
  local pair = self.pairs[group] or { active = true }
  local other = pair[3 - colour]
  -- PX's exclusion uses the impact point and the other rect plus 10px.
  if other and math.abs(x - other.x) < other.w / 2 + 10
    and math.abs(y - other.y) < other.h / 2 + 10 then return nil end
  local fresh = pair[colour] == nil
  local p = pair[colour] or {}
  p.group, p.colour, p.team_colour = group, colour, team_colour
  p.x, p.y = x + OFFSET[dir][1] * self.offset, y + OFFSET[dir][2] * self.offset
  p.draw_x, p.draw_y, p.dir, p.nx, p.ny = x, y, dir, nx, ny
  p.w, p.h = self.width, self.height
  -- PX's final constructor else puts straight exits at the centre. Its
  -- diagonals use the inner x edge and one/ two thirds down the rectangle.
  p.exit_x, p.exit_y = p.x, p.y
  if dir == 2 or dir == 4 or dir == 6 or dir == 8 then
    p.exit_x = p.x + OFFSET[dir][1] * (p.w / 2 - 5)
    p.exit_y = trunc(p.y + OFFSET[dir][2] * p.h / 6)
  end
  pair[colour] = p
  self.pairs[group] = pair
  return p, fresh
end

function Network:active(group, on)
  local pair = self.pairs[group]
  if pair then pair.active = on ~= false end
end
function Network:turn_start()
  for _, group in ipairs(wa.sorted(self.pairs)) do
    local pair = self.pairs[group]
    pair.active, pair.ended_at = true, nil
  end
end
function Network:turn_end()
  for _, group in ipairs(wa.sorted(self.pairs)) do
    local pair = self.pairs[group]
    pair.ended_at = self.age
    if self.grace == 0 then pair.active = false end
  end
end
function Network:tick()
  self.age = self.age + 1
  for _, group in ipairs(wa.sorted(self.pairs)) do
    local pair = self.pairs[group]
    if pair.ended_at and self.age - pair.ended_at > self.grace then pair.active = false end
  end
end
function Network:move(body)
  local kind = body.kind or "worm"
  if kind == "worm" and (body.hp <= 0 or body.taken) then return false end
  local key = identity(body)
  local x, y, vx, vy = body.x, body.y, body.vx, body.vy
  local last = self.last_exit[key]
  if last then
    if inside(last, x, y) then return false end
    self.last_exit[key] = nil
  end
  local entry, exit, best
  for _, group in ipairs(wa.sorted(self.pairs)) do
    local pair = self.pairs[group]
    if pair.active and pair[1] and pair[2] then
      for colour = 1, 2 do
        local p = pair[colour]
        local t = crossing(p, x, y, vx, vy)
        if t and (not best or t < best) then entry, exit, best = p, pair[3-colour], t end
      end
    end
  end
  if not entry then return false end
  if best > 0 then
    local hit = wa.land.trace(x, y, x + vx * best, y + vy * best)
    if hit and hit.hit then return false end
  end
  local tx, ty = exit.exit_x, exit.exit_y
  if self.clearance then
    tx, ty = self.clearance(body, exit)
    if not tx then return false end
  elseif not body:fits(tx, ty, "terrain") then
    -- PX's emergency clearance. Do not transport into a still blocked exit.
    wa.land.cut({x = tx, y = ty, shape = "circle", radius = 15})
    if not body:fits(tx, ty, "terrain") then return false end
  end
  local nvx, nvy, facing = self.velocity(kind, entry.dir, exit.dir, vx, vy, body.facing)
  local spec = { x = tx, y = ty, vx = nvx, vy = nvy }
  if kind == "worm" then spec.facing = facing end
  if not body:warp(spec) then return false end
  self.last_exit[key] = exit
  if self.on_transport then self.on_transport(body, entry, exit) end
  return true
end
Network.direction, Network.inside, Network.crossing = direction, inside, crossing
return Network
