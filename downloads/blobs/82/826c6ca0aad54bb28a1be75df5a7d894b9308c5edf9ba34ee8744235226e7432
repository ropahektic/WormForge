-- Highlander: Jump. Split from rules.lua by tools/split_highlander.py.
local shared = require("lib/shared")
local fires = shared.fires

-- ------------------------------------------------------------------ Jump
do
--
-- PX's jumpscript (utility_jump). Its record throws like a grenade, but
-- nothing leaves the worm: FireFinal gives the worm the shot's own speed --
-- the aim and the charge -- and plays the team's "Jump" line. The worm keeps
-- its aim posture, eyes on the crosshair, until it jumps.
--
-- Differences: PX shows WA's wjump while the charge builds
-- (SetAnimEx(269, FirePower)), which looks ahead rather than along the aim;
-- it also mutes the worm's "Fire!" and "Watch this" lines while the Jump is
-- selected, and stops a fuse and bounce being chosen for it.

-- The first team's "Jump1" speech: WA loads each team's 54 lines in turn
-- after its own sounds, so a worm's is 54 on per team (PX's PlaySoundBank(150)).
local JUMP_SPEECH, SPEECH_LINES = 150, 54

fires.jump = function(fire)
  local worm = fire.worm
  worm:release(fire.vx, fire.vy)
  wa.sound.play(worm, JUMP_SPEECH + SPEECH_LINES * (worm.team - 1))
end
end
