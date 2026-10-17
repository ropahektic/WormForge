-- Highlander as the test suites run it: the Highlander profile's match, on
-- Project X's layout. Every Highlander weapon sits on its home slot, WA's own
-- weapons the profile deals sit on theirs, and the hl.rules add-on deals from
-- the pools the weapons suggest (mod.toml) and the profile sets
-- (profiles/Highlander.toml). They install as the engine installs a profile's
-- components: hl.rules first (before_weapons), then each weapon, in slot
-- order. A real match runs the components the player's profile selects; the
-- engine never runs this file.
--
-- A port of Project X's `scheme_hl_0rang3` (Highlander 0rang3 1.1): every
-- worm is dealt one weapon from each of three pools at the start of the
-- match, may use each once a turn, and takes everything a worm it kills
-- carried (scheme/rules.lua).
local HOME = require("lib/homes")
local root = HIGHLANDER_ROOT or "mods/px/"

-- WA's 71 slots in order: where each weapon sits decides the deal's order.
local STOCK = {
  "bazooka", "homing_missile", "mortar", "homing_pigeon", "sheep_launcher",
  "grenade", "cluster_bomb", "banana_bomb", "battle_axe", "earthquake", "shotgun",
  "handgun", "uzi", "minigun", "longbow", "fire_punch", "dragon_ball", "kamikaze",
  "suicide_bomber", "prod", "dynamite", "mine", "sheep", "super_sheep",
  "aqua_sheep", "mole_bomb", "air_strike", "napalm_strike", "mail_strike",
  "mine_strike", "mole_squadron", "blow_torch", "pneumatic_drill", "girder",
  "baseball_bat", "girder_pack", "ninja_rope", "bungee", "parachute", "teleport",
  "scales_of_justice", "super_banana", "holy_grenade", "flame_thrower",
  "salvation_army", "mb_bomb", "petrol_bomb", "skunk", "ming_vase",
  "sheep_strike", "carpet_bomb", "mad_cow", "old_woman", "donkey",
  "nuclear_test", "armageddon", "skip_go", "surrender", "select_worm", "freeze",
  "magic_bullet", "jet_pack", "low_gravity", "fast_walk", "laser_sight",
  "invisibility", "damage_x2", "crate_spy", "double_turn_time", "crate_shower",
}
local INDEX = {}
for i, name in ipairs(STOCK) do INDEX[name] = i end

-- Each weapon's hl.rules settings: pool and cavern, as mod.toml suggests
-- them for PX's weapons and the profile sets them for WA's own.
local settings = {}
-- `header`: a table header naming the weapon (the profile's); else the
-- weapon is the last `id =` seen (mod.toml's components).
local function read(path, header)
  local f = assert(io.open(root .. path, "r"))
  local id
  for line in f:lines() do
    id = line:match('^id = "([%w_%.]+)"') or (header and line:match(header)) or id
    local pool = line:match('^pool = "([%w ]+)"')
    local cavern = line:match("^cavern = (%a+)")
    if id and (pool or cavern) then
      settings[id] = settings[id] or {}
      if pool then settings[id].pool = pool end
      if cavern then settings[id].cavern = cavern == "true" end
    end
  end
  f:close()
end
read("mod.toml")
read("profiles/Highlander.toml", '^%[weapon_options%."hl%.rules"%."([%w_%.]+)"%]')

-- The match's weapons: PX's on their home slots, and WA's own with a pool.
local placed = {}
for id, home in pairs(HOME) do
  placed[#placed + 1] = { id = id, slot = home }
end
for id in pairs(settings) do
  local stock = id:match("^stock%.(.+)$")
  if stock then
    placed[#placed + 1] = { id = id, slot = stock }
  end
end
table.sort(placed, function(a, b) return INDEX[a.slot] < INDEX[b.slot] end)
local weapons = {}
for _, w in ipairs(placed) do
  local s = settings[w.id] or {}
  w.options = { pool = s.pool or "not dealt", cavern = s.cavern ~= false }
  weapons[w.id] = w
end

-- hl.rules first, then each weapon claiming its slot.
local loader = require("components/loader")
require("components/highlander").install({ id = "hl.rules", weapons = weapons, placed = placed })
for _, w in ipairs(placed) do
  if HOME[w.id] then
    HIGHLANDER_CLAIMING = w.slot
    loader.install({ id = w.id, weapons = weapons, placed = placed })
  end
end
HIGHLANDER_CLAIMING = nil
