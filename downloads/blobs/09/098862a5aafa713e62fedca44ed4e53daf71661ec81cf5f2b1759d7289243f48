-- Growth Hormones, the flags way: a donkey GIF falls from the sky where you
-- click and explodes on landing. Native code runs these statuses each
-- FRAME_FINISH; a later editor generates this table from dropdowns. No Lua
-- brain. lua.lua is the same weapon written in Lua.
return {
  install = function()
    wa.weapons.replace({
      copy_from = "stock.donkey",
      name = "Growth Hormones",
      is_weapon = true,
      panel_icon = "sprites/icon.png",

      on_select = {
        cursor = true,
      },

      on_click = {
        spawn = {
          sprite = "sprites/200w.gif",
          loop = true,
          from = "sky",
          origin = "bottom",
          gravity = true,
          collide_terrain = true,
          damage_terrain = true,
          collide_worms = true,
          damage_worms = true,
          persist = false,
          drown = true,
          explode = {
            damage = 250,
            id = 100,
            below = true,
          },
        },
      },
    })
  end,
}
