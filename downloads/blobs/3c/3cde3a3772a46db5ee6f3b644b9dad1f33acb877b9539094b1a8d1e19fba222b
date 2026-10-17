-- Live HP, by reddaz: a worm's health bar follows its damage as it
-- happens, not at the turn's end. From reddaz's LiveHP pack 2.0.1, as it was.
-- Live HP v9.0 (Final)
-- Per-frame HP snapshot polling with safe pulse routing.
-- Prevents 0 HP accidental deaths, 1 HP phantom healing, and net-damage loss.

local RETRY_DELAY = 0   

local pending = {}        -- worm.id -> { wait }
local last_hp = {}        -- worm.id -> last seen hp
local spawnedMapActor = false

-- The msgs filter makes the engine call this only on FRAME_FINISH, not on
-- every message every worm gets for the rest of the match.
wa.on.worm_message(function(worm)
  if worm.id ~= (1 * 16 + 1) then return end
  if spawnedMapActor then return end
  spawnedMapActor = true

  wa.actors.spawn({
    sprite = false, x = 0, y = 0, gravity = false, collide = false, owner = worm,
    on = function()
      local worms = wa.worms.all()

      -- 1. Detection: compare current HP against last frame's snapshot
      for _, w in ipairs(worms) do
        if w.hp <= 0 then
          pending[w.id] = nil
          last_hp[w.id] = nil
        else
          local last = last_hp[w.id]
          if last and w.hp < last and not pending[w.id] then
            wa.log(string.format("livehp v9: worm %d hp %d -> %d, queuing commit",
              w.id, last, w.hp))
            pending[w.id] = { wait = RETRY_DELAY }
          end
        end
      end

      -- 2. Commit: execute safe hurt(1) -> heal(1) pulse
      for _, w in ipairs(worms) do
        local p = pending[w.id]
        if p then
          if w.hp <= 0 then
            pending[w.id] = nil
          else
            p.wait = p.wait - 1
            if p.wait <= 0 then
              local vx, vy = w.vx, w.vy
              local hp_before = w.hp

              -- SAFETY GUARD: Skip commit pulse if current HP is <= 1.
              -- Prevents accidental death on 1 HP survivors (Poison/Shotgun/Flame).
              if hp_before <= 1 then
                pending[w.id] = nil
              else
                w.vx, w.vy = 0, 0

                -- Hurt first to force MSG_COMMIT_HEALTH
                w:hurt(1)

                if w.hp < hp_before then
                  -- hurt(1) registered; restore the 1 HP test pulse
                  w:heal(1)
                  w:release(vx, vy, { tumble = true })
                  wa.log(string.format("livehp v9: worm %d committed health safely", w.id))
                  pending[w.id] = nil
                else
                  -- hurt(1) swallowed by same-frame hit cooldown; retry next frame
                  w:release(vx, vy, { tumble = true })
                  p.wait = 1
                end
              end
            end
          end
        end
      end

      -- 3. Snapshot for next frame's diff
      for _, w in ipairs(worms) do
        last_hp[w.id] = w.hp
      end
    end,
  })
end, { msgs = { wa.msg.FRAME_FINISH } })
