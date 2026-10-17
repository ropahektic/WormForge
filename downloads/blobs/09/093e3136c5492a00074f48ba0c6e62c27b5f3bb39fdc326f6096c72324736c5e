# Project X ports

Project X's weapons, ported to WormForge as the component bundle
`px.ports`. Each weapon is a component any profile can place, credited in
the mod loader to its Project X authors as its scripts name them (`authors`
and `credits` in `mod.toml`); where nobody is named yet, it shows only as a
Project X weapon.

## Highlander

Highlander's rules are the add-on **Highlander rules** (`hl.rules`), built on
`wa.inventory`, `wa.on.turn_start`, and `wa.on.death`.

Project X's *Highlander 0rang3 1.1*: its rules, on its weapon layout. The
Highlander profile places each of its weapons on the panel, WA's own among
them where PX used WA's (the Baseball Bat, `stock.baseball_bat`). Each weapon's pool is one of its settings
for the add-on; every PX weapon suggests its PX pool.

Weapons are ported in batches. **A weapon not ported yet leaves WA's stock
weapon on its slot, and that stands in for it.**

## Playing it

Highlander is a component bundle (`format_version = 2`): installing it runs
nothing until a profile selects it. Its two profiles (`profiles/`) are copied
into `WormForge/Profiles` when the mod loader installs the bundle; load
**Highlander** in the loader's Profile tab. It places every PX weapon where
PX's layout puts it and ticks Highlander rules, which deal them by the rules
below. **Highlander weapons** places the same weapons without the rules, for
trying them out: the ammo is the WA lobby scheme's.

Any profile can tick Highlander rules over its own weapon set. Each placed
weapon then has two more settings in the Weapons tab: its **Highlander pool**
(offensive, second, movement, or not dealt) and whether it is **dealt on
cavern maps**. A PX weapon suggests PX's choice; WA's own weapons are not
dealt until a profile says so.

