-- Highlander's rules, the hl.rules add-on: each worm is dealt one weapon
-- from each pool, may use each once a turn, and takes everything a worm it
-- kills carried (scheme/pools, scheme/state, scheme/rules), wherever the
-- profile put the weapons. It installs before the weapons (before_weapons),
-- so its hooks run first.
--
-- The pools are the placed weapons' settings for this add-on ("Highlander
-- pool", "Dealt on cavern maps"): a PX weapon suggests its PX pool in
-- mod.toml, and a profile may set any weapon's, a stock one's too.
--
-- What PX gives outside the deal -- the Hot Air Balloons refilled to 3 and
-- the Wind Changer to 1 each turn, one Weapon Crate a round -- is weapon data
-- in the Highlander profile, which the loader shows and a player may change.
local shared = require("lib/shared")

-- ctx.placed is in slot order, the same on every peer: the pools keep it.
local function pools_from(placed)
  local out = {
    offensive = {}, second = {}, movement = {},
    cave_offensive = {}, cave_second = {}, cave_movement = {},
  }
  for _, w in ipairs(placed) do
    local pool = w.options.pool
    if out[pool] then
      table.insert(out[pool], w.id)
      if w.options.cavern then
        table.insert(out["cave_" .. pool], w.id)
      end
    end
  end
  return out
end

return {
  install = function(ctx)
    require("components/loader").place(ctx)
    local pools = pools_from(ctx.placed)
    if #pools.offensive + #pools.second + #pools.movement == 0 then
      wa.log("highlander: no placed weapon is in a pool, so nothing is dealt")
      return
    end
    shared.pools = pools
    require("scheme/pools")
    require("scheme/state")
    require("scheme/rules")
  end,
}
