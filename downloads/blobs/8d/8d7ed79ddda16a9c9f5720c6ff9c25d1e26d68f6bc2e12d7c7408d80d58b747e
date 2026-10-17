-- Attack Helicopter -- Project X's "COLADOR AEREO" (PX_pending/attack_helicopter.txt).
-- Ported by hand to WormForge API 4, as a weapon component.
--
-- PX: a custom missile body (`heliShoot : CMissile`, :3) fired from
-- `CWorm::FireFinal` when the fired weapon is named "COLADOR AEREO" (:423-494).
-- It is an air strike: WA shows its cursor, the click gives the target
-- (`Desc->AddX/AddY`, :427-428), and the body then enters from off the map
-- (`Y=-288`, `X=-500`/`LevelSX+500`, :434-445), hovers toward the target
-- (`SpX=±15`), fires 17 homing bullets (`bulletCount`, :31; 4-frame cadence,
-- :264-271), and finally leaves or blows up over water (:214-239).
--
-- Here the body is a Lua actor we move ourselves (`wa.actors.spawn`, the
-- Electromagnet pattern), the bullets are real WA missiles (`wa.weapons.launch`)
-- of the slot's **own record** -- PX's `weps/bullet_wep.wep`, which the same
-- click weapon carries: a weapon a worm never fires, only `shoot` launches it --
-- turned onto the target in `wa.on.missile_frame` (the Double Bazooka pattern),
-- and the blast-damage absorption (`TakeExplosionDamage`, :175-191) is the
-- actor's `hit` event. The strike itself is the Lightning Strike's shape
-- (Highlander weapons/catalog.lua:319-337): a click-only strike --
-- `on_select = { cursor = true }` keeps WA's cursor and turn handling, and
-- `on_click(ev)` gets the coordinate and `ev.worm`. The side it enters from is
-- the worm's facing, as PX's own strike reads it (`ev.worm.facing`,
-- wklua_and_px/electrical.lua:157); the Highlander port's `ev.vx` guess
-- (weapons/electrical.lua:174, weapons/bowling_ball.lua:533) is not PX's. No
-- `on_fire` and no `eat_fire`: a real strike needs neither.
--
-- Art is one directory of `frameNNN.png` per PX sprite, as cut_lab and stress
-- do: `empty` (2 rotor frames), `aim` (32), `gun` (2: idle, firing) and
-- `casing` (16, the shell), plus `bullet.png` for the bullets. The rotated
-- draws need the sheets in the GPU atlas (`params.gpu_prefix`).
--
-- What the API cannot carry (presentation/feel, none a blocker -- REPORT.md 9.3):
-- sound volume/pan and the rotor loop rate (`wa.sound.play` has neither), the
-- `CSmoker` on impact, and the `CFire` fan's directional velocity (the three
-- fires are placed apart instead). PX's `CColMask(15,15,MakeCircleMask(15))`
-- circle is dropped on purpose: an actor only takes `mask = true`, a square.
--
-- The rounds trail: PX's effect-manager trail, as a module (lib/px_trail.lua).
-- REPORT.md 11.9 maps it back to px_effects.c, and TRAIL.md is how to put it on
-- another weapon. The module is required at load, but is pure data until
-- trail.install() -- a component's file, and anything it requires, runs where
-- `wa` does not exist yet.
local trail = require("lib/px_trail")

