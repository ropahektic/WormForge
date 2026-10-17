-- Highlander: Hot Air Balloon. Split from rules.lua by tools/split_highlander.py.
local shared = require("lib/shared")
local balloons = shared.balloons

-- --------------------------------------------------------- Hot Air Balloon
do
  --
  -- PX's balloon_s (r2_balloon by rafa''2, modified by 0rang3). PX flies it on
  -- WA's parachute with the worm's gravity turned upside down; here the pack
  -- flies it (worm:take) with WA's own parachute physics, upside down. WA 3.8.1,
  -- per frame (0x4FCB30): the speed gains gravity times the worm's gravity
  -- factor and, unless the worm is against land beside it, the wind times its
  -- wind factor; then both speeds are damped. Its parachute (SetState 0x7D at
  -- 0x50EBE2 and 0x50EC57) damps them to 0.8 and takes the wind factor from the
  -- weapon record's +0x38 in percent: the patched bungee's fire_method, 100.
  -- So it rises at up to four times gravity and drifts with four times the
  -- wind. The arrow keys push it as they push WA's parachute (0x513EB0, run
  -- before that step): half of gravity a frame each way held (through the
  -- worm's +0x44 push, divided by its mass, 1.0), opposite keys cancelling. It pops -- the worm given back to WA, falling -- on touching land,
  -- in water, on the jump key (which closes WA's parachute), and when the
  -- turn ends. The worm's body is hidden behind the balloon, drawn in its
  -- team's colour, and the worm in its basket, as PX's RenderWorm override.
  --
  -- It still opens as WA's parachute (the patched bungee, by hand or
  -- automatically); the pack takes the worm on the first frame of it.

  local BALLOON_DAMP = 0.79998779296875       -- WA's parachute damping, 0.8
  local BALLOON_WIND = 100          -- the patched bungee's fire_method, in percent
  local BALLOON_DEPTH = wa.depth.FRONT + 1     -- behind the basket, in front of worms
  local BASKET_DEPTH = wa.depth.FRONT
  -- PX's GetTeamColorRGB, by WA's colour index (worm.alliance, 0 red .. 5 cyan).
  -- PX adds it to its dark grey balloon (SetColorMod mode 8); the GPU tint
  -- multiplies, so the pack's balloon art is PX's lightened to white, and the
  -- team colour shows at full strength.
  local TEAM_RGB = { 0xFF8080, 0x0096FF, 0x00D000, 0xFFFF40, 0xE800E8, 0x50FFFF }

  -- Also records the weapon equipped before WA changes the visible slot while
  -- opening a parachute, for both the balloon and glider handlers.
  -- worm id -> { active, x, y, vx, vy, ticks, equipped_weapon, balloon, basket }

  local function balloon_of(worm)
    local b = balloons[worm.id]
    if not b then
      b = { active = false, ticks = 0 }
      balloons[worm.id] = b
    end
    return b
  end

  local function balloon_sound(worm, name, n)
    wa.sound.play(worm, "sounds/balloon/" .. name .. wa.random(1, n) .. ".wav")
  end


  -- How many frames after popping against land the worm is watched: WA may
  -- stand it up there, in mid-air under a ceiling.
  local BALLOON_UNSTAND = 3

  -- StopBalloon: a pop, and the worm back to WA, falling with its speed.
  -- Against land it keeps no upward speed, and for a few frames, if WA has
  -- stood it up, it is released again, falling: PX's balloon does the same
  -- (WS_IDLE -> WS_SLIDING) when WA's parachute closes against the land.
  -- `why` goes to the log with each pop, so a report of a balloon that
  -- would not pop can be traced to what ended it.
  local function balloon_stop(worm, b, why, against_land)
    if not b.active then
      return
    end
    wa.log(string.format(
      "highlander: balloon of worm %d popped after %d frames: %s (turn clock %d ms)",
      worm.id, b.ticks, why, wa.world.turn_clock()
    ))
    b.active, b.ticks = false, 0
    if b.balloon then b.balloon:despawn(); b.balloon = nil end
    if b.basket then b.basket:despawn(); b.basket = nil end
    worm.body_visible = true
    balloon_sound(worm, "pop", 4)
    local vy = against_land and math.max(b.vy, 0) or b.vy
    if worm.taken then
      worm:release(b.vx, vy)
    end
    b.unstand = against_land and BALLOON_UNSTAND or nil
  end

  local function balloon_draw(worm, b)
    -- DrawBalloonWorm: the balloon above, in the team's colour, and the worm
    -- in its basket, whose art faces left.
    local f = worm.facing
    local function art(sheet)
      return wa.actors.spawn({
        sprite = sheet, x = b.x, y = b.y, gravity = false,
        collide = false, owner = worm, on = function() end,
      })
    end
    b.balloon = b.balloon or art("sprites/balloon/balloon")
    b.basket = b.basket or art("sprites/balloon/basket")
    local x = b.x + 6 * f
    b.balloon.x, b.balloon.y, b.balloon.vx, b.balloon.vy = x, b.y - 43, 0, 0
    b.balloon:frame(math.min((b.ticks % 200) * 16 // 200, 15))
    b.balloon:gfx({ tint = 0xFF000000 | (TEAM_RGB[(worm.alliance or 0) + 1] or 0xFFFFFF),
      depth = BALLOON_DEPTH })
    b.basket.x, b.basket.y, b.basket.vx, b.basket.vy = x, b.y + 3, 0, 0
    b.basket.facing = -f
    b.basket:frame(math.min((b.ticks % 80) * 17 // 80, 16))
    b.basket:gfx({ depth = BASKET_DEPTH })
    worm.body_visible = false
  end

  local function balloon_frame(worm)
    local b = balloon_of(worm)
    local state = worm.state
    -- WA may change the selected slot to Parachute (or none) as Bungee fires.
    -- The weapon equipped before that transition identifies the auto trigger;
    -- an unrelated parachute opening must not become a Hot Air Balloon.
    local equipped = b.equipped_weapon
    if not b.active and state == "parachuting" and not b.was_parachuting
        and equipped == "px.hot_air_balloon" then
      b.active, b.ticks = true, 0
      b.x, b.y, b.vx, b.vy = worm.x, worm.y, worm.vx, worm.vy
      -- Under the balloon the worm fires what WA lets it fire mid-air.
      worm:take{ turn = "run", fire = true }
      balloon_sound(worm, "inflate", 3)
    end
    b.was_parachuting = state == "parachuting"
    if state ~= "parachuting" then b.equipped_weapon = worm.weapon end
    if b.unstand then
      if state == "standing" then
        worm:release(0, 0)
        b.unstand = nil
      else
        b.unstand = b.unstand > 1 and b.unstand - 1 or nil
      end
    end
    if not b.active then
      return
    end
    -- The engine let go: the turn ended, or WA knocked the worm flying.
    if not worm.taken then
      balloon_stop(worm, b, "the engine let go (turn over or knocked flying)")
      return
    end
    local vx, vy = b.vx, b.vy
    -- The arrow keys, as WA's parachute takes them (0x514AC0, 0x513EB0).
    local k = worm.keys or {}
    local left, right, up, down = k.left, k.right, k.up, k.down
    if left and right then left, right = false, false end
    if up and down then up, down = false, false end
    local g = wa.world.gravity()
    local push = g / 2
    vx = vx + (right and push or 0) - (left and push or 0)
    vy = vy + (down and push or 0) - (up and push or 0)
    -- WA's parachute physics, gravity upside down (0x4FCB30).
    vy = vy - g * worm.gravity
    local side = wa.world.wind() >= 0 and 1 or -1
    if worm:fits(b.x + side, b.y) then
      vx = vx + wa.world.wind() * (BALLOON_WIND / 100)
    end
    vx, vy = vx * BALLOON_DAMP, vy * BALLOON_DAMP
    b.vx, b.vy = vx, vy
    local x, y = b.x + vx, b.y + vy
    -- It pops on touching land, as WA's parachute closes there: where WA's
    -- own test says the worm would touch it, so it never sits inside it.
    if not worm:fits(x, y) then
      balloon_stop(worm, b, "touched land", true)
      return
    end
    if y >= wa.world.water() then
      balloon_stop(worm, b, "reached the water")
      return
    end
    b.x, b.y = x, y
    worm:carry(x, y)
    b.ticks = b.ticks + 1
    balloon_draw(worm, b)
  end

  -- WA's key messages, named for the log. In flight WA sends jump for Space
  -- and fire for Enter.
  local BALLOON_KEY_MESSAGES = {
    [wa.msg.JUMP] = "jump", [wa.msg.JUMP_UP] = "backflip",
    [wa.msg.FIRE_WEAPON] = "fire", [wa.msg.RELEASE_WEAPON] = "release",
  }

  wa.on.worm_message(function(worm, msg)
    if msg == wa.msg.FRAME_FINISH then
      balloon_frame(worm)
      return
    end
    local b = balloons[worm.id]
    if not (b and b.active) then
      return
    end
    local key = BALLOON_KEY_MESSAGES[msg]
    if key then
      wa.log(string.format("highlander: balloon of worm %d got WA's %s message at flight frame %d",
        worm.id, key, b.ticks))
    end
    if msg == wa.msg.JUMP then
      -- The jump key closes WA's parachute: here it pops the balloon.
      -- In flight WA sends it for Space.
      balloon_stop(worm, b, "jump key (Space in flight)")
      return "eat"
    end
  end, { msgs = { wa.msg.FRAME_FINISH, wa.msg.JUMP, wa.msg.JUMP_UP, wa.msg.FIRE_WEAPON, wa.msg.RELEASE_WEAPON } })

  -- M_TURNBEGIN: any balloon still up pops.
  wa.on.turn_start(function()
    for _, worm in ipairs(wa.worms.all()) do
      local b = balloons[worm.id]
      if b and b.active then
        balloon_stop(worm, b, "a new turn began")
      end
    end
  end)
end
