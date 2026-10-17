-- Highlander: the claimed weapons and their art. Split from rules.lua by tools/split_highlander.py.
local shared = require("lib/shared")
local PX_POSTURE = shared.PX_POSTURE

-- Filled in by the Double Bazooka's and Nuke Rocket's sections further down.
-- Weapons' on_fire, filled in by their sections below (jump, laser); one
-- table, the file being at Lua's 200 locals for one chunk.
local fires = {}
-- Ported weapons. Each takes its scheme record, cut from the .pxs with
-- tools/px_scheme_weps.py: how it fires, and its PX name. Anything else in an
-- entry goes to wa.weapons.replace as it is.
--
-- WA's own weapons, as PX tuned them for this scheme. One moved off its own
-- stock slot borrows its own stock icon.
local PORTED = {
  { -- PX's Skip Go/Surrender: stock Skip Go, or stock Surrender with Ctrl.
    weapon = "skip_go", name = "Skip Go/Surrender",
    panel_icon = "sprites/skip_go/icon.png",
    stock_fire_choice = { held = "ctrl", alternate = "stock.surrender" },
  },
  { weapon = "dynamite" },
  { weapon = "blow_torch" },                                   -- BlowTorch
  { weapon = "flame_thrower" },
  { weapon = "girder_pack" },                                  -- 3 Girder Pack
  { weapon = "fast_walk" },
  { weapon = "crate_spy" },
  { weapon = "crate_shower" },
  { weapon = "magic_bullet", panel_icon = "cluster_bomb" },    -- Cluster Bomb
  { weapon = "invisibility", panel_icon = "teleport" },        -- Teleport
  { weapon = "damage_x2", panel_icon = "skunk" },              -- Skunk
  { weapon = "double_turn_time", panel_icon = "mole_bomb" },   -- Mole Bomb
  { weapon = "ming_vase" },                                    -- Priceless Ming Vase
}

