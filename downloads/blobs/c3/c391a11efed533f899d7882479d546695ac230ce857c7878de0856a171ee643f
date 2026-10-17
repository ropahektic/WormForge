-- Highlander: Helicopter. Split from rules.lua by tools/split_highlander.py.
local shared = require("lib/shared")

-- -------------------------------------------------------------- Helicopter
-- Shared with later sections; the rest of this section is local to it.
local trunc
do
--
-- PX's helicopter_user_script, on WA's jet pack. While the jet pack runs,
-- the script flies the worm itself from the worm's own move keys. The engine
-- consumes them after this callback, so WA neither thrusts nor burns fuel.
-- Speed builds while a key is held and dies away when it is not; fuel burns
-- with it (not during retreat), and a crash -- an explosion sized by the fuel
-- left and the speed -- when the fuel runs out, the worm reaches water, the
-- turn ends, or it hits something other than a mine faster than a pixel a
-- frame, the ground included: landing slower than that is PX's smooth
-- landing. The worm's body is hidden behind the helicopter, and behind PX's
-- climb-in animation while WA winds the jet pack up; its labels, the fuel
-- counter among them, stay, as with PX's RenderWorm override.
--
-- Speeds and factors use Lua floats; the engine rounds writes to WA fields.

-- Its fuel, PX's FuelAmount, is its record's (`jet_pack.fuel`, in
-- claims.lua's FIXES): WA gives it the worm when the jet pack starts.
local HELI_REALISTIC = true      -- gravity and wind act on it, at 0.2
local HELI_EXPLODE_ON_TURN_END = true
local HELI_DEPTH = wa.depth.FRONT       -- in front of worms and terrain

local helis = {} -- worm id -> { flying, launch, jumpin, jump_phase, frame, ticks, body, climb }

function trunc(v)
  return v >= 0 and math.floor(v) or math.ceil(v)
end

local function heli_of(worm)
  local h = helis[worm.id]
  if not h then
    h = { flying = false, launch = false, jumpin = false, jump_phase = 0, frame = 0, ticks = 0 }
    helis[worm.id] = h
  end
  return h
end

local function heli_actor(worm, sheet)
  return wa.actors.spawn({
    sprite = sheet, x = worm.x, y = worm.y, gravity = false,
    collide = false, owner = worm, on = function() end,
  })
end

local function heli_drop_art(h, worm)
  if h.body then h.body:despawn(); h.body = nil end
  if h.climb then h.climb:despawn(); h.climb = nil end
  worm.body_visible = true
end

local HELI_OOPS = {
  [2] = "sounds/helicopter/oops1.wav", [4] = "sounds/helicopter/oops2.wav",
  [6] = "sounds/helicopter/huh.wav", [8] = "sounds/helicopter/poop.wav",
  [10] = "sounds/helicopter/idiot.wav",
}

-- DisableHeli: blow up, sized by the fuel left and the speed, and land.
local function heli_crash(worm, h, sx, sy)
  if not h.flying then
    return
  end
  local speed = (math.abs(sy) + math.abs(sx)) / 2
  local size = trunc((worm.fuel - 75) / 10 * speed)
  if size < 10 then size = 10 end
  -- The worm's own explosion: a spawn needs an owner, and outside a brain
  -- (from wa.on.contact) there is none to inherit.
  wa.actors.spawn({
    sprite = false, x = worm.x, y = worm.y, gravity = false, collide = false,
    owner = worm, explode = { damage = size * 2, id = size, now = true },
  })
  worm.gravity = 1
  worm.wind = 0
  local oops = HELI_OOPS[wa.random(1, 10)]
  if oops then wa.sound.play(worm, oops) end
  h.flying = false
  heli_drop_art(h, worm)
end

-- One of PX's key responses, towards `dir` (-1 up or left, 1 down or
-- right): a kick that fades as the speed that way reaches 10 pixels a frame.
-- PX: if (SpY > -1) SpY -= 0.2; if (SpY > -4) SpY -= 0.4; ... for up.
local function push(v, dir)
  local s = -dir * v
  if s > -1 then s = s - 0.2 end
  if s > -4 then s = s - 0.4 end
  if s > -8 then s = s - 0.15 end
  if s > -10 then s = s - 0.05 end
  return -dir * s
end

