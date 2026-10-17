-- Highlander: Reinforcement (PX utility_reinforcement: reinforcement_SCRIPT.txt).
local shared = require("lib/shared")
-- "Reinforcement", 200).
local NAME, HEALTH = "Reinforcement", 200
-- Its centre this far above the land it stands on: WA's standing worm
-- settles the rest itself.
local STAND = 12

-- The ground under x (pixels): the first land below open air from the top
-- (on a cavern, the roof's underside is not ground). Nil over the water.
local function ground(x)
  local size = wa.world.size()
  local y = 0
  while y < size.h and wa.land.solid(x, y) do y = y + 1 end
  while y < size.h and not wa.land.solid(x, y) do y = y + 1 end
  if y >= size.h then return nil end
  return y
end

-- A click places it: PX drops the worm at the click's x from 200 pixels
-- above the map on a jet pack with no fuel, and stands it up once it has
-- landed. Here it stands on the ground under the click straight away, so
-- it takes no fall damage either. Over the water it drops in at the
-- surface, as PX's falls in. It takes a dead worm's place, as PX's does;
-- with 8 living worms the team is full (PX: "Too many worms (8) in your
-- team!").
shared.fires.reinforcement = function(ev)
  local worm = ev.worm
  local x = ev.x // 1
  local y = ground(x)
  local at = y and (y - STAND) or wa.world.water() - STAND
  local ok, spawned = pcall(wa.worms.spawn, { team = worm.team, x = x, y = at, name = NAME, health = HEALTH })
  if not ok then
    wa.log("Reinforcement: " .. tostring(spawned))
    wa.sound.play(worm, "sounds/gravity_control/error.wav")
  elseif shared.fresh_hand then
    -- Highlander's rules: dealt a fresh hand, as a new worm.
    shared.fresh_hand(spawned)
  end
end
