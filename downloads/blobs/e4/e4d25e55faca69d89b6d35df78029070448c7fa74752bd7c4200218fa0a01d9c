-- Highlander: the rules. Split from rules.lua by tools/split_highlander.py.
--
-- A port of Project X's `scheme_hl_0rang3` (Highlander 0rang3 1.1).
-- The source (`highlander.txt`) does all of this with four calls:
-- SetWeaponEx(team, weapon, 1) to grant and SetWeaponEx(team, weapon, 0) to
-- take away. `worm:ammo(name, { set = n })` is the same absolute write. It has
-- to be absolute: a stock scheme gives some of these weapons infinite ammo,
-- and adding to infinite leaves it infinite.
--
-- Where this differs from the source, on purpose:
--
--   * No turn-end removal. PX removes a worm's weapons at M_TURNEND and again,
--     through CurW, at the next M_TURNBEGIN. The second alone is enough, so
--     this listens for one message instead of two.
--
--     START_TURN (0x34) reaches only the worm whose turn it is: WA's handler
--     marks the receiver turn-active and calls TeamArena::SetActiveWorm on it
--     unconditionally (OpenWA `msg_start_turn`), which would be nonsense sent
--     to every worm. So the worm it arrives on IS the active worm.
--
--   * Every pooled slot is zeroed for every team at each turn start, not
--     just the previous worm's. PX relied on its scheme having those slots at
--     zero. Here the scheme can say anything, so the pack enforces it itself.
--
--   * PX's GiveWeapons also sets the Hot Air Balloon to 3 and the Wind
--     Changer to 1 each turn. The Highlander scheme gives them as weapon data
--     (profiles/Highlander.toml), so this file alone doesn't.
--
-- Lockstep: dealing, turn_start and death are all dispatched from WA's own
-- simulation messages, and every random choice is wa.random(). Two peers, or
-- a peer and a replay, deal the same hands and make the same grants. Nothing
-- here reads local input or the clock.
local shared = require("lib/shared")
local POOLS = shared.POOLS
local arsenal = shared.arsenal
local dead_hands = shared.dead_hands
local dealt = shared.dealt
local describe = shared.describe
local revived_by_lightning = shared.revived_by_lightning

-- ----------------------------------------------------------------- rules

-- One from each pool, dealt to a worm on the first message it receives -- as
-- PX does on each worm's first M_FRAME. Dealing everyone at once on the very
-- first message would assume every worm already exists by then; this makes no
-- such assumption. Worms receive messages in WA's own entity order, which is
-- the same on every peer, so the draws still come out of WA's RNG in the same
-- sequence everywhere.
local function deal(worm)
  local cave = wa.world.cavern()
  for _, name in ipairs({ "offensive", "second", "movement" }) do
    local pool = POOLS[cave and "cave_" .. name or name]
    -- A profile may leave a pool empty: nothing to deal from it.
    if #pool > 0 then
      arsenal:deal(worm, pool, 1)
    end
  end
  dealt[worm.id] = true
  wa.log(string.format(
    "highlander: worm %d dealt %s (%s map)",
    worm.id, describe(arsenal:list(worm)), cave and "cavern" or "open"
  ))
end

-- The hand, one use of each, for the turn. PX's GiveWeapons (the Hot Air
-- Balloons and the Wind Changer) is weapon data in the Highlander profile:
-- the engine gives it.
local function start_turn(worm)
  arsenal:apply(worm, { clear = true, each = 1 })
end

local function on_death(event)
  local victim = event.victim
  local active = event.active
  revived_by_lightning[victim.id] = nil
  local mine = arsenal:list(victim)
  dead_hands[victim.id] = mine

  if active and active.id == victim.id then
    -- Died on its own turn: nothing to hand on, just take its weapons away.
    arsenal:clear(victim)
    arsenal:apply(victim, { clear = true, each = 1 })
    wa.log(string.format("highlander: worm %d died on its own turn", victim.id))
    return
  end

  -- Otherwise the worm whose turn it is gets everything -- whoever or
  -- whatever did the killing, friend or foe, exactly as in PX.
  if not active or active.hp <= 0 then
    return
  end
  arsenal:transfer(victim, active, {
    weapons = "all", mode = "move", x = victim.x, y = victim.y,
  })
  -- Usable at once, this turn, not from the stealer's next turn.
  arsenal:apply(active, { weapons = mine, each = 1 })
  wa.log(string.format(
    "highlander: worm %d took %s from worm %d",
    active.id, describe(mine), victim.id
  ))
end

wa.on.worm_message(function(worm, msg)
  if not dealt[worm.id] then
    deal(worm)
  end
end, { msgs = { wa.msg.FRAME_FINISH, wa.msg.START_TURN } })

-- A worm that comes in a dead worm's place (the Reinforcement) is a new
-- worm: a fresh hand, dealt at its first message as every worm's is, not
-- what the dead one held or left behind.
shared.fresh_hand = function(worm)
  arsenal:clear(worm)
  dealt[worm.id] = nil
  dead_hands[worm.id] = nil
  revived_by_lightning[worm.id] = nil
end

wa.on.turn_start(function(event)
  start_turn(event.worm)
end)

wa.on.death(on_death)

