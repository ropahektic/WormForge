-- Highlander: Crate Strike (PX utility_all_crates: allcrates_script.txt).
local shared = require("lib/shared")
local fires = shared.fires

-- PX drops three crates on parachutes from 50 pixels above the map: at the
-- click's x, 50 to its left and 50 to its right. Each is a weapon, utility
-- or health crate, drawn in that order from WA's RNG, as PX's RandomInt(1,
-- 3); WA picks what is inside (PX's WCT_RANDOM). A health crate gives 20 to
-- 40, 40 to 60 or 60 to 80, by its place.
local KINDS = { "weapon", "utility", "health" }
local DROPS = {
  { dx = 0, lo = 20, hi = 40 },
  { dx = -50, lo = 40, hi = 60 },
  { dx = 50, lo = 60, hi = 80 },
}

fires.crate_strike = function(ev)
  local x = ev.x
  for _, d in ipairs(DROPS) do
    local kind = KINDS[wa.random(1, 3)]
    local health = wa.random(d.lo, d.hi)
    local crate = { x = (x + d.dx), y = ev.sky, kind = kind, health = health, drop = "chute" }
    -- A match whose crates hold no weapon (or no utility) refuses that
    -- kind; a health crate drops in its place.
    if not pcall(wa.crates.spawn, crate) then
      crate.kind = "health"
      wa.crates.spawn(crate)
    end
  end
end
