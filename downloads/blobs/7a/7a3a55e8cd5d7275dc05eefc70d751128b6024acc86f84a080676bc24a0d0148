-- PX p_portalgun2: a pair per team, orange (-) and blue (+). Ctrl/Alt
-- chooses the other colour for one shot. Pause toggles the team's pair.
-- The transport rules are reusable Lua; WA keeps the transported bodies.
local shared = require("lib/shared")
local Portals = require("lib/portals")
local Effects = require("lib/portal_effects")
-- The slot the Portal Gun sits on this match (its home: Scales of Justice).
local SLOT, ART = "px.portal_gun", "sprites/portal_gun/"
local SPEED = 35
local chosen, held, half_used = {}, {}, {}
local bolts, effects = {}, Effects.new()
local ticker
local colours = { 0xFFDF6400, 0xFF003FEF }
local team_colours = { 0xD21400, 0x0014DC, 0x00DC00, 0xFADC00, 0xDC00DC, 0x00E6E6 }
local function sound(name, worm) wa.sound.play(worm, "sounds/" .. name .. ".wav") end
local network = Portals.new({ grace = 0, on_transport = function(body, entry)
  effects:transport(entry)
  if (body.kind or "worm") == "worm" then sound("portal_teleport", body) end
end })
shared.portals = network

local function tick()
  network:tick()
  effects:tick(wa.world.gravity())
  for _, group in ipairs(wa.sorted(network.pairs)) do
    local pair = network.pairs[group]
    if pair.active and pair[1] and pair[2] and network.age % 500 ~= 0 then
      for colour = 1,2 do effects:ambient(pair[colour]) end
    end
  end
  -- Bounded return cache, without userdata or freed native pointers.
  if network.age % 150 == 0 then
    local alive = {}
    for _, worm in ipairs(wa.worms.all()) do alive["worm:" .. worm.id] = true end
    for _, list in ipairs({wa.missiles, wa.mines, wa.crates, wa.oil, wa.graves, wa.arrows}) do
      for _, body in ipairs(list.all()) do alive[body.kind .. ":" .. body.uid] = true end
    end
    if shared.portal_bowling_balls then
      for _, body in ipairs(shared.portal_bowling_balls()) do alive["actor:" .. body.id] = true end
    end
    for _, key in ipairs(wa.sorted(network.last_exit)) do
      if not alive[key] then network.last_exit[key] = nil end
    end
  end
end
local function ensure_ticker(worm)
  if ticker then return end
  ticker = wa.actors.spawn({ sprite = ART .. "portal_glow.png", x = 0, y = -1000,
    owner = worm, gravity = false, collide = false, on = { frame = tick } })
  ticker:scale(0)
end

-- PX's CheckWall: at least one of its four diagonal traces touches land.
local function supported(x, y)
  for _, d in ipairs({ {-15,-15}, {15,15}, {-15,15}, {15,-15} }) do
    local hit = wa.land.trace(x, y, x + d[1], y + d[2])
    if hit and hit.hit then return true end
  end
  return false
end
local function shooter(b)
  for _, w in ipairs(wa.worms.all()) do if w.id == b.worm_id then return w end end
end
local function place(b, hit)
  if hit.y >= wa.world.water() or not supported(hit.x, hit.y) then
    effects:impact(hit.x, hit.y, true)
    sound("portal_gun_failhit", shooter(b))
    return false
  end
  local p, fresh = network:place(b.team, b.colour, hit.x, hit.y, hit.nx, hit.ny, b.team_colour)
  if not p then effects:impact(hit.x, hit.y, true); sound("portal_gun_failhit", shooter(b)); return false end
  if fresh then chosen[b.team] = 3 - b.colour end
  sound("portal_gun_hit", shooter(b))
  effects:impact(hit.x, hit.y, false)
  -- Each two successful placements use one ammo. Misses are refunded, as
  -- PX's FireFinal/TakeOffPortalWeap; attribute delayed hits to their shooter.
  if half_used[b.worm_id] then
    half_used[b.worm_id] = nil
    local worm = shooter(b)
    if worm then worm:ammo(SLOT, -1) end
  else half_used[b.worm_id] = true end
  return true
end
local function remove(b)
  bolts[b.id] = nil
  b.a:despawn()
