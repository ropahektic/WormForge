-- Highlander: sprite animation helpers. Split from rules.lua by tools/split_highlander.py.
local shared = require("lib/shared")

-- PX's missile sprite animations share these two helpers. Holds are drawn
-- by the engine from each replace claim's hold table above.
local HOLD_DEPTH = wa.depth.FRONT
local function next_phase(phase, anim_speed)
  if phase > 0.99 then return 0 end
  return phase + anim_speed * 30 / 1000
end
local function frame_of(phase, frames)
  return math.min(math.floor(phase * frames), frames - 1)
end

shared.HOLD_DEPTH = HOLD_DEPTH
shared.frame_of = frame_of
shared.next_phase = next_phase
