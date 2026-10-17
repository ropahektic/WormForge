-- Highlander: Weapon Crate (PX utility_all_crates: allcrates_script.txt's
-- "Weapon Crate", by Steps and rafa``2, animations by 0rang3), on the Freeze
-- slot as PX's Highlander scheme has it. Its record is PX's: placed as WA
-- places a mine (its take-out, placing and ammo), and the turn goes on. What
-- it places is one of WA's weapon crates, its contents WA's pick, teleported
-- in 40 px in front of the worm, for the worm to go and collect. Every worm
-- gets one each turn (scheme/rules.lua).
local shared = require("lib/shared")
local AHEAD = 40 -- px in front of the worm

shared.fires.weapon_crate = function(fire)
  local worm = fire.worm
  wa.crates.spawn({ x = worm.x + worm.facing * AHEAD, y = worm.y, kind = "weapon", drop = "teleport" })
end
