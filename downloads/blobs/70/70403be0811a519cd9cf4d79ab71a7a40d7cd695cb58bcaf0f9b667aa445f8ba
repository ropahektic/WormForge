-- Highlander: Project X's sentry turrets (weapon_sentry_gun's PxSentryGun,
-- weapon_sentry_laser's PxSentryLaser), the part they share: a body dropped
-- where the worm stands, with passage for the planter until clear, a head that sweeps,
-- picks the nearest moving enemy in sight beyond its barrel sweep, turns and fires, reloads
-- each turn, and is disabled for the turn by positive damage and explodes at 0
-- health. What it aims at and what it fires are the weapon's: `targets` (by
-- default the worms) and `fire(t, a, s, target)`.
--
-- From the standalone sentry_gun port (mods/examples/sentry_gun_old), with
-- its numbers as the defaults. Angles: 0 down, 90 right, 180 up, 270 left.
local turret = {}
local turrets = {}
local feet = require("lib/sentry_mask")

-- Scripted bodies are not in the stock electrical target list. Include
-- their whole body circle in Lightning's existing beam selection in Lua.
function turret.on_beam(x0, y0, dx, dy, length)
  local best, entry
  for _, t in ipairs(turrets) do
    for _, id in ipairs(wa.sorted(t.state)) do
      local s = t.state[id]
      if s.body.id == id then
        local cx, cy = s.x - x0, s.y - t.capture_up - y0
        local along = cx * dx + cy * dy
        local miss = cx * cx + cy * cy - along * along
        if miss <= t.capture_radius * t.capture_radius then
          local at = along - math.sqrt(math.max(0, t.capture_radius * t.capture_radius - miss))
          if at > 0 and at < length and (not best or at < best) then
            best, entry = at, { t = t, s = s, body = s.body }
          end
        end
      end
    end
  end
  if best then return x0 + best * dx, y0 + best * dy, entry end
end

function turret.capture_hit(entry, x, y, alliance)
  if not entry or entry.t.state[entry.body.id] ~= entry.s then return false end
  local dx, dy = entry.s.x - x, entry.s.y - entry.t.capture_up - y
  if dx * dx + dy * dy > (entry.t.capture_radius + 6) * (entry.t.capture_radius + 6) then return false end
  return entry.t.capture(entry.body, entry.s, alliance)
end

-- PX's Javelin includes sentries in its strict impact square. The stock
-- electrical list excludes Lua actors, so add them through this registry.
function turret.projectile_target(x, y)
  for _, t in ipairs(turrets) do
    for _, id in ipairs(wa.sorted(t.state)) do
      local s = t.state[id]
      if s.body.id == id and math.abs(x - s.x) < 20
        and math.abs(y - (s.y - t.capture_up)) < 20 then
        return { t = t, s = s, body = s.body }
      end
    end
  end
end

function turret.projectile_hit(entry, damage, vx, vy, uid)
  if entry and entry.t.state[entry.body.id] == entry.s then
    entry.t.projectile_hit(entry.body, entry.s, damage, vx, vy, uid)
    return true
  end
  return false
end

