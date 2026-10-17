-- Highlander: Double Bazooka. Split from rules.lua by tools/split_highlander.py.
local shared = require("lib/shared")

-- ---------------------------------------------------------- Double Bazooka
do
--
-- PX's double_bazooka_script. A Double Bazooka shell does not end at the
-- first thing it hits: WA's explosion goes off, a 50-pixel hole is cut
-- (GG->land->MakeHole(50), WA's landscape "apply explosion", as
-- wa.land.cut), and a second shell carries on from there at the first one's
-- speed, a real WA missile of the same slot (new CMissile with the weapon's
-- launch data), so WA flies it with wind and its smoke trail. PX changes
-- three things for it: damage 40, sprite 54 and a 5 s fuse. The port takes
-- the damage and fuse; 54 is a cluster bit (clustlet) in WA 3.8.1, so the
-- second shell keeps the record's bazooka shell (48, missile), as the first
-- does. Its own explosion ends it.
--
-- Not ported: PX's particle trail on top of WA's (pxparticles), and a plain
-- 50/35 blast PX makes when a second shell explodes before its first frame.

local DB_SECOND = { damage = 40, fuse = 5000 }
local DB_HOLE = 50

local db_speed = {}   -- missile id -> { vx, vy } at its last frame
local db_second = {}  -- missile id -> true: a second shell, which ends it
local db_pending = {} -- second shells to launch once the blast is over
local db_shooter      -- the worm that fired it (PX's ClWT / ClWN)

wa.on.missile_frame(function(m)
  if m.weapon == "px.double_bazooka" and m.phase == "post" then
    db_speed[m.id] = { m.vx, m.vy }
  end
end)

shared.double_bazooka_explode = function(ev)
  local id = ev.missile
  if not id then
    return
  end
  local speed = db_speed[id]
  db_speed[id] = nil
  if db_second[id] then
    db_second[id] = nil
    return
  end
  if not speed then
    return
  end
  wa.land.cut({ x = ev.x, y = ev.y, shape = "circle", radius = DB_HOLE })
  -- Launched after the blast, as PX's comes after super: WA's explosion
  -- would otherwise push it.
  db_pending[#db_pending + 1] = { x = ev.x, y = ev.y, vx = speed[1], vy = speed[2] }
end

wa.on.worm_message(function(worm, msg)
  if msg == wa.msg.FIRE_WEAPON and worm.weapon == "px.double_bazooka" then
    db_shooter = worm
  elseif msg == wa.msg.FRAME_FINISH and #db_pending > 0 then
    -- The first worm's frame after the blast; every worm gets one.
    local owner = db_shooter or worm
    for _, p in ipairs(db_pending) do
      local id = wa.weapons.launch({
        weapon = "px.double_bazooka", owner = owner, x = p.x, y = p.y, vx = p.vx, vy = p.vy,
        missile = { explosion = { power = DB_SECOND.damage }, fuse = DB_SECOND.fuse },
      })
      db_second[id] = true
    end
    db_pending = {}
  end
end, { msgs = { wa.msg.FIRE_WEAPON, wa.msg.FRAME_FINISH } })
end
