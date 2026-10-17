-- PX p_portal2 CPortal::TeleportObject, worm and other-object rules.
-- Indexed by entry/exit surface: 1 down, 2 down-left, 3 left,
-- 4 up-left, 5 up, 6 up-right, 7 right, 8 down-right (outward normals).
-- Keep the two sets separate: PX deliberately treats worms differently.
-- Speeds inside these rules are pixels/frame. The public boundary also uses pixels/frame.
local rules = { worm = {}, object = {} }
rules.worm[1] = {
  [1] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY
    if vy < 0 then vy = -vy end
    if vy < 2 then vy = 2 end
    return vx, vy, face
  end,
  [2] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memY / 2
    vy = -memY / 2 - memX
    if vx > 0 then vx = -vx end
    if vy < 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = -2 end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [3] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memY
    vy = -memX
    if vx > 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    if vy > 0 then vy = -vy end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [4] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memY / 2
    vy = memY / 2 - memX
    if vx > 0 then vx = -vx end
    if vy > 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = -2 end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [5] = function(vx, vy, face)
    local memX, memY = vx, vy
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [6] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memY / 2
    vy = memY / 2 - memX
    if vx < 0 then vx = -vx end
    if vy > 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = 2 end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
  [7] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memY
    vy = -memX
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    if vy > 0 then vy = -vy end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
  [8] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memY / 2
    vy = -memX - memY / 2
    if vx < 0 then vx = -vx end
    if vy < 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = 2 end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
}
rules.worm[2] = {
  [1] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY / 2 - memX
    vx = memY / 2 + memX
    if vy < 0 then vy = -vy end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [2] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY
    vx = -memX
    if vy < 0 then vy = -vy end
    if vx > 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [3] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY / 2 - memX
    vx = -memY / 2
    if vx > 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    if vy > 0 then vy = -vy end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [4] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX
    vy = memY
    if vy > 0 then vy = -vy end
    if vx > 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [5] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = memY / 2 - memX
    vx = -memY / 2 + memX
    if vy > 0 then vy = -vy end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [6] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memX
    vy = memY
    if vy > 0 then vy = -vy end
    if vx < 0 then vx = -vx end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
  [7] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = memY / 2 + memX
    vx = memY / 2
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    if vy > 0 then vy = -vy end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
  [8] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY
    vx = memX
    if vy < 0 then vy = -vy end
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
}
rules.worm[3] = {
  [1] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memY
    vy = memX
    if vy < -2 then
      vy = -vy
    else
      if vy < 2 then
        vy = 2
      end
    end
    return vx, vy, face
  end,
  [2] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX / 2
    vy = -memY + memX / 2
    if vx > 0 then vx = -vx end
    if vy < 0 then vy = -vy end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [3] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX
    if vx > 2 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [4] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX / 2 + memY
    vy = -memX
    if vx > 0 then vx = -vx end
    if vy > 0 then vy = -vy end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [5] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memY
    vy = memX
    if vy > 2 then
      vy = -vy
    else
      if vy > -2 then
        vx = -2
      end
    end
    return vx, vy, face
  end,
  [6] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX / 2
    vy = -memY - memX / 2
    if vx < 0 then vx = -vx end
    if vy > 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = 2 end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
  [7] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memX
    if vx < 2 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    if vy > 0 then vy = -vy end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
  [8] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memX / 2
    vy = memY + memX / 2
    if vx < 0 then vx = -vx end
    if vy < 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = 2 end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
}
rules.worm[4] = {
  [1] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = memY / 2 - memX
    vx = memY / 2 + memX
    if vy < 0 then vy = -vy end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [2] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX
    if vy < 0 then vy = -vy end
    if vx > 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [3] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY / 2 - memX
    vx = -memY / 2
    if vx > 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    if vy > 0 then vy = -vy end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [4] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY
    vx = -memX
    if vy > 0 then vy = -vy end
    if vx > 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [5] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY / 2 - memX
    vx = -memY / 2 + memX
    if vy > 0 then vy = -vy end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [6] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY
    if vy > 0 then vy = -vy end
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
  [7] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY / 2 + memX
    vx = memY / 2
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    if vy > 0 then vy = -vy end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
  [8] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memX
    vy = memY
    if vy < 0 then vy = -vy end
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
}
rules.worm[5] = {
  [1] = function(vx, vy, face)
    local memX, memY = vx, vy
    if vy < 0 then vy = -vy end
    return vx, vy, face
  end,
  [2] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX + memY / 2
    vy = memY / 2
    if vx > 0 then vx = -vx end
    if vx > -2 then vx = -2 end
    if vy < 0 then vy = -vy end
    if vy > 0 and vy < 2 then vy = 2 end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [3] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memY
    vy = -memX
    if vx > 0 then vx = -vx end
    if vx > -2 then vx = -2 end
    if vx > -2 and vx < 2 then vx = -2 end
    if vy > 0 then vy = -vy end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [4] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX + memY / 2
    vy = memY / 2
    if vx > 0 then vx = -vx end
    if vx > -2 then vx = -2 end
    if vy > 0 then vy = -vy end
    if vy > -2 and vy < 2 then vy = -2 end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [5] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY
    if vy > 0 then vy = -vy end
    if vy > -2 and vy < 0 then vy = -2 end
    return vx, vy, face
  end,
  [6] = function(vx, vy, face)
    local memX, memY = vx, vy
    if memX < 0 then memX = -memX end
    vx = memY / 2
    vy = memY / 2 + memX
    if vx < 0 then vx = -vx end
    if vx < 2 then vx = 2 end
    if vy > 0 then vy = -vy end
    if vy > -2 and vy < 2 then vy = -2 end
    if vx > -2 and vx < 2 then vx = 2 end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
  [7] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memY
    vy = -memX
    if vx < 0 then vx = -vx end
    if vx < 2 and vx > 0 then vx = 2 end
    if vy < 2 and vy > 0 then vy = 2 end
    if vx > -2 and vx < 2 then vx = 2 end
    if vy > 0 then vy = -vy end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
  [8] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX - memY / 2
    vy = -memY / 2
    if vx < 0 then vx = -vx end
    if vx < 2 then vx = 2 end
    if vy < 0 then vy = -vy end
    if vy < 2 and vy > 0 then vy = 2 end
    if vx > -2 and vx < 2 then vx = 2 end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
}
rules.worm[6] = {
  [1] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = memY / 2 + memX
    vx = memY / 2 + memX
    if vy < 0 then vy = -vy end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [2] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX
    vy = memY
    if vx > 0 then vx = -vx end
    if vy < 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = -2 end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [3] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY / 2 + memX
    vx = -memY / 2
    if vx > 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    if vy > 0 then vy = -vy end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [4] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY
    if vx > 0 then vx = -vx end
    if vy > 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = -2 end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [5] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY / 2 + memX
    vx = -memY / 2 + memX
    if vy > 0 then vy = -vy end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [6] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY
    vx = -memX
    if vx < 0 then vx = -vx end
    if vy > 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = 2 end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
  [7] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY / 2 - memX
    vx = memY / 2
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    if vy > 0 then vy = -vy end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
  [8] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX
    if vx < 0 then vx = -vx end
    if vy < 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = 2 end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
}
rules.worm[7] = {
  [1] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memY
    vy = memX
    if vy < 0 then vy = -vy end
    return vx, vy, face
  end,
  [2] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memX / 2
    vy = memY + memX / 2
    if vx > 0 then vx = -vx end
    if vy < 0 then vy = -vy end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [3] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memX
    if vx > 2 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    if vy > 0 then vy = -vy end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [4] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memX / 2
    vy = -memY + memX / 2
    if vx > 0 then vx = -vx end
    if vy > 0 then vy = -vy end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [5] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memY
    vy = memX
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [6] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memX / 2
    vy = -memY - memX / 2
    if vx < 0 then vx = -vx end
    if vy > 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = 2 end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
  [7] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memX
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    if vy > 0 then vy = -vy end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
  [8] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX / 2
    vy = memY - memX / 2
    if vx < 0 then vx = -vx end
    if vy < 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = 2 end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
}
rules.worm[8] = {
  [1] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY / 2 + memX
    vx = memY / 2 + memX
    if vy < 0 then vy = -vy end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [2] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY
    vx = memX
    if vy < 0 then vy = -vy end
    if vx > 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [3] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY / 2 + memX
    vx = -memY / 2
    if vx > 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    if vy > 0 then vy = -vy end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [4] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memX
    vy = memY
    if vy > 0 then vy = -vy end
    if vx > 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [5] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = memY / 2 + memX
    vx = -memY / 2 + memX
    if vy > 0 then vy = -vy end
    if face > 0 then face = -face end
    return vx, vy, face
  end,
  [6] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX
    vy = memY
    if vy > 0 then vy = -vy end
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
  [7] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = memY / 2 - memX
    vx = memY / 2
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    if vy > 0 then vy = -vy end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
  [8] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY
    vx = -memX
    if vy < 0 then vy = -vy end
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    if face < 0 then face = -face end
    return vx, vy, face
  end,
}
rules.object[1] = {
  [1] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY
    if vy < 0 then vy = -vy end
    if vy < 2 then vy = 2 end
    return vx, vy, face
  end,
  [2] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memY / 2
    vy = -memY / 2 - memX
    if vx > 0 then vx = -vx end
    if vy < 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = -2 end
    return vx, vy, face
  end,
  [3] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memY
    vy = -memX
    if vx > 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [4] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memY / 2
    vy = memY / 2 - memX
    if vx > 0 then vx = -vx end
    if vy > 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = -2 end
    return vx, vy, face
  end,
  [5] = function(vx, vy, face)
    local memX, memY = vx, vy
    if vy > 0 then vy = -vy end
    if vy > -2 and vy < 0 then vy = -2 end
    return vx, vy, face
  end,
  [6] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memY / 2
    vy = memY / 2 - memX
    if vx < 0 then vx = -vx end
    if vy > 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = 2 end
    return vx, vy, face
  end,
  [7] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memY
    vy = -memX
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [8] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memY / 2
    vy = -memX - memY / 2
    if vx < 0 then vx = -vx end
    if vy < 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = 2 end
    return vx, vy, face
  end,
}
rules.object[2] = {
  [1] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY / 2 - memX
    vx = memY / 2 + memX
    if vy < 0 then vy = -vy end
    return vx, vy, face
  end,
  [2] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY
    vx = -memX
    if vy < 0 then vy = -vy end
    if vx > 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    return vx, vy, face
  end,
  [3] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY / 2 - memX
    vx = -memY / 2
    if vx > 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [4] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX
    vy = memY
    if vy > 0 then vy = -vy end
    if vx > 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    return vx, vy, face
  end,
  [5] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = memY / 2 - memX
    vx = -memY / 2 + memX
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [6] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memX
    vy = memY
    if vy > 0 then vy = -vy end
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    return vx, vy, face
  end,
  [7] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = memY / 2 + memX
    vx = memY / 2
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [8] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY
    vx = memX
    if vy < 0 then vy = -vy end
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    return vx, vy, face
  end,
}
rules.object[3] = {
  [1] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memY
    vy = memX
    if vy < -2 then
      vy = -vy
    else
      if vy < 2 then
        vy = 2
      end
    end
    return vx, vy, face
  end,
  [2] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX / 2
    vy = -memY + memX / 2
    if vx > 0 then vx = -vx end
    if vy < 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = -2 end
    return vx, vy, face
  end,
  [3] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX
    if vx > 2 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [4] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX / 2 + memY
    vy = -memX / 2
    if vx > 0 then vy = -vy end
    if vy > 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = -2 end
    return vx, vy, face
  end,
  [5] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memY
    vy = memX
    if vy > 2 then
      vy = -vy
    else
      if vy > -2 then
        vx = -2
      end
    end
    return vx, vy, face
  end,
  [6] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX / 2
    vy = -memY - memX / 2
    if vx < 0 then vx = -vx end
    if vy > 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = 2 end
    return vx, vy, face
  end,
  [7] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memX
    if vx < 2 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [8] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memX / 2
    vy = memY + memX / 2
    if vx < 0 then vx = -vx end
    if vy < 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = 2 end
    return vx, vy, face
  end,
}
rules.object[4] = {
  [1] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = memY / 2 - memX
    vx = memY / 2 + memX
    if vy < 0 then vy = -vy end
    return vx, vy, face
  end,
  [2] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX
    if vy < 0 then vy = -vy end
    if vx > 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    return vx, vy, face
  end,
  [3] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY / 2 - memX
    vx = -memY / 2
    if vx > 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [4] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY
    vx = -memX
    if vx > 0 then vx = -vx end
    if vy > 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = 2 end
    return vx, vy, face
  end,
  [5] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY / 2 - memX
    vx = -memY / 2 + memX
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [6] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY
    if vy > 0 then vy = -vy end
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    return vx, vy, face
  end,
  [7] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY / 2 + memX
    vx = memY / 2
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [8] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memX
    vy = memY
    if vy < 0 then vy = -vy end
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    return vx, vy, face
  end,
}
rules.object[5] = {
  [1] = function(vx, vy, face)
    local memX, memY = vx, vy
    if vy < 0 then vy = -vy end
    return vx, vy, face
  end,
  [2] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX + memY / 2
    vy = memY / 2
    if vx > 0 then vx = -vx end
    if vx > -2 then vx = -2 end
    if vx > -2 and vx < 2 then vx = -2 end
    if vy < 0 then vy = -vy end
    if vy > 0 and vy < 2 then vy = 2 end
    return vx, vy, face
  end,
  [3] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memY
    vy = -memX
    if vx > 0 then vx = -vx end
    if vx > -2 then vx = -2 end
    if vy > -2 and vy < 0 then vy = -2 end
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [4] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX + memY / 2
    vy = memY / 2
    if vx > 0 then vx = -vx end
    if vx > -2 then vx = -2 end
    if vx > -2 and vx < 2 then vx = -2 end
    if vy > 0 then vy = -vy end
    if vy > -2 and vy < 0 then vy = -2 end
    return vx, vy, face
  end,
  [5] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY
    if vy > 0 then vy = -vy end
    if vy > -2 and vy < 0 then vy = -2 end
    return vx, vy, face
  end,
  [6] = function(vx, vy, face)
    local memX, memY = vx, vy
    if memX < 0 then memX = -memX end
    vx = memY / 2
    vy = memY / 2 + memX
    if vx < 0 then vx = -vx end
    if vy > 0 then vy = -vy end
    if vy > -2 and vy < 2 then vy = -2 end
    if vx > -2 and vx < 2 then vx = 2 end
    return vx, vy, face
  end,
  [7] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memY
    vy = -memX
    if vx < 0 then vx = -vx end
    if vx < 2 then vx = 2 end
    if vy < 2 and vy > 0 then vy = 2 end
    if vx > -2 and vx < 2 then vx = 2 end
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [8] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX - memY / 2
    vy = -memY / 2
    if vx < 0 then vx = -vx end
    if vx < 2 then vx = 2 end
    if vy < 0 then vy = -vy end
    if vy < 2 and vy > 0 then vy = 2 end
    if vx > -2 and vx < 2 then vx = 2 end
    return vx, vy, face
  end,
}
rules.object[6] = {
  [1] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = memY / 2 + memX
    vx = memY / 2 + memX
    if vy < 0 then vy = -vy end
    return vx, vy, face
  end,
  [2] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX
    vy = memY
    if vx > 0 then vx = -vx end
    if vy < 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = -2 end
    return vx, vy, face
  end,
  [3] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY / 2 + memX
    vx = -memY / 2
    if vx > 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [4] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY
    if vx > 0 then vx = -vx end
    if vy > 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = -2 end
    return vx, vy, face
  end,
  [5] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY / 2 + memX
    vx = -memY / 2 + memX
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [6] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY
    vx = -memX
    if vx < 0 then vx = -vx end
    if vy > 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = 2 end
    return vx, vy, face
  end,
  [7] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY / 2 - memX
    vx = memY / 2
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [8] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX
    if vx < 0 then vx = -vx end
    if vy < 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = 2 end
    return vx, vy, face
  end,
}
rules.object[7] = {
  [1] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memY
    vy = memX
    if vy < 0 then vy = -vy end
    return vx, vy, face
  end,
  [2] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memX / 2
    vy = memY + memX / 2
    if vx > 0 then vy = -vy end
    if vy < 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = -2 end
    return vx, vy, face
  end,
  [3] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memX
    if vx > 2 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [4] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memX / 2
    vy = -memY - memX / 2
    if vx > 0 then vy = -vy end
    if vy > 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = -2 end
    return vx, vy, face
  end,
  [5] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memY
    vy = memX
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [6] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX / 2
    vy = -memY - memX / 2
    if vx < 0 then vy = -vy end
    if vy > 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = 2 end
    return vx, vy, face
  end,
  [7] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memX
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [8] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX / 2
    vy = memY - memX / 2
    if vx < 0 then vy = -vy end
    if vy < 0 then vy = -vy end
    if vx > -2 and vx < 2 then vx = 2 end
    return vx, vy, face
  end,
}
rules.object[8] = {
  [1] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY / 2 + memX
    vx = memY / 2 + memX
    if vy < 0 then vy = -vy end
    return vx, vy, face
  end,
  [2] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY
    vx = memX
    if vy < 0 then vy = -vy end
    if vx > 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    return vx, vy, face
  end,
  [3] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY / 2 + memX
    vx = -memY / 2
    if vx > 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [4] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = memX
    vy = memY
    if vy > 0 then vy = -vy end
    if vx > 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = -2 end
    return vx, vy, face
  end,
  [5] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = memY / 2 + memX
    vx = -memY / 2 + memX
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [6] = function(vx, vy, face)
    local memX, memY = vx, vy
    vx = -memX
    vy = memY
    if vy > 0 then vy = -vy end
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    return vx, vy, face
  end,
  [7] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = memY / 2 - memX
    vx = memY / 2
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    if vy > 0 then vy = -vy end
    return vx, vy, face
  end,
  [8] = function(vx, vy, face)
    local memX, memY = vx, vy
    vy = -memY
    vx = -memX
    if vy < 0 then vy = -vy end
    if vx < 0 then vx = -vx end
    if vx > -2 and vx < 2 then vx = 2 end
    return vx, vy, face
  end,
}
return function(kind, entry, exit, vx, vy, facing)
  local f = assert(rules[kind == "worm" and "worm" or "object"][entry][exit])
  local x, y, face = f(vx, vy, facing or 1)
  return x, y, face
end