local DEFAULTS = {
  sensor_px = 360,      -- detection radius
  ammo = 20,            -- rounds per turn
  shot_frames = 6,      -- frames between rounds
  activate = 60,        -- frames after acquiring before the first shot
  beep_frames = 60,     -- minimum gap between alert beeps
  rot_idle = 0.5,       -- degrees per frame while sweeping
  rot_active = 1.5,     -- PX tracking speed, degrees per frame
  sweep = 10,           -- PX idle sweep amplitude, degrees
  aim_tolerance = 1.5,  -- PX fires only after rotation reaches the target
  require_motion = true, -- PX only acquires walking/jumping/moving worms
  hold_own_turn = true, -- the Sentry Gun holds fire on its colour's turns
  settle_px = 4,        -- mask may overlap real terrain by this depth
  foot_offsets = { -6, 7 }, -- support beside the buried mask, never inside it
  top_px = feet.top,         -- top of the feet/hub silhouette above its anchor
  capture_radius = 24, -- Lightning's circle around the body
  capture_up = 16 - feet.burial,
  muzzle_up = 25 - feet.burial,       -- pixels from the anchor up to the turret pivot
  sight_grace_px = 4, -- terrain grace beyond the barrel tip's circular sweep
  placement_reach = 64, -- bounded clear-space search around the planting worm
  health = 50,
  slide_friction = 0.20, -- pixels/frame lost on supported ground
  contact_worm = 0.5,    -- fraction of incoming worm velocity transferred
  contact_projectile = 0.25, -- PX Javelin transfers a quarter of its velocity
  boom = { damage = 50, id = 100, below = false },
  -- Occlusion band for the head: in front of terrain (0x180000), so the
  -- landscape never buries it.
  head_depth = wa.depth.FRONT,
}

-- 0 = down, 90 = right: the art faces right, and screen y grows down.
-- wa.math: an aim reaches the simulation (what the turret sees and hits), so
-- it must come out the same on every machine.
function turret.angle_to(ax, ay, tx, ty)
  local dx = (tx - ax) // 1
  local dy = (ty - ay) // 1
  local deg = math.deg(wa.math.atan(dx, dy))
  if deg < 0 then deg = deg + 360 end
  return deg
end

-- The same physical barrel tip is used for firing and its terrain gate.
function turret.muzzle(t, a, angle)
  local rad = math.rad(angle)
  return a.x + wa.math.sin(rad) * t.muzzle_out,
    a.y - t.muzzle_up + wa.math.cos(rad) * t.muzzle_out
end

-- Terrain probes leave out this turret's stamped feet, but real terrain
-- and overlapping actors still block. Starting inside either must block too:
-- world.trace otherwise describes the exit from an initial overlap.
function turret.trace(a, x0, y0, x1, y1)
  local hit = wa.world.trace { x0 = x0, y0 = y0, x1 = x1, y1 = y1,
    radius = 0, with = { "terrain" }, ignore = { a } }
  if hit and hit.starts_solid then return { hit = true, x = x0, y = y0 } end
  if hit and hit.hit then return hit end
end

-- Ignore nearby terrain for sight only, inside the circle swept by every
-- possible muzzle position plus padding. Beyond it, even an initially solid
-- ray must block. Firing still checks the actual tip and uses the full terrain.
function turret.sight(t, a, tx, ty)
  local px, py = a.x, a.y - t.muzzle_up
  local dx, dy = tx - px, ty - py
  local radius = t.muzzle_out + t.sight_grace_px
  local distance2 = dx * dx + dy * dy
  if distance2 <= radius * radius then return true end
  local scale = radius / math.sqrt(distance2)
  return not turret.trace(a, px + dx * scale, py + dy * scale, tx, ty)
end

local function turn_toward(cur, want, speed)
  local d = (want - cur + 540) % 360 - 180
  if d > speed then d = speed elseif d < -speed then d = -speed end
  return (cur + d) % 360
end

-- A turret without one of the sounds (the laser has no firing loop) skips it.
local function play(a, sound)
  if sound then a:sound(sound) end
end

local function angle_gap(a, b)
  local d = (a - b + 540) % 360 - 180
  return d < 0 and -d or d
end

