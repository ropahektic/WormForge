-- A second weapon, outside the scheme's preset: the Profile tab adds it, and
-- it can swap places with Big Bazooka. It fires as a mortar wherever it sits.
return {
  defaults = {
    ammo = { round_start = 3 },
  },
  install = function(ctx)
    wa.log(("Big Mortar at %s %d"):format(ctx.position.row, ctx.position.column))
    -- No slot: it claims the one it was placed on, built on WA's own Mortar.
    wa.weapons.replace({ copy_from = "stock.mortar", name = "Big Mortar", missile = { explosion = { power = 70 } } })
  end,
}
