-- Collision silhouette above the eight buried pixels of PX's feet.
-- Rows relative to the mask's bottom anchor (source x=31, y=41).
-- These runs also describe turret_mask.png; the original base art is untouched.
local rows = {
  { -22, -3, 4 },
  { -21, -4, 5 },
  { -20, -4, 5 },
  { -19, -5, 6 },
  { -18, -5, 6 },
  { -17, -6, 7 },
  { -16, -6, 7 },
  { -15, -9, 7 },
  { -14, -10, 7 },
  { -13, -11, 7 },
  { -12, -12, 7 },
  { -11, -13, -7, -5, 6 },
  { -10, -13, -9, -4, 5 },
  { -9, -12, -10, -2, 3 },
  { -8, -2, 3 },
  { -7, -2, 3 },
  { -6, -2, 3 },
  { -5, -2, 3 },
  { -4, -3, 4 },
  { -3, -3, 4 },
  { -2, -3, 4 },
  { -1, -4, 5 },
  { 0, -4, -1, 1, 5 },
}
local mask = { rows = rows, top = 22, left = -13, right = 7, burial = 8 }

-- Constant-time membership in the exact authored row runs.
function mask.contains(x, y, px, py)
  local row = rows[py - y + mask.top + 1]
  if not row then return false end
  for i = 2, #row, 2 do
    if px >= x + row[i] and px <= x + row[i + 1] then return true end
  end
  return false
end

function mask.overlaps_worm(x, y, worm)
  x, y = math.floor(x), math.floor(y)
  local wx, wy = worm.x, worm.y
  if x + mask.right < wx - 10 or x + mask.left > wx + 10
    or y < wy - 20 or y - mask.top > wy + 6 then return false end
  for _, row in ipairs(rows) do
    local py = y + row[1]
    if py >= wy - 20 and py <= wy + 6 then
      for i = 2, #row, 2 do
        if x + row[i] <= wx + 10 and x + row[i + 1] >= wx - 10 then return true end
      end
    end
  end
  return false
end

function mask.intersects(x, y, other_x, other_y)
  x, y, other_x, other_y = math.floor(x), math.floor(y), math.floor(other_x), math.floor(other_y)
  if x + mask.right < other_x + mask.left or x + mask.left > other_x + mask.right
    or y < other_y - mask.top or y - mask.top > other_y then return false end
  for _, row in ipairs(rows) do
    -- Rows are contiguous from -top through zero: only one can share this y.
    local other = rows[y + row[1] - other_y + mask.top + 1]
    if other then
      for i = 2, #row, 2 do
        for j = 2, #other, 2 do
          if x + row[i] <= other_x + other[j + 1] and x + row[i + 1] >= other_x + other[j] then return true end
        end
      end
    end
  end
  return false
end

function mask.clear(x, y, worms, planter_id, burial, solid)
  x, y = math.floor(x), math.floor(y)
  burial = burial or 0
  solid = solid or wa.land.solid
  -- Test each worm once against the authored runs, rather than reading native
  -- userdata properties again for every pixel. Burial never exempts a worm.
  for _, w in ipairs(worms) do
    if w.id ~= planter_id and w.hp > 0 and mask.overlaps_worm(x, y, w) then return false end
  end
  for _, row in ipairs(rows) do
    if row[1] <= -burial then
      local py = y + row[1]
      for i = 2, #row, 2 do
        for px = x + row[i], x + row[i + 1] do
          if solid(px, py) then return false end
        end
      end
    end
  end
  return true
end

return mask