local function heli_frame(worm)
  local h = helis[worm.id]
  local state = worm.state
  -- WS_FIRED: WA winding up the Helicopter; PX shows its climb-in. This is
  -- also where it is armed: once it fires, WA may already have cleared the
  -- worm's selection (its last shot of the Helicopter), and PX decides at
  -- FireFinal, from the weapon actually fired.
  if worm.weapon == "px.helicopter" and state == "prefiring" and not (h and h.flying) then
    h = heli_of(worm)
    h.jumpin, h.armed = true, true
    h.jump_phase = h.jump_phase + 0.047
  end
  -- FireFinal: the jet pack it wound up has started.
  if h and h.armed and state == "jetpacking" and not h.flying then
    worm.gravity = HELI_REALISTIC and 0.2 or 0
    worm:jetpack_steer(true)
    h.flying, h.launch, h.ticks, h.armed = true, true, 0, false
  elseif h and h.armed and not worm.turn then
    h.armed = false -- the turn ended before it fired
  end
  if not h then
    return
  end
  if h.flying then
    if state ~= "jetpacking" then
      -- WA owns the landing and its resulting state. Only remove our art
      -- and physics overrides when WA has ended the jet pack.
      worm:jetpack_steer(false)
      worm.gravity, worm.wind = 1, 0
      h.flying = false
      heli_drop_art(h, worm)
      return
    end
    local vx, vy = worm.vx, worm.vy
    -- Rotor and radio, while it moves.
    if vx ~= 0 or vy ~= 0 then
      if h.ticks % 47 == 0 then wa.sound.play(worm, "sounds/helicopter/helicopterloop.wav") end
      local radio = wa.random(1, 200)
      if radio % 20 == 0 and radio <= 80 then
        wa.sound.play(worm, "sounds/helicopter/" .. (radio // 20) .. ".wav")
      end
    end
    h.ticks = h.ticks + 1
    if worm.y >= wa.world.water() then
      heli_crash(worm, h, vx, vy)
      return
    end
    if h.launch then
      h.jump_phase, h.jumpin, h.launch = 0, false, false
      if HELI_REALISTIC then worm.wind = 0.2 end
    end
    local k = worm.keys
    local up, down, left, right = k.up, k.down, k.left, k.right
    if not up and not down then vy = vy / 1.105 end
    if not left and not right then vx = vx / 1.105 end
    if up and down then vy = vy / 1.095 end
    if left and right then vx = vx / 1.095 end
    -- Diagonals: PX's lines damp each pair twice.
    for _, d in ipairs({ { up, right }, { up, left }, { down, right }, { down, left } }) do
      if d[1] and d[2] then
        vx, vy = vx * 0.99 * 0.99, vy * 0.99 * 0.99
      end
    end
    h.frame = (h.frame + 1) % 3
    local fuel = worm.fuel
    local burn = wa.world.retreat() == 0
    if burn then fuel = fuel - 0.020 end
    local shift = wa.world.keys().shift
    if up then
      if burn then fuel = fuel - 0.2 end
      vy = push(vy, -1)
    end
    if down then
      if burn then fuel = fuel - 0.020 end
      vy = push(vy, 1)
    end
    if left then
      if burn then fuel = fuel - 0.1 end
      if not shift then worm.facing = -1 end
      vx = push(vx, -1)
    end
    if right then
      if burn then fuel = fuel - 0.1 end
      if not shift then worm.facing = 1 end
      vx = push(vx, 1)
    end
    worm.vx, worm.vy, worm.fuel = vx, vy, fuel
    if worm.fuel <= 0.1 then
      heli_crash(worm, h, worm.vx, worm.vy)
      return
    end
    if HELI_EXPLODE_ON_TURN_END and not worm.turn then
      heli_crash(worm, h, worm.vx, worm.vy)
      return
    end
  end
  -- What PX draws in the worm's place.
  local f = worm.facing
  if h.flying then
    if h.climb then h.climb:despawn(); h.climb = nil end
    h.body = h.body or heli_actor(worm, "sprites/helicopter/flying")
    local a = h.body
    a.x, a.y, a.vx, a.vy, a.facing = worm.x, worm.y, 0, 0, f
    a:frame(h.frame)
    a:gfx({ angle = math.deg(wa.math.sin(worm.vx / 24)) % 360, depth = HELI_DEPTH })
    worm.body_visible = false
  elseif h.jumpin and state == "prefiring" then
    h.climb = h.climb or heli_actor(worm, "sprites/helicopter/jumpin")
    local a = h.climb
    a.x = worm.x + (f > 0 and -11.5 or 12.5)
    a.y, a.vx, a.vy, a.facing = worm.y + 1, 0, 0, f
    a:frame(math.min(math.floor(h.jump_phase * 23), 22))
    a:gfx({ depth = HELI_DEPTH })
    worm.body_visible = false
  elseif h.body or h.climb then
    h.jumpin, h.jump_phase = false, 0
    heli_drop_art(h, worm)
  end
end

wa.on.worm_message(function(worm, msg)
  if msg == wa.msg.FRAME_FINISH then
    heli_frame(worm)
  end
end, { msgs = { wa.msg.FRAME_FINISH } })

-- Collide: hitting anything but a mine faster than a pixel a frame crashes
-- it, the ground included -- a slow landing is PX's smooth landing -- judged
-- on the speed before WA exchanged velocities.
if wa.on.contact then
  wa.on.contact(function(worm, other, c)
    local h = helis[worm.id]
    if h and h.flying and other.kind ~= "mine"
        and (math.abs(c.vx) > 1 or math.abs(c.vy) > 1) then
      heli_crash(worm, h, c.vx, c.vy)
    end
  end)
end
end

-- Shared by the balloon and glider handlers to recognize the equipped weapon.
local balloons = {}

shared.balloons = balloons
shared.trunc = trunc
