-- Exercise real POOZ movement through a pixel-valued host mock.
local claim, actor, keys
keys = {}
wa = {
  weapons = { replace = function(spec) claim = spec end },
  actors = { spawn = function(spec)
    actor = { x = spec.x, y = spec.y, vx = spec.vx, vy = spec.vy,
      in_water = function() return false end, look = function() end,
      advance = function() end, despawn = function() end }
    actor.tick = spec.on
  end },
  world = { keys = function() return keys end },
  land = { solid = function(_, y) return y > 100 end },
}
local source = debug.getinfo(1, 'S').source:sub(2):match('^(.*[/\\])') or ''
dofile(source .. 'weapons.lua').install()
local worm = { id = 1, weapon = 'pooz.runner', x = 50.25, y = 100, keys = {},
  carry = function(self, x, y) self.x, self.y = x, y end, drop = function() end }
claim.on_select({ worm = worm })
keys = { right = true }
actor.tick(actor)
assert(actor.vx > 0.08 and actor.vx < 0.10, 'ground acceleration must remain subpixel')
assert(actor.x > 50.25 and actor.x < 50.35, 'origin and motion retain their fractions')
keys = {}
local speed = actor.vx
actor.tick(actor)
assert(actor.vx > 0 and actor.vx < speed, 'ground friction slows gradually')
keys = { jump = true, right = true }
speed = actor.vx
actor.tick(actor)
assert(actor.vy < -5 and actor.vy > -6, 'jump speed remains pixels/frame')
assert(actor.vx > speed and actor.vx < 0.2, 'air acceleration remains subpixel')
assert(worm.x == actor.x and worm.y == actor.y, 'carried worm follows the actor')
print('POOZ: fractional acceleration, friction, jump and carry passed')
