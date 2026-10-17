-- Growth Hormones, the Lua way: the same weapon as flags.lua, with no status
-- flags. Click and tick are both Lua; native code only runs the verbs you
-- call. Both can be placed at once, each on its own slot.
--
-- Land/explode use the GIF's bottom opaque row as the platform (stock donkey
-- collides on the horizontal rectangle in gfx.dir masks.bmp, not the sprite).
-- a:explode is stock CreateExplosion; bounce is that impulse. Do not zero vy.
-- a.vx = 0 is this weapon's policy: no sideways speed from radial blasts.
--
-- A second after the click the donkey goes off for good: a huge electric
-- blast that shocks every worm near it, with arcs crackling out to them, and
-- WA's petrol fires in the colours of the rainbow. It survives its landing
-- blasts until then (`persist`); the flags version is gone after its first.
local FUSE = 50           -- frames from the click: a second, 50 a second
local SHOCK_RADIUS = 320  -- pixels: worms this near take the shock
local SHOCK_DAMAGE = 15
local ARC_FRAMES = 60     -- how long the arcs crackle after the blast
local RAINBOW = { 0xFF2A2A, 0xFF8C1A, 0xFFE81A, 0x3CFF4A, 0x2E8CFF, 0x8A3CFF, 0xFF3CD2 }
local ARC = "sprites/fx/arc.png"

return {
  install = function()
    -- Actor id -> the frame it fell from the sky (the click).
    local born = {}
    -- The blasts still crackling, for the draw: where, until when, and the
    -- worms the arcs reach.
    local blasts = {}

    local function go_off(a)
      local x, y = a.x, a.y
      a:explode({ damage = 80, id = 160, at = "center" })
      local reached = {}
      for _, worm in ipairs(wa.worms.all()) do
        local dx, dy = worm.x - x, worm.y - y
        if worm.hp > 0 and dx * dx + dy * dy <= SHOCK_RADIUS * SHOCK_RADIUS then
          worm:hurt(SHOCK_DAMAGE)
          reached[#reached + 1] = { worm.x, worm.y }
        end
      end
      -- Fires that don't spread (count and damage 0, as Valyrian Fire's): a
      -- fire with damage spreads into new fires in other slots, and those
      -- burn untinted. They still burn worms. Five of each colour, sprayed
      -- up and out.
      for i, tint in ipairs(RAINBOW) do
        local side = i - (#RAINBOW + 1) / 2
        for k = -2, 2 do
          wa.fire.spawn({
            owner = a, x = x + side * 8 + k * 3, y = y - 6,
            vx = side * 0.8 + k * 0.4, vy = -3 - (k + 2) * 0.5,
            count = 0, duration = 6000, damage = 0, tint = tint,
          })
        end
      end
      blasts[#blasts + 1] = { x = x, y = y, until_frame = wa.world.frame() + ARC_FRAMES, reached = reached }
      born[a.id] = nil
      a:despawn()
    end

    local function brain(a)
      local now = wa.world.frame()
      born[a.id] = born[a.id] or now
      if now - born[a.id] >= FUSE then
        go_off(a)
        return
      end
      a.vx = 0
      a:gravity()
      local hit = a:move({ terrain = true, worms = true })
      if hit.land then
        a:explode({ damage = 50, id = 100, at = "below" })
      end
      a.vx = 0
      a:advance()
      if a:in_water() then
        born[a.id] = nil
        a:despawn()
      end
    end

    wa.weapons.replace({
      copy_from = "stock.grenade",
      name = "Growth Hormones (Lua)",
      is_weapon = true,
      panel_icon = "sprites/icon_lua.png",
      sprite = "sprites/200w.gif",
      sprites = { ARC },
      params = { gpu_prefix = "sprites/fx/" },

      on_select = {
        cursor = true,
      },

      on_click = function(click)
        wa.actors.spawn({
          sprite = "sprites/200w.gif",
          x = click.x,
          y = click.sky,
          origin = "bottom",
          owner = click.worm,
          persist = true,
          on = brain,
        })
      end,
    })

    -- The arcs: a look, so their jitter is wa.draw.random, never WA's.
    local arc_sprite = wa.sprites.key(ARC)
    local function arc(x0, y0, x1, y1, life)
      local points, steps = {}, 12
      local nx, ny = -(y1 - y0), x1 - x0
      local len = math.sqrt(nx * nx + ny * ny)
      if len == 0 then return end
      nx, ny = nx / len, ny / len
      local alpha = math.floor(255 * life) << 24
      for i = 0, steps do
        local t = i / steps
        local kick = (i == 0 or i == steps) and 0 or (wa.draw.random() * 2 - 1) * 18
        points[#points + 1] = {
          x = x0 + (x1 - x0) * t + nx * kick, y = y0 + (y1 - y0) * t + ny * kick,
          width = 14, u = t, color = alpha | 0xB8D0FF,
        }
      end
      wa.draw.ribbon({ points = points, sprite = arc_sprite, blend = "add", depth = wa.depth.EFFECTS })
    end
    wa.on.draw(function()
      local now = wa.world.frame()
      for i = #blasts, 1, -1 do
        local b = blasts[i]
        if now >= b.until_frame then
          table.remove(blasts, i)
        else
          local life = (b.until_frame - now) / ARC_FRAMES
          for _, target in ipairs(b.reached) do
            arc(b.x, b.y, target[1], target[2], life)
          end
          -- A few strays into the air around it.
          for _ = 1, 5 do
            local angle = wa.draw.random() * 2 * math.pi
            local reach = 80 + wa.draw.random() * 160
            arc(b.x, b.y, b.x + math.cos(angle) * reach, b.y + math.sin(angle) * reach, life)
          end
        end
      end
    end)
  end,
}
