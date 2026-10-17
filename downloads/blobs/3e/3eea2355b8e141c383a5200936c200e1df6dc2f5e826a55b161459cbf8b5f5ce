-- A Highlander weapon as a component: every one of the bundle's weapon
-- components runs this file, and ctx.id says which weapon it is. Its
-- defaults are its own (weapons/defaults.lua); its ammo, delay and crate
-- odds are the profile's, and under Highlander's rules they deal the ammo.
return {
  defaults = function(id) return require("weapons/defaults")[id] end,
  install = function(ctx)
    require("components/loader").install(ctx)
  end,
}
