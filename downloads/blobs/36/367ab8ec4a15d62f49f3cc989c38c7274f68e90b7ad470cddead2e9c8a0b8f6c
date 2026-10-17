-- Highlander: what its modules share, one table per match.
-- Split from rules.lua by tools/split_highlander.py.
local shared = {}

-- The engine names a weapon by its id (`px.javelin`, `stock.fast_walk`); the
-- pack's own tables are keyed by each weapon's home slot (lib/homes.lua).
-- shared.home(id) is the home of a Highlander weapon, or the stock name of
-- one of WA's own that no Highlander weapon calls home (WA's Mine is not the
-- Nuke Rocket); nil for anything else.
local HOME = require("lib/homes")
local IS_HOME = {}
for _, home in pairs(HOME) do IS_HOME[home] = true end

function shared.home(id)
  if id == nil then return nil end
  if HOME[id] then return HOME[id] end
  local stock = id:match("^stock%.(.+)$")
  return stock and not IS_HOME[stock] and stock or nil
end

return shared
