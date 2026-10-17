-- Highlander: PX's missile sprites. Split from rules.lua by tools/split_highlander.py.
local shared = require("lib/shared")
local HOLD_DEPTH = shared.HOLD_DEPTH
local frame_of = shared.frame_of
local next_phase = shared.next_phase

-- ------------------------------------ PX's missile sprites, at run time
-- Shared with later sections; the rest of this section is local to it.
local flying, current_worm
do
--
-- For some weapons PX draws the missile itself (p_sprite_builder,
-- WeapSprite) and leaves WA's sprite 0: a sprite that follows the missile,
-- turned to its flight, mirrored when it flies left, and, if `animate`,
-- stepped through its sheet as a hold is. Here it is a GPU actor per
-- missile, placed from wa.on.missile_frame after WA has moved the missile.
-- It reads m.weapon (the missile's slot); on an engine without it nothing
-- matches and nothing is drawn. With `hide`, WA draws nothing for the
-- missile (m.sprite = 0), as PX's sprite 0 does; its record keeps its
-- sprite, which a thrown weapon's worm posture is picked by.
--
-- How it turns follows the record's animation type (the entry's +0x64,
-- PX's launchdata.anim.type): 2, WAT_TrackMovement, faces its flight
-- (WeapSprite type 2, as a bazooka shell); 1, WAT_Rotation, spins with its
-- speed (type 3, as a grenade), which `spin` asks for.

-- Slot -> the weapon's WeapSpriteParams, as its PX script states them.
local PX_WEAP_SPRITES = {
  prod = {
    sheet = "sprites/javelin/flight", hide = true,
    animate = true, anim_speed = 1.90, frames = 12,
  },
  longbow = { -- Shadow-Bolt
    sheet = "sprites/shadow_bolt/bolt", animate = true, anim_speed = 1.30, frames = 6,
  },
  super_banana = { -- Chilli Bomb (chilli_bomb_anim) and the five it bursts into
    sheet = "sprites/px_hold/chilli_bomb", frames = 1,
    spin = true, -- its record's WAT_Rotation
    -- WA's own sprite 0, as PX's record has it: nothing under the chilli.
    hide = true,
  },
  homing_missile = { -- Igniter (igniter_anim: igniter_bullet, 16 frames)
    sheet = "sprites/igniter/flight", animate = true, anim_speed = 1.0, frames = 16,
  },
  petrol_bomb = { -- Valyrian Fire: its bottle, spun at PX's 0.35 (WeapSprite speed)
    sheet = "sprites/px_hold/valyrian_fire.png", frames = 1,
    spin = true, spin_speed = 0.35,
    hide = true, -- PX's record has sprite 0; the stock bottle is the throw sheet's
  },
  earthquake = { -- Electric Grenade (electric_grenade_anim: electric_grenade_bullet)
    sheet = "sprites/px_hold/electric_grenade.png", frames = 1,
    spin = true, -- its record's WAT_Rotation
    -- PX's record has sprite 0; the pack's stock grenade is only for the
    -- worm's throw sheet.
    hide = true,
  },
}

flying = {} -- missile id -> { actor, phase, seen }

-- The actor goes when its missile stops reporting: WA has freed it.
local function follow_missile(id)
  return function(a)
    local f = flying[id]
    if f and f.seen then
      f.seen = false
      return
    end
    if f and f.actor == a then
      flying[id] = nil
    end
    a:despawn()
  end
end

-- The worm whose turn it is: WeapSprite's owner (GetCurrentWorm()). A
-- missile frame gives no spawn owner of its own.
function current_worm()
  for _, w in ipairs(wa.worms.all()) do
    if w.turn then
      return w
    end
  end
end

-- A missile can outlive the turn it was fired in: a Chilli's five burst
-- after a blast that hurt the thrower, which ends WA's turn. With no worm
-- holding the turn, the last turn's worm owns the sprite, or it would not
-- be drawn at all while WA still flies the missile. That worm may have
-- died since, and WA frees a dead worm: it is kept by id and looked up
-- among the living, and if it is gone any living worm owns the sprite.
-- Left undrawn instead, the missile would show WA's own sprite, which
-- another weapon may have taken over (the Electric Grenade's is the stock
-- grenade, which the Sticky Bomb redraws as its bomb).
local last_turn_id
wa.on.turn_start(function(event)
  last_turn_id = event.worm and event.worm.id
end)

local function sprite_owner()
  local turn = current_worm()
  if turn then return turn end
  if not last_turn_id then return nil end
  local any
  for _, w in ipairs(wa.worms.all()) do
    if w.id == last_turn_id then return w end
    any = any or w
  end
  return any
end

wa.on.missile_frame(function(m)
  local home = shared.home(m.weapon)
  local p = shared.owns(home) and PX_WEAP_SPRITES[home]
  -- WA's sprite is hidden only where PX's is drawn in its place: with no
  -- owner for ours, WA's stays.
  if p and p.hide and m.phase == "pre" and (flying[m.id] or sprite_owner()) then
    m.sprite = 0
  end
  p = m.phase == "post" and p
  if not p then
    return
  end
  local f = flying[m.id]
  if not f then
    local owner = sprite_owner()
    if not owner then
      return
    end
    f = { phase = 0, rot = 0 }
    f.actor = wa.actors.spawn({
      sprite = p.sheet, x = m.x, y = m.y, gravity = false, collide = false,
      owner = owner, on = follow_missile(m.id),
    })
    flying[m.id] = f
  end
  f.seen = true
  local a = f.actor
  a.x, a.y, a.vx, a.vy = m.x, m.y, 0, 0
  a.facing = m.vx < 0 and -1 or 1
  if p.animate then
    f.phase = next_phase(f.phase, p.anim_speed)
    a:frame(frame_of(f.phase, p.frames))
  end
  local rot
  if p.spin then
    -- WeapSprite type 3: speed * (vx * 0.15 + |vy| * 0.01, towards vx) a
    -- frame, in pixels a frame and radians; WeapSprite's speed is 0.5
    -- unless the weapon's script sets it.
    local vx, vy = m.vx, m.vy
    local sign = vx > 0 and 1 or vx < 0 and -1 or 0
    f.rot = f.rot + (p.spin_speed or 0.5) * (vx * 0.15 + math.abs(vy * 0.01) * sign)
    rot = f.rot
  else
    -- WeapSprite::CalculateAngle, rotation 0.
    rot = -wa.math.atan(m.vx, m.vy) - math.pi
  end
  a:gfx({ angle = math.deg(rot) % 360, depth = HOLD_DEPTH })
end)
end

shared.current_worm = current_worm
