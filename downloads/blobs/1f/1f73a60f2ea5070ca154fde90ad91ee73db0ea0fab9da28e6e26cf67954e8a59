# component_demo

A component bundle (`format_version = 2`): two weapons and an add-on
(feature). Installing it runs nothing; a profile selects what runs. The
profile in `profiles/`, **Demo**, is copied into `WormForge/Profiles` when the mod
loader installs the bundle; pick it in the loader's Profile tab. A profile is a plain TOML file, so it can be written by
hand too:

```toml
features = ["demo.turn_note"]
crates = { weapon = 40, health = 10, utility = 20 }

[weapons]
"demo.big_bazooka" = { row = "F1", column = 1 }
"stock.ninja_rope" = { row = "F8", column = 1 }

[weapon_settings."demo.big_bazooka"]
delay = 1

[options."demo.turn_note"]
show = true
```

**Demo** places **Big Bazooka** (Bazooka with damage 80) on F1 and sets its
delay to 1; `wkLua.log` shows the merged data (`round_start -1, delay 1`) and
the resolved profile (`profile ...` lines). It also places six stock weapons
(`stock.grenade`, `stock.ninja_rope` and so on): WA's own weapons, with the
ammo the profile gives them. The Turn note add-on adds a HUD line while
`show` is on.

The weapon data is written into WA's scheme for the round, whatever scheme
the lobby picked, and a profile with weapons owns the whole panel: every team
starts with infinite Big Bazookas (usable from the second round of turns, a
delay of 1), grenades, shotguns, five ropes and two teleports, and every
other slot is empty and never comes in a crate. Each turn a weapon crate
drops with a 40% chance, a health crate 10% and a utility crate 20% (the
profile's `crates`), whatever the lobby's crate settings.

Rules are add-ons too, so any profile can tick them: Utilities
(`core.utilities`) heals the worm whose turn starts, for one.

**Big Mortar** (Mortar with damage 70, 3 at round start) is in no profile.
Type "mortar" in the Weapons tab's search and double-click it: it goes to its
default position, F1 3. Any weapon may go at any position (the stock slot
there takes it), so moving one onto another's place offers to swap them or
replace the one there.
