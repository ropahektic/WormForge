-- From the Agility pack 1.1 (Zed / 0rang3, port by red), as it was.
-- Agility (air control), ported from Zed's RPG Wars mod, edited by 0rang3.
--
-- 1:1 port now that vx/vy are directly writable during jump and other
-- airborne states. No workaround needed -- this just nudges worm.vx/vy
-- per frame, the same as the original SpX/SpY increments.
--
-- Notes:
--   * PX's `GetCurrentWorm() == this` is `worm.turn`.
--   * PX's ModulatedGravity == 1 is worm.gravity == 1 (a plain factor).
--   * State check uses worm.state_id against the hex values from the state
--     logger, not the string names, since that's the precise source here.
--   * Keys follow the synchronized turn-player input in networked matches.

local STEP      = 0.1   -- per-tick nudge, matches C's 0.1
local STEP_LOWG = 0.03   -- up-nudge when gravity < 1.0
local LIMIT     = 3                  -- matches C's SpX/SpY <= 3 cap

-- Allowed states, by worm.state_id, mirroring the C allowlist:
-- WS_JUMP, WS_SLIDING, WS_FLYING2, WS_POWERFLY, WS_DRILLING, WS_FLYING.
-- Only JUMP and DRILLING are a confident 1:1 match to the logger's names;
-- the rest are my best guess at which hex id corresponds to which C state.
-- Confirm with the state logger and correct any that are wrong.
local ALLOWED = {
  [0x6E] = true,  -- WS_DRILLING      
  [0x73] = true,  -- WS_AFTERROPE     
  [0x79] = true,  -- WS_JUMP      
  --[0x7A] = true,  -- Landing Jump     
  [0x7E] = true,  -- WS_JUMP   
  [0x7F] = true,  -- WS_SLIDING
  [0x80] = true,  -- WS_FLYING
  [0x81] = true,  -- WS_POWERFLY
}

-- Runs once per worm per frame: the msgs filter makes the engine skip Lua
-- for every other message a worm gets (thousands a frame in a busy match).
wa.on.worm_message(function(worm)
  if not worm.turn then return end

  local state = worm.state_id
  if not state or not ALLOWED[state] then return end

  local k = worm.keys

  if k.up then
    local step = (worm.gravity or 1) == 1 and STEP or STEP_LOWG
    if worm.vy >= -LIMIT then worm.vy = worm.vy - step end
  end
  if k.down and worm.vy <= LIMIT then
    worm.vy = worm.vy + STEP
  end
  if k.left and worm.vx >= -LIMIT then
    worm.vx = worm.vx - STEP
  end
  if k.right and worm.vx <= LIMIT then
    worm.vx = worm.vx + STEP
  end
end, { msgs = { wa.msg.FRAME_FINISH } })
