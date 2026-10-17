-- ExTurnSide, by red: left and right turn the worm during rope swings
-- and other actions. From red's ExTurnSide pack 1.0.1, as it was.

-- Allows manual facing direction changes during rope swings and action states.
local prev_left = false
local prev_right = false

-- Once per worm per frame: the msgs filter skips Lua for every other message.
wa.on.worm_message(function(worm)
  if not worm.turn then return end

  local k = wa.world.keys()
  
  -- Left key pressed:
  if k.left and not prev_left then
    worm.facing = -1
  end
  
  -- Right key pressed: 
  if k.right and not prev_right then
    worm.facing = 1
  end
  
  prev_left = k.left
  prev_right = k.right
end, { msgs = { wa.msg.FRAME_FINISH } })