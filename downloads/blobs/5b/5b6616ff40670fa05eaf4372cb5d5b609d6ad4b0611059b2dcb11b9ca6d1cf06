-- Highlander: Wind Changer, Gravity Control. Split from rules.lua by tools/split_highlander.py.
local shared = require("lib/shared")
local current_worm = shared.current_worm
local trunc = shared.trunc

-- ---------------------------------------------- Wind Changer, Gravity Control
do
--
-- PX's wind_changer_script (ravander, improved by 0rang3) and
-- gravity_control_script (DabbyB, edited by 0rang3). Both records are one of
-- WA's turn utilities (subtype 19) with an index WA does not use (8), so WA
-- fires them as a utility that does nothing, spending the shot as usual, and
-- the script does the work.
--
-- Wind Changer, on the surrender's slot: while it is selected, 0..9 choose
-- the force; firing it sets the wind to force x 0.0317 towards where the
-- worm faces, through WA's own wind change, so the clouds and the wind bar
-- follow. Gravity Control, on low gravity's slot: 1..5 choose 0.3, 0.5, 1,
-- 1.7 or 2.4 times the match's gravity; firing it holds WA's gravity there
-- until the turn ends, or until the turn clock has stood still for 10 s (PX's
-- rule). Fired with nothing chosen it does not fire (PX gives the shot back).
--
-- The clock stands still while WA waits for everything to settle after a
-- shot, about 2.4 s, so shots land under the chosen gravity. Some things
-- never settle under a strong gravity: a grave vibrated in place for good at
-- 2.4x, WA waited for it, and the turn never went on. After 10 s the gravity
-- goes back and they come to rest.
--
-- Differences: a HUD line says which keys to press and what is chosen, in
-- place of PX's team messages.

local WIND_STEP = 0.0317       -- wind per point of force (PX's), a turn's wind is up to about 0.29
local GRAVITY_FACTORS = { 0.3, 0.5, 1.0, 1.7, 2.4 }
local GRAVITY_NAMES = { "Very Low Gravity", "Low Gravity", "Normal Gravity", "High Gravity", "Very High Gravity" }

local wind_force = 0          -- wf
local gravity_choice          -- TransformedGravity's index, until fired
local gravity_initial         -- InitialGravity: the match's
local gravity_factor          -- ModulatedGravity while Gravity Control is on
local SETTLE_LIMIT = 500      -- frames (10 s) the turn clock may stand still
local clock_seen = {}         -- worm id -> { clock, frames }: each worm counts the frames itself
local last_digit              -- KeyPressedNow: a digit counts when it goes down

local function gravity_back()
  gravity_factor, clock_seen = nil, {}
  wa.world.set_gravity(gravity_initial)
end

-- Every worm sees each frame once, so the first to count SETTLE_LIMIT frames
-- with the clock where it was marks 10 s, whichever worms are still alive.
local function watch_clock(worm)
  if not gravity_factor then
    return
  end
  local clock = wa.world.turn_clock()
  local seen = clock_seen[worm.id]
  if not seen or seen.clock ~= clock then
    clock_seen[worm.id] = { clock = clock, frames = 0 }
    return
  end
  seen.frames = seen.frames + 1
  if seen.frames >= SETTLE_LIMIT then
    gravity_back()
  end
end

local function world_physics_frame(worm)
  gravity_initial = gravity_initial or wa.world.gravity()
  watch_clock(worm)
  if not worm.turn then
    return
  end
  local digit = wa.world.keys().digit
  local pressed = digit ~= nil and digit ~= last_digit
  last_digit = digit
  if not pressed then
    return
  end
  if worm.weapon == "px.wind_changer" then
    wind_force = digit
    wa.sound.play(worm, 107)
  elseif worm.weapon == "px.gravity_control" and digit >= 1 and digit <= 5 then
    gravity_choice = digit
    wa.sound.play(worm, 92)
  end
end

wa.on.worm_message(function(worm, msg)
  if msg == wa.msg.FRAME_FINISH then
    world_physics_frame(worm)
  elseif msg == wa.msg.FIRE_WEAPON and worm.weapon == "px.wind_changer" then
    -- FireFinal(Wind Changer): breeze for none, a calm wind up to 5, strong
    -- above; towards where the worm faces.
    local f = wind_force
    wa.sound.play(worm, f == 0 and "sounds/wind_changer/breeze.wav"
      or f < 6 and "sounds/wind_changer/calm_wind.wav" or "sounds/wind_changer/strong_wind.wav")
    wa.world.set_wind((f * WIND_STEP) * worm.facing)
  elseif msg == wa.msg.FIRE_WEAPON and worm.weapon == "px.gravity_control" then
    if not gravity_choice then
      wa.sound.play(worm, "sounds/gravity_control/error.wav")
      return "eat"
    end
    gravity_initial = gravity_initial or wa.world.gravity()
    gravity_factor, gravity_choice = GRAVITY_FACTORS[gravity_choice], nil
    clock_seen = {}
    wa.sound.play(worm, "sounds/gravity_control/activate.wav")
    wa.world.set_gravity(gravity_initial * gravity_factor)
  end
end, { msgs = { wa.msg.FRAME_FINISH, wa.msg.FIRE_WEAPON } })

-- Reset when this turn ends; doing it at the next turn start can softlock.
wa.on.turn_end(function()
  if gravity_factor then
    gravity_back()
  end
  gravity_choice = nil
end)

if wa.on.hud then
  wa.on.hud(function()
    local worm = current_worm()
    if not worm then
      return
    end
    if worm.weapon == "px.wind_changer" then
      wa.hud.line(string.format("Wind Changer: force %d (keys 0-9), then Space", wind_force))
    elseif worm.weapon == "px.gravity_control" then
      wa.hud.line("Gravity Control: " .. (gravity_choice and GRAVITY_NAMES[gravity_choice]
        or "choose 1-5") .. ", then Space")
    end
  end)
end
end
