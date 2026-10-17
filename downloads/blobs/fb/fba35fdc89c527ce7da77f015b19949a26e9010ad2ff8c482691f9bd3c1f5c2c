-- Highlander: Hang-Glider. Split from rules.lua by tools/split_highlander.py.
local shared = require("lib/shared")
local STOPPERS = shared.STOPPERS
local balloons = shared.balloons
local trunc = shared.trunc

-- ------------------------------------------------------------- Hang-Glider
do
  --
  -- PX's paratest (utility_hangglider_render). A worm that opens WA's
  -- parachute with the Hang-Glider flies PX's glider instead: the pack takes
  -- it (worm:take) and moves it with the glider's physics: gravity at 0.75,
  -- the wind blowing along the wing's up side (x3), the speed across the wing
  -- damped, and the nose turning towards the flight path. Up and down turn the
  -- nose, faster the faster it flies; left and right nudge it. Just before it
  -- would run into something (PX's WS_AFTERROPE), on the jump key, in water,
  -- or when the turn ends, it gives the worm back to WA, falling on with the
  -- glider's speed; WA lands it. While it glides, the worm's body is hidden
  -- behind the glider art, which carries the worm; brought down onto land,
  -- the glider's own pack-away plays once WA has the worm standing (PX swaps
  -- sheet 289, wparbak, for it).
  --
  -- PX's speeds and angles are pixels per frame and radians; WA's gravity,
  -- wind and worm speeds use pixel units.

  local GLIDER_GRAVITY = 0.75           -- GliderGravityFactor
  local GLIDER_WIND = 3.0               -- GliderWindFactor
  local GLIDER_FRICTION = 0.25          -- GliderFriction
  local GLIDER_TURN = 0.06              -- GliderMaxAngularVelocity
  local GLIDER_TURN_SPEED = 20.0        -- GliderMaxTurningSpeed
  local GLIDER_ANIM = 0.04              -- GliderAnimSpeed
  local GLIDER_LERP = 0.03              -- GliderRotationLerp
  local GLIDER_PUSH = 0.02              -- GliderMoveAcceleration
  local GLIDER_MAX_ANGLE = 1.5          -- about 86 degrees either way
  local GLIDER_DEPTH = wa.depth.FRONT          -- in front of worms and terrain
  -- wgldbak: 6 frames, loaded at 24 frames a second; WA runs 50.
  local GLIDER_PACK_FRAMES, GLIDER_PACK_FPS = 6, 24
  -- How long after coming down onto land WA may take to stand the worm up for
  -- the pack-away (frames).
  local GLIDER_PACK_WAIT = 50
  -- WA's fall damage begins at 8 pixels/frame of downward impact speed. Its
  -- fixed-point formula includes one 16.16 unit of bias.
  local GLIDER_SAFE_LANDING_SPEED = 8 - 1 / 65536
  local GLIDER_PI = 3.141593

  local gliders = {} -- worm id -> { enabled, deployed, x, y, ang, target, cycle, sx, sy, art, pack, pack_t, landing }

  local function glider_of(worm)
    local g = gliders[worm.id]
    if not g then
      g = { enabled = false, deployed = false, ang = 0, target = 0, cycle = 0, sx = 0, sy = 0 }
      gliders[worm.id] = g
    end
    return g
  end

  -- utils' NormalizeAngle and LerpAngle.
  local function normalize_angle(a)
    while a > GLIDER_PI do a = a - 6.283186 end
    while a <= -GLIDER_PI do a = a + 6.283186 end
    return a
  end

  local function lerp_angle(c, a, b)
    a = normalize_angle(a)
    b = a + normalize_angle(b - a)
    return normalize_angle(a + (b - a) * c)
  end

  local function glider_art(worm, x, y, sheet)
    return wa.actors.spawn({
      sprite = sheet, x = x, y = y, gravity = false,
      collide = false, owner = worm, on = function() end,
    })
  end

  local function glider_drop_art(worm, g)
    if g.art then g.art:despawn(); g.art = nil end
    if g.pack then g.pack:despawn(); g.pack = nil end
    g.pack_x, g.pack_y = nil, nil
    worm.body_visible = true
  end

  local function glider_begin_pack(worm, g)
    g.landing = nil
    if g.art then g.art:despawn(); g.art = nil end
    g.pack, g.pack_t = glider_art(worm, worm.x, worm.y, "sprites/hang_glider/pack"), 0
    g.pack_x, g.pack_y = worm.x, worm.y
    g.pack.facing = -worm.facing
    g.pack:frame(0)
    g.pack:gfx({ depth = GLIDER_DEPTH })
    worm.body_visible = false
  end

  -- TraceMask from (x, y) to where it is heading: anything the worm would
  -- touch there by WA's own test of its shape (worm:fits, every 2 pixels),
  -- and anything else in the way by the Sniper Rifle's estimate of its mask.
  local function glider_blocked(worm, x, y, sx, sy)
    local x1, y1 = x + (1.1 * sx), y + (1.1 * sy)
    local n = math.max(1, math.ceil(math.sqrt(sx * sx + sy * sy) * 1.1 / 2))
    for i = 1, n do
      if not worm:fits(x + (x1 - x) * i / n, y + (y1 - y) * i / n) then
        return true
      end
    end
    local len = math.sqrt(sx * sx + sy * sy) * 1.1
    if len == 0 then
      return false
    end
    local dx, dy = sx * 1.1 / len, sy * 1.1 / len
    for _, s in ipairs(STOPPERS) do
      local list, r = s[1], s[2]
      if list and list.all then
        for _, o in ipairs(list.all()) do
          if o.id ~= worm.id then
            local ox, oy = (o.x - x), (o.y - y)
            local t = ox * dx + oy * dy
            if t > 0 and t < len and math.abs(ox * dy - oy * dx) < r then
              return true
            end
          end
        end
      end
    end
    return false
  end

  -- CWormGlider::Move: up and down turn the nose, left and right push.
  local function glider_keys(worm, g)
    local k = worm.keys
    local speed = math.sqrt(g.sx * g.sx + g.sy * g.sy) / GLIDER_TURN_SPEED
    if k.up then
      g.ang = math.max(g.ang - GLIDER_TURN * math.min(speed, 1), -GLIDER_MAX_ANGLE)
    end
    if k.down then
      g.ang = math.min(g.ang + GLIDER_TURN * math.max(math.min(speed, 1), 0.5), GLIDER_MAX_ANGLE)
    end
    if k.left then g.sx = g.sx - GLIDER_PUSH end
    if k.right then g.sx = g.sx + GLIDER_PUSH end
  end

  -- CWormGlider::Think's physics, once deployed: the new speed.
  local function glider_think(worm, g)
    local f = worm.facing
    local ang = f < 0 and g.ang or GLIDER_PI - g.ang
    local fwd_x, fwd_y = -wa.math.cos(ang), wa.math.sin(ang)
    local up_x, up_y
    if f < 0 then up_x, up_y = -fwd_y, fwd_x else up_x, up_y = fwd_y, -fwd_x end
    local sx, sy = g.sx, g.sy
    sy = sy + wa.world.gravity() * GLIDER_GRAVITY
    local wind = up_x * wa.world.wind() * GLIDER_WIND
    sx, sy = sx + wind * up_x, sy + wind * up_y
    local up_vel = sx * up_x + sy * up_y
    sx, sy = sx - up_x * up_vel * GLIDER_FRICTION, sy - up_y * up_vel * GLIDER_FRICTION
    -- The nose turns towards the flight path, never straight up or down.
    local target = f < 0 and wa.math.atan(sy, -sx) or wa.math.atan(sy, sx)
    target = normalize_angle(target)
    g.target = math.max(-GLIDER_MAX_ANGLE, math.min(GLIDER_MAX_ANGLE, target))
    g.ang = lerp_angle(GLIDER_LERP, g.ang, g.target)
    g.cycle = math.min(g.cycle + GLIDER_ANIM, 1)
    g.sx, g.sy = sx, sy
  end

  -- How many frames after a crash the worm is watched: WA may stand it up
  -- where it hit, as it does a balloon popped against a ceiling.
  local GLIDER_UNSTAND = 3

  -- The glide ends: the worm back to WA, falling on with the glider's speed.
  -- `landing`: a gentle landing, so the pack-away plays once WA has the worm
  -- standing. A hard landing gives WA the glider's full speed in its
  -- falling state and lets WA decide whether it causes fall damage and loss
  -- of control. Suppress automatic parachute firing only until WA handles
  -- this impact; otherwise it immediately reopens and slows the worm.
  -- Only a collision
  -- elsewhere needs the short guard against WA standing it up in mid-air.
  local function glider_close(worm, g, landing, hard_landing)
    g.deployed = false
    -- A gentle landing can spend several frames falling under WA's control
    -- before WA stands the worm up. Keep the wing over its body until the
    -- pack-away takes its place, so it never flashes empty-handed. Only
    -- looks: if it fails, the worm still goes back to WA below.
    local looks, err = pcall(function()
      if landing then
        g.art = g.art or glider_art(worm, worm.x, worm.y, "sprites/hang_glider/glider")
        worm.body_visible = false
      else
        glider_drop_art(worm, g)
      end
      wa.sound.play(worm, "sounds/hang_glider/hangclose.wav")
    end)
    if not looks then
      wa.log("hang glider: closing without its art: " .. tostring(err))
    end
    g.landing = landing and GLIDER_PACK_WAIT or nil
    g.unstand = not (landing or hard_landing) and GLIDER_UNSTAND or nil
    if worm.taken then
      local vx, vy = g.sx, g.sy
      if hard_landing then
        worm:release(vx, vy, { suppress_auto_parachute = true })
      else
        worm:release(vx, vy)
      end
    end
  end

  local function glider_frame(worm)
    local state = worm.state
    local b = balloons[worm.id]
    local equipped = b and b.equipped_weapon
    if b and b.active then
      local g = gliders[worm.id]
      if g then g.enabled = false end
      return
    end
    -- A glider may have auto-opened and cleared its selected slot before its
    -- first frame. The slot equipped before opening is authoritative.
    local g = gliders[worm.id]
    if not g then
      if (state == "parachuting" and equipped ~= "px.hang_glider")
          or (state ~= "parachuting" and worm.weapon ~= "px.hang_glider") then
        return
      end
      g = glider_of(worm)
    end
    if g.deployed then
      -- The engine let go: the turn ended, or WA knocked the worm flying.
      if not worm.taken then
        glider_close(worm, g, false)
        return
      end
      glider_keys(worm, g)
      glider_think(worm, g)
      if glider_blocked(worm, g.x, g.y, g.sx, g.sy) then
        -- Onto land below it: WA handles the impact with the glider's full
        -- speed. Only a fall below its damage threshold gets the pack-away.
        local below = g.sy > 0 and not worm:fits(g.x, g.y + (1.1 * g.sy + 4))
        local hard_landing = below and g.sy >= GLIDER_SAFE_LANDING_SPEED
        glider_close(worm, g, below and not hard_landing, hard_landing)
        return
      end
      local x, y = g.x + g.sx, g.y + g.sy
      if y >= wa.world.water() then
        glider_close(worm, g, false)
        return
      end
      g.x, g.y = x, y
      worm:carry(x, y)
      -- CWormGlider::Render, in the worm's place.
      local f = worm.facing
      g.art = g.art or glider_art(worm, x, y, "sprites/hang_glider/glider")
      local a = g.art
      a.x, a.y, a.vx, a.vy, a.facing = x, y, 0, 0, -f
      a:frame(math.min(math.floor(g.cycle * 10), 9))
      a:gfx({ angle = math.deg(f * g.ang) % 360, depth = GLIDER_DEPTH })
      worm.body_visible = false
      return
    end
    if state ~= "parachuting" then
      -- Which parachute the worm opens next: PX checks the weapon only while
      -- the worm is not already under one.
      g.enabled = worm.weapon == "px.hang_glider"
      if g.unstand then
        if state == "standing" then
          worm:release(0, 0)
          g.unstand = nil
        else
          g.unstand = g.unstand > 1 and g.unstand - 1 or nil
        end
      end
      -- A land contact starts the pack-away in that frame. Standing is a
      -- fallback if WA did not report a contact; it may arrive 12 frames later.
      if g.landing then
        if state == "standing" and worm.y < wa.world.water() then
          glider_begin_pack(worm, g)
        elseif worm.y >= wa.world.water() or state == "tumbling" then
          g.landing = nil
          glider_drop_art(worm, g)
        else
          g.landing = g.landing > 1 and g.landing - 1 or nil
          if g.landing and g.art then
            g.art.x, g.art.y, g.art.vx, g.art.vy = worm.x, worm.y, 0, 0
            g.art.facing = -worm.facing
            worm.body_visible = false
          else
            glider_drop_art(worm, g)
          end
        end
      end
      if g.pack then
        local frame = g.pack_t * GLIDER_PACK_FPS // 50
        local keys = worm.keys or {}
        local moving = keys.left or keys.right or state == "walking"
          or state == "jump_prepare" or state == "jumping"
          or math.abs(worm.x - g.pack_x) > 1
        local landing_state = state == "standing" or state == "sliding"
          or state == "jump_falling" or state == "falling"
        if frame >= GLIDER_PACK_FRAMES or moving or not landing_state
            or worm.y >= wa.world.water() then
          glider_drop_art(worm, g)
        else
          g.pack.x, g.pack.y, g.pack.vx, g.pack.vy = worm.x, worm.y, 0, 0
          g.pack.facing = -worm.facing -- its art faces left, as WA's worms do
          g.pack:frame(frame)
          g.pack:gfx({ depth = GLIDER_DEPTH })
          worm.body_visible = false
          g.pack_t = g.pack_t + 1
        end
      end
      -- Its speed carries over into the glide.
      g.sx, g.sy = worm.vx, worm.vy
      return
    end
    g.enabled = equipped == "px.hang_glider"
    if not g.enabled or g.deployed or state ~= "parachuting" then
      return -- a plain parachute, or the balloon
    end
    -- WA has opened its parachute: the pack takes the worm and glides.
    g.deployed, g.ang, g.target, g.cycle, g.landing, g.unstand = true, 0, 0, 0, nil, nil
    g.x, g.y = worm.x, worm.y
    if g.pack then g.pack:despawn(); g.pack = nil end
    -- On the glider the worm fires what WA lets it fire mid-air.
    worm:take{ turn = "run", fire = true }
    wa.sound.play(worm, "sounds/hang_glider/hangopen.wav")
    return glider_frame(worm)
  end

  if wa.world.gravity and wa.world.wind then
    if wa.on.contact then
      wa.on.contact(function(worm, other)
        local g = gliders[worm.id]
        if g and g.landing and other.kind == "land" and worm.y < wa.world.water() then
          local keys = worm.keys or {}
          if keys.left or keys.right then
            g.landing = nil
            glider_drop_art(worm, g)
          else
            glider_begin_pack(worm, g)
          end
        end
      end)
    end
    wa.on.worm_message(function(worm, msg)
      if msg == wa.msg.FRAME_FINISH then
        glider_frame(worm)
        return
      end
      local g = gliders[worm.id]
      if g and g.pack and (msg == wa.msg.JUMP or msg == wa.msg.JUMP_UP) then
        glider_drop_art(worm, g)
        return
      end
      if not (g and g.deployed) then
        return
      end
      if msg == wa.msg.JUMP then
        -- The jump key closes WA's parachute: here it lets go of the glider.
        glider_close(worm, g, false)
        return "eat"
      end
    end, { msgs = { wa.msg.FRAME_FINISH, wa.msg.JUMP, wa.msg.JUMP_UP } })
  end
end
