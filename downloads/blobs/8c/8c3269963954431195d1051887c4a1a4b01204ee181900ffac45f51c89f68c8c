-- A weapon component: its data, and what it does once placed. `wa` is only
-- available inside install; this file itself just returns the table.
return {
  defaults = {
    ammo = { round_start = -1 },
    delay = 0,
  },
  install = function(ctx)
    -- ctx.data is these defaults with the profile's settings laid over them.
    wa.log(("Big Bazooka at %s %d: round_start %d, delay %d"):format(
      ctx.position.row, ctx.position.column, ctx.data.ammo.round_start, ctx.data.delay))
    -- WA's Bazooka, with a bigger explosion: power is damage and radius together.
    wa.weapons.replace({ copy_from = "stock.bazooka", name = "Big Bazooka", missile = { explosion = { power = 80 } } })
  end,
}
