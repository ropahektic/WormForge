-- +10 Seconds: an instant utility of our own, in place of Double Time. It
-- adds ten seconds to the turn going on, whoever's it is.
--
-- From a crate it does what the profile's `on_collect` says. `use` (the
-- default) takes it at once: the grant handler gives the copy WA stocked
-- back and adds the time. `keep` leaves it stocked, and firing it adds the
-- time, without ending the turn. It comes in utility crates by its own
-- crate type.
--
-- It's built on Double Time's record: a utility, no aim, and the worm holds
-- WA's utility pose (wutllnk), which WA picks by the record's subtype. Its
-- on_fire replaces WA's utility fire, so Double Time's own bit and icon stay
-- off; WA's effect for Double Time is tied to id 69 anyway.
local SECONDS = 10
local MAX_MS = 3600000 -- what wa.world.set_turn_clock accepts

local function add_time(seconds)
  local ms = math.min(wa.world.turn_clock() + seconds * 1000, MAX_MS)
  wa.world.set_turn_clock(ms)
end

return {
  defaults = {
    ammo = { round_start = 0 },
    delay = 0,
    crate = { chance_pct = 40, type = "utility" },
    on_collect = "use",
    after_use = "continue",
  },
  install = function(ctx)
    local id = ctx.id
    wa.weapons.replace({
      copy_from = "stock.double_turn_time",
      name = "+10 Seconds",
      panel_icon = "sprites/plus_ten.png",
      on_fire = function(fire)
        add_time(SECONDS)
      end,
    })
    if ctx.data.on_collect == "keep" then
      return
    end
    -- Used on pickup: undo the copy WA stocked, and add the time now.
    wa.on.weapon_grant(function(ev)
      for _, item in ipairs(ev.items) do
        if item.weapon == id and item.amount > 0 then
          for _, worm in ipairs(wa.worms.all()) do
            if worm.id == ev.worm_id then
              local held = worm:ammo(id)
              if held >= 0 then
                worm:ammo(id, { set = math.max(held - item.amount, 0) })
              end
              break
            end
          end
          add_time(SECONDS * item.amount)
        end
      end
    end)
  end,
}
