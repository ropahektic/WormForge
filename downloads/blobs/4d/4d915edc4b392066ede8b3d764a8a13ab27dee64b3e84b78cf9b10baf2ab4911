-- Highlander: Valyrian Fire (PX weapon_valyrianfire, rafa``2's valyrianfire_s).
local shared = require("lib/shared")
local fires = shared.fires

-- PX's FireFinal: from a worm in the water nothing is thrown and the bottle
-- goes back into the team's ammo; otherwise the bottle starts 15 pixels
-- further along the aim. WA's own projectile from there, so WA flies, burns
-- and explodes it as its Petrol Bomb.
local THROW_OUT = 15

fires.valyrian_fire = function(fire)
  local w = fire.worm
  if w.y >= wa.world.water() then
    -- Set, as the pack always writes ammo; infinite (-1) stays infinite.
    local n = w:ammo("px.valyrian_fire")
    if n >= 0 then w:ammo("px.valyrian_fire", { set = n + 1 }) end
    return
  end
  -- Along the aim, which is the throw's direction. Not PX's cos and sin of
  -- the aim angle: the start is simulation, and only sqrt is exact on
  -- every machine.
  local x, y = fire.x, fire.y
  local speed = math.sqrt(fire.vx * fire.vx + fire.vy * fire.vy)
  if speed > 0 then
    x = x + (THROW_OUT * fire.vx / speed)
    y = y + (THROW_OUT * fire.vy / speed)
  end
  wa.weapons.launch({ weapon = "px.valyrian_fire", owner = w, x = x, y = y, vx = fire.vx, vy = fire.vy })
end

-- PX's ExplodeAt: 51 fires on a 3-pixel ring at the impact, besides WA's own
-- explosion (the record starts no fire of its own: its detonation is 0). Each
-- with PX's CFireDesc: count 0, duration 6000, no upward power, damage 0,
-- owned by the team of the worm whose turn it is. PX's worm handler makes
-- their hits 25% more damaging and knocks twice as hard (its M_GUNEXP,
-- WA's 0x4B from the fire): the engine scales them as it spawns them. PX
-- draws them green, SetColorMod(RGB(75, 225, 75)): `tint`, on the GPU.
--
-- PX places them at x +- 3 cos(360 - 7.2 i), y - 3 sin(360 - 7.2 i), the sign
-- of x alternating. Simulation, so not computed here: the offsets below are
-- that formula's, 16.16, worked out once (cos and sin need not agree to the
-- bit between machines; integers do).
local RING_DX = {
    -0.85107421875, -1.7654266357421875, 2.99908447265625, -1.8835601806640625, -0.7073516845703125, 2.7441864013671875, -2.6315155029296875, 0.45758056640625, 2.0747833251953125, -2.981964111328125,
    1.5533905029296875, 1.091949462890625, -2.8819732666015625, 2.41455078125, -0.055816650390625, -2.3466339111328125, 2.910980224609375, -1.195159912109375, -1.4568328857421875, 2.967681884765625,
    -2.153961181640625, -0.346954345703125, 2.5760955810546875, -2.787384033203125, 0.8153228759765625, 1.795379638671875, -2.9997711181640625, 1.8544464111328125, 0.7434539794921875, -2.7590179443359375,
    2.6134490966796875, -0.4207611083984375, -2.10150146484375, 2.9776611328125, -1.5214385986328125, -1.12652587890625, 2.89208984375, -2.39227294921875, 0.0186004638671875, 2.3696441650390625,
    -2.9017486572265625, 1.1609344482421875, 1.4892425537109375, -2.972900390625, 2.1278839111328125, 0.3838958740234375, -2.594970703125, 2.7734222412109375, -0.779449462890625, -1.8250579833984375,
    3.0,
}
local RING_DY = {
    -2.8767547607421875, -2.425537109375, -0.0744171142578125, 2.3350067138671875, 2.9154205322265625, 1.212188720703125, -1.4405364990234375, -2.96490478515625, -2.1668701171875, 0.3284759521484375,
    2.5665130615234375, 2.794219970703125, 0.833221435546875, -1.7804412841796875, -2.999481201171875, -1.8690338134765625, 0.7254180908203125, 2.7516632080078125, 2.622528076171875, 0.439178466796875,
    -2.0881805419921875, -2.9798736572265625, -1.537445068359375, 1.1092681884765625, 2.8870849609375, 2.4034576416015625, 0.0372161865234375, -2.358184814453125, -2.9064178466796875, -1.178070068359375,
    1.4730682373046875, 2.9703521728515625, 2.140960693359375, -0.3654327392578125, -2.5855865478515625, -2.78045654296875, -0.7974090576171875, 1.8102569580078125, 2.99993896484375, 1.83978271484375,
    -0.761474609375, -2.766265869140625, -2.6042633056640625, -0.40234375, 2.1147308349609375, 2.975341796875, 1.50537109375, -1.1437530517578125, -2.89697265625, -2.3809967041015625,
    0.0,
}
local VALYRIAN_FIRE = {
  count = 0, duration = 6000, up_power = 0, damage = 0, damage_scale = 1.25, knock_scale = 2,
  tint = 0x4BE14B,
}

fires.valyrian_burst = function(ev)
  local owner = shared.current_worm() or ev.worm
  if not owner then return end
  for i = 1, #RING_DX do
    wa.fire.spawn({
      owner = owner, x = ev.x + RING_DX[i], y = ev.y + RING_DY[i],
      count = VALYRIAN_FIRE.count, duration = VALYRIAN_FIRE.duration,
      up_power = VALYRIAN_FIRE.up_power, damage = VALYRIAN_FIRE.damage,
      damage_scale = VALYRIAN_FIRE.damage_scale, knock_scale = VALYRIAN_FIRE.knock_scale,
      tint = VALYRIAN_FIRE.tint,
    })
  end
end
