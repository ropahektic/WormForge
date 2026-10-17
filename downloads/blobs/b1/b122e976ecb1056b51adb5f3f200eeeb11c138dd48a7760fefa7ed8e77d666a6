-- Cluster Bomb slot. Aiming keeps the stock cluster sprite / worm.
-- Shot: fullscreen cut-in, courier flies, then WormCraft is spelled letter by letter.
return {
  install = function()
    local WORD = { "W", "o", "r", "m", "C", "r", "a", "f", "t" }
    local STEP = 58
    local LETTER_W, LETTER_H = 50, 70
    local GAP = 50
    local LETTER_WAIT = 22
    local SEQ_FPS = 15
    local FRAMES = {
      ["sprites/absorb"] = 31,
      ["sprites/burst"] = 18,
      ["sprites/death"] = 50,
      ["sprites/haste"] = 29,
      ["sprites/heal"] = 16,
    }

    local function fx_brain(sprite)
      local frames = FRAMES[sprite] or 1
      local need = frames * 50 // SEQ_FPS
      if need < 1 then
        need = 1
      end
      local t = 0
      return function(a)
        a.vx = 0
        a.vy = 0
        t = t + 1
        a:advance()
        if t >= need then
          a:despawn()
        end
      end
    end

    local function spawn_fx(sprite, x, y, owner)
      wa.actors.spawn({
        sprite = sprite,
        x = x,
        y = y,
        vx = 0,
        vy = 0,
        gravity = false,
        loop = false,
        collide = false,
        origin = "center",
        owner = owner,
        on = fx_brain(sprite),
      })
    end

    local function surround(origin, left, y, n)
      local right = left + (n - 1) * STEP
      local mid = origin.x
      local owner = origin.owner
      local side = LETTER_W // 2 + GAP
      local up = LETTER_H // 2 + GAP
      spawn_fx("sprites/death", left - side, y, owner)
      spawn_fx("sprites/death", right + side, y, owner)
      spawn_fx("sprites/haste", mid, y - up, owner)
      spawn_fx("sprites/heal", mid, y + up, owner)
      spawn_fx("sprites/absorb", mid, y - up - GAP, owner)
      spawn_fx("sprites/burst", left - side, y - up, owner)
      spawn_fx("sprites/burst", right + side, y - up, owner)
    end

    local function letter_brain(delay, last, origin, left, y, n, dest_x, dest_y, i)
      local t = 0
      local shown = false
      local falling = false
      local boom = false
      local word_done = 10 + (n - 1) * LETTER_WAIT + 20
      local fall_at = word_done + 4 + (i - 1) * 11 + ((i - 1) % 3) * 5
      local drop = 0.078125 + i * 0.0390625
      return function(a)
        t = t + 1
        if t < delay then
          a.x = dest_x
          a.y = -2048
          a.vx = 0
          a.vy = 0
          return
        end
        local age = t - delay
        if age == 0 then
          a.x = dest_x
          a.y = dest_y
          if last then
            a:sound("sounds/emotional-damage.wav")
          end
        end
        if last and not shown and age == 20 then
          shown = true
          surround(origin, left, y, n)
        end
        if not falling then
          a.vx = 0
          if age < 16 then
            a.vy = -0.1875
          else
            a.vy = 0
          end
          a:move({ terrain = false, worms = false })
          a.vx = 0
          a.vy = 0
          if t >= fall_at then
            falling = true
            a.vy = drop
          end
          return
        end
        a:gravity()
        local hit = a:move({ terrain = true, worms = true })
        if not boom and (hit.land or a:on_feet()) then
          boom = true
          a:explode({ damage = 35, id = 100, at = "below" })
          a:despawn()
          return
        end
        if a:in_water() then
          a:despawn()
        end
      end
    end

    local function write_word(courier)
      -- The courier despawns now, and a despawned actor's fields read as
      -- nothing: the letters and the effects around them keep its place and
      -- owner instead.
      local origin = { x = courier.x, y = courier.y, owner = courier.owner }
      local n = #WORD
      local left = origin.x - (n - 1) * STEP / 2
      local y = origin.y - 36
      local feet_y = y + LETTER_H // 2
      for i, ch in ipairs(WORD) do
        local dest_x = left + (i - 1) * STEP
        wa.actors.spawn({
          sprite = "sprites/" .. ch .. ".png",
          x = dest_x,
          y = -2048,
          vx = 0,
          vy = 0,
          gravity = false,
          loop = false,
          collide = false,
          origin = "bottom",
          owner = origin.owner,
          on = letter_brain(10 + (i - 1) * LETTER_WAIT, i == n, origin, left, y, n, dest_x, feet_y, i),
        })
      end
    end

    local CUTIN = 42

    local function cutout_brain()
      local t = 0
      return function(a)
        t = t + 1
        a.vx = 0
        a.vy = 0
        if t >= CUTIN then
          a:despawn()
        end
      end
    end

    local function courier_brain()
      local t = 0
      return function(a)
        t = t + 1
        a:gravity()
        local hit = a:move({ terrain = true, worms = true })
        a:advance()
        if hit.land or hit.worm or t >= 30 then
          write_word(a)
          a:despawn()
        end
      end
    end

    local function lines_brain(fire)
      local t = 0
      local fired = false
      return function(a)
        t = t + 1
        a.vx = 0
        a.vy = 0
        a:advance()
        if t >= CUTIN and not fired then
          fired = true
          wa.actors.spawn({
            sprite = "sprites/absorb",
            x = fire.x,
            y = fire.y,
            vx = fire.vx,
            vy = fire.vy,
            origin = "center",
            owner = fire.worm,
            on = courier_brain(),
          })
          a:despawn()
        end
      end
    end

    wa.weapons.replace({
      copy_from = "stock.cluster_bomb",
      name = "WormCraft",
      is_weapon = true,
      panel_icon = "sprites/icon.png",
      sprites = {
        "sprites/absorb",
        "sprites/burst",
        "sprites/death",
        "sprites/haste",
        "sprites/heal",
        "sprites/W.png",
        "sprites/o.png",
        "sprites/r.png",
        "sprites/m.png",
        "sprites/C.png",
        "sprites/a.png",
        "sprites/f.png",
        "sprites/t.png",
        "sprites/shader",
        "sprites/cutout.png",
      },
      sounds = {
        "sounds/emotional-damage.wav",
        "sounds/cutout.wav",
      },
      on_fire = function(fire)
        local lines = wa.actors.spawn({
          sprite = "sprites/shader",
          x = 0,
          y = 0,
          vx = 0,
          vy = 0,
          gravity = false,
          loop = true,
          collide = false,
          origin = "center",
          screen = "fill",
          owner = fire.worm,
          on = lines_brain(fire),
        })
        wa.actors.spawn({
          sprite = "sprites/cutout.png",
          x = 0,
          y = 0,
          vx = 0,
          vy = 0,
          gravity = false,
          loop = false,
          collide = false,
          origin = "center",
          screen = "front",
          owner = fire.worm,
          on = cutout_brain(),
        })
        lines:sound("sounds/cutout.wav")
      end,
    })
  end,
}
