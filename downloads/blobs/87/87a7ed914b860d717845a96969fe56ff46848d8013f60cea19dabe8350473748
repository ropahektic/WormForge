-- Highlander: the weapon holds the engine draws. Split from rules.lua by tools/split_highlander.py.
local shared = require("lib/shared")

-- ---------------------------------------------------------------- weapons

-- PX's sprite builder, for the weapons below whose hold PX draws at run
-- time: the worm posture with no weapon in it, and its hands. The engine
-- draws the weapon and optional hand from the hold claim below.
local PX_POSTURE = {
  weaponlnk = "sprites/px_hold/aim", weaponlnku = "sprites/px_hold/aimu",
  weaponlnkd = "sprites/px_hold/aimd",
  wthrow = "sprites/px_hold/draw", wthrowu = "sprites/px_hold/drawu",
  wthrowd = "sprites/px_hold/drawd",
}
local PX_HANDS = {
  "sprites/px_hold/hand_rad_lower", "sprites/px_hold/hand_rad", "sprites/px_hold/hand_rad_upper",
}
local PX_HOLDS = {
  prod = {
    keep_while_firing = true,
    sheet = "sprites/javelin/hold", draw_hand = false,
    hand_radius = 0, hand_rotation = 0, hand_radial_rotation = 0,
    weap_radial_rotation = 0, weap_rotation = 1, weap_radius = -11.8,
    animate = true, anim_speed = 1.25, frames = 12,
  },
  earthquake = { -- Electric Grenade (electric_grenade_anim)
    thrown = true,
    sheet = "sprites/px_hold/electric_grenade.png", hand_type = 1,
    hand_radius = 15, hand_scale = 0.8,
    weap_rotation = 0.5, weap_radius = 9,
  },
  grenade = { -- Sticky Bomb (sb_script)
    -- Thrown: once fired it has left the worm's hands, and WA puts nothing
    -- away (as for its own grenades), so neither does the rule.
    thrown = true,
    sheet = "sprites/px_hold/sticky_bomb", hand_type = 1, hand_radius = 24,
    hand_rotation = 1.0, hand_radial_rotation = 1.05, hand_scale = 0.8,
    weap_rotation = 0.5, weap_radial_rotation = 0.9, weap_radius = 10,
  },
  petrol_bomb = { -- Valyrian Fire (valyrianfire_s)
    thrown = true,
    sheet = "sprites/px_hold/valyrian_fire.png", hand_type = 1, hand_radius = -6.0,
    hand_rotation = 0.0, hand_radial_rotation = 0.0, hand_scale = 1.0,
    weap_rotation = 0.35, weap_radial_rotation = 0.0, weap_radius = -8.0,
  },
  super_banana = { -- Chilli Bomb (chilli_bomb_anim)
    thrown = true,
    sheet = "sprites/px_hold/chilli_bomb", hand_type = 1, hand_radius = 13,
    hand_scale = 0.8, weap_rotation = 0.5, weap_radius = 9,
  },
  homing_missile = { -- Igniter (igniter_anim)
    -- Up through the shot too: it has no firing poses of its own, so WA
    -- fires it in the aim posture, empty-handed without the hold. Not PX's.
    keep_while_firing = true,
    sheet = "sprites/px_hold/igniter", hand_type = 2, hand_radius = -6.0,
    hand_rotation = 1.0, hand_radial_rotation = 0.9, hand_scale = 0.8,
    weap_rotation = 1.0, weap_radial_rotation = 0.0, weap_radius = 0.0,
  },
  salvation_army = { -- Ferret (ferret_s's WormSprite): held still, not at the
    -- aim's angle (dont_rotate_with_angle), and thrown.
    thrown = true,
    sheet = "sprites/ferret/hold.png", hand_type = 2, hand_radius = -8.0,
    hand_rotation = 0.0, hand_radial_rotation = -0.13, hand_scale = 1.0,
    weap_rotation = 0.5, weap_radial_rotation = 0.22, weap_radius = -9.0,
    static = { weap = 0.0, hand = 0.45 }, -- ang_if_static, hand_ang_if_static
  },
  mine = { -- Nuke Rocket (nuke_rocket_anim): held at a fixed angle, not
    -- the aim's (dont_rotate_with_angle), and placed, so never put away.
    thrown = true,
    sheet = "sprites/px_hold/nuke_rocket", hand_type = 2, hand_radius = 13.0,
    hand_rotation = -0.6, hand_radial_rotation = -0.95, hand_scale = 1.0,
    weap_rotation = 0.45, weap_radial_rotation = 1.0, weap_radius = 8.5,
    static = { weap = -0.1, hand = 0.4 }, -- ang_if_static, hand_ang_if_static
  },
  handgun = { -- Sniper Rifle (sniper_rifle_script): its hand at scale 0
    -- Up through each shot, with its laser, over the snipefire poses (the
    -- worm lit by the muzzle), so it does not flicker between the three.
    -- Not PX's: PX hides it until the worm aims again.
    keep_while_firing = true,
    -- A muzzle flash on each shot. Not PX's: its rifle and snipefire poses
    -- have none. The sentry gun's flare, smaller, at the barrel's tip (30
    -- pixels out, on the barrel 2 to the side, as the laser leaves it).
    flash = { sheet = "sprites/sniper_rifle/flash", out = 30, side = 2, scale = 0.45, frames = 3 },
    sheet = "sprites/px_hold/sniper_rifle", draw_hand = false, hand_radius = -6.0,
    hand_rotation = 1.0, hand_radial_rotation = 0.9,
    weap_rotation = 1.0, weap_radial_rotation = 0.0, weap_radius = 0.1,
  },
  longbow = { -- Shadow-Bolt (shadow_bolt_script): no hand, the bolt animated
    -- The crossbow stays up through the shot: it has no firing poses of
    -- its own, so WA fires it in the aim posture. Not PX's.
    keep_while_firing = true,
    sheet = "sprites/px_hold/shadow_bolt", draw_hand = false, hand_radius = 0.0,
    hand_rotation = 0.0, hand_radial_rotation = 0.0,
    weap_rotation = 1.0, weap_radial_rotation = 0.0, weap_radius = 3.5,
    animate = true, anim_speed = 1.30, frames = 6,
  },
}

-- Each replace claim carries its own hold data. The engine draws it and
-- handles walking/aim/firing; no simulation actors are created for it.
for _, p in pairs(PX_HOLDS) do
  if p.draw_hand ~= false then p.hand = PX_HANDS[p.hand_type or 2] end
end

shared.PX_HOLDS = PX_HOLDS
shared.PX_POSTURE = PX_POSTURE
