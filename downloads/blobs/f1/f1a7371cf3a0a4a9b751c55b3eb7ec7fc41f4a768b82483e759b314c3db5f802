-- Highlander: Super Tele. Split from rules.lua by tools/split_highlander.py.
local shared = require("lib/shared")
local fires = shared.fires

-- --------------------------------------------------------------- Super Tele
do
-- PX's FireFinal arms the teleport, the next M_FRAME starts its pose and
-- sound, and M_FRAME moves the worm 50 frames after that. Keep the click
-- from WA's fire context: the live pointer
-- may have moved by the time the worm arrives. Mask 4 is approximated by
-- three overlapping round cuts, centred where PX places them.
fires.teleports = {} -- worm id -> frozen target and elapsed frames

local function super_tele_arrive(worm, x, y)
  worm.x, worm.y = x, y
  for _, rise in ipairs({ 0, 10, 22 }) do
    wa.land.cut({ x = x, y = y - rise, shape = "circle", radius = 12 })
  end
end

-- WA's sound slots and the priority its teleport plays them at.
local TELE_SOUND_PRIORITY = 3
local SOUND_TELEPORT, SOUND_COMMUNICATOR, SOUND_WORM_POP = 67, 68, 54
-- WA's manual placement plays Communicator at the click and WormPop when
-- the worm appears, this many frames later.
local PLACEMENT_POP_FRAMES = 21

-- During manual placement WA keeps unplaced worms at (960, -10000).
local function unplaced(worm) return worm.y == -10000 end

-- WA's own teleport places a worm at the click, with no wind-up. Super
-- Tele's record is a click weapon, which winds up first: for an unplaced
-- worm the wind-up is skipped, so the click places it at once. On the fire
-- message, before WA starts the wind-up; at the frame's end as a fallback.
local function skip_placement_windup(worm)
  if worm.weapon == "px.super_tele" and unplaced(worm) and worm.windup == nil then
    worm.windup = 0
  end
end

fires.super_tele_click = function(ev)
  local worm = ev.worm
  if worm.hp <= 0 then return end
  local y = ev.y
  if wa.world.cavern() and y < 19 then y = 19 end
  local previous = fires.teleports[worm.id]
  if previous and previous.marker then previous.marker:despawn() end
  -- Waiting 50 frames there makes an unplaced worm fall and take damage
  -- before the arrival, so it is placed now. It sounds like WA's own
  -- placement.
  if unplaced(worm) then
    super_tele_arrive(worm, ev.x, y)
    worm:teleport_pose()
    wa.sound.play(worm, SOUND_COMMUNICATOR, TELE_SOUND_PRIORITY)
    fires.teleports[worm.id] = { placed = true, frames = 0 }
    return
  end
  -- FireWeapon clears WA's planted X for click-only weapons. Keep a fixed
  -- stock planted-X marker at the saved target until the worm arrives instead;
  -- the engine plays it once, as WA plays its own.
  local marker = wa.actors.spawn({
    owner = worm, x = ev.x, y = y, sprite = "markerr",
    gravity = false, collide = false, drown = false,
  })
  fires.teleports[worm.id] = { x = ev.x, y = y, frames = 0, pending = true, marker = marker }
  wa.sound.play(worm, SOUND_COMMUNICATOR, TELE_SOUND_PRIORITY) -- PX's M_SETTARGET confirmation
end

wa.on.worm_message(function(worm, msg)
  if msg == wa.msg.FIRE_WEAPON then
    skip_placement_windup(worm)
    return
  end
  if worm.state == "prefiring" then skip_placement_windup(worm) end
  local tele = fires.teleports[worm.id]
  if not tele then return end
  if tele.placed then
    tele.frames = tele.frames + 1
    if tele.frames < PLACEMENT_POP_FRAMES then return end
    fires.teleports[worm.id] = nil
    if worm.hp > 0 then wa.sound.play(worm, SOUND_WORM_POP, TELE_SOUND_PRIORITY) end
    return
  end
  if worm.hp <= 0 then
    tele.marker:despawn()
    fires.teleports[worm.id] = nil
    return
  end
  if tele.pending then
    tele.pending = false
    -- WA's teleport setup clears its activity flag. Do this after the
    -- Lua-handled FireWeapon return restores that flag, as PX's M_FRAME does.
    worm:teleport_pose()
    wa.sound.play(worm, SOUND_TELEPORT, TELE_SOUND_PRIORITY) -- PX's teleport start
    return
  end
  tele.frames = tele.frames + 1
  if tele.frames < 50 then return end
  tele.marker:despawn()
  fires.teleports[worm.id] = nil
  super_tele_arrive(worm, tele.x, tele.y)
end, { msgs = { wa.msg.FRAME_FINISH, wa.msg.FIRE_WEAPON } })
end