return {
  defaults = {
    ammo = { round_start = -1 },
    delay = 0,
  },
  install = function(ctx)
    trail.install() -- the module's wa.on.missile_frame/wa.on.draw, now that wa is here
    -- --------------------------------------------------------------- tuning
    -- PX's own numbers, in pixels (PX is 16.16 fixed point, so "SpX = 15.0" is 15).
    local BULLETS        = 17      -- bulletCount (:31)
    local ENTER_Y        = -288    -- spawn height, above the map (:434)
    local SIDE           = 500     -- spawn offset past the map edge (:437,439)
    local HOVER          = 15      -- entry/hover speed (:443,445)
    local SHOOT_RANGE    = 450     -- begin firing within this of the target (:249)
    local COOLDOWN_START = 40      -- wind-up before the first shot (:252)
    local COOLDOWN_SHOT  = 4       -- frames between shots (:270)
    local BULLET_SPEED   = 35      -- homeToPlace speed (:387, "35.0")
    local BULLET_FRAMES  = 3       -- homeToPlace runs this long (:384)
    local BULLET_FUSE    = 3000    -- timeBeforeExplosion (:304)
    local MUZZLE         = 22      -- barrel length: the gun sheet's tip above its centre
    local BLAST_DAMAGE   = 80      -- Weap->launch.explosion.damage (:477)
    local BLAST_KIND     = 100     -- big blast (PX's pushPower 120 has no field here)
    local DEAD_DAMAGE    = 25      -- TakeExplosionDamage -> Collide above this (:190)
    local DRIFT          = 0.984   -- SpX damping while shooting (:263)
    local LEAVE          = 1.082    -- SpX growth after the magazine (:281)
    local TURN           = 0.75    -- gunAngle interpolation (:83)
    local ROTOR_TICKS    = 47      -- heli2Wav loop period (:229-233)
    local HALF_PI        = math.pi / 2
    -- The shell eject (:369-379): the same PxParticle(115) the sentry port runs
    -- as its casing (weapons/sentry_gun.lua:16-49) -- 16 frames, life 100,
    -- jitter +-0.3 rad, speed 2.0-3.0, gravity, no bounce.
    local CASING_FRAMES  = 16
    local CASING_LIFE    = 100     -- p->SetLifeTime(100) (:371)
    local CASING_JITTER  = 17      -- RandomFloat(-0.3, 0.3) rad (:372), in degrees
    local CASING_SPEED_MIN, CASING_SPEED_MAX = 200, 300 -- 2.0 .. 3.0 (:373), hundredths
    -- Mirror of the aiming worm and the gun, against the body's. PX's flags
    -- (:130-140): the body mirrors when flying left, the worm when flying right
    -- (the opposite `wormTurnflag`), the gun like the body. Seen in game with
    -- this art the worm and gun both came out on the wrong side, so both are
    -- flipped. The mirror flips the art ONLY: `a:gfx` takes the angle as given
    -- and does not reflect it (see `place`), so the angles are PX's raw ones and
    -- carry no mirror factor.
    local FLIP_AIM, FLIP_GUN = true, true

    local ART = "sprites/attack_helicopter/"
    local BULLET = "sprites/bullet.png" -- the redWeapSheet bullet PX draws itself (:364)
    local SND = "sounds/attack_helicopter/"

    local helis = {}   -- body actor id -> helicopter state
    local shots = {}   -- bullet missile id -> { x, y, frames } the homing target


    -- Round toward zero, as PX's fixed-point arithmetic does.
    local function trunc(n) return n < 0 and math.ceil(n) or math.floor(n) end

    local frame, hit -- forward declarations (the actor callbacks, defined below)

    -- PX's UpdateRotation (:69-91): the gun angle eases toward the straight-line
    -- angle to the target, and drives the aiming worm's 32-frame pose.
    local function update_aim(h, spawned)
      local instant = wa.math.atan(h.ty - h.y, math.abs(h.tx - h.x)) -- atan2(dy, |dx|)
      if instant > HALF_PI then instant = HALF_PI end
      if instant < -math.pi then instant = -math.pi end
      if spawned then
        h.gun = instant
      else
        h.gun = h.gun + (instant - h.gun) * TURN
      end
      local n = (h.gun + math.pi) / (math.pi * 1.5) -- 0.0 to 1.0
      if n < 0 then n = 0 elseif n > 1 then n = 1 end
      h.worm_frame = math.floor((1 - n) * 31)
    end

    -- PX's UpdateHelicopterRotation (:93-125): the body leans into its motion.
    local function update_rot(h)
      local fast = h.vx < -14 or h.vx > 14
      local slow = h.vx > -14 and h.vx < 14
      if h.dir >= 0 then
        if fast and h.shots < BULLETS then
          h.rot = 0.3
        elseif slow and h.shots < BULLETS then
          if h.rot > -0.115 then h.rot = h.rot - 0.01 end
        elseif h.shots >= BULLETS then
          if h.rot < 0.3 then h.rot = h.rot + 0.01 end
        end
      else
        if fast and h.shots < BULLETS then
          h.rot = -0.3
        elseif slow and h.shots < BULLETS then
          if h.rot < 0.115 then h.rot = h.rot + 0.01 end
        elseif h.shots >= BULLETS then
          if h.rot > -0.3 then h.rot = h.rot - 0.01 end
        end
      end
    end

    -- PX's Draw (:127-173): three sprites -- the body (2 frames), the aiming
    -- worm (32 frames) and the gun (2 frames: idle, firing). A lower depth is
    -- nearer, so the gun goes on top: gun (PX z 4.9) in front of the worm (5.1)
    -- in front of the body (10.01).
    local function place(h)
      local a, aim, gun = h.body, h.aim, h.gun_actor
      local right = h.dir >= 0
      -- PX mirrors its art with `turnflag` (:127-140); our sheets are the
      -- mirror of PX's sprite bank, so the flags invert. `facing` flips the art
      -- only: `a:gfx` takes the angle as given and does NOT reflect it for a
      -- mirrored actor (the Highlander missile follow sprite relies on the same,
      -- lib/missile_sprites.lua:140,158), so every part is drawn at PX's raw
      -- angle -- only the art's own mirror carries the flip. The gun's absolute
      -- bearing is negated (PX's clockwise `HALF_PI + final` reads the other way
      -- here); the body/worm lean is the signed `heliRotation` and keeps its sign.
      local face = right and -1 or 1
      local aface = FLIP_AIM and -face or face -- the worm's own mirror
      local gface = FLIP_GUN and -face or face -- the gun's own mirror
      a.x, a.y, a.vx, a.vy, a.facing = h.x, h.y, 0, 0, face
      a:frame(h.frame)
      a:gfx({ angle = math.deg(h.rot) % 360, depth = wa.depth.OBJECTS + 2 })

      local gx = h.x + (right and 5 or -5)
      aim.x, aim.y, aim.facing = gx - 2, h.y + 6, aface
      aim:frame(h.worm_frame)
      aim:gfx({ angle = math.deg(h.rot * 0.9) % 360, depth = wa.depth.OBJECTS + 1 })

      local final = right and h.gun or (math.pi - h.gun) -- (:161-165) mirror left
      gun.x, gun.y, gun.facing = gx, h.y + 12, gface
      -- The gun sheet is a 2-frame trim of PX's multiplex: frame 0 idle, 1 firing.
      gun:frame(h.firing and 1 or 0)
      -- PX draws the gun at `HALF_PI + finalRenderAngle` (:170); the art's own
      -- mirror is the only flip.
      gun:gfx({ angle = -math.deg(HALF_PI + final) % 360, depth = wa.depth.OBJECTS })
    end

    -- Clear every actor of a helicopter and forget it. The companions go first:
    -- despawning an already-exploded body can throw, and a skipped companion
    -- would strand a gun sprite on the map -- the "cursor" that would not leave.
    local function despawn(a)
      if a and not a.dead then a:despawn() end
    end
    local function drop(h)
      helis[h.body.id] = nil
      despawn(h.aim)
      despawn(h.gun_actor)
      despawn(h.body)
    end

    -- PX's ExplodeAt (:392-421) plus the missile's own blast: three fanned fires,
    -- then the 80-damage explosion. (The fan's SpX/SpY cannot be carried; the
    -- three fires are placed apart instead.)
    local function boom(h)
      if h.owner then
        for _, f in ipairs({ { -3, -1 }, { 3, 20 }, { 0, -3 } }) do
          wa.fire.spawn({
            owner = h.owner, x = h.x + f[1], y = h.y + f[2],
            count = 7, duration = 1500, up_power = 55, damage = 9,
          })
        end
      end
      h.body:explode({ damage = BLAST_DAMAGE, id = BLAST_KIND, below = false })
      drop(h)
    end

    -- PX's shell eject (:369-379): a casing thrown sideways off the barrel, with
    -- a little random angle and speed, gravity and no bounce, gone after 100
    -- frames. The sentry port's `casing()` (weapons/sentry_gun.lua:16-49) is the
    -- same PxParticle(115); its sprite is WA's uzicase sheet.
    local function eject(h)
      local ang = h.gun + HALF_PI + math.rad(wa.random(-CASING_JITTER, CASING_JITTER))
      local speed = wa.random(CASING_SPEED_MIN, CASING_SPEED_MAX) / 100
      local life, spin = CASING_LIFE, 0
      wa.actors.spawn({
        sprite = ART .. "casing", x = h.x, y = h.y + 10, -- PX: PosX, PosY + 10 (:369)
        vx = wa.math.cos(ang) * speed, vy = wa.math.sin(ang) * speed,
        gravity = false, collide = false, owner = h.owner, kind = "casing",
        on = function(c)
          life = life - 1
          if life <= 0 then c:despawn(); return end
          c:gravity()
          c:move({ terrain = false, worms = false })
          spin = (spin + 1) % CASING_FRAMES
          c:frame(spin)
        end,
      })
    end

    -- PX's target selection in shootBullet (the FindWormInBox / FindShootableInBox
    -- calls, with IsInBox strict on all four sides). Each Find picks uniformly at
    -- random among its matches (PX's reservoir sampling), so the draws come from
    -- wa.random in a fixed object order: worms, mines, crates, oil.
    local function in_box(o, l, r, t, b)
      return o.x > l and o.x < r and o.y > t and o.y < b
    end

    -- FindWormInBox(l, r, t, b, true): living worms, the firing worm excluded.
    local function find_worm(h, l, r, t, b)
      local pick, count = nil, 0
      for _, w in ipairs(wa.worms.all()) do
        if w.hp > 0 and w.id ~= h.owner.id and in_box(w, l, r, t, b) then
          count = count + 1
          if wa.random(1, count) == 1 then pick = w end
        end
      end
      return pick
    end

    -- FindShootableInBox: worms, mines, crates and oil drums. No exclusion of the
    -- firing worm here -- the caller compares, as PX does. (Dead worms are
    -- skipped, which PX's version does not bother with.)
    local function find_any(l, r, t, b)
      local pick, count = nil, 0
      for _, group in ipairs({ wa.worms, wa.mines, wa.crates, wa.oil }) do
        if group then
          for _, o in ipairs(group.all()) do
            if (o.kind ~= "worm" or o.hp > 0) and in_box(o, l, r, t, b) then
              count = count + 1
              if wa.random(1, count) == 1 then pick = o end
            end
          end
        end
      end
      return pick
    end

    -- TraceLine(this, PosX, PosY, o->PosX, o->PosY, CMASK_TERRAIN): clear when
    -- nothing of the terrain is hit. Traced from the helicopter's centre.
    local function clear(h, o)
      return wa.land.trace(math.floor(h.x), math.floor(h.y),
        math.floor(o.x), math.floor(o.y)) == nil
    end

    -- Where a bullet is aimed: a visible worm near the click, else a visible
    -- shootable near it, else one underneath the flight path, else the click.
    local function pick_target(h)
      local tx, ty = h.tx, h.ty
      local function is_cur(o) return o.kind == "worm" and o.id == h.owner.id end

      local worm = find_worm(h, tx - 130, tx + 130, ty - 70, ty + 80)
      if worm and clear(h, worm) then
        return worm.x, worm.y
      end
      -- Fallback: the worm was missing or covered (the find has no trace in it).
      local obj = find_any(tx - 130, tx + 130, ty - 50, ty + 70)
      local visible = obj and not is_cur(obj) and clear(h, obj)
      if not visible then
        if h.dir < 0 then -- PX regDir < 0: check underneath
          obj = find_any(h.x - 30, tx + 80, ty - 90, ty + 120)
        else
          obj = find_any(tx - 80, h.x + 30, ty - 90, ty + 120)
        end
        visible = obj and not is_cur(obj) and clear(h, obj)
      end
      if visible then
        return obj.x, obj.y
      end
      return tx, ty -- PX: shoots at the click itself (sometimes "kinda fun")
    end

    -- PX's shootBullet (:288-380): pick a shooting sound, launch a real missile
    -- at the muzzle and remember the target so wa.on.missile_frame can home it.
    local function shoot(h)
      wa.sound.play(h.owner, SND .. "hks" .. wa.random(1, 3) .. ".wav")
      h.firing = true
      -- PX spawns each round at PosX + spriteXOffset + 10, PosY + spriteYOffset
      -- + 20 (:310-311), a fixed offset from the gun's anchor -- that reads as a
      -- nudge off the hull, not the barrel. Fire from the muzzle instead: the
      -- gun's anchor plus the barrel length turned by the gun's drawn angle. The
      -- hull carries no collision mask (we did not add PX's), so nothing blocks
      -- the round at the tip.
      local right = h.dir >= 0
      local gx = h.x + (right and 5 or -5) -- the gun's anchor x (:136, :150)
      local final = right and h.gun or (math.pi - h.gun)
      local ang = -(HALF_PI + final)          -- the gun's drawn angle, radians
      local gface = right and 1 or -1         -- the gun's own mirror
      local lx, ly = gface * 1, -MUZZLE        -- tip in the sheet, from its centre
      -- Turn that offset by the same angle the gun is drawn at (`place` passes
      -- `deg(ang)` to a:gfx), in the engine's own sense: a local (x, y) lands at
      -- (x*cos - y*sin, x*sin + y*cos), y down on screen. The turret proves it
      -- (`lib/turret.lua:109-113` against its drawn `90 - angle` at `:590`): its
      -- muzzle offset is the aim direction, and no art orientation satisfies that
      -- unless the engine turns a:gfx's angle this way. Both sines had the other
      -- sign here, so the tip was turned by `-ang` -- a lateral error of
      -- `2 * sin(ang) * MUZZLE` that vanishes when the gun points straight down
      -- (ang = 180 deg, sin = 0), which is exactly how it read in game.
      local cos, sin = wa.math.cos(ang), wa.math.sin(ang)
      local sx = gx + cos * lx - sin * ly
      local sy = (h.y + 12) + sin * lx + cos * ly
      -- The round: PX's runtime values ride as `missile` overrides on a weapon
      -- that is already on the scheme (`stock.bazooka`, as PX sets `damage` 13
      -- and `timeBeforeExplosion` 3000 at :298, :304). WA's own trail is off
      -- (`trail = { sprite = 0 }`) because the trail drawn is PX's
      -- (lib/px_trail.lua); gravity and wind are off because PX zeroes its
      -- bullet's `GravityFactor` for the whole flight (:386, "Stable
      -- direction"), so the bullet flies the straight line PX aims along and
      -- nothing has to be compensated for. The `missile` keys are the `.wep`
      -- field names (`weapons/wep_data.lua`), which is why `gravity_pct` and
      -- `wind_pct` take (verified in match, REPORT.md 11.8).
      -- A `missile` override on PX's own bullet record crashed WA on launch
      -- (Access Violation, null read; REPORT.md 11.8), so what the slot builds
      -- on is not what is launched.
      local id = wa.weapons.launch({
        weapon = "stock.bazooka", owner = h.owner, x = sx, y = sy, vx = 0, vy = 0,
        missile = { trail = { sprite = 0 }, explosion = { power = 13 }, fuse = BULLET_FUSE,
          gravity_pct = 0, wind_pct = 0 },
      })
      if id then
        -- PX aims each bullet at the picked target, +-1 random on its x (:362).
        local tx, ty = pick_target(h)
        shots[id] = { x = tx + wa.random(-1, 1), y = ty, frames = BULLET_FRAMES,
          owner = h.owner }
        trail.add(id, h.owner,  {every = 1, g = 30, b = 10}) -- the round's trail, drawn by lib/px_trail.lua
      end
      eject(h) -- (:369) the casing, after the shot
    end

    -- PX's heliShoot::Message M_FRAME (:203-284).
    frame = function(a)
      local h = helis[a.id]
      if not h then return end
      local w = wa.world.size().w

      -- Gone off the map either side (:214-217): just leave.
      if (h.vx >= 0 and h.x >= w + SIDE + 50) or (h.vx < 0 and h.x < -(SIDE + 50)) then
        drop(h)
        return
      end
      -- Magazine spent, over water and on the map (:234-239): blow up.
      if h.done and h.y >= wa.world.water() and h.x < w + 300 and h.x > -300 then
        boom(h)
        return
      end

      update_rot(h)

      -- Acquire and begin firing within 450 px (:243-256).
      if not h.shooting and h.shots < BULLETS then
        update_aim(h, false)
        if math.abs(h.x - h.tx) < SHOOT_RANGE then
          update_aim(h, true)
          h.cooldown = COOLDOWN_START
          h.shooting = true
        end
      end
      if h.shots >= BULLETS and h.shooting then
        h.shooting = false
        h.vx = h.dir * 0.15 -- (:261)
      end
      if h.shooting then h.vx = h.vx * DRIFT end -- (:263)

      h.firing = false
      if h.shooting and h.cooldown == 0 then
        update_aim(h, false)
        shoot(h)
        h.shots = h.shots + 1
        h.cooldown = COOLDOWN_SHOT
      elseif h.shooting and h.cooldown > 0 then
        update_aim(h, false)
        h.cooldown = h.cooldown - 1
      end
      if h.shots >= BULLETS and not h.shooting then
        h.done = true
        if math.abs(h.vx) < HOVER then h.vx = h.vx * LEAVE end -- (:281)
      end

      h.x = h.x + h.vx
      h.frame = (h.frame + 1) % 2
      h.ticks = h.ticks + 1
      if h.ticks % ROTOR_TICKS == 0 then wa.sound.play(h.owner, SND .. "loop.wav") end
      place(h)
    end

    -- PX's TakeExplosionDamage (:175-191): less the further off, and it only
    -- throws the helicopter if the leftover is over 25.
    hit = function(a, event)
      local h = helis[a.id]
      if not h then return end
      local dmg = math.max(0, event.damage or 0)
      if event.kind == "blast" and dmg > 0 then
        local dx, dy = a.x - (event.x or a.x), a.y - (event.y or a.y)
        dmg = trunc((1 - (dx * dx + dy * dy) / (dmg * dmg * 4)) * dmg)
      end
      if dmg > DEAD_DAMAGE then boom(h) end
    end

    -- The strike: the click gives the target and the side. PX enters from the
    -- side the shot aimed at (`Desc->SpX`, :436-445).
    local function fire(worm, x, y)
      if not worm or not x or not y then return end
      local w = wa.world.size().w
      -- PX enters from the side the aim points (`Desc->SpX <= 0`, :436-445); the
      -- click's facing sign is that aim (`ev.worm.facing`).
      local from_left = (worm.facing or 1) <= 0
      local h = {
        owner = worm, tx = x, ty = y,
        dir = from_left and 1 or -1,          -- the direction it drifts
        x = from_left and -SIDE or (w + SIDE),
        y = ENTER_Y,
        vx = (from_left and 1 or -1) * HOVER,
        shots = 0, cooldown = 0, shooting = false, done = false, firing = false,
        gun = -math.pi, worm_frame = 0, rot = 0, frame = 0, ticks = 0,
      }
      h.body = wa.actors.spawn({
        sprite = ART .. "empty", x = h.x, y = h.y, vx = 0, vy = 0,
        gravity = false, collide = true, owner = worm, as_object = true, mask = true,
        on = { frame = frame, hit = hit },
      })
      h.aim = wa.actors.spawn({ sprite = ART .. "aim", x = h.x, y = h.y,
        gravity = false, collide = false, owner = worm, on = function() end })
      h.gun_actor = wa.actors.spawn({ sprite = ART .. "gun", x = h.x, y = h.y,
        gravity = false, collide = false, owner = worm, on = function() end })
      helis[h.body.id] = h
    end

    wa.log(("Attack Helicopter at %s %d"):format(ctx.position.row, ctx.position.column))

    wa.weapons.replace({
      -- The slot is the profile's (`F6 2`); a component names no `weapon`, only
      -- the record it builds on. The record is PX's **bullet** (`bullet_wep.wep`,
      -- name "bullet"; damage 13 at +0x54, fuse 3000 at +0x20, a type-3 cursor
      -- record): one slot carries both the click weapon and the round `shoot`
      -- launches, because a manual launch fires the slot's own record
      -- (REPORT.md 11.8). `heliWeap.wep` is no longer used.
      wep = "weps/bullet_wep.wep",
      panel_icon = "sprites/helishootico.png", -- PX's own icon (helishootico.png)
      -- One directory of frameNNN.png per PX sprite, as cut_lab and stress do.
      sprites = { ART .. "empty", ART .. "aim", ART .. "gun", ART .. "casing", BULLET,
        trail.BEAM, trail.GLOW },
      params = { gpu_prefix = "sprites/" }, -- route the sheets into the GPU atlas for a:gfx
      sounds = { SND .. "hks1.wav", SND .. "hks2.wav", SND .. "hks3.wav", SND .. "loop.wav" },
      -- Click-only dispatch keeps the strike's cursor and turn handling, exactly
      -- as the Lightning Strike / Reinforcement (weapons/catalog.lua:46-52,
      -- :319-337): the worm never fires the record, and the click only picks the
      -- target. `on_select.cursor` overrides the record's own aim mode, so the
      -- cursor does not depend on the record being a strike. No on_fire, no
      -- eat_fire -- an eat would also swallow the turn end (REPORT.md 11.7). The
      -- panel name comes from the component (mod.toml).
      on_select = { cursor = true },
      on_click = function(ev) fire(ev.worm, ev.x, ev.y) end,
    })

    -- PX's homeToPlace (:382-390): for its first frames each bullet turns hard
    -- onto the point it was aimed at, then flies straight (WA flies it on). PX
    -- runs it before super, so it is the frame's "pre" phase.
    --
    -- PX also draws each bullet itself (redWeapSheet, :364) with WA's own
    -- sprite left at 0 (:301), turned to its flight (WAT_TrackMovement, :303):
    -- the Highlander missile-sprite pattern (lib/missile_sprites.lua:112-159)
    -- hides WA's sprite and follows the missile with a GPU actor.
    local follow = {} -- missile id -> { actor, seen }
    local function gone(id)
      return function(b)
        local f = follow[id]
        if f and f.seen then f.seen = false; return end
        -- The round is gone -- the same test that drops its sprite. Its trail
        -- stays behind: lib/px_trail.lua sheds it and draws it.
        trail.drop(id)
        follow[id] = nil
        shots[id] = nil
        b:despawn()
      end
    end
    wa.on.missile_frame(function(m)
      local s = shots[m.id]
      if not s then return end
      if m.phase == "pre" then
        m.sprite = 0 -- WA draws nothing for it; ours is drawn below
        if s.frames <= 0 then return end
        s.frames = s.frames - 1
        -- PX's homeToPlace (:382-390), aiming flat at the target at PX's own
        -- 35.0 -- which is exact, because the round has neither gravity nor wind
        -- (`missile = { gravity_pct = 0, wind_pct = 0 }` above, PX's own
        -- `GravityFactor = 0`, :386). A weapon that has to keep gravity aims
        -- with PX's SolveBallistic instead: TRAIL.md.
        local dx, dy = s.x - m.x, s.y - m.y
        local len = math.sqrt(dx * dx + dy * dy)
        if len > 0 then
          m.vx, m.vy = dx / len * BULLET_SPEED, dy / len * BULLET_SPEED
        end
        return
      end
      local f = follow[m.id]
      if not f then
        f = { actor = wa.actors.spawn({
          sprite = BULLET, x = m.x, y = m.y, gravity = false, collide = false,
          owner = s.owner, on = gone(m.id),
        }) }
        follow[m.id] = f
      end
      f.seen = true
      local b = f.actor
      b.x, b.y, b.vx, b.vy = m.x, m.y, 0, 0
      b.facing = m.vx < 0 and -1 or 1
      -- WeapSprite::CalculateAngle, WAT_TrackMovement (rotation 0).
      local rot = -wa.math.atan(m.vx, m.vy) - math.pi
      b:gfx({ angle = math.deg(rot) % 360, depth = wa.depth.OBJECTS - 1 })
    end)
  end,
}