-- PX weapons that need only PX's art: its icons, copied byte for byte so
-- replays share them, and its strips split into frame folders with
-- tools/px_split_strip.py. Where PX draws the worm's hold at run time with
-- its sprite builder (p_sprite_builder), so does the engine from PX_HOLDS.
local PX_ART = {
  { -- Ice Arrow: WA's own ArrowEntity supplies its flight and bow impact.
    -- The Highlander script freezes only a worm hit by this slot's arrow.
    weapon = "armageddon", wep = "weps/armageddon.wep",
    panel_icon = "sprites/ice_arrow/icon.png",
  },
  { -- Reinforcement: PX's new worm for the team (weapons/reinforcement.lua),
    -- on Nuclear Test's slot. Click-only, as the Super Tele.
    weapon = "nuclear_test", wep = "weps/nuclear_test.wep",
    panel_icon = "sprites/reinforcement/icon.png",
    on_select = { cursor = true },
    on_click = function(ev) fires.reinforcement(ev) end,
  },
  { -- Portal Gun: custom bolts and per-team pairs, on Scales of Justice.
    weapon = "scales_of_justice", wep = "weps/scales_of_justice.wep",
    panel_icon = "sprites/portal_gun/icon.png",
    -- The native shot remains usable while Lua accounts for pairs. PX's
    -- CanFire/state hacks are replaced by keeping the turn (claims.lua's
    -- KEEPS_TURN) and firing jumping or falling (airborne, on_fire's
    -- fire.airborne).
    fires = { subtype = 3 }, -- the bazooka's hold
    airborne = true,
    worm_sprites = {
      weaponlnk = "sprites/portal_gun/portal_gun_normal",
      weaponlnku = "sprites/portal_gun/portal_gun_up",
      weaponlnkd = "sprites/portal_gun/portal_gun_down",
      wthrow = "sprites/portal_gun/portal_gun_link_normal",
      wthrowu = "sprites/portal_gun/portal_gun_link_up",
      wthrowd = "sprites/portal_gun/portal_gun_link_down",
    },
    sprites = {
      "sprites/portal_gun/portal_ball", "sprites/portal_gun/portal_orange.png",
      "sprites/portal_gun/portal_blue.png", "sprites/portal_gun/portal_glow.png",
      "sprites/portal_gun/portal_gun_glow.png",
      "sprites/portal_gun/lightning_glow.png", "sprites/portal_gun/portal_black_mask",
    },
    sounds = { "sounds/portal_gun_shoot.wav", "sounds/portal_gun_hit.wav", "sounds/portal_gun_failhit.wav",
      "sounds/portal_active.wav", "sounds/portal_inactive.wav", "sounds/portal_teleport.wav" },
    params = { gpu_prefix = "sprites/portal_gun/" },
    on_fire = function(fire) fires.portal_gun(fire) end,
  },
  { -- Electromagnet: PX's placed, persistent field on the Baseball Bat slot.
    weapon = "baseball_bat", wep = "weps/baseball_bat.wep",
    -- PX's red icon is attract mode; ours, recoloured to the blue magnet's
    -- colours, repel (the HUD hook in electromagnet.lua shows the mode).
    panel_icon = "sprites/electromagnet/ico_magnet.png",
    panel_icons = { "sprites/electromagnet/ico_magnet_blue.png" },
    -- WA takes it out and puts it away with the Dynamite's draw (334-336);
    -- PX swaps in the magnet's (CSpriteAnim::SetAnimEx): blue repelling,
    -- red once + switched the worm to attracting (the engine reads + as the
    -- module does, and plays the take-out again in the new colour).
    worm_sprites = {
      wdynlnk = "sprites/electromagnet/wmag2lnk",
      wdynlnku = "sprites/electromagnet/wmag2lnku",
      wdynlnkd = "sprites/electromagnet/wmag2lnkd",
    },
    worm_sprites_toggle = { key = "plus_key", worm_sprites = {
      wdynlnk = "sprites/electromagnet/wmaglnk",
      wdynlnku = "sprites/electromagnet/wmaglnku",
      wdynlnkd = "sprites/electromagnet/wmaglnkd",
    } },
    sprites = {
      "sprites/electromagnet/magnet.png", "sprites/electromagnet/magnet2.png",
      "sprites/electromagnet/magnet_damaged.png", "sprites/electromagnet/magnet2_damaged.png",
      "sprites/electromagnet/ring_in.png", "sprites/electromagnet/ring_out.png",
      "sprites/electromagnet/magnetsparks",
    },
    params = { gpu_prefix = "sprites/electromagnet/" },
    on_fire = function(fire) fires.electromagnet(fire) end,
  },
  { -- Sentry Gun: PX's turret (weapons/sentry_gun.lua, lib/turret.lua) on
    -- the Kamikaze slot, placed as WA places a mine: its timing, ammo and
    -- retreat, with the turret as a Lua body instead of a mine.
    weapon = "kamikaze", copy_from = "stock.mine", name = "Sentry Gun",
    panel_icon = "sprites/sentry_gun/icon.png",
    is_weapon = true,
    -- PX's take-out and placing, grey; the housing in them coloured per team
    -- at draw time (one sheet and its housing for six colours).
    worm_sprites = {
      weaponlnk = "sprites/sentry_gun/equip", weaponlnku = "sprites/sentry_gun/equipu",
      weaponlnkd = "sprites/sentry_gun/equipd",
      wthrow = "sprites/sentry_gun/unequip", wthrowu = "sprites/sentry_gun/unequipu",
      wthrowd = "sprites/sentry_gun/unequipd",
    },
    worm_sprites_team_tint = {
      worm_sprites = {
        weaponlnk = "sprites/sentry_gun/equip_housing", weaponlnku = "sprites/sentry_gun/equipu_housing",
        weaponlnkd = "sprites/sentry_gun/equipd_housing",
        wthrow = "sprites/sentry_gun/unequip_housing", wthrowu = "sprites/sentry_gun/unequipu_housing",
        wthrowd = "sprites/sentry_gun/unequipd_housing",
      },
      colours = { 0xFF6447, 0x4764FF, 0x47FF64, 0xE6E647, 0xE647E6, 0x47E6E6 },
    },
    sprites = {
      "sprites/sentry_gun/impact.png", "sprites/sentry_gun/casing", "sprites/sentry_gun/turret_base", "sprites/sentry_gun/turret_mask.png",
      "sprites/sentry_gun/turret_gun", "sprites/sentry_gun/turret_flare", "sprites/sentry_gun/turret_light.png",
    },
    sounds = {
      "sounds/sentry_gun/sentryplace.wav", "sounds/sentry_gun/sentrybeeps2.wav",
      "sounds/sentry_gun/sentryfireloop.wav", "sounds/sentry_gun/sentryfireend.wav",
      "sounds/sentry_gun/sentryservostart.wav", "sounds/sentry_gun/sentryservoloop.wav",
      "sounds/sentry_gun/sentryservoend.wav",
    },
    params = {
      sprite_columns = 1,
      -- The take-out and placing play frame by frame, not as aim sheets.
      worm_sprites_animate = true,
      -- The turret between terrain (0x180000) and soil (0x1B0000): the
      -- real landscape can occlude its feet. The worm's sheets stay in front.
      depth = wa.depth.BEHIND_TERRAIN,
      depth_prefix = "sprites/sentry_gun/turret_",
      gpu_prefix = "sprites/sentry_gun/turret_",
    },
    on_fire = function(fire) fires.sentry_gun(fire) end,
  },
  { -- Sentry Laser: PX's projectile-defence turret (weapons/sentry_laser.lua,
    -- lib/turret.lua) on the Dragon Ball slot, placed as the Sentry Gun.
    weapon = "dragon_ball", copy_from = "stock.mine", name = "Sentry Laser",
    panel_icon = "sprites/sentry_laser/icon.png",
    is_weapon = true,
    worm_sprites = {
      weaponlnk = "sprites/sentry_laser/equip", weaponlnku = "sprites/sentry_laser/equipu",
      weaponlnkd = "sprites/sentry_laser/equipd",
      wthrow = "sprites/sentry_laser/unequip", wthrowu = "sprites/sentry_laser/unequipu",
      wthrowd = "sprites/sentry_laser/unequipd",
    },
    -- The body coloured per team, as on the planted turret; its barrel stays grey.
    worm_sprites_team_tint = {
      worm_sprites = {
        weaponlnk = "sprites/sentry_laser/equip_housing", weaponlnku = "sprites/sentry_laser/equipu_housing",
        weaponlnkd = "sprites/sentry_laser/equipd_housing",
        wthrow = "sprites/sentry_laser/unequip_housing", wthrowu = "sprites/sentry_laser/unequipu_housing",
        wthrowd = "sprites/sentry_laser/unequipd_housing",
      },
      colours = { 0xFF6447, 0x4764FF, 0x47FF64, 0xE6E647, 0xE647E6, 0x47E6E6 },
    },
    sprites = {
      "sprites/sentry_laser/turret_base", "sprites/sentry_laser/turret_mask.png", "sprites/sentry_laser/turret_body",
      "sprites/sentry_laser/turret_barrel", "sprites/sentry_laser/turret_light.png",
    },
    sounds = {
      "sounds/sentry_laser/sentrylaserplace.wav", "sounds/sentry_laser/sentrylaserbeep.wav",
      "sounds/sentry_laser/sentrylaserstart.wav", "sounds/sentry_laser/sentrylaserloop.wav",
      "sounds/sentry_laser/sentrylaserend.wav", "sounds/sentry_laser/sentrylaserdisin.wav",
    },
    params = {
      sprite_columns = 1,
      worm_sprites_animate = true,
      depth = wa.depth.BEHIND_TERRAIN,
      depth_prefix = "sprites/sentry_laser/turret_",
      gpu_prefix = "sprites/sentry_laser/turret_",
    },
    on_fire = function(fire) fires.sentry_laser(fire) end,
  },
  { -- Kamikaze Rocket: PX's steered Kamikaze (weapons/kamikaze_rocket.lua) on
    -- the Suicide Bomber slot. Its record is WA's Kamikaze's, so WA flies,
    -- digs and hits as its own Kamikaze; the pack steers it.
    weapon = "suicide_bomber", wep = "weps/suicide_bomber.wep",
    panel_icon = "sprites/kamikaze_rocket/icon.png",
    -- The Kamikaze's take-out (its last frame the hold) and launch, PX's.
    worm_sprites = {
      wkamlnk = "sprites/kamikaze_rocket/take_out", wkamlnku = "sprites/kamikaze_rocket/take_out",
      wkamlnkd = "sprites/kamikaze_rocket/take_out", wkamjmp = "sprites/kamikaze_rocket/launch",
    },
    sprites = { "sprites/kamikaze_rocket/fly" },
    params = { gpu_prefix = "sprites/kamikaze_rocket/" },
  },
  { -- Weapon Crate: a weapon crate dropped in front of the worm
    -- (weapons/weapon_crate.lua) on the Freeze slot, placed as WA places a
    -- mine (PX's record), the crate instead of the mine.
    weapon = "freeze", wep = "weps/freeze.wep",
    panel_icon = "sprites/weapon_crate/icon.png",
    -- PX's take-out (picking the crate up) and its hold.
    worm_sprites = {
      weaponlnk = "sprites/weapon_crate/take_out", weaponlnku = "sprites/weapon_crate/take_outu",
      weaponlnkd = "sprites/weapon_crate/take_outd",
      wthrow = "sprites/weapon_crate/put_away", wthrowu = "sprites/weapon_crate/put_awayu",
      wthrowd = "sprites/weapon_crate/put_awayd",
    },
    params = { worm_sprites_animate = true },
    on_fire = function(fire) fires.weapon_crate(fire) end,
  },
  { -- Super Tele: the PX record is a type-3 cursor weapon on teleport's slot.
    weapon = "teleport",
    wep = "weps/teleport.wep",
    panel_icon = "sprites/super_tele/icon.png",
    on_select = { cursor = true },
    on_click = function(ev) fires.super_tele_click(ev) end,
  },
  { -- Javelin: stock flight, direct thrust or a permanent terrain stamp.
    weapon = "prod", wep = "weps/prod.wep",
    panel_icon = "sprites/javelin/icon.png",
    sprite = "missile", worm_sprites = PX_POSTURE,
    sprites = { "sprites/javelin/hold", "sprites/javelin/flight", "sprites/javelin/stamp" },
    sounds = { "sounds/javelin_impact.wav" },
    params = { gpu_prefix = "sprites/javelin/" },
    on_explode = function(ev) fires.javelin(ev) end,
  },
  { -- Laser Gun: a 5 s beam in place of the uzi's bullet (its section below).
    weapon = "uzi",
    wep = "weps/uzi.wep",
    panel_icon = "sprites/laser_gun/ico_lasergun.png",
    worm_sprites = {
      weaponlnk = "sprites/laser_gun/aim", weaponlnku = "sprites/laser_gun/aimu",
      weaponlnkd = "sprites/laser_gun/aimd",
      wthrow = "sprites/laser_gun/draw", wthrowu = "sprites/laser_gun/drawu",
      wthrowd = "sprites/laser_gun/drawd",
    },
    sprites = { "sprites/laser_gun/laser_beam.png", "sprites/laser_gun/laser_glow.png" },
    sounds = {
      "sounds/laser_gun/laser_start.wav", "sounds/laser_gun/laser_loop.wav",
      "sounds/laser_gun/laser_end.wav",
    },
    params = { gpu_prefix = "sprites/laser_gun/" },
    on_fire = function(fire) fires.laser(fire) end,
  },
  { -- Electric Grenade: stock flight and explosion, then PX's chaining arc.
    -- PX's record leaves the flight sprite 0 and PX draws the grenade at run
    -- time (electric_grenade_anim, PX_WEAP_SPRITES below). A grenade-type
    -- slot picks the worm's throw sheet from its flight sprite, and 0 has
    -- none, so the worm vanished: here the stock grenade, hidden in flight,
    -- as for the Sticky Bomb. The arc's sheets come with the Lightning
    -- Strike's (its entry below), this prefix being the hold's.
    weapon = "earthquake",
    wep = "weps/earthquake.wep",
    panel_icon = "sprites/electric_grenade/icon.png",
    sprite = "grenade",
    worm_sprites = PX_POSTURE,
    sprites = { "sprites/px_hold/electric_grenade.png" },
    sounds = { "sounds/lightning/tazer_loop.wav" },
    params = { gpu_prefix = "sprites/px_hold/" },
    on_explode = function(ev) shared.electric_grenade_explode(ev) end,
  },
  { -- Valyrian Fire (rafa``2's valyrianfire_s): a Petrol Bomb with PX's
    -- bottle in the hand and spinning in flight (PX_WEAP_SPRITES), thrown
    -- 15 pixels further out. PX's record leaves the flight sprite 0, as the
    -- Electric Grenade's: here the stock bottle, for the worm's throw sheet,
    -- hidden in flight.
    weapon = "petrol_bomb",
    wep = "weps/petrol_bomb.wep",
    panel_icon = "sprites/valyrian_fire/icon.png",
    sprite = "petrolbm",
    worm_sprites = PX_POSTURE,
    sprites = { "sprites/px_hold/valyrian_fire.png" },
    params = { gpu_prefix = "sprites/px_hold/" },
    on_fire = function(fire) fires.valyrian_fire(fire) end,
    on_explode = function(ev) fires.valyrian_burst(ev) end,
  },
  { -- Bowling Ball Strike: PX's three rolling balls (weapons/bowling_ball.lua),
    -- not WA's sheep. Click-only, as the Lightning Strike: the engine ends
    -- WA's prefire after the click.
    weapon = "sheep_strike",
    wep = "weps/sheep_strike.wep",
    panel_icon = "sprites/bowling_ball/strike_icon.png",
    sprites = { "sprites/bowling_ball/ball.png", "sprites/bowling_ball/glow.png", "sprites/bowling_ball/spark.png",
      "sprites/bowling_ball/sheen.png" },
    params = { gpu_prefix = "sprites/bowling_ball/" },
    on_select = { cursor = true },
    on_click = function(ev) fires.bowling_strike(ev) end,
  },
  { -- Ferret: PX's terrain-walking ferret (weapons/ferret.lua), thrown in
    -- place of WA's Salvation Army.
    weapon = "salvation_army",
    wep = "weps/salvation_army.wep",
    panel_icon = "sprites/ferret/icon.png",
    worm_sprites = PX_POSTURE,
    sprites = { "sprites/ferret/walk" },
    sounds = { "sounds/ferret/walk.wav" },
    params = { gpu_prefix = "sprites/ferret/" },
    on_fire = function(fire) fires.ferret(fire) end,
  },
  { -- Crate Strike: PX's three parachute crates (weapons/crate_strike.lua),
    -- not WA's donkey. Click-only, as the Lightning Strike.
    weapon = "donkey",
    wep = "weps/donkey.wep",
    panel_icon = "sprites/crate_strike/icon.png",
    on_select = { cursor = true },
    on_click = function(ev) fires.crate_strike(ev) end,
  },
  { -- Lightning Strike: the PX strike is an effect, not WA's napalm plane.
    weapon = "napalm_strike",
    wep = "weps/napalm_strike.wep",
    panel_icon = "sprites/lightning/icon.png",
    -- With the Electric Grenade's arc and zap sheets: both weapons' effects
    -- are GPU sheets under this prefix.
    sprites = {
      "sprites/lightning/beam.png", "sprites/lightning/glow.png", "sprites/lightning/cloud.png",
      "sprites/electric_grenade/explosion", "sprites/electric_grenade/tazed1",
      "sprites/electric_grenade/tazed2",
    },
    sounds = { "sounds/lightning/thunder.wav", "sounds/lightning/hit.wav" },
    params = { gpu_prefix = "sprites/" },
    -- Click-only dispatch keeps the strike's cursor and turn handling.
    on_select = { cursor = true },
    -- The engine ends WA's prefire after a click-only fire. (A closure:
    -- lightning_click is defined further down.)
    on_click = function(ev) shared.lightning_click(ev) end,
  },
  { -- Double Bazooka: a second shell carries on from where the first
    -- explodes (its section below). Held as a plain bazooka: the pack's
    -- record has launcher 3 (wbaz) at +0x34 where the scheme's has 7, the
    -- homing missile's recoloured wbaz2 (Weapon__hold_sheet, 0x51C060).
    weapon = "bazooka",
    panel_icon = "sprites/double_bazooka/double_bazooka_ico.png",
    on_explode = function(ev) shared.double_bazooka_explode(ev) end,
  },
  { -- Nuke Rocket: a rocket fuses on the ground, then a nuke climbs out of
    -- it (its section below). PX draws both upright (a type 5 WeapSprite,
    -- mirrored flying left), as WA draws a flight sprite.
    weapon = "mine",
    panel_icon = "sprites/nuke_rocket/nuke_rocket_ico.png",
    sprite = "sprites/nuke_rocket/nuke_rocket_bullet.png",
    on_explode = function(ev) shared.nuke_rocket_explode(ev) end,
    -- The engine draws its PX sprite-builder hold from PX_HOLDS:
    -- the record's own sprite is PX-only, which left WA no sheet to draw
    -- the worm with.
    worm_sprites = PX_POSTURE,
    sprites = {
      "sprites/px_hold/nuke_rocket",
    },
    sounds = { "sounds/nuke_rocket_launch.wav" },
    params = { gpu_prefix = "sprites/px_hold/" },
  },
  { -- Burning Sheep Launcher
    weapon = "sheep_launcher",
    panel_icon = "sprites/launchers/burning_sheep_launcher_ico.png",
  },
  { -- Cow Launcher
    weapon = "mad_cow",
    panel_icon = "sprites/launchers/cow_launcher_ico.png",
  },
  { -- Old Woman Launcher: WA's animal launched from a clear muzzle point.
    weapon = "old_woman",
    panel_icon = "sprites/launchers/old_woman_launcher_ico.png",
  },
  { -- Pigeon Strike
    weapon = "mail_strike",
    panel_icon = "sprites/pigeon_strike/ico_pigeonst.png",
  },
  { -- Windy Cluster: the stock cluster bomb's body, PX's bits.
    weapon = "cluster_bomb",
    panel_icon = "sprites/windy_cluster/ico_windyc.png",
    cluster = { sprite = "sprites/windy_cluster/cluster" },
  },
  { -- Super Gravedigger, and the worm holding and taking it out.
    weapon = "banana_bomb",
    panel_icon = "sprites/super_gravedigger/sgrave_ico.png",
    sprite = "sprites/super_gravedigger/flight",
    cluster = { sprite = "sprites/super_gravedigger/cluster" },
    worm_sprites = {
      weaponlnk = "sprites/super_gravedigger/aim",
      weaponlnku = "sprites/super_gravedigger/aimu",
      weaponlnkd = "sprites/super_gravedigger/aimd",
      wthrow = "sprites/super_gravedigger/draw",
      wthrowu = "sprites/super_gravedigger/drawu",
      wthrowd = "sprites/super_gravedigger/drawd",
    },
  },
  -- The next three have trails PX draws by overriding stock sprites its
  -- records point at: the Salvation Army's wsv* frames, free here because
  -- the Ferret holds that slot. sprite_overrides does the same, for the
  -- whole match. The trail art is PX's sprite_curtis_<id> libraries'.
  { -- S.M.A.R.T Bomb: its bits home, and draw their own sprite doing so.
    weapon = "mortar",
    panel_icon = "sprites/smart_bomb/smart_ico.png",
    sprite = "sprites/smart_bomb/flight",
    cluster = {
      sprite = "sprites/smart_bomb/cluster",
      homing_sprite = "sprites/smart_bomb/cluster_homing",
    },
    sprite_overrides = { wsvbd = "sprites/smart_bomb/trail" },          -- 250
    worm_sprites = {
      weaponlnk = "sprites/smart_bomb/aim",
      weaponlnku = "sprites/smart_bomb/aimu",
      weaponlnkd = "sprites/smart_bomb/aimd",
      wthrow = "sprites/smart_bomb/draw",
      wthrowu = "sprites/smart_bomb/drawu",
      wthrowd = "sprites/smart_bomb/drawd",
    },
  },
  { -- Blaster Worm
    weapon = "homing_pigeon",
    panel_icon = "sprites/blaster_worm/bworm_ico.png",
    sprite = "sprites/blaster_worm/flight",
    cluster = { sprite = "sprites/blaster_worm/cluster" },
    sprite_overrides = { wsvbu = "sprites/blaster_worm/cluster_trail" }, -- 249
    worm_sprites = {
      weaponlnk = "sprites/blaster_worm/aim",
      weaponlnku = "sprites/blaster_worm/aimu",
      weaponlnkd = "sprites/blaster_worm/aimd",
      wthrow = "sprites/blaster_worm/draw",
      wthrowu = "sprites/blaster_worm/drawu",
      wthrowd = "sprites/blaster_worm/drawd",
    },
  },
  { -- Thumper Nade
    weapon = "battle_axe",
    panel_icon = "sprites/thumper_nade/thumpern_ico.png",
    sprite = "sprites/thumper_nade/flight",
    cluster = { sprite = "sprites/thumper_nade/cluster" },
    sprite_overrides = {
      wsvg = "sprites/thumper_nade/trail",                                -- 251
      wsvgu = "sprites/thumper_nade/cluster_trail",                       -- 252
    },
    worm_sprites = {
      weaponlnk = "sprites/thumper_nade/aim",
      weaponlnku = "sprites/thumper_nade/aimu",
      weaponlnkd = "sprites/thumper_nade/aimd",
      wthrow = "sprites/thumper_nade/draw",
      wthrowu = "sprites/thumper_nade/drawu",
      wthrowd = "sprites/thumper_nade/drawd",
    },
  },
  -- Strikes keep their bomb's art 0x14 further along than a projectile
  -- does; `sprite` and `cluster.sprite` follow it there.
  { -- Thumper Nade Strike: Thumper Nades from the sky, with the Thumper
    -- Nade's own trails (the overrides above).
    weapon = "carpet_bomb",
    panel_icon = "sprites/thumper_nade/thumpernst_ico.png",
    sprite = "sprites/thumper_nade/flight",
    cluster = { sprite = "sprites/thumper_nade/cluster" },
  },
  { -- Mortar Strike: stock mortar shells, PX's trails and bits.
    weapon = "air_strike",
    panel_icon = "sprites/mortar_strike/ico_mortarst.png",
    cluster = { sprite = "sprites/mortar_strike/cluster" },
    sprite_overrides = {
      wsvclnk = "sprites/mortar_strike/trail",                             -- 466
      wsvc = "sprites/mortar_strike/cluster_trail",                        -- 260
    },
  },
  { -- Gravler: a mole bomb whose records point its dive and dig frames at
    -- the Salvation Army's wsvr*/wsvb, which PX's script overrides.
    weapon = "mole_bomb",
    panel_icon = "sprites/gravler/gravler_ico.png",
    sprite_overrides = {
      wsvr = "sprites/gravler/gravlerdive",                                -- 245
      wsvru = "sprites/gravler/gravlerdiga",                               -- 246
      wsvrd = "sprites/gravler/gravlerdigb",                               -- 247
      wsvb = "sprites/gravler/gravlerdigc",                                -- 248
    },
    worm_sprites = {
      weaponlnk = "sprites/gravler/aim",
      weaponlnku = "sprites/gravler/aimu",
      weaponlnkd = "sprites/gravler/aimd",
      wthrow = "sprites/gravler/draw",
      wthrowu = "sprites/gravler/drawu",
      wthrowd = "sprites/gravler/drawd",
    },
  },
  { -- Gravler Strike: its record points at the same four frames, and it
    -- overrides them too, so it draws its gravlers without the Gravler
    -- placed (WA would draw the Salvation Army's own). With both placed, the
    -- second claim of a frame is skipped: the same art either way.
    weapon = "mole_squadron",
    panel_icon = "sprites/gravler/gravlerst_ico.png",
    sprite_overrides = {
      wsvr = "sprites/gravler/gravlerdive",                                -- 245
      wsvru = "sprites/gravler/gravlerdiga",                               -- 246
      wsvrd = "sprites/gravler/gravlerdigb",                               -- 247
      wsvb = "sprites/gravler/gravlerdigc",                                -- 248
    },
  },
  { -- Ghost Sheep: the Aqua Sheep's own sprites, overridden.
    weapon = "aqua_sheep",
    panel_icon = "sprites/ghost_sheep/ghost_sheep_ico.png",
    sprite_overrides = {
      aquashp1 = "sprites/ghost_sheep/ghstshp1",                           -- 156
      aquashp2 = "sprites/ghost_sheep/ghstshp2",                           -- 157
    },
  },
  { -- Pogo Sheep. Its bits' trail is the Blaster Worm's (249, above).
    weapon = "sheep",
    panel_icon = "sprites/pogo_sheep/psheep_ico.png",
    sprite = "sprites/pogo_sheep/flight",
    cluster = { sprite = "sprites/pogo_sheep/cluster" },
  },
  { -- Banana Express: stock banana bombs from PX's banana plane. PX's
    -- record names its plane 704, an id PX adds past WA's sprites; `plane`
    -- gives the strike the sheet instead.
    weapon = "mb_bomb",
    panel_icon = "sprites/banana_express/banana_express_ico.png",
    plane = "sprites/banana_express/plane",
  },
  { -- Real Shotgun: PX's FireFinal fires the shotgun five times per shot,
    -- five pellets in one frame, each spread by WA's own hitscan cone.
    weapon = "shotgun",
    panel_icon = "sprites/real_shotgun/real_shotgun_ico.png",
    fire_repeat = 5,
  },
  { -- Hellish Hand-Grenade: the hellish_grenade example's art on the scheme's
    -- record, which leaves the flight sprite to the slot.
    weapon = "holy_grenade",
    panel_icon = "sprites/hellish/hhh_ico.png",
    sprite = "sprites/hellish/grenade",
    worm_sprites = {
      weaponlnk = "sprites/hellish/aim",
      weaponlnku = "sprites/hellish/aimu",
      weaponlnkd = "sprites/hellish/aimd",
      wthrow = "sprites/hellish/draw",
      wthrowu = "sprites/hellish/drawu",
      wthrowd = "sprites/hellish/drawd",
    },
  },
  { -- Remote Roller
    weapon = "skunk",
    panel_icon = "sprites/remote_roller/rroller_ico.png",
    sprite = "sprites/remote_roller/flight",
    worm_sprites = {
      weaponlnk = "sprites/remote_roller/aim",
      weaponlnku = "sprites/remote_roller/aimu",
      weaponlnkd = "sprites/remote_roller/aimd",
      wthrow = "sprites/remote_roller/draw",
      wthrowu = "sprites/remote_roller/drawu",
      wthrowd = "sprites/remote_roller/drawd",
    },
  },
  { -- Igniter: PX sets the missile's own sprite to 0 and draws its bullet at
    -- run time, animated and turned to its flight (PX_WEAP_SPRITES below).
    -- WA still draws its homing missile's rocket under it for now.
    weapon = "homing_missile",
    panel_icon = "sprites/igniter/igniter_ico.png",
    worm_sprites = PX_POSTURE,
    sprites = {
      "sprites/px_hold/igniter", "sprites/igniter/flight",
    },
    params = { gpu_prefix = "sprites/" },
  },
  { -- Chilli Bomb: five more Chillis burst out of it, which burst into fire
    -- (its section below). PX's record has sprite 0 and PX draws the chilli
    -- at run time, turned to its flight (PX_WEAP_SPRITES below). A thrown
    -- weapon's worm posture is picked by its sprite, so the record keeps the
    -- banana, and each missile's own copy is set to 0 in flight instead.
    weapon = "super_banana",
    panel_icon = "sprites/chilli_bomb/chilli_ico.png",
    sprite = "banana",
    on_explode = function(ev) shared.chilli_bomb_explode(ev) end,
    worm_sprites = PX_POSTURE,
    sprites = { "sprites/px_hold/chilli_bomb" },
    params = { gpu_prefix = "sprites/px_hold/" },
  },
  { -- Sticky Bomb: PX's record leaves the bomb's sprite 0 and PX's script
    -- draws the bomb at run time. Here the bomb is the stock grenade sprite
    -- again -- a grenade-type slot picks the worm's throw sheet from it, and
    -- 0 has none -- which the override draws as PX's bomb. The bits too.
    weapon = "grenade",
    panel_icon = "sprites/sticky_bomb/sbico.png",
    sprite = "grenade",
    cluster = { sprite = "sprites/sticky_bomb/bomb" },
    -- Stuck, the bits draw with the frames at +0x178..+0x184, which the
    -- record points at the Salvation Army's 467; PX overrides that too.
    sprite_overrides = {
      grenade = "sprites/sticky_bomb/bomb",                                -- 50
      wsvclnku = "sprites/sticky_bomb/bomb",                               -- 467
    },
    worm_sprites = PX_POSTURE,
    sprites = { "sprites/px_hold/sticky_bomb" },
    params = { gpu_prefix = "sprites/px_hold/" },
  },
  { -- Fire Jump: a fire punch, then a jump and a glide (below).
    weapon = "fire_punch",
    panel_icon = "sprites/fire_jump/fire_jump_ico.png",
  },
  { -- Super Drill: WA's drill, cutting a second hole each frame (below).
    weapon = "pneumatic_drill",
    panel_icon = "sprites/super_drill/ico_superdrill.png",
  },
  { -- Shadow-Bolt: the record leaves the bolt's sprite 0, and PX draws the
    -- bolt at run time, animated and turned to its flight (PX_WEAP_SPRITES
    -- below), with its trail on stock 453 (sprite_curtis_453).
    weapon = "longbow",
    panel_icon = "sprites/shadow_bolt/ico_shadowb.png",
    worm_sprites = PX_POSTURE,
    sprite_overrides = { [453] = "sprites/shadow_bolt/trail" },
    sprites = { "sprites/px_hold/shadow_bolt", "sprites/shadow_bolt/bolt" },
    params = { gpu_prefix = "sprites/" },
  },
  { -- Hot Air Balloon: WA's parachute, carried up by PX's script (below).
    weapon = "bungee",
    panel_icon = "sprites/balloon/balloon_icon.png",
    sprites = { "sprites/balloon/balloon", "sprites/balloon/basket" },
    -- A pack WAV plays only once an entry registers it.
    sounds = {
      "sounds/balloon/inflate1.wav", "sounds/balloon/inflate2.wav", "sounds/balloon/inflate3.wav",
      "sounds/balloon/pop1.wav", "sounds/balloon/pop2.wav", "sounds/balloon/pop3.wav",
      "sounds/balloon/pop4.wav",
    },
    params = { gpu_prefix = "sprites/balloon/" },
  },
  { -- Hang-Glider: WA's parachute, flown as PX's glider (below).
    weapon = "parachute",
    panel_icon = "sprites/hang_glider/ico_glider.png",
    sprites = { "sprites/hang_glider/glider", "sprites/hang_glider/pack" },
    sounds = { "sounds/hang_glider/hangopen.wav", "sounds/hang_glider/hangclose.wav" },
    params = { gpu_prefix = "sprites/hang_glider/" },
  },
  { -- Swim Suit: on the laser sight's slot; worn, the worm swims (below).
    weapon = "laser_sight",
    panel_icon = "sprites/swim_suit/ico_swimsuit.png",
    sprites = { "sprites/swim_suit/swim", "sprites/swim_suit/float", "sprites/swim_suit/ring" },
    sounds = { "sounds/swim_suit/putting_on_ssuit.wav" },
    params = { gpu_prefix = "sprites/swim_suit/" },
  },
  { -- Jump: on the ninja rope's slot; the worm leaves with the shot (below).
    weapon = "ninja_rope",
    panel_icon = "sprites/jump/jumpic.png",
    worm_sprites = {
      weaponlnk = "sprites/jump/aim", weaponlnku = "sprites/jump/aimu",
      weaponlnkd = "sprites/jump/aimd",
    },
    on_fire = function(fire) fires.jump(fire) end,
  },
  { -- Wind Changer: on the surrender's slot; sets the wind (below).
    weapon = "surrender",
    panel_icon = "sprites/wind_changer/ico_windchanger.png",
    sounds = {
      "sounds/wind_changer/breeze.wav", "sounds/wind_changer/calm_wind.wav",
      "sounds/wind_changer/strong_wind.wav",
    },
  },
  { -- Gravity Control: on low gravity's slot; sets the gravity (below).
    weapon = "low_gravity",
    panel_icon = "sprites/gravity_control/gravity_control_ico.png",
    sounds = { "sounds/gravity_control/activate.wav", "sounds/gravity_control/error.wav" },
  },
  { -- Helicopter: WA's jet pack, flown by PX's script (below).
    weapon = "jet_pack",
    panel_icon = "sprites/helicopter/heli_ico.png",
    sprites = { "sprites/helicopter/flying", "sprites/helicopter/jumpin" },
    sounds = {
      "sounds/helicopter/helicopterloop.wav",
      "sounds/helicopter/1.wav", "sounds/helicopter/2.wav", "sounds/helicopter/3.wav",
      "sounds/helicopter/4.wav",
      "sounds/helicopter/oops1.wav", "sounds/helicopter/oops2.wav", "sounds/helicopter/huh.wav",
      "sounds/helicopter/poop.wav", "sounds/helicopter/idiot.wav",
    },
    params = { gpu_prefix = "sprites/helicopter/" },
  },
  { -- Sniper Rifle: the hold drawn at run time, PX's laser sight while aiming
    -- and its own shot (below). Firing, the worm takes the snipefire poses
    -- the scheme's record names (lit by the muzzle), not WA's handgun, and
    -- the hold and laser stay up over them (PX_HOLDS).
    weapon = "handgun",
    panel_icon = "sprites/sniper_rifle/srico.png",
    worm_sprites = {
      weaponlnk = PX_POSTURE.weaponlnk, weaponlnku = PX_POSTURE.weaponlnku,
      weaponlnkd = PX_POSTURE.weaponlnkd,
      wthrow = PX_POSTURE.wthrow, wthrowu = PX_POSTURE.wthrowu, wthrowd = PX_POSTURE.wthrowd,
      weaponfire = "sprites/sniper_rifle/fire", weaponfireu = "sprites/sniper_rifle/fireu",
      weaponfired = "sprites/sniper_rifle/fired",
    },
    sprites = {
      "sprites/px_hold/sniper_rifle", "sprites/sniper_rifle/laser", "sprites/sniper_rifle/flash",
    },
    sounds = { "sounds/sniper_firing.wav" },
    params = { gpu_prefix = "sprites/" },
  },
  { -- Burst Rifle: the worm aiming it, taking it out and firing it.
    weapon = "minigun",
    panel_icon = "sprites/burst_rifle/ico_burstr.png",
    worm_sprites = {
      weaponlnk = "sprites/burst_rifle/aim",
      weaponlnku = "sprites/burst_rifle/aimu",
      weaponlnkd = "sprites/burst_rifle/aimd",
      wthrow = "sprites/burst_rifle/draw",
      wthrowu = "sprites/burst_rifle/drawu",
      wthrowd = "sprites/burst_rifle/drawd",
      weaponfire = "sprites/burst_rifle/fire",
      weaponfireu = "sprites/burst_rifle/fireu",
      weaponfired = "sprites/burst_rifle/fired",
    },
  },
}

shared.PORTED = PORTED
shared.PX_ART = PX_ART
shared.fires = fires
