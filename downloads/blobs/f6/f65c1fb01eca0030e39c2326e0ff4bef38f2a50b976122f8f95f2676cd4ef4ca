-- Highlander: the weapon pools. Each worm is dealt one weapon from each.
--
-- The pools are each placed weapon's settings under the hl.rules add-on
-- ("Highlander pool", "Dealt on cavern maps"), which components/highlander.lua
-- reads into shared.pools, by weapon id, before this loads. A PX weapon
-- suggests its PX pool in mod.toml.
local shared = require("lib/shared")

local pools = assert(shared.pools, "scheme/pools: components/highlander.lua sets the pools")

-- Every pooled weapon, in a fixed order. Zeroing walks this list, so it must
-- not depend on pairs() order: Lua's string hashing is seeded per process,
-- and a different order on each peer is a different sequence of writes.
local POOLED, seen = {}, {}
for _, name in ipairs({ "offensive", "second", "movement" }) do
  for _, id in ipairs(pools[name]) do
    if not seen[id] then
      seen[id] = true
      POOLED[#POOLED + 1] = id
    end
  end
end

shared.POOLS = pools
shared.POOLED = POOLED
