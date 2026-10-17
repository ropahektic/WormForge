-- Highlander: the scheme's state. Split from rules.lua by tools/split_highlander.py.
local shared = require("lib/shared")
local POOLED = shared.POOLED

-- ----------------------------------------------------------------- state

-- The engine store is keyed by stable worm id (team * 16 + index), never by
-- entity address. It is virtual: WA's physical ammo is still alliance-shared
-- and is materialized from one worm's inventory at turn start.
local arsenal = wa.inventory.create({ id = "arsenal", slots = POOLED })
local dealt = {}
local dead_hands = {}
shared.revived_by_lightning = shared.revived_by_lightning or {}
local revived_by_lightning = shared.revived_by_lightning

-- The current Highlander port moves a dead worm's hand to the active worm.
-- A grave revived by Lightning also gets that original hand back. This is a
-- copy: the active worm keeps the weapons it already stole.
shared.restore_lightning_inventory = function(worm)
  local hand = dead_hands[worm.id]
  if not hand then return end
  arsenal:clear(worm)
  for _, weapon in ipairs(hand) do arsenal:add(worm, weapon, 1) end
  dealt[worm.id] = true
  dead_hands[worm.id] = nil
end

local function describe(list)
  if not list or #list == 0 then
    return "(nothing)"
  end
  return table.concat(list, ", ")
end

shared.arsenal = arsenal
shared.dead_hands = dead_hands
shared.dealt = dealt
shared.describe = describe
shared.revived_by_lightning = revived_by_lightning
