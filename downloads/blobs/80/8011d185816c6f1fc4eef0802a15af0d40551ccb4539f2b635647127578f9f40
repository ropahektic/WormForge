-- Highlander: Chilli Bomb. Split from rules.lua by tools/split_highlander.py.
local shared = require("lib/shared")

-- ------------------------------------------------------------- Chilli Bomb
do
--
-- PX's pyro_grenades_script (PyroMan), on WA's super banana. When a Chilli
-- Bomb explodes, five more Chillis burst out of it, straight up with a
-- random spread (PX's ShotClustlets): real WA missiles of the same slot,
-- each with damage 30, an 8 s fuse, no countdown, the fire key setting it
-- off, and a burst of fire where it ends. The five do not burst again: a
-- missile PX's script makes has no weapon of its own (weap), so its
-- ExplodeAt skips the Chilli's branch.
--
-- Not ported: PX's particle trail and the sparks while aiming
-- (pxparticles), and the smoke trail's power of 20 on the five. PX also
-- writes the five's changes into the weapon's own launch data, so every
-- later Chilli Bomb flies with them; the port changes the five only.

local CHILLI_CHILD = { count = 5, damage = 30, fuse = 8000 }

local chilli_child = {}   -- missile id -> true: one of the five, which ends it
local chilli_pending = {} -- where the five burst out, once the blast is over
local chilli_shooter      -- the worm that threw it (PX's ClWT / ClWN)

shared.chilli_bomb_explode = function(ev)
  local id = ev.missile
  if not id then
    return
  end
  if chilli_child[id] then
    chilli_child[id] = nil
    return
  end
  chilli_pending[#chilli_pending + 1] = { x = ev.x, y = ev.y }
end

wa.on.worm_message(function(worm, msg)
  if msg == wa.msg.FIRE_WEAPON and worm.weapon == "px.chilli_bomb" then
    chilli_shooter = worm
  elseif msg == wa.msg.FRAME_FINISH and #chilli_pending > 0 then
    -- After the blast, as the Double Bazooka's second shell.
    local owner = chilli_shooter or worm
    for _, p in ipairs(chilli_pending) do
      for _ = 1, CHILLI_CHILD.count do
        -- RandomFloat(3, -3), then RandomFloat(-7, -10).
        local vx = wa.random(-196608, 196608) / 65536
        local vy = wa.random(-655360, -458752) / 65536
        local id = wa.weapons.launch({
          weapon = "px.chilli_bomb", owner = owner, x = p.x, y = p.y, vx = vx, vy = vy,
          missile = {
            explosion = { power = CHILLI_CHILD.damage }, fuse = CHILLI_CHILD.fuse, countdown = 0,
            explode_on_space = true, burst = "fire",
            sprite = 0, -- PX leaves them WA's sprite 0; the chilli is drawn instead
          },
        })
        chilli_child[id] = true
      end
    end
    chilli_pending = {}
  end
end, { msgs = { wa.msg.FIRE_WEAPON, wa.msg.FRAME_FINISH } })
end
