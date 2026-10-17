-- Bunker Buster / Super Bunker Buster -- the component's entry point.
--
-- Both components in mod.toml point at this file; the module reads `ctx.id` to
-- tell them apart. `require` runs where `wa` does not exist yet, so the module
-- is pure data at load and does its `wa` work inside install (the same rule
-- lib/px_trail.lua follows).
local bunker = require("lib/px_bunker")

return {
  defaults = {
    ammo = { round_start = -1 }, -- infinite, so it can be tested at once
    delay = 0,
  },
  install = function(ctx) bunker.install(ctx) end,
}