-- `cfg`: the weapon's numbers (over DEFAULTS), `art` { base, gun, flare,
-- barrel }, `sounds` { place, beep, fire_loop, fire_end, servo_start,
-- servo_loop, servo_end }, `tints` (team colours, red to cyan, 0xRRGGBB),
-- `kind`, `fire(t, a, s, target)`, which shoots once (a, the body; s, its
-- state), and optionally `targets(t, a, s)`, what it can aim at: a list of
-- { key, x, y, alliance, moving }, in an order the same on every machine.
-- Returns `t`, whose `place(fire_ev)` drops a turret for the firing worm.
--
-- The head: `gun`, team-tinted, its frames the firing poses; with a
-- `barrel`, the barrel is its own untinted layer behind it, its frames the
-- poses, and the gun's two frames are its art and its mirror image, for a
-- turret that has turned to face left (PX draws it flipped).
function turret.new(cfg)
  local t = {}
  for k, v in pairs(DEFAULTS) do t[k] = v end
  for k, v in pairs(cfg) do t[k] = v end
  local state = {}
  -- The colour taking its turn: its turrets hold fire. Alliance, not team:
  -- it is WA's colour index (0 red .. 5 cyan), shared by allied teams.
  local active_alliance = nil

  local function note_motion(s, w)
    local p = s.seen[w.id]
    local m = (w.vx ~= 0 or w.vy ~= 0)
    if p then
      if p.x ~= w.x or p.y ~= w.y then m = true end
      p.x, p.y, p.moving = w.x, w.y, m
    else
      s.seen[w.id] = { x = w.x, y = w.y, moving = m }
    end
  end

  -- The Sentry Gun's targets: the worms, keyed by worm id; moving by
  -- note_motion.
  local function worm_targets(_, _, s)
    local out = {}
    for _, w in ipairs(wa.worms.all()) do
      if w.visible ~= false then
      local p = s.seen[w.id]
        out[#out + 1] = { key = w.id, x = w.x, y = w.y, alliance = w.alliance, moving = p and p.moving, obj = w }
    end
    end
    return out
  end
  local targets = cfg.targets or worm_targets

  -- Movement is needed to notice a target; a held target may stop moving.
  -- Nearby terrain has grace around the complete barrel sweep; normal sight
  -- blocking applies beyond it. Firing also checks the current barrel tip.
  local function can_track(a, s, c, need_motion)
    if c.alliance == s.alliance then return false end
    if need_motion and t.require_motion and not c.moving then return false end
    local ex, ey = a.x, a.y - t.muzzle_up
    local dx, dy = (c.x - ex) // 1, (c.y - ey) // 1
    if dx * dx + dy * dy > t.sensor_px * t.sensor_px then return false end
    return turret.sight(t, a, c.x, c.y)
  end

  -- The nearest moving enemy in sight; ties to the first listed, the same
  -- everywhere.
  local function acquire(a, s, list)
    local ex, ey = a.x, a.y - t.muzzle_up
    local best, best_d
    for _, c in ipairs(list) do
      if can_track(a, s, c, true) then
        local dx, dy = (c.x - ex) // 1, (c.y - ey) // 1
        local d = dx * dx + dy * dy
        if not best_d or d < best_d then best, best_d = c, d end
      end
    end
    return best
  end

  -- Keep the target while it remains eligible, in range and in sight.
  local function held(a, s, list)
    if s.tid == nil then return nil end
    for _, c in ipairs(list) do
      if c.key == s.tid then return can_track(a, s, c, false) and c or nil end
    end
    return nil
  end

  function t.start_firing(a, s)
    if s.firing then return end
    s.firing, s.anim = true, 0
    -- PX zeroes ShootTimer as firing (re)starts: the first round goes now.
    s.cooldown = 0
    s.fire_sound = 35
    play(a, t.sounds.fire_loop)
  end

  function t.stop_firing(a, s)
    if not s.firing then return end
    s.firing, s.anim = false, 0
    play(a, t.sounds.fire_end)
  end

  local function update_servo(a, s, rotating)
    if rotating then
      if not s.rotating then
        s.rotating, s.servo_sound = true, 17
        play(a, t.sounds.servo_start)
      elseif s.servo_sound <= 0 then
        s.servo_sound = 47
        play(a, t.sounds.servo_loop)
      end
    elseif s.rotating then
      s.rotating, s.servo_sound = false, 0
      play(a, t.sounds.servo_end)
    end
  end

  local function think(a, s)
    if not cfg.targets then
    for _, w in ipairs(wa.worms.all()) do note_motion(s, w) end
    end

    local target
    if s.active then
      local list = targets(t, a, s)
      target = held(a, s, list)
      if not target and not s.lost then
        target = acquire(a, s, list)
        if target then s.tid = target.key end
      end
    end
    local want
    local hx, hy = a.x, a.y - t.muzzle_up
    if target then
      if not s.had_target then
        s.activate = t.activate
        wa.log("Sentry acquired " .. t.kind .. " id=" .. a.id .. " target=" .. target.key
          .. " at=(" .. target.x .. "," .. target.y .. ")")
        if s.beep <= 0 then
          play(a, t.sounds.beep)
          s.beep = t.beep_frames
        end
      end
      s.had_target, s.lost = true, false
      s.tx, s.ty = target.x, target.y
      want = turret.angle_to(hx, hy, target.x, target.y)
      s.angle = turn_toward(s.angle, want, t.rot_active)
    elseif s.had_target then
      -- PX stops firing at once, turns to the last place it saw it, then
      -- drops it.
      if not s.lost then t.stop_firing(a, s) end
      s.lost = true
      want = turret.angle_to(hx, hy, s.tx, s.ty)
      s.angle = turn_toward(s.angle, want, t.rot_active)
      if angle_gap(s.angle, want) <= t.aim_tolerance then
        s.had_target, s.lost, s.tid = false, false, nil
      end
    else
      -- PX sweeps to one side and turns back the moment it gets there.
      s.had_target = false
      want = s.idle + s.sweep_dir * t.sweep
      s.angle = turn_toward(s.angle, want, t.rot_idle)
      if s.angle == want then s.sweep_dir = -s.sweep_dir end
    end

    -- PX: turned over itself, it idles facing the other way.
    if (180 - s.angle) * s.side < 0 then
      s.side = -s.side
      s.idle = 180 - 90 * s.side
    end

    if not s.active then
      want = s.idle - 45 * s.side
      s.angle = turn_toward(s.angle, want, t.rot_idle)
      t.stop_firing(a, s)
    end

    if s.beep > 0 then s.beep = s.beep - 1 end
    if s.activate > 0 then s.activate = s.activate - 1 end
    if s.cooldown > 0 then s.cooldown = s.cooldown - 1 end
    if s.servo_sound > 0 then s.servo_sound = s.servo_sound - 1 end
    if s.fire_sound > 0 then s.fire_sound = s.fire_sound - 1 end

    local aligned = target and angle_gap(s.angle, want) <= t.aim_tolerance
    -- PX's long-rotation sound: a turn left of at least twice its speed.
    update_servo(a, s, target ~= nil and angle_gap(s.angle, want) >= 2 * t.rot_active)

    -- PX latches firing once on target, until it loses it, runs dry or is
    -- disabled.
    local hold_fire = t.hold_own_turn and active_alliance == s.alliance
    local muzzle_clear = false
    if target and not hold_fire and s.activate <= 0 and (s.firing or aligned) then
      local mx, my = turret.muzzle(t, a, s.angle)
      muzzle_clear = not turret.trace(a, mx, my, mx, my)
    end
    if muzzle_clear then
      t.start_firing(a, s)
      if s.fire_sound <= 0 then
        s.fire_sound = 35
        play(a, t.sounds.fire_loop)
      end
      if s.cooldown <= 0 then
        t.fire(t, a, s, target)
        s.cooldown = t.shot_frames
      end
    else
      t.stop_firing(a, s)
    end
  end

  -- Coalition owns the sentry. A living member is only WA's required
  -- spawn/shot parent, chosen in stable worm-id order; it is not the owner.
  function t.owner(a, s)
    local best
    for _, w in ipairs(wa.worms.all()) do
      if w.hp > 0 and w.alliance == s.alliance and (not best or w.id < best.id) then best = w end
    end
    return best or a
  end

  local function disable(a, s)
    s.disabled, s.active = true, false
    s.had_target, s.lost, s.tid = false, false, nil
    t.stop_firing(a, s)
    update_servo(a, s, false)
  end

  local function destroy(a, s, explode)
    state[a.id] = nil
    if explode then
      -- The blast's stock parent must come from the owning colour too.
      -- This instant, invisible emission has no collision or lasting body.
      local owner = t.owner(a, s)
      if owner ~= a then
        local e = wa.actors.spawn({ sprite = false, owner = owner,
          x = a.x, y = a.y + feet.burial - 20, gravity = false, collide = false,
          explode = { damage = t.boom.damage, id = t.boom.id, now = true } })
        e:despawn()
      else
        a:explode(t.boom)
      end
    end
    a:despawn()
  end

  local function hit(a, ev)
    local s = state[a.id]
    if not s then return end
    local damage = math.max(0, ev.damage or 0)
    if damage > 0 then
      s.health = s.health - damage
      disable(a, s)
      if s.health <= 0 then destroy(a, s, true); return end
    end
    t.push(a, s, ev.vx or 0, ev.vy or 0)
  end

  function t.push(a, s, vx, vy)
    s.vx, s.vy = s.vx + vx, s.vy + vy
    a.vx, a.vy = 0, 0
    if vy < 0 then s.planted = false end
    if vx ~= 0 or vy ~= 0 then t.stop_firing(a, s) end
  end

  local function touched(a, ev)
    local s = state[a.id]
    if not s or not ev.other then return end
    local uid = ev.other.uid
    if uid and s.script_hits[uid] then s.script_hits[uid] = nil; return end
    if ev.other.kind == "worm" and s.planter and ev.other.id == s.planter_id then return end
    local fraction = ev.other.kind == "worm" and t.contact_worm or t.contact_projectile
    t.push(a, s, (ev.vx or 0) * fraction, (ev.vy or 0) * fraction)
  end

  function t.projectile_hit(a, s, damage, vx, vy, uid)
    if uid then s.script_hits[uid] = wa.world.frame() end
    hit(a, { damage = damage, vx = vx, vy = vy })
  end

  local function motion(a, s)
    local obstacles, land = nil, {}
    local function other_feet()
      if obstacles then return obstacles end
      obstacles = {}
      -- Settled sentries need only support probes. Snapshot obstacles once
      -- when moving, including positions moved earlier in this Lua frame.
      for _, other_t in ipairs(turrets) do
        for _, id in ipairs(wa.sorted(other_t.state)) do
          local other = other_t.state[id]
          if id ~= a.id and other.body.id == id then
            obstacles[#obstacles + 1] = { x = other.x, y = other.y }
          end
        end
      end
      return obstacles
    end
    local function solid(px, py)
      px, py = math.floor(px), math.floor(py)
      local row = land[py]
      if not row then row = {}; land[py] = row end
      if row[px] == nil then
        -- Most leading pixels are air. Filter our own stamp only when the
        -- grid says solid; real dirt and overlapping masks stay solid.
        row[px] = wa.land.solid(px, py) and turret.trace(a, px, py, px, py) ~= nil
      end
      return row[px]
    end
    local function support(x, y)
      for _, dx in ipairs(t.foot_offsets) do
        if solid(x + dx, y - t.settle_px + 1) then return true end
      end
      return false
    end
    local function blocked(x, y)
      for _, other in ipairs(other_feet()) do
        if feet.intersects(x, y, other.x, other.y) then return true end
      end
      -- Test the newly entered silhouette pixels. Existing burial cannot
      -- trap a knocked turret, and the burial band may slide through soil.
      local ox, oy = math.floor(s.x), math.floor(s.y)
      x, y = math.floor(x), math.floor(y)
      for _, row in ipairs(feet.rows) do
        if row[1] <= -t.settle_px then
          for i = 2, #row, 2 do
            for px = x + row[i], x + row[i + 1] do
              if not feet.contains(ox, oy, px, y + row[1]) and solid(px, y + row[1]) then return true end
            end
          end
        end
      end
      return false
    end
    if s.planted and not support(s.x, s.y) then
      s.planted = false
      t.stop_firing(a, s)
      update_servo(a, s, false)
    end
    if s.planted and s.vy > 0 then s.vy = 0 end
    if not s.planted then s.vy = s.vy + wa.world.gravity() end
    if s.vx ~= 0 or s.vy ~= 0 or not s.planted then
      local n = math.max(1, math.ceil(math.max(math.abs(s.vx), math.abs(s.vy))))
      local dx, dy = s.vx / n, s.vy / n
      for _ = 1, n do
        if dx ~= 0 then
          if blocked(s.x + dx, s.y) then s.vx, dx = 0, 0
          else s.x = s.x + dx end
        end
        if dy < 0 then
          if blocked(s.x, s.y + dy) then s.vy, dy = 0, 0
          else s.y = s.y + dy; s.planted = false end
        elseif dy > 0 then
          if blocked(s.x, s.y + dy) and not support(s.x, s.y + dy) then
            s.vy, dy = 0, 0
          else
            s.y = s.y + dy
            if support(s.x, s.y) then
              s.vy, dy = 0, 0
              if not s.planted then
                s.planted = true
                wa.log(string.format("Sentry planted %s id=%d mask=(%.2f,%.2f) art_feet=%.2f support_y=%.2f overlap=%d",
                  t.kind, a.id, s.x, s.y, s.y + feet.burial, s.y - t.settle_px + 1, t.settle_px))
                play(a, t.sounds.place)
              end
            end
          end
        end
        if s.planted and not support(s.x, s.y) then s.planted = false end
      end
      if s.planted then
        if math.abs(s.vx) <= t.slide_friction then s.vx = 0
        elseif s.vx > 0 then s.vx = s.vx - t.slide_friction
        else s.vx = s.vx + t.slide_friction end
      end
    end
    a.x, a.y, a.vx, a.vy = s.x, s.y, 0, 0
    if a:in_water() then destroy(a, s, false); return false end
    return true
  end

  local function brain(a)
    local s = state[a.id]
    if not s then return end
    -- Damage is consumed only by on.hit; the legacy frame damage accumulator
    -- may describe the same blast and must not deduct health twice.
    s.tick = s.tick + 1
    local frame = wa.world.frame()
    for uid, at in pairs(s.script_hits) do
      if at < frame - 1 then s.script_hits[uid] = nil end
    end
    if s.recoil > 0 then s.recoil = s.recoil - 1 end
    if s.firing or s.recoil > 0 then s.anim = s.anim + 1 end
    local stamped_x, stamped_y = s.x, s.y
    if not motion(a, s) then return end
    if s.planter then
      local planter
      for _, w in ipairs(wa.worms.all()) do
        if w.id == s.planter_id and w.hp > 0 then planter = w; break end
      end
      -- WA uses the stamp from the frame's start until the next frame.
      -- When falling, clear both that footprint and the moved feet before
      -- ending passage, so a remaining old stamp cannot trap the planter.
      if not planter or (not feet.overlaps_worm(s.x, s.y, planter)
        and not feet.overlaps_worm(stamped_x, stamped_y, planter)) then
        a:collision_ignore(s.planter, false)
        wa.log(string.format("Sentry passage ended %s id=%d planter=%d (%s)",
          t.kind, a.id, s.planter_id, planter and "clear" or "gone"))
        s.planter, s.planter_id = nil, nil
      end
    end
    s.active = not s.disabled and s.ammo > 0
    if s.planted then think(a, s) end
  end

  local function status(s)
    if s.ammo <= 0 then return 0x808080, true, "empty" end
    if not s.planted or not s.active or (t.hold_own_turn and active_alliance == s.alliance) then
      return 0x202020, false, "inactive"
    end
    if s.firing or s.had_target or s.lost or s.recoil > 0 then return 0xFF3030, true, "tracking" end
    return 0x30FF50, true, "ready"
  end
  t.status = status

  -- One gameplay actor; its head, barrel, flare and added LED are draw calls.
  local function sheet(path, x, y, frame, angle, rgb, depth, blend, size)
    local h = (size or 144) / 2
    local r = math.rad(angle)
    local c, sn = math.cos(r), math.sin(r)
    local points = {}
    for i, p in ipairs({ {-h,-h}, {h,-h}, {h,h}, {-h,h} }) do
      points[i] = { x + p[1] * c - p[2] * sn, y + p[1] * sn + p[2] * c }
    end
    wa.draw.quad({ sprite = path, points = points, frame = frame,
      color = 0xFF000000 | rgb, depth = depth, blend = blend or "alpha" })
  end
  if wa.on.draw then
    wa.on.draw(function()
      for _, id in ipairs(wa.sorted(state)) do
        local s = state[id]
        if s.body.id == id then
          sheet(t.art.base, s.x + 1, s.y - 9, 0, 0, 0xFFFFFF, wa.depth.BEHIND_TERRAIN, "alpha", 64)
          local x, y, angle = s.x, s.y - t.muzzle_up, (90 - s.angle) % 360
          local pose = (s.firing or s.recoil > 0) and (1 + ((s.anim // 3) % 2)) or 0
          if t.art.barrel then sheet(t.art.barrel, x, y, pose, angle, 0xFFFFFF, t.head_depth + 1) end
          local look = t.art.barrel and (s.side < 0 and 1 or 0) or pose
          sheet(t.art.gun, x, y, look, angle, t.tints[s.alliance + 1] or t.tints[1], t.head_depth)
          if t.art.flare then
            sheet(t.art.flare, x, y, pose == 1 and 1 or 0, angle, 0xFFFFFF, t.head_depth, "add")
          end
          local rgb, flash = status(s)
          if flash and (s.tick % 30) >= 15 then rgb = (rgb & 0xFEFEFE) >> 1 end
          local r = math.rad(angle)
          local lx, ly = -7 * math.cos(r) + 3 * math.sin(r), -7 * math.sin(r) - 3 * math.cos(r)
          sheet(t.art.light, x + lx, y + ly - 4, 0, 0, rgb, t.head_depth - 1, "alpha", 5)
        end
      end
    end)
  end

  function t.capture(a, s, alliance)
    if alliance < 0 or alliance > 5 then return false end
    s.alliance = alliance
    disable(a, s)
    return true
  end

  -- Prefer the worm's position, then deterministic 4px rings if blocked.
  -- The planter can walk out; every other worm keeps its body clearance.
  local function placement(worm, facing)
    local wx, wy, planter_id = worm.x, worm.y, worm.id
    local x, y = wx, wy - feet.burial
    -- Nothing moves during this callback. Snapshot native handles once and
    -- share terrain reads across the overlapping candidates in this search.
    local worms, obstacles, land = {}, {}, {}
    for _, w in ipairs(wa.worms.all()) do
      local id, hp = w.id, w.hp
      if id ~= planter_id and hp > 0 then
        worms[#worms + 1] = { id = id, hp = hp, x = w.x, y = w.y }
      end
    end
    for _, other_t in ipairs(turrets) do
      for _, id in ipairs(wa.sorted(other_t.state)) do
        local other = other_t.state[id]
        if other.body.id == id then obstacles[#obstacles + 1] = { x = other.x, y = other.y } end
      end
    end
    local function solid(px, py)
      local row = land[py]
      if not row then row = {}; land[py] = row end
      local value = row[px]
      if value == nil then value = wa.land.solid(px, py); row[px] = value end
      return value
    end
    for radius = 0, t.placement_reach, 4 do
      local step = radius == 0 and 360 or math.max(15, math.floor(360 / (radius / 2)))
      for deg = 0, 359, step do
        local angle = math.rad(deg)
        local tx = x + facing * radius * wa.math.cos(angle)
        local ty = y + radius * wa.math.sin(angle)
        local blocked = false
        for _, other in ipairs(obstacles) do
          if feet.intersects(tx, ty, other.x, other.y) then blocked = true; break end
        end
        if not blocked and feet.clear(tx, ty, worms, planter_id, t.settle_px, solid) then
          local hit = wa.land.trace(wx, wy - 8, tx, ty - feet.top / 2)
          if not hit or not hit.hit then return tx, ty end
        end
      end
    end
  end

  -- Drop a turret for the firing worm, its owner's colour (not worm.team,
  -- its roster slot: online a blue team in slot 1 placed a red turret).
  function t.place(fire_ev)
    local worm = fire_ev.worm
    local alliance = worm.alliance or 0
    if alliance < 0 or alliance > 5 then alliance = 0 end
    local facing = worm.facing
    local idle = facing < 0 and 270 or 90
    local x, y = placement(worm, facing)
    if not x then
      -- The native placed shot consumes one charge; retain it on failure.
      local ammo = worm:ammo(t.weapon)
      if ammo >= 0 then worm:ammo(t.weapon, { set = ammo + 1 }) end
      wa.log("Sentry: no clear placement within " .. t.placement_reach .. "px; charge refunded")
      return nil
    end
    local body = wa.actors.spawn({
      sprite = t.art.mask, x = x, y = y,
      vx = 0, vy = 0,
      loop = false, origin = "bottom", owner = worm, kind = t.kind, persist = true,
      gravity = false, collide = false, drown = false, as_object = true,
      mask = true, mask_worms = true, mask_weapons = true, mask_land = false, mask_actors = false,
      on = { frame = brain, hit = hit, contact = touched },
    })
    assert(body:collision_ignore(worm, true), "Sentry: could not register planter passage")
    local s = {
      alliance = alliance, planted = false, active = true, disabled = false, ammo = t.ammo,
      x = x, y = y, vx = body.vx, vy = body.vy, tick = 0,
      script_hits = {}, health = t.health, angle = idle, idle = idle, side = facing < 0 and -1 or 1,
      sweep_dir = 1, shots = 0, firing = false, anim = 0, rotating = false,
      servo_sound = 0, fire_sound = 0, beep = 0, activate = 0, cooldown = 0,
      had_target = false, lost = false, seen = {}, recoil = 0,
      planter = worm, planter_id = worm.id,
    }
    state[body.id] = s
    s.body = body
    body:frame(0)
    -- Zero additive colour hides the mechanical mask without removing its alpha.
    body:gfx({ tint = 0, blend = "add", depth = wa.depth.BEHIND_TERRAIN })
    wa.log(string.format("Sentry placed %s id=%d planter=%d at=(%.2f,%.2f) passage=on",
      t.kind, body.id, worm.id, x, y))
    return body, s
  end

  -- Each turn reloads and reactivates every turret, and forgets what moved
  -- and what it aimed at. Order-independent: each entry gets the same reset.
  wa.on.worm_message(function(worm, msg)
    if msg ~= wa.msg.START_TURN then return end
    active_alliance = worm.alliance
    for id, s in pairs(state) do
      if s.body.id ~= id then state[id] = nil else
        s.ammo, s.active, s.disabled, s.had_target, s.tid, s.lost, s.seen = t.ammo, true, false, false, nil, false, {}
      end
    end
  end, { msgs = { wa.msg.START_TURN } })

  t.state = state -- for the Highlander mock
  turrets[#turrets + 1] = t
  return t
end

return turret
