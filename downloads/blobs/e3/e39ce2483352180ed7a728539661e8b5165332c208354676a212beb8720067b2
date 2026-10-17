-- The utilities feature: match settings the lobby scheme doesn't have, and
-- some players' favourite packs as switches. Every setting is an option of
-- this one component, read once at install.

-- The packs, by option: each module installs its hooks when loaded, so only
-- a switched-on one is loaded.
local PACKS = {
  { "ex_turn_side", "features/ex_turn_side" },
  { "agility", "features/agility" },
  { "live_hp", "features/live_hp" },
  { "collect_viewer", "features/collect_viewer" },
}

return function(ctx)
  local heal = ctx.option("heal_per_turn")
  if heal > 0 then
    wa.on.turn_start(function(ev) ev.worm:heal(heal) end)
  end

  local on = {}
  for _, pack in ipairs(PACKS) do
    if ctx.option(pack[1]) then
      require(pack[2])
      on[#on + 1] = pack[1]
    end
  end

  wa.log(("heal %d, packs %s"):format(
    heal, #on > 0 and table.concat(on, " ") or "none"))
end