end
local function bolt_frame(b)
  b.age = b.age + 1
  local size = wa.world.size()
  if b.x < 0 or b.x > size.w or b.y < -size.h then b.vy = b.vy + wa.world.gravity() end
  local hit = wa.world.trace({ x0 = b.x, y0 = b.y, x1 = b.x + b.vx, y1 = b.y + b.vy,
    with = {"terrain"}, radius = 0 })
  if hit and hit.hit then
    place(b, hit)
    remove(b)
    return
  end
  b.x, b.y = b.x + b.vx, b.y + b.vy
  if b.y >= wa.world.water() or b.age > 600 or math.abs(b.x) > 32000 or math.abs(b.y) > 32000 then
    remove(b); return
  end
  b.a.x, b.a.y = b.x, b.y
  b.a:frame((b.age // 2) % 20)
  b.a:gfx({ scale = 0.12, tint = colours[b.colour] & 0xFFFFFF, depth = wa.depth.OBJECTS })
  effects:trail(b.x, b.y, b.colour)
end
local function air_aim(worm, keys)
  if (keys.left or keys.right) and keys.up then return 0.75 end
  if (keys.left or keys.right) and keys.down then return 0.175 end
  if keys.left or keys.right then return 0.5 end
  if keys.down then return 0 end
  if keys.up then return 1 end
  return worm.aim
end
shared.fires.portal_gun = function(fire)
  local worm, keys = fire.worm, wa.world.keys()
  ensure_ticker(worm)
  local colour = chosen[worm.team] or 1
  if keys.ctrl or keys.alt then colour = 3 - colour end
  local aim = fire.airborne and air_aim(worm, keys) or worm.aim
  local angle = (1 - aim) * math.pi
  local dx, dy = wa.math.sin(angle) * worm.facing, -wa.math.cos(angle)
  local power = fire.power or 1
  local b = { x = worm.x + dx, y = worm.y + dy,
    vx = (dx * SPEED * power), vy = (dy * SPEED * power),
    worm_id = worm.id, team = worm.team, team_colour = team_colours[worm.alliance + 1],
    colour = colour, age = 0 }
  -- Native ground fire consumes ammo after this callback; airborne fire
  -- dispatches Lua alone and therefore needs no refund.
  if not fire.airborne then worm:ammo(SLOT, 1) end
  local a = wa.actors.spawn({ sprite = ART .. "portal_ball", x = b.x, y = b.y,
    owner = worm, gravity = false, collide = false, on = { frame = function() bolt_frame(b) end } })
  b.a, b.id = a, a.id
  a:gfx({ scale = 0.12, tint = colours[colour] & 0xFFFFFF, depth = wa.depth.OBJECTS })
  bolts[b.id] = b
  sound("portal_gun_shoot", worm)
end

wa.on.body_move(function(body) if next(network.pairs) then network:move(body) end end,
  { kinds = { "worm", "missile", "mine", "crate", "oil", "grave", "arrow" } })
wa.on.worm_message(function(worm)
  if not worm.turn then return end
  local keys, id, team = wa.world.keys(), worm.id, worm.team
  local old = held[id] or {}
  if keys.pause_key and not old.pause_key then
    local pair = network.pairs[team]
    if pair then
      network:active(team, not pair.active)
      sound(pair.active and "portal_active" or "portal_inactive", worm)
    end
  end
  -- Jumping and falling it fires through on_fire (the claim's airborne =
  -- true, the profile's "Fires jumping, falling" setting).
  if worm.weapon == SLOT then
    if keys.minus_key and not old.minus_key then chosen[team] = 1 end
    if keys.plus_key and not old.plus_key then chosen[team] = 2 end
  end
  held[id] = { portal = worm.weapon == SLOT, plus_key = keys.plus_key, minus_key = keys.minus_key, pause_key = keys.pause_key }
end, { msgs = { wa.msg.FRAME_FINISH } })
wa.on.turn_start(function() network:turn_start(); held = {} end)
wa.on.turn_end(function() network:turn_end() end)

if wa.on.hud then wa.on.hud(function()
  local worm = shared.current_worm()
  if worm and worm.weapon == SLOT then
    wa.hud.line("Portal Gun: " .. ((chosen[worm.team] or 1) == 1 and "ORANGE" or "BLUE")
      .. " (- orange, + blue; Ctrl/Alt other colour; Pause toggle)")
  end
end) end

if wa.on.draw then
  local function quad(sprite, x, y, w, h, angle, colour, blend, depth, frame)
    local c, s = wa.math.cos(angle or 0), wa.math.sin(angle or 0)
    local points = {}
    for _, v in ipairs({ {-w/2,-h/2}, {w/2,-h/2}, {w/2,h/2}, {-w/2,h/2} }) do
      points[#points + 1] = { x + (v[1]*c-v[2]*s), y + (v[1]*s+v[2]*c) }
    end
    wa.draw.quad({sprite = ART .. sprite, points = points, color = colour, blend = blend,
      depth = depth or wa.depth.OBJECTS, frame = frame or 0})
  end
  wa.on.draw(function()
    for _, group in ipairs(wa.sorted(network.pairs)) do
      local pair = network.pairs[group]
      for colour = 1, 2 do
        local p = pair[colour]
        if p then
          -- PX's CAnimation draws the endpoint independently of CPortal's
          -- linked/active state. Its alpha=50 is a percentage and draws the
          -- image repeatedly, not a byte alpha that makes singles disappear.
          local angle = math.pi / 2 - wa.math.atan(p.nx, p.ny)
          quad(colour == 1 and "portal_orange.png" or "portal_blue.png", p.draw_x, p.draw_y,
            40, 100, angle, 0xFFFFFFFF, "add")
          quad("portal_black_mask", p.draw_x - (p.x-p.draw_x)*2, p.draw_y - (p.y-p.draw_y)*2,
            12.5, 12.5, 0, (135 << 24) | (p.team_colour or 0xFFFFFF), "alpha",
            wa.depth.OBJECTS - 1, (network.age // 50) % 2)
        end
      end
    end
    effects:draw(quad)
    local worm = shared.current_worm()
    if worm and worm.weapon == SLOT and worm.aiming then
      local keys = wa.world.keys()
      local colour = chosen[worm.team] or 1
      if keys.ctrl or keys.alt then colour = 3 - colour end
      quad("portal_gun_glow.png", worm.x, worm.y, 80, 80,
        worm.facing * (0.5 - worm.aim) * math.pi, (100 << 24) | (colours[colour] & 0xFFFFFF), "add", 0x000CFFFF)
    end
  end)
end
shared.portal_air_aim = air_aim
