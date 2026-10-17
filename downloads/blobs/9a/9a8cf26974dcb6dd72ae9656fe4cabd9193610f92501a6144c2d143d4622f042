-- A presentation-only inventory acquisition viewer. No actors or physics.
local CONFIG = {
  debug = true,          -- targeted grant/preview/visibility diagnostics in wkLua.log
  size = 24,             -- bounding square, world pixels; aspect preserved
  rise = 48,             -- world pixels over one lifetime
  amplitude = 6,         -- horizontal sine amplitude, world pixels
  spacing = 28,          -- centres in a simultaneous grant's grid
  columns = 4,
  lifetime = 2,          -- simulation seconds, paused with the game
  fade = 1.5,            -- final seconds fade linearly; lifetime - fade is opaque
}
local FPS, TAU = 50, 2 * math.pi
local popups = {}
local sequence = 0
local visuals = {}
local draw_started = false
local function trace(message)
  if CONFIG.debug then wa.log("collect_viewer: " .. message) end
end
trace("loaded; size=" .. CONFIG.size .. " lifetime=" .. CONFIG.lifetime .. " fade=" .. CONFIG.fade)
local function art(weapon)
  if visuals[weapon] then return visuals[weapon] end
  local v = wa.weapons.visual(weapon)
  if v then visuals[weapon] = v end
  return v
end
wa.on.weapon_grant(function(event)
  trace(string.format("grant source=%s worm=%s coalition=%s frame=%s origin=(%s,%s) items=%d",
    tostring(event.source), tostring(event.worm_id), tostring(event.alliance), tostring(event.frame),
    tostring(event.x), tostring(event.y), #event.items))
  if event.alliance == nil then trace("grant skipped: active coalition unavailable"); return end
  local copies = {}
  for _, item in ipairs(event.items) do
    local v = art(item.weapon)
    trace(string.format("preview weapon=%s amount=%s sprite=%s kind=%s size=%s x %s",
      item.weapon, tostring(item.amount), v and v.sprite or "MISSING", v and v.kind or "?",
      v and tostring(v.width) or "?", v and tostring(v.height) or "?"))
    if v then
      for _ = 1, item.amount do copies[#copies + 1] = v end
    end
  end
  local columns = math.min(CONFIG.columns, #copies)
  if columns == 0 then trace("grant skipped: no drawable previews"); return end
  trace("spawn copies=" .. #copies)
  local rows = math.ceil(#copies / columns)
  for n, v in ipairs(copies) do
    local row = math.floor((n - 1) / columns)
    local row_count = math.min(columns, #copies - row * columns)
    local column = (n - 1) % columns
    sequence = sequence + 1
    local scale = CONFIG.size / math.max(v.width, v.height)
    popups[#popups + 1] = {
      x = event.x + (column - (row_count - 1) / 2) * CONFIG.spacing,
      y = event.y + (row - (rows - 1) / 2) * CONFIG.spacing,
      born = event.frame, alliance = event.alliance,
      phase = (sequence % 4) * TAU / 4,
      w = v.width * scale, h = v.height * scale, art = v,
    }
  end
end)
wa.on.draw(function()
  local frame = wa.world.frame()
  if not draw_started then trace("first draw frame=" .. tostring(frame)); draw_started = true end
  if frame == nil then return end
  local live, visibility = {}, {}
  for _, p in ipairs(popups) do
    local age = frame - p.born
    if age >= 0 and age < CONFIG.lifetime * FPS then
      live[#live + 1] = p
      if visibility[p.alliance] == nil then
        visibility[p.alliance] = wa.world.is_local_alliance(p.alliance)
      end
      if p.last_visible ~= visibility[p.alliance] then
        trace(string.format("popup sprite=%s coalition=%s age=%s visible=%s", p.art.sprite,
          tostring(p.alliance), tostring(age), tostring(visibility[p.alliance])))
        p.last_visible = visibility[p.alliance]
      end
      if visibility[p.alliance] then
        local u = age / (CONFIG.lifetime * FPS)
        local x = p.x + CONFIG.amplitude * (math.sin(TAU * u + p.phase) - math.sin(p.phase))
        local y = p.y - CONFIG.rise * u
        -- Opaque until the final fade seconds, then linearly to zero.
        local remaining = CONFIG.lifetime - age / FPS
        local alpha = CONFIG.fade > 0
          and math.floor(255 * math.min(1, remaining / CONFIG.fade) + 0.5) or 255
        local left, right = (x - p.w / 2), (x + p.w / 2)
        local top, bottom = (y - p.h / 2), (y + p.h / 2)
        wa.draw.quad({
          points = {{left, top}, {right, top}, {right, bottom}, {left, bottom}},
          sprite = p.art.sprite, frame = p.art.frame,
          color = alpha * 0x1000000 + 0xffffff, blend = "alpha", depth = wa.depth.FRONT,
        })
      end
    else
      trace("popup expired sprite=" .. p.art.sprite .. " age=" .. age)
    end
  end
  popups = live
end)