Each weapon is also a component of its own (`px.double_bazooka`,
`px.sniper_rifle`, ...), and like any weapon it may go at any panel position.
Its home (PX's layout: the Double Bazooka where the Bazooka is) is where it
shows by default and how the pack's own tables key it (`lib/homes.lua`); its
slot is one past WA's 70, as every weapon's that isn't WA's own, and the code
names it to the engine by its id. Under Highlander
rules, moved weapons are dealt where they are, and one taken out is not dealt. A profile without the rules can place
some of them next to WA's own weapons: they then keep the ammo, delay and
crate odds that profile gives them. Search for them in the Weapons tab.

## Rules

- At the start of the match, every worm is dealt **one weapon from each
  pool**.
- On a worm's turn it can use **exactly its own weapons, one shot of each**.
  Nobody else holds any pooled weapon, whatever the profile says.
- Next turn it gets them back. Firing doesn't use a weapon up for good.
- **When a worm dies, the worm whose turn it is takes everything the dead
  worm carried**, and can use it that same turn. That includes friendly and
  accidental kills, as in PX. A worm that dies on its own turn simply loses its
  weapons.
- **On cavern maps, the Ferret and nothing that falls from the sky is
  dealt.**

| Pool | Weapons (stock slot) |
|---|---|
| Offensive (29) | Double Bazooka (bazooka), Igniter (homing missile), S.M.A.R.T Bomb (mortar), Blaster Worm (homing pigeon), Burning Sheep Launcher (sheep launcher), Sticky Bomb (grenade), Windy Cluster (cluster bomb), Super Gravedigger (banana bomb), Thumper Nade (battle axe), Electric Grenade (earthquake), Dynamite, Nuke Rocket (mine), Pogo Sheep (sheep), Ghost Sheep (aqua sheep), Chilli Bomb (super banana), Hellish Hand-Grenade (holy grenade), Valyrian Fire (petrol bomb), Remote Roller (skunk), Priceless Ming Vase (ming vase), Cow Launcher (mad cow), Old Woman Launcher (old woman), Ferret (salvation army), Mortar Strike (air strike), Pigeon Strike (mail strike), Submarine Attack (mine strike), Gravler Strike (mole squadron), Banana Express (mb bomb), Bowling Ball Strike (sheep strike), Thumper Nade Strike (carpet bomb) |
| Second (19) | Fire Jump (fire punch), Sentry Laser (dragon ball), Sentry Gun (kamikaze), Javelin (prod), Baseball Bat (WA's own), Electromagnet (baseball bat), Real Shotgun (shotgun), Sniper Rifle (handgun), Laser Gun (uzi), Burst Rifle (minigun), Shadow-Bolt (longbow), BlowTorch, Super Drill (pneumatic drill), Portal Gun (scales of justice), Ice Arrow (armageddon), Flame Thrower, Reinforcement (nuclear test), Crate Strike (donkey), Lightning Strike (napalm strike) |
| Movement (7) | 3 Girder Pack (girder pack), Jump (ninja rope), Hang-Glider (parachute), Super Tele (teleport), Helicopter (jet pack), Gravity Control (low gravity), Swim Suit (laser sight) |
| Not pooled (14) | Kamikaze Rocket (suicide bomber), Gravler (mole bomb), Hot Air Balloon (bungee), Skip Go/Surrender (skip go), Wind Changer (surrender), Muahaha 3 (select worm), Weapon Crate (freeze), Cluster Bomb (magic bullet), Fast Walk, Teleport (invisibility), Skunk (damage x2), Crate Spy, Mole Bomb (double turn time), Crate Shower |

Highlander's rules never touch the **not pooled** weapons. Three get weapon
settings in the Highlander profile, which the mod loader shows and a player
may change: the team's Hot Air Balloons are refilled to 3 and its Wind
Changer to 1 each turn, as PX's GiveWeapons does, and each team gets one
Weapon Crate a round, as in PX. The others keep whatever ammo the profile
gives, so the profile decides whether Teleport or Skip Go is always
available.

On cavern maps PX draws from the first 21 offensive and the first 16 second
weapons only. That leaves out the Ferret and the strikes, and Reinforcement,
Crate Strike and Lightning Strike.

## Ported weapons

### Ice Arrow

Ice Arrow uses the Highlander scheme's arrow record on Armageddon's slot and
WA's ArrowEntity for flight and bow impact. Its PX panel icon is included.
When that arrow hits a worm, the pack enters WA's frozen state on the worm's
next frame, after the bow hit has applied its momentum.

Most start from WA's own weapon of their home slot (`copy_from = "stock.<home>"`) with
the record fields PX's scheme changed, as Lua API 4's tables (`WEP_FIELDS` in
`weapons/wep_data.lua`, generated by `tools/embed_weps.py`). Lightning Strike and
Electric Grenade use the scheme's full `.wep` records, extracted with
`tools/px_scheme_weps.py` from `HL - 0rang3 - 1.1.pxs`.

### Electrical weapons

| Slot | Weapon | Behavior |
|---|---|---|
| napalm_strike | Lightning Strike | Cursor-aimed 30° beam, 150-frame warning, 16-frame strike, 60-frame tail; heals live worms, revives linked graves at 10 HP, arms mines, and hits crates/oil drums. |
| earthquake | Electric Grenade | WA grenade flight and explosion followed by PX's seeking, terrain-following, chaining tazer arc; delayed 24 damage to worms and 12 to objects, mine arming, a temporary tazed pose, and Bowling Balls as links, zapped as PX's Tazer zaps them (thrown up and electrified; thrown at 0.8 once electrified). |

The beams, glows, and explosion use the GPU atlas. Gameplay runs in simulation
callbacks; drawing only varies presentation. A grave records its original worm
ID when WA creates it. On revival, Highlander restores the dead worm's saved
hand while the active worm keeps the weapons it gained at death. PX's sentry
ownership transfer is deferred.

### Super Tele

Super Tele replaces the teleport slot with the scheme's type-3 cursor weapon
and PX icon. The click position is held for 50 game frames while WA plays its
teleport animation, then the worm moves there. Three 12-pixel terrain cuts at
the click and 10 and 22 pixels above make room to arrive inside land. Cavern
clicks are clamped to 19 pixels below the ceiling, as in PX. The click comes
from WA's synchronized fire context, so the destination cannot follow a
later mouse movement.
During manual placement the worm starts at WA's off-map holding position, so
Super Tele places it immediately and plays its start sound at the destination.

### Ported by reddaz

Three weapons outside Highlander, ported by reddaz with their own files:
they take no part in Highlander's pools.

- **Attack Helicopter** (`px.attack_helicopter`, `weapons/attack_helicopter.lua`):
  Project X's "COLADOR AEREO". Click a target; a helicopter enters from off
  the map, hovers toward it and fires 17 homing bullets, then leaves.
- **Bunker Buster** and **Super Bunker Buster** (`px.bunker_buster`,
  `px.super_bunker_buster`, `weapons/bunker_buster.lua`): Worms Reloaded's
  drill strike, from Project X's `bunkerbuster.txt`. Click a target; the buster
  falls, drills down through the land and blows up. The Super sprays fire as
  it drills and cuts sideways with five overlapping blasts.

### WA's own weapons

| Slot | Weapon | Notes |
|---|---|---|
| dynamite | Dynamite | WA's own (`stock.dynamite`) |
| blow_torch | BlowTorch | |
| flame_thrower | Flame Thrower | WA's own (`stock.flame_thrower`) |
| girder | Baseball Bat | WA's own (`stock.baseball_bat`): PX moved it here for the Electromagnet |
| girder_pack | 3 Girder Pack | three girders, not five |
| fast_walk | Fast Walk | WA's own (`stock.fast_walk`) |
| crate_spy | Crate Spy | WA's own (`stock.crate_spy`) |
| crate_shower | Crate Shower | WA's own (`stock.crate_shower`) |
| magic_bullet | Cluster Bomb | stock cluster icon |
| invisibility | Teleport | WA's own (`stock.teleport`) on Invisibility's place |
| damage_x2 | Skunk | stock skunk icon |
| double_turn_time | Mole Bomb | stock mole icon |
| ming_vase | Priceless Ming Vase | the stock vase under PX's name |

These are WA's own weapons. Moving one to another slot works only as far as
WA reads the weapon from its record rather than its slot number. Played in
game: the Cluster Bomb, Skunk and Mole Bomb fire as their records say; 3 Girder Pack
places three. Open points:

- **Teleport on the invisibility slot:** WA disables Invisibility's slot in
  offline games, so the Teleport is unavailable offline. Not yet checked
  online.
- **The scheme's header fields** (the dwords before the fire type) do not
  match WA's stock values. For example, the bat's first flag is 0 where WA's
  is 1. The whole record is imported, as PX writes it, except whether the
  weapon ends the turn (below); the bat plays no differently for it.
- **Ends the turn** is a profile setting, not part of the weapon. PX's
  records leave it off on almost every weapon, which is how Highlander lets a
  worm fire its whole hand in one turn. Each claim puts back the weapon's own
  (`KEEPS_TURN` in `weapons/claims.lua`: on, as WA's are, except for the rope,
  bungee, parachute, jet pack and other tools, and the Portal Gun), and the
  Highlander profile turns it off where PX does. PX's Dynamite was nothing
  more than that, so the profile places WA's own.

### PX weapons that need only PX's art

None of these has a script in PX. The icons are PX's files byte for byte,
so replays share them. The strips are split into frame folders with
`tools/px_split_strip.py`.

| Slot | Weapon | Art |
|---|---|---|
| sheep_launcher | Burning Sheep Launcher | icon |
| mad_cow | Cow Launcher | icon |
| old_woman | Old Woman Launcher | icon |
| mail_strike | Pigeon Strike | icon |
| cluster_bomb | Windy Cluster | icon, cluster bits |
| banana_bomb | Super Gravedigger | icon, flight and cluster sprites, the worm holding and taking it out (flat, up, down) |
| minigun | Burst Rifle | icon, the worm aiming it, taking it out and firing it (`weaponfire*`) |
| mortar | S.M.A.R.T Bomb | icon, flight and cluster sprites, the bits' own sprite while they home, trail, worm |
| homing_pigeon | Blaster Worm | icon, flight and cluster sprites, the bits' trail, worm |
| battle_axe | Thumper Nade | icon, flight and cluster sprites, both trails, worm |
| carpet_bomb | Thumper Nade Strike | icon, the Thumper Nade's flight and cluster sprites and trails |
| air_strike | Mortar Strike | icon, cluster sprite, both trails (stock mortar shells) |
| mole_bomb | Gravler | icon, dive and dig frames, worm |
| mole_squadron | Gravler Strike | icon (the Gravler's frames) |
| aqua_sheep | Ghost Sheep | icon, its two sprites |
| sheep | Pogo Sheep | icon, flight and cluster sprites (the Blaster Worm's bits' trail) |
| mb_bomb | Banana Express | icon, the banana plane (`plane`) |
| shotgun | Real Shotgun | icon; five pellets per shot (`fire_repeat = 5`) |

All eighteen were played in game.

**Trails.** PX draws the last three weapons' trails by overriding stock
sprites their records point at: the Salvation Army's `wsv*` frames (249-252),
free here because the Ferret holds that slot. The pack does the same with
`sprite_overrides`, for the whole match, using the trail art from PX's
`sprite_curtis_<id>` libraries. The Gravler (245-248), Ghost Sheep (156/157)
and Mortar Strike (260, 466) have their art on overridden stock sprites the
same way; PX's scripts for them do nothing else.

**Strikes** keep their bomb's art 0x14 further along than a projectile does
(+0x74 bomb, +0x7C trail, +0x138 bits, +0x140 bits' trail). The importer and
`sprite` / `cluster.sprite` follow them there. A strike's plane is at +0x38:
PX's record names the Banana Express's 704, an id PX adds past WA's last
sprite (696), so the importer keeps the slot's own plane there and the pack
gives it the banana plane with `plane`.

**The Real Shotgun** has no art of its own. PX's script calls the shotgun's
fire five times per shot; `fire_repeat = 5` does the same, five pellets in one
frame, each spread by WA's own hitscan cone.

**Old Woman Launcher** fires WA's Old Woman directly, with her stock movement,
sprite, and five-second fuse. If WA's muzzle point is inside a wall, the pack
places her at the nearest clear point back toward the worm before calling
`wa.weapons.launch`. The worm uses the bazooka aim sheet (+0x34 = 3);
PX's 0 draws no worm in WA 3.8.1.

### PX weapons with a small script

| Slot | Weapon | Art | Script |
|---|---|---|---|
| holy_grenade | Hellish Hand-Grenade | icon, flight sprite, worm | none: PX draws its hold and grenade at run time, and the pack uses sheets |
| skunk | Remote Roller | icon, flight sprite, worm | none: the library's script is empty in the extract |
| homing_missile | Igniter | icon, the hold, PX's bullet | the hold and the bullet drawn at run time |
| grenade | Sticky Bomb | icon, the bomb and its bits | the hold, drawn at run time |
| fire_punch | Fire Jump | icon | PX's jump timeline |
| pneumatic_drill | Super Drill | icon | a second hole each frame |
| longbow | Shadow-Bolt | icon, the hold, the bolt, its trail | the hold and the bolt drawn at run time |
| handgun | Sniper Rifle | icon, the hold, the firing poses, laser.png, a muzzle flash | the hold, the laser sight, a muzzle flash and its own shot sound |
| jet_pack | Helicopter | icon, the helicopter, the climb-in, sounds | PX's flight, fuel and crashes on WA's jet pack |
| bazooka | Double Bazooka | icon | a second shell from where the first explodes |
| mine | Nuke Rocket | icon, the rocket, the hold, the launch sound | a nuke climbs out of the fusing rocket |
| super_banana | Chilli Bomb | icon, the chilli (held and in flight) | five more Chillis burst out of it and burst into fire |
| laser_sight | Swim Suit | icon, the swim and float animations, the bubble, its sound | PX's swimming on WA's laser sight |
| surrender | Wind Changer | icon, three wind sounds | 0-9 choose the force, firing sets the wind |
| skip_go | Skip Go/Surrender | PX icon | Space skips the turn; holding Ctrl shows the Surrender pose and fires stock Surrender |
| uzi | Laser Gun | icon, the worm aiming and taking it out, its beam and glow, three sounds | PX's 5 s beam in place of the uzi's bullet |
| low_gravity | Gravity Control | icon, its two sounds | 1-5 choose the gravity, firing holds it for the turn |
| ninja_rope | Jump | icon, the worm aiming it | the worm leaves with the shot's speed |
| parachute | Hang-Glider | icon, the glider, its pack-away, its two sounds | PX's glider, flown by the pack once WA's parachute opens |
| petrol_bomb | Valyrian Fire | icon, the bottle (held and in flight) | the hold and the spinning bottle drawn at run time; thrown 15 pixels further out, and from the water the bottle goes back to the team; PX's 51 fires on a 3-pixel ring at the impact (`wa.fire.spawn`, PX's fire values), drawn green (PX's RGB(75, 225, 75)) on the GPU renderer, whose hits on worms do 25% more damage and knock twice as far. Not yet: "WILDFIRE !!!" and the bottle bursting on the water |
| nuclear_test | Reinforcement | icon | a click puts a new worm in the team's next unused place (`wa.worms.spawn`), named Reinforcement, with 200 health, standing on the ground under the click; with 8 worms the team is full (an error sound). In a dead worm's place it is a new worm: under Highlander's rules it is dealt a fresh hand, not the dead one's. Not PX's: PX's worm floats down from above the map on an empty jet pack; this one stands there at once |
| sheep_strike | Bowling Ball Strike | icon, the ball, PX's spark and glow | three balls dropped from PX's plane height, set back by their drift so the middle one comes down on the click, rolling on PX's CBowlingBall physics: traced as a 16-pixel circle (`wa.world.trace`), bounce and friction along the surface's normal, PX's inertia, low speed and sleep. Faster than 4 a frame it hurts what it rolls into, 5 to 60 by speed (crates and oil drums 100, pushed the way it rolls), a worm at most every 12 frames and knocked the way it rolls (`worm:hurt{ amount, vx, vy }`), a standing worm crushed from above; balls push each other apart and wake. A Lightning Strike, or an Electric Grenade's arc linking to it, overcharges the balls (PX's Zap: thrown up, then electrified for good, speeding up as it rolls, drawn with PX's blue glow, crawling sparks and glowing trail), and a ball in the way stops the bolt. WA's fires, guns and blasts hit it and wake it (`as_object`, `on.hit`): blasts at full force, the rest at 0.7, as PX's. Not yet: flame trail, shake, PX's plane |
| salvation_army | Ferret | icon, the ferret (held and walking), its sound | thrown, it falls until the land is 3 pixels under it, then walks the terrain's outline (PX's square tracing, 3-pixel steps, against the land with WA's missile shape, the Skunk's: `shape = "missile"`, `a:fits`) and never falls off it; it explodes on a worm (the turn's worm is spared for 60 frames), an oil drum, the water or a dead end, or by itself 15 s after it was placed (not PX's), flicks mines and Bowling Balls up, and at most 10 walk at once. Its frames animate as it walks (PX's barely do) |
| baseball_bat | Electromagnet | icon, the magnet (both poles, damaged), its rings and sparks, the worm's deploy | dropped at the worm, it falls and settles as a mine does (a circle traced against the land, bouncing a little) and stays: for four of its owner's turns its field (170 pixels) pushes (repel) or pulls (attract) WA's own mines and missiles (`object:impulse`) and the Bowling Balls at a quarter, and triggers the mines it catches, an attracting one setting their fuses close together. + (synchronized, `wa.world.keys().plus_key`) switches the turn's worm between repel and attract; the HUD names the mode. Blasts, guns and fires hit it; at 0 of its 80 health it explodes. The Hellish Hand-Grenade slows down in a field. Not PX's: 300 frames after the turn ends, the field lets go of missiles instead of exploding them. The worm takes it out and puts it away with PX's magnet in place of the Dynamite: blue repelling, red attracting (`worm_sprites_toggle`), the take-out playing again in the new colour when + switches |
| donkey | Crate Strike | icon | three crates on parachutes from 50 pixels above the map, at the click and 50 to either side (`wa.crates.spawn`); each a weapon, utility or health crate at random, WA picking what is inside; a health crate gives 20-40, 40-60 or 60-80 by its place |
| freeze | Weapon Crate | icon, the worm's take-out and hold | PX's record: placed as WA places a mine (its take-out, placing and ammo), and the turn goes on; what it places is one of WA's weapon crates, its contents WA's pick, teleported in 40 pixels in front of the worm (`wa.crates.spawn`), for the worm to collect. Each team gets one a round. |
| kamikaze | Sentry Gun | icon, the turret (base, head, flare), casings, impact, the worm's take-out and placing, its sounds | placed as WA places a mine, it plants where the worm stands with passage for the planter until clear, searching nearby if blocked; its head sweeps, takes the nearest moving enemy within 360 pixels, ignores terrain within its barrel-sweep grace area, requires clear sight beyond it and fires from a clear barrel tip, up to 20 rounds a turn (PX's spread, casings), holds fire on its owner's colour's turns, reloads each turn; positive damage disables it for the turn, and at 0 of its 50 health it explodes. Its head is drawn in its owner's colour, and so is the housing the worm carries (`worm_sprites_team_tint`). The shared turret (`lib/turret.lua`) is for the Sentry Laser too |
| dragon_ball | Sentry Laser | icon, the turret (base, body, barrel), the worm's take-out and placing, its sounds | placed as the Sentry Gun; it shoots the nearest moving missile, mine or Bowling Ball of another colour within 300 pixels (`object.team`), ignoring terrain within its barrel-sweep grace area, requiring clear sight beyond it and firing only from a clear barrel tip, 20 frames after it finds it, turning 5 degrees a frame; each of its 4 shots a turn is a short beam in its owner's colour that disintegrates a target reached before terrain without a blast (`object:remove()`), burns worms (10) and crates and oil drums (20) in between, arms a mine it crosses, and cuts a 4-pixel hole where it stops; it fires on every colour's turn, and at 0 of its 35 health it explodes. Its body is drawn in its owner's colour, the barrel grey, and so is the body the worm carries. Not PX's: WA's arrows are not listed to Lua, so it ignores them. |
| suicide_bomber | Kamikaze Rocket | icon, the take-out, the launch, the rocket in flight | PX's scheme record, WA's Kamikaze's: WA flies the worm, digs its way and hits the worms it passes. Fired only with Ctrl held (Ctrl + Space; without, nothing is used and the HUD says so). The worm becomes a rocket from where it stood, along its aim at 8 pixels a frame, turned 9 degrees a frame by left and right, digging an 8-pixel hole each frame, for 4 seconds (counted down on the HUD); then it blows up (damage 30, blast 100) and the worm goes into the water. As PX's, it ends sooner if WA's Kamikaze does: in the water, or out of the map. |

Played in game: the Fire Jump, the Sticky Bomb and Igniter holds, the
Shadow-Bolt, the Sniper Rifle and the Helicopter.

**Holds drawn at run time.** For some weapons PX draws the worm holding it
with its sprite builder, not from a sheet. It takes a posture with no weapon
in it, then draws the weapon and a hand over it, placed and turned from the
aim each frame, and grows the weapon in as aiming starts. Each replacement
declares its PX numbers as `hold = {…}` (`PX_HOLDS` in `lib/holds.lua`); the engine
draws the GPU weapon and optional hand over WA's worm pose. Walking hides the
hold immediately, and aiming restores it. Holds are presentation only and do
not spawn simulation actors.

**Sticky Bomb.** PX's record leaves the bomb's sprite 0. That gives a
grenade-type slot no throw sheet, so the pack keeps the stock grenade sprite
and overrides it with PX's bomb. Its bits, once stuck, draw with the
Salvation Army's frame 467, which PX overrides too; so does the pack.

**Fire Jump.** This is WA's fire punch, whose speed then follows PX's
timeline:

- up at 9 pixels a frame at once;
- forward at 4 after 30 frames;
- 1 more upward at 60 frames;
- until 210 frames, a fall faster than 5 goes back to 4.

PX counts from `FireFinal`, which WA calls after the punch's wind-up, so the
pack starts counting when the worm starts rising. WA keeps the worm in its
punch state until it stops, so the punch cuts terrain and burns worms all the
way up. The full analysis is in `docs/px-reverse-engineering.md`.

**Super Drill.** WA drills as usual, and a hidden actor cuts a second drill
hole at the worm each frame until WA's drill stops.

**Missiles drawn at run time.** For some weapons PX leaves WA's flight
sprite 0 and draws the missile itself (`WeapSprite`). The sprite is turned
to its flight, mirrored when it flies left, and can be animated. The pack
does the same with a GPU actor per missile, placed from
`wa.on.missile_frame`, and uses each weapon's numbers from its PX script
(`PX_WEAP_SPRITES` in `lib/missile_sprites.lua`). It needs `m.weapon`, the missile's slot
(engine branch `missile-weapon`). The Shadow-Bolt's bolt is drawn this way,
its hold is animated, and its trail is stock sprite 453 with PX's shadow
trail, as `sprite_curtis_453` does.

**Sniper Rifle.** While the current worm aims it, PX's laser sight is drawn
every rendered frame from `wa.on.draw`, as `wa.draw.quad`s (engine branch
`draw-quad`), following PX's `laserray` point for point:

- 100-pixel additive quads of `laser.png` along the aim;
- narrowing along the ray, with PX's brighter start and faint 7-pixel tip.

It stops at terrain, traced exactly, and at worms, mines, crates and
barrels. PX stops it with a 2x2 collision mask, so the object radii here are
estimates. Two differences from PX:

- **The aim:** the ray uses the aim the rifle was drawn with, so the two
  always turn together. `worm.aim` is WA's smoothed crosshair, and WA
  rewrites it at render time (see `docs/px-reverse-engineering.md`).
- **The start:** the ray starts on the barrel, 2 pixels off the worm's
  centre line where PX starts it, because the art's barrel runs 2 pixels to
  one side.

The rifle fires with PX's own shot sound, `sounds/sniper_firing.wav`, and
the worm fires it in the `snipefire` poses the scheme's record names; left
out, WA drew its own handgun for the shot.

A few things differ from PX on purpose, for weapons drawn at run time:

- **Putting it away.** PX drops the weapon the frame the worm stops
  aiming. WA puts it away by playing the worm's draw backwards (see
  `docs/px-reverse-engineering.md`), so the weapon shrinks out with it:
  PX's grow-in played backwards, over WA's 20 frames. Not after a throw:
  a thrown Sticky Bomb has left the worm's hands, and WA puts nothing away.
- **While firing.** PX hides the weapon while the worm fires. The Igniter,
  the Shadow-Bolt's crossbow and the Sniper Rifle (with its laser) stay up
  instead, over whatever pose WA fires in: the Sniper Rifle's `snipefire`
  poses are the worm lit by the muzzle, and the other two have none, so the
  worm would be empty-handed.
- **A muzzle flash.** PX's Sniper Rifle has none. Each shot lights the
  sentry gun's flare, smaller (0.45), at the rifle's tip for 3 frames:
  additive and white, turned with the aim.

**Double Bazooka.** PX's `double_bazooka_script`:

- **The first shell** explodes as WA's own. PX then cuts a 50-pixel hole
  there (`MakeHole`, as `wa.land.cut`'s circle) and fires a second shell from it at
  the first one's speed.
- **The second shell** is a real WA missile of the same slot, launched with
  `wa.weapons.launch`, as PX's script creates a `CMissile` from the weapon's
  launch data. So WA flies it with wind and its smoke trail. It takes PX's
  damage 40 and 5 s fuse, and its own explosion ends it. PX also gives it
  sprite 54, which is a cluster bit (`clustlet`) in WA 3.8.1, so it keeps
  the record's bazooka shell instead.
- **The worm holds a plain bazooka.** The scheme's record gives the Double
  Bazooka the homing missile's recoloured launcher (`wbaz2`, 7 at +0x34);
  the pack's copy has the bazooka's own (3).
- **Not ported:** PX's particle trail on top of WA's, and a plain 50/35
  blast PX makes when a second shell explodes before its first frame.

**Nuke Rocket.** PX's `nuke_rocket_script`, on the mine slot:

- **The rocket** is WA's own shot. The scheme's record is a placed weapon
  that WA fires as a missile, and it already has what PX's `FireFinal`
  gives the rocket: a 3 s fuse, no damage, WA's `Fuse` sound. It sits on
  the ground fusing, and PX adds the hiss every 10 frames.
- **The nuke** climbs out when it explodes: PX's launch sound, then a real
  WA missile of the slot (`wa.weapons.launch`), silent, with a 1.6 s fuse,
  bursting into the record's clustlets. For 53 frames it climbs, randomly
  and jittering sideways, carrying worms and missiles within 17 pixels
  along; then it brakes. Its explosion adds WA's sounds 85 and 70 and two
  40/40 blasts.
- **The hold** is PX's sprite builder with a fixed angle
  (`dont_rotate_with_angle`): the rocket and a hand, placed as if aimed
  level and turned by PX's fixed angles, whatever the aim.
- **Not ported:** PX's particle trails, and carrying mines, crates, oil
  drums and bowling balls.

**Helicopter.** PX's `helicopter_user_script`, on WA's jet pack:

- **Arming:** the Helicopter is armed while WA winds the jet pack up and
  launches on the jet pack that follows, since WA may clear the worm's
  selection as it fires the team's last one. During the wind-up, PX's
  climb-in animation plays.
- **Flight:** the script flies the worm from the worm's own move keys
  (`worm.keys`). The engine consumes the keys after the script reads them
  (`worm:jetpack_steer(true)`), so WA's jet pack neither thrusts nor burns fuel.
  Speed builds while a key is held, towards
  10 pixels a frame, and dies away when it is not. Gravity and wind act at
  0.2, and Shift keeps the facing.
- **Fuel:** 100 (`worm.fuel`), burnt by flying and by each key, but not
  during retreat. WA's own fuel counter shows it, because only the worm's
  body is hidden (`worm.body_visible`), as PX's `RenderWorm` override does.
- **Crash:** when the fuel runs out, the worm reaches water, or it hits
  anything but a mine faster than a pixel a frame (`wa.on.contact`, judged
  on the speed before impact). The explosion is sized by the fuel left and
  the speed, followed by one of PX's "oops" lines. The ground counts as
  something it hits: landing slower than a pixel a frame is PX's smooth
  landing, and a faster one crashes it. When WA ends the jet pack at rest,
  WA owns the landing state; the script restores the worm's body and normal
  gravity when the jet pack ends.

**Chilli Bomb.** PX's `pyro_grenades_script` (PyroMan), on WA's super
banana. When it explodes, five more Chillis burst out of it, straight up with
a random spread: real WA missiles of the same slot (`wa.weapons.launch`), each
with damage 30, an 8 s fuse, no countdown, the fire key setting it off, and a
burst of fire where it ends. They do not burst again: a missile PX's script
makes has no weapon of its own. PX draws the chilli turned to its flight
and leaves WA's sprite 0; so does the pack. The record keeps WA's banana,
because a thrown weapon's worm posture is picked by its sprite, and each
missile's own copy is set to 0 in flight instead (`m.sprite`). Not ported: PX's particles, the five's smoke trail power
of 20, and PX writing the five's changes into the weapon's own launch data,
so that every later Chilli Bomb flies with them.

**Swim Suit.** PX's `swimsuit_SCRIPT` (StepS), with `fastswim_SCRIPT` and
`swim_suit_diving_s` (PyroMan), on WA's laser sight, which never switches on.
Worn, a worm that falls into the water swims instead of drowning:
- **Swimming:** it is held in WA's bungee state with no gravity and moved by
  its own four keys, up to 2.5 pixels a frame times the swim speed, and glides
  to a stop when they are let go. Left and right turn it unless Shift is held.
  Enter does nothing while it swims.
- **Leaving the water:** out of the water it flies on as from a jump. Too deep,
  or knocked out of those states, the suit gives out and it sinks.
- **Speed:** Fast Walk switches the swim speed between 2 and 6 for the turn.
- **Missiles:** a missile in the water blows up on a swimming worm (100, 50).
- **Looks:** the swim or float animation is drawn in its place, with a bubble
  drawn in `wa.on.draw` from live worm.x/y while the suit is worn (no ring actor).
- **Engine pieces:** `worm.collision_mask` and `m.collision_mask`, and the
  `bungee` and `sinking` states.
- **Not ported:** PX's ghost-jet and battyswim interplay, the Ninja Rope
  workaround (the Jump is on that slot), inverted controls, and the team
  message.

**Laser Gun.** PX's `lasergun` (`CLaserRay`), on the Uzi's slot. Its record
is an uzi firing one bullet; no bullet leaves, and a beam burns from the worm
along its aim for 5 s, the worm held firing (aim live) for as long:
- **Every fourth frame** it traces to the first land, up to 2048 px, cutting
  4 px holes there, along the cut while the aim holds still.
- **Damage:** everything within 5 px of it takes fire damage: a worm 2, then
  1 once it has taken 10, and no more than 45 from one beam; an oil drum 4, a
  crate 1.
- **Looks:** a red strip pulsing from full width to half, glows at the muzzle
  and the hit, red sparks from the muzzle, glows rising from the cut, yellow
  sparks on what it touches.
- **Differences:** a mine it touches is armed on its fuse once, rather than
  taking PX's gun damage; the loop sound is replayed every 51 frames.

**Wind Changer and Gravity Control.** PX's `wind_changer_script` (ravander,
improved by 0rang3) and `gravity_control_script` (DabbyB, edited by 0rang3).
Both records are one of WA's turn utilities with an index WA doesn't use, so
WA fires a utility that does nothing and the script does the work:
- **Wind Changer:** while it is selected, 0-9 choose the force. Firing it sets
  the wind to force × 0.0317 towards where the worm faces, through WA's own
  wind change (the clouds and the wind bar follow). The rules grant one every
  turn, as PX's GiveWeapons does.
- **Gravity Control:** 1-5 choose 0.3, 0.5, 1, 1.7 or 2.4 times the match's
  gravity. Firing it holds WA's gravity there until this turn ends, or until
  the turn clock has stood still for 10 s, as PX does: the clock stands still
  while WA waits for things to settle after a shot, and some things (a grave
  at 2.4x) never settle under a strong gravity. Fired with nothing chosen, it
  doesn't fire.
- **Keys:** the digit keys are synced like the other keys.
- **Differences:** a HUD line shows the keys and the choice, in place of PX's
  team messages.

**Jump.** PX's `jumpscript` (`utility_jump`), on the Ninja Rope's slot. Its
record throws like a grenade, but nothing leaves the worm:
- **Firing:** the worm itself leaves with the shot's speed, from the aim and
  the charge, and says its team's "Jump" line.
- **Aiming:** the worm looks along the aim (PX's `eyes` sheets) until it
  jumps, charging included.
- **Differences:** PX shows WA's `wjump` crouch while the charge builds, which
  looks ahead rather than along the aim. PX also mutes the worm's "Fire!" and
  "Watch this" lines while the Jump is selected, and stops a fuse or bounce
  being chosen for it.

**Hang-Glider.** PX's `paratest` (`utility_hangglider_render`). Opened with
the Hang-Glider, WA's parachute becomes PX's glider: the pack takes the worm
(`worm:take`) and flies it itself, with gravity at 0.75, the wind along the
wing's up side at 3x, a quarter of the speed across the wing damped each
frame, and a nose that turns towards the flight path, at most about 86 degrees
up or down. Up and down turn the nose, faster the faster it flies; left and
right push it. It needs WA's own gravity and wind, `wa.world.gravity()` /
`wa.world.wind()`.
- **Ends:** just before it would run into something (PX's `WS_AFTERROPE`;
  land by WA's own test of the worm's shape, `worm:fits`), on
  the jump key, in water, or when the turn ends, the worm goes back to WA
  (`worm:release`) falling on with the glider's speed, and WA lands it.
  Weapons fire from it as from WA's parachute.
- **Landing:** PX swaps the sheet WA packs a parachute away with (`wparbak`,
  289) for the glider's own. Here WA never packs a parachute away: when the
  glide ends coming down onto land below WA's 8-pixel-per-frame fall-damage
  threshold, the glider's pack-away (6 frames at 24 a second) plays once WA
  has the worm standing. A faster impact releases the worm at full speed into
  WA's normal falling state, so WA can apply the scheme's fall damage and
  loss of control. During that impact, the engine masks the parachute slot
  inside the worm's frame handler so it cannot reopen and slow the worm; the
  selected weapon is restored afterwards. A hard landing or a crash into
  something ahead plays no pack-away.

**Hot Air Balloon.** PX's `balloon_s` (r2_balloon by rafa''2, modified by
0rang3), on the Bungee's slot, whose record the pack patches into a parachute.
PX flies it on WA's parachute with the worm's gravity turned upside down.
Here the pack takes the worm when that parachute opens and flies it with WA
3.8.1's own parachute physics, upside down:
- **Physics:** each frame the speed gains gravity (upward) and the wind, then
  both are damped to 0.8. These are WA's entity physics (0x4FCB30) with the
  parachute's damping and wind factor (SetState 0x7D, 0x50EBE2 and 0x50EC57).
  So it rises at up to four times gravity and drifts with four times the wind.
- **Steering:** the arrow keys push it as they push WA's parachute (0x513EB0):
  half of gravity a frame in the key's direction, opposite keys cancelling.
- **Pops:** on touching land, in water, on the jump key (which closes WA's
  parachute), and when the turn ends. The worm then goes back to WA, falling
  with the balloon's speed. Weapons fire from the basket as from WA's
  parachute.
- **Art:** the worm's body is hidden behind the balloon, drawn in its team's
  colour, and the worm in its basket, as PX's `RenderWorm` override draws them.

Flight, cluster and plane sprites take 20 of the 223 shared sprite slots. Worm
sheets and `sprite_overrides` (the trails and the Gravler's and Ghost Sheep's
frames) are drawn by the GPU renderer, in true colour, and take none.

## Playing it

1. Enable only this pack in the mod loader. Packs that replace a stock slot,
   such as `sentry_gun`, `pooz` or `worm_toss`, would put their weapon into the
   pool in place of the one there.
2. Any lobby scheme works. The pooled slots are overwritten every turn,
   including ones the lobby scheme has at infinite.
3. `wkLua.log` records every hand dealt, by slot, and every weapon taken:
   `highlander: worm 16 took ... from worm 32`.

## Differences from PX

These are deliberate, and each one is explained in the pack's code:

- PX grants 3 Hot Air Balloons and 1 Wind Changer every turn; so does the
  Highlander profile, as weapon settings the loader shows.
- There's no removal at turn end. The next turn start does the same job.
- Every pooled slot is zeroed at each turn start, not only the previous
  worm's. PX left that to its own scheme; here any lobby scheme works.
- The pools are each weapon's settings, so a draw picks among the placed
  weapons in slot order rather than in PX's list order; and a weapon is kept
  off cavern maps by its own setting, not by its place in PX's list.

## Lockstep

The pack uses lockstep `worm_message`, `turn_start`, and `death` events.
Every random choice is `wa.random()`, which draws from WA's shared RNG, and
hands are dealt in worm-message order. Two peers, or a replay, deal the same
hands. Nothing reads local input or the clock.

## Reusable engine features

- `worm:ammo(name, { set = n })`: an absolute ammo write, WormForge's
  version of PX's `SetWeaponEx`. The older `worm:ammo(name, n)` adds to
  the current ammo and never changes infinite.
- `wa.inventory.create({ id, slots })`: a pack-scoped, per-worm virtual
  inventory. Its `deal`, `transfer`, `clear`, and `apply` verbs are usable by
  class/loadout mods without copying Highlander's bookkeeping.
- `wa.on.turn_start`: the active worm as a first-class lockstep event.
- `wa.on.death`: one event per death with `victim`, current `active`, and
  optional proven `attacker`, `attacker_team`, `weapon`, `slot`, and damage
  `kind`. Highlander intentionally transfers to `active`, preserving PX rules.
- `wa.on.hurt` carries the same optional attribution fields, so a different
  pack can transfer on damage or only for a particular weapon.
- `wa.world.cavern()`: WA's own cavern flag (`GameWorld+0x777C`).
- A fix: granting ammo used to move the weapon into the F1 panel row. It now
  stays in its own row.
- A fix: ammo **writes** went to the wrong row. The engine read a team's
  alliance from a different field than WA's own `GetAmmo` does, so every
  team's writes landed in the first team's row. Only that team ever played by
  Highlander rules.

## Layout

The bundle runs as components (`components/`): the add-on `hl.rules`
(Highlander rules) builds the pools, by weapon id, from each placed weapon's
settings and loads `scheme/`, and each placed weapon component runs
`components/weapon.lua`, which loads the modules the placed weapons need
(`components/loader.lua`) and claims the slot it was placed on. The code
names weapons to the engine by id (`px.javelin`, `stock.fast_walk`), never by
slot; the pack's own tables (the catalog, the claims, the art) key each
weapon by its home slot (`lib/homes.lua`), and `shared.home(id)` maps back.
Code that acts on a weapon it finds by id asks `shared.owns(home)` first, so
a weapon Highlander didn't claim is left alone. `rules.lua` is the test
suites' harness: the Highlander profile's match, every weapon on its home
slot, installed as the engine installs components.

| Folder | Holds |
|---|---|
| `lib/` | What several weapons share: the engine-drawn holds, sprite animation helpers, PX's missile sprites, and `shared.lua`, the table modules pass values through. |
| `weapons/` | One module per weapon or weapon family, plus the claim tables (`catalog.lua`, `claims.lua`) and the generated record data (`wep_data.lua`, written by `tools/embed_weps.py`). |
| `scheme/` | Highlander's rules: its pools, its state and the rules themselves. |
| `components/` | The bundle's entries: the rules add-on, the weapon component, and the loader that maps placed weapons to modules. |
| `profiles/` | Highlander and Highlander weapons, copied into `WormForge/Profiles` when the loader installs the bundle. |

A module reads another's value as `local name = shared.name`; one that is
set later (an explode handler the claims call) is used as `shared.name`
throughout. `tools/split_highlander.py` made this layout from the single
`rules.lua` the pack once was.

## Tests

```sh
lua mods/px/test_rules.lua     # from the repo root
```

These run the Highlander profile's match (`rules.lua`, the components and the modules they load) against a mocked WA, which translates between WA's slots and the engine's weapon ids as the engine does. Ammo is stored per alliance, and
the mock scheme has an infinite bazooka. Which row a team's writes land in is
the engine's job, and the mock can't test it. They cover:
- every Highlander weapon's claim, including the Lightning Strike, Electric Grenade,
  Laser Gun and Super Tele scheme records
- Super Tele's exact click, 50-frame wait, three terrain cuts, cavern ceiling,
  cancellation when its worm dies, and immediate manual placement
- strike timing, grave identity, revival and restored Highlander hand
- tazer seeking, delayed zap, stun, mine fuse, object damage and terrain trace
- the Fire Jump's timeline, counted from the punch, not the fire key
- the run-time holds: placed from the aim, mirrored, grown in, and dropped;
  animated, and with no hand
- the run-time missile sprites: one per missile, turned to its flight,
  animated, and only on its own weapon's missiles
- the laser sight: its start, colours, length (full, to terrain, to a worm),
  when it shows, and the shot sound
- the Helicopter: the climb-in, launch (including with the last shot),
  kicks, damping, fuel and retreat, crashes by contact and fuel, mines not
  crashing it, slow and fast landings, and the landing slide
- pool coverage (55 pooled slots, and the 15 others never touched)
- deterministic dealing, including worms that appear late
- cavern hands (PX's short ranges)
- per-turn ownership and taking weapons back
- a stolen hand usable the same turn and kept afterwards
- friendly kills
- no double transfer
- a worm dying on its own turn

The inventory/rule-event refactor is covered by this mock suite and still
needs an in-game validation after deploying the matching DLL and pack.

### Javelin (prod)

Uses Highlander 0rang3 1.1's weapon record and the sprite-builder edition's
12-frame hold and flight animations. Stock WA flies the projectile. On impact,
Lua thrusts the first worm, mine, crate or oil drum in PX's strict 20-pixel
square, with 20 damage and a quarter of the incoming velocity. Mines handle
the impact through WA's mine handler. The active worm has PX's 25-pixel fallback.

If nothing is hit, `wa.land.stamp` embeds one of the 32 oriented 60×60 frames
into actual terrain. It stays solid, can be walked on and destroyed, and needs
no persistent actor. PX's ratio-based orientation bins are preserved. The
stamp uses source alpha and the colours the terrain already holds; airborne
art uses GPU sheets. Terrain writes and target selection run only during
simulation. The impact sound plays on the turn's worm (PX plays it unplaced):
an explosion's `ev.worm` is the missile's owner, not necessarily a worm.


## Portal Gun

Scales of Justice's slot is PX's Portal Gun. `-` selects orange, `+` blue;
Ctrl or Alt selects the other colour for a shot. New endpoints automatically
select the other colour. Pause/Break toggles the current team's portals.
Ground shots keep WA's charge bar; airborne shots fire at full power, using
Up/Down and Left/Right for PX's eight aim choices. Flight momentum and WA's
collisions continue. Normal stock aim speed is retained (PX's Shift aim-speed
hack is not used).

A team owns one persistent pair. Both endpoints are required for transport.
Placement follows PX's terrain normals and partner exclusion; each two
successful impacts use one ammo, misses refunded. Native firing remains
usable (`handling.ends_turn = false`); placing a pair consumes ammo without ending the
turn. This replaces PX's state/CanFire overrides with a Lua dispatch and
explicit ammo accounting. Portals reactivate at turn start and stop transporting
when retreat ends. Each endpoint stays visible independently of its partner
and activity, including between turns. Missiles, worms, mines, crates, oil drums, arrows
(including Ice Arrow), graves and Bowling Balls can pass. Portal bolts,
Electromagnets and flames do not; the last two were not traversed by PX's
active Portal Gun loop.

`lib/portals.lua` owns pairs, placement, reentry suppression, swept crossings
and clearance. It accepts configurable dimensions, placement offset, grace,
velocity and clearance functions, and a transport callback. Its default
velocity strategy (`lib/portal_velocity.lua`) keeps PX's separate worm and
object rules for all 8 × 8 directions, including their minimum speeds and
facing changes. A transported body remains the same WA object. For a blocked
exit, Lua cuts PX's 15-pixel clearance hole; an exit still blocked is refused.
Swept entry checks also catch fast bodies before native terrain impact.
Bowling Balls adapt their Lua motion model directly before their own sweep.

`lib/portal_effects.lua` ports PX's two-layer plasma trails, 17-spark impact
bursts (47 for rejected placement), three-frame flash, 15-frame ambient
particles and five-particle teleport burst, using its original glow sprites,
sizes, colours, drag, gravity and lifetimes. The team marker uses PX's two
black-mask frames. Particle randomness is confined to looks and consumes no
WA gameplay RNG. Transport activity gates ambience; it never hides endpoints.

Added engine surface:

- `worm:warp{ x, y, vx?, vy?, facing? }`, `object:warp{...}` and
  `actor:warp{...}` atomically move a live body and wake it. Omitted speeds
  retain momentum; facing is supported for worms/actors. A grounded or roped
  worm moving out enters WA's controlled fall; tumble/frozen states remain.
  Returns false for invalid/dead bodies. Clearance is decided by Lua.
- `object:fits(x, y)` uses its own native shape against terrain.
  `worm:fits(x, y, "terrain")` ignores other objects; omitting the mode
  retains the worm's normal collision mask. Portals use terrain-only checks.
- The claim's `airborne = true` (the weapon's own "Fires jumping, falling"
  setting, which a profile may change) enables `on_fire` for synchronized
  Space press edges in flight. The event has `airborne = true`; native
  ammo/turn processing is not invoked. A worm the Swim Suit holds fires
  nothing of it (`worm:take{ fire = ... }`). No aiming or steering physics
  is changed by the verb. Ground `on_fire.power` is normalized charge 0..1.
- `wa.on.body_move(fn, { kinds = {...} })` runs before stock sea, gravity and
  collision. Supported kinds: worm, missile, mine, crate, oil, grave, arrow.
  The callback receives the corresponding handle; warping it makes WA's
  step continue at the new position. Filters avoid Lua calls for other kinds.
- `object.uid` is a per-world construction number, unaffected by allocator
  reuse; the old `object.id` stays compatible. `wa.arrows.all()` enumerates
  live stock arrows. `ctrl`, `minus_key`, `alt`, `pause_key` join synchronized keys.

Tests: `lua mods/px/test_portals.lua`, `lua mods/px/test_pools.lua` (the
pools from each weapon's settings), plus the existing
scheme mock and native Windows engine/Lua tests. The port was playtested in
WA, including endpoint visibility and effects. Replay/network playback is
still unverified.

### Sentry feet, activity and ownership

Both sentries use one persistent actor with an indestructible moving feet mask.
Placement starts where the worm stands, without launch momentum. If another
worm, sentry or terrain blocks that point, it searches visible free points on
4-pixel rings within 64 pixels. The mask keeps clearance for other living worms,
including hidden opponents, while permitting the configured terrain burial.
A blocked search spawns nothing and refunds the native ammo charge.
Only the planter can pass through its new sentry, using
`actor:collision_ignore(worm, true)`. Once its walking-clearance rectangle
clears the feet, Lua restores collision permanently. Passage persists across
turn changes while overlapping, follows the original planter through coalition
capture, and ends if that worm dies or disappears. Shots fired by the planter
while passage is active also pass through those feet: stock guns, native
projectiles and Lua actors inherit the exception. It ends for those shots when
the planter clears the feet. Older shots and other worms' weapons collide
immediately. Real terrain and overlapping masks from other actors remain solid.
The original foot art is unchanged: its bottom
8 pixels have no collision, so the feet sit in the ground while the trimmed
mask can overlap the soil by a further 8 pixels. The support probes sit
beside the buried silhouette so it cannot support itself after terrain is
removed. The feet are drawn behind terrain, which hides the buried pixels.
Worms and weapons collide with the feet; removing the ground beneath them makes
the sentry fall and settle again. Hits retain horizontal and vertical knockback.
Confirmed worm and stock projectile contacts also push the actor, using the
incoming velocity before WA stops or destroys the source. The planter remains
exempt while its temporary passage is active. Sentries slide with ground friction,
fall off ledges and stop at other feet, walls and ceilings. Javelin explicitly
includes sentries in its impact selection (20 damage, quarter incoming velocity),
with no duplicate contact impulse. Contact alone deals no damage. Damage
is counted once and disables the sentry until the next turn. The original
health (Gun 50, Laser 35), ammo and targeting rules remain.

The Gun fires one native stock Uzi round per firing tick through
`wa.weapons.fire_bullet`, with 2 damage and the sentry's existing spread.
WA supplies the Uzi's small impact graphics, terrain hits, directional push
and nearby damage. It traces intervening worms and objects, including allies.
Only the firing sentry's body/feet are excluded from the trace; real terrain
and other sentries remain obstacles. The stock record is captured before
panel overrides, so Highlander's Laser Gun on the Uzi slot does not alter it.
There are no synthetic per-round explosion actors. Casings remain as before.
Hits also affect jumping and flying worms: WA applies the Uzi push and hit
state, which cancels Helicopter steering and restores the worm's body.
If its coalition has no living worm, the Gun retains its colour and ammo but
cannot fire native rounds until a living parent exists (revival or capture).

The added light flashes green while ready, red while tracking or firing, and
grey when empty. It is dark while falling, damaged or holding fire. The head,
barrel and light are visual draw calls that follow the same actor.

Ownership belongs to coalition colour, including allied teams. A Lightning
Strike that directly selects a sentry captures it for the caster's colour at
fire time, preserves its health and ammo, and disables it for the current turn.
A living coalition member supplies WA's required parent for subsequent shots;
the placing worm's death does not change ownership.

The shared `lib/turret.lua` configuration keeps motion in Lua:
`slide_friction = 0.20` pixels/frame per supported frame,
`contact_worm = 0.5` and `contact_projectile = 0.25` incoming velocity multipliers.
Existing `settle_px` and `foot_offsets` still control planting and support.

Sentry targeting ignores terrain inside a circle centred on the barrel pivot,
with radius `muzzle_out + sight_grace_px`. The default `sight_grace_px = 4`
adds four pixels beyond every possible tip position (Gun: 15 pixels total;
Laser: 23.6). Beyond that circle, normal terrain occlusion prevents target
acquisition and tracking. Firing always requires a clear actual muzzle, and
shots still collide with all terrain from that muzzle onward.
