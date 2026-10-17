-- Focused Portal Gun simulation tests, from the repo root:
-- lua mods/px/test_portals.lua
local root = HIGHLANDER_ROOT or "mods/px/"
package.path = root .. "?.lua;" .. package.path
local hooks, actors, keys, sounds, worms, draws = {}, {}, {}, {}, {}, {}
local cut, obstruction, solid_exit = 0, false, false
local next_hit
wa = {
    depth = { FRONT = 0x10000, EFFECTS = 0xC0000, WORMS = 0xD0000, OBJECTS = 0xE0000, TERRAIN = 0x180000, BEHIND_TERRAIN = 0x190000 },
  sorted = function(t) local a = {}; for k in pairs(t) do a[#a+1]=k end; table.sort(a); return a end,
  math = { sin = math.sin, cos = math.cos, atan = math.atan },
  world = { keys = function() return keys end, water = function() return 1000 end,
    size = function() return {w=2000,h=1000} end, gravity = function() return (1 / 8) end,
    trace = function() return next_hit end },
  land = { trace = function() return obstruction and {hit=true} or nil end,
    cut = function(s) assert(s.shape=="circle" and s.radius==15); cut=cut+1 end },
  worms = { all = function() return worms end },
  sound = { play = function(target, name)
    assert(target==nil or type(target)=="table")
    assert(type(name)=="string"); sounds[#sounds+1] = name
  end },
  actors = { spawn = function(spec)
    local a = { id = #actors+1, x = spec.x, y = spec.y, on = spec.on }
    function a:scale(v) self.scale_value=v end
    function a:gfx(v) self.gfx_value=v end
    function a:frame(v) self.frame_value=v end
    function a:despawn() self.dead=true end
    actors[#actors+1]=a; return a
  end },
  on = {}, msg = { FRAME_FINISH = 2 },
  draw = { quad = function(q)
    assert(#q.points==4)
    for _, p in ipairs(q.points) do assert(math.abs(p[1])<32000 and math.abs(p[2])<32000) end
    draws[#draws+1]=q
  end },
}
for _, name in ipairs({ "missiles", "mines", "crates", "oil", "graves", "arrows" }) do wa[name]={all=function() return {} end} end
for _, name in ipairs({"body_move", "worm_message", "turn_start", "turn_end", "draw"}) do
  wa.on[name] = function(f, opts) hooks[name] = f; hooks[name .. "_opts"] = opts end
end
local function body(kind, uid, x, y, vx, vy)
  local b = { kind=kind, uid=uid, id=uid, x=x, y=y, vx=vx or 0, vy=vy or 0, facing=1, hp=100 }
  function b:fits(_, _, mode) assert(mode=="terrain"); return not solid_exit end
  function b:warp(s)
    self.warps=(self.warps or 0)+1
    self.x,self.y,self.vx,self.vy=s.x,s.y,s.vx or self.vx,s.vy or self.vy
    self.facing=s.facing or self.facing; return true
  end
  return b
end
local Portals = require("lib/portals")
local velocity = require("lib/portal_velocity")
local function pair(options)
  local n = Portals.new(options)
  assert(n:place(0,1,100,100,-1,0))
  assert(n:place(0,2,400,100,1,0))
  return n
end
local n = pair()
local worm = body("worm", 17,90,100,8,3)
assert(n:move(worm) and worm.x == 410 and worm.vx == 8 and worm.vy == -3)
assert(not n:move(worm), "return suppressed while still inside exit")
worm.x, worm.vx = 450, -10
assert(not n:move(worm))
worm.x=420
assert(n:move(worm) and worm.x==90, "return allowed once body leaves exit")
-- A different body's same raw address must not inherit the old exit lock.
local missile = body("missile", 101,90,100,8,3)
assert(n:move(missile))
local reuse = body("missile", 102,410,100,-8,0)
assert(n:move(reuse))
-- Native IDs are prefixed by kind, since worm ids and actor ids have their
-- own sequences. Dead and taken worms keep their WA handoff.
local other = body("worm",101,90,100,2,0); assert(n:move(other))
other.hp=0; other.x=90; assert(not n:move(other))
other.hp=100; other.taken=true; assert(not n:move(other))
local fast = body("arrow",303,20,100,150,0)
assert(pair():move(fast), "fast arrow intercepted before the wall")
obstruction=true; assert(not pair():move(body("missile",304,20,100,150,0)))
obstruction=false
solid_exit=true; assert(not pair():move(body("crate",305,90,100,0,0)) and cut==1)
solid_exit=false
local fit_calls=0
local clearing=body("oil",306,90,100,0,0)
function clearing:fits(_, _, mode) assert(mode=="terrain"); fit_calls=fit_calls+1; return fit_calls>1 end
assert(pair():move(clearing) and cut==2)
local old = n.pairs[0][1]
assert(n:place(0,1,200,100,-1,0)==old, "relocation retains endpoint identity")
assert(not n:place(0,1,400,100,-1,0), "overlapping partner rejected")
assert(n:place(1,1,200,300,-1,0) and not n.pairs[1][2], "pair belongs to its team")
n:active(0,false); assert(not n:move(body("mine",307,190,100,0,0)))
n:turn_start(); assert(n.pairs[0].active)
n:turn_end(); for _=1,150 do n:tick() end; assert(n.pairs[0].active)
n:tick(); assert(not n.pairs[0].active)
local immediate=pair({grace=0}); immediate:turn_end()
assert(not immediate.pairs[0].active, "zero grace disables transport at retreat end")
-- PX distinguishes the worm's and an object's right->right exit. Its
-- diagonal rules combine momentum; this is not a simple vector rotation.
local x,y,f=velocity("worm",3,3,8,3,1); assert(x==-8 and y==3 and f==-1)
x,y=velocity("missile",3,3,8,3,1); assert(x==-8 and y==-3)
x,y,f=velocity("worm",3,2,8,3,1); assert(x==-4 and y==1 and f==-1)
x,y=velocity("worm",3,3,0,0,1); assert(x==-2)
for entry=1,8 do for exit=1,8 do for _, kind in ipairs({"worm","missile"}) do
  for _, speed in ipairs({{0,0},{8,3},{-7,-11},{1,-1},{40,40}}) do
    x,y,f=velocity(kind,entry,exit,speed[1],speed[2],-1)
    assert(type(x)=="number" and type(y)=="number" and (f==1 or f==-1))
  end
end end end
assert(Portals.direction(0,1)==1 and Portals.direction(-1,0)==3 and Portals.direction(0,-1)==5)
assert(Portals.direction(1,0)==7 and Portals.direction(-.7,.7)==2 and Portals.direction(.7,-.7)==6)
local strategy_calls=0
local custom=pair({velocity=function() strategy_calls=strategy_calls+1; return 3,4,1 end,
  clearance=function() return 600,200 end})
local custom_body=body("actor",909,90,100,0,0)
assert(custom:move(custom_body) and strategy_calls==1 and custom_body.x==600 and custom_body.vx==3)

-- Gun: Space while airborne uses PX's direction keys at full power,
-- retains worm momentum, and captures owner/team/colour per bolt.
local shared=require("lib/shared"); shared.fires={}; shared.current_worm=function() return worms[1] end
require("weapons/portal_gun")
worm=body("worm",17,100,100,4,-6)
worm.team,worm.alliance,worm.weapon,worm.turn,worm.aim=0,0,"px.portal_gun",true,.5
worm.stock=3
function worm:ammo(_,delta) if delta then self.stock=self.stock+delta end; return self.stock end
function worm:air_fire(on) self.air_enabled=on~=false; return true end
worms={worm}
for _, entry in ipairs({{{up=true,left=true},.75},{{down=true,right=true},.175},{{up=true},1},{{down=true},0},{{left=true},.5},{{},.5}}) do
  keys=entry[1]
  local aim=shared.portal_air_aim(worm,keys); assert(aim==entry[2])
  shared.fires.portal_gun({worm=worm,airborne=true})
  assert(worm.vx==4 and worm.vy==-6 and worm.stock==3)
end
keys={plus_key=true}; hooks.worm_message(worm); assert(not worm.air_enabled, "airborne fire is the claim's, not a per-frame call")
shared.fires.portal_gun({worm=worm,airborne=true})
local a=actors[#actors]
-- Replace the trace with a supported terrain hit. The first successful
-- blue placement auto-selects orange, without consuming half a pair's ammo.
next_hit={hit=true,x=300,y=100,nx=-1,ny=0}; obstruction=true
a.on.frame(a); assert(a.dead and shared.portals.pairs[0][2] and worm.stock==3)
local function endpoint(sprite)
  for _, q in ipairs(draws) do if q.sprite=="sprites/portal_gun/"..sprite then return q end end
end
draws={}; hooks.draw()
local single=assert(endpoint("portal_blue.png"), "first endpoint drawn before its partner exists")
assert(single.color==0xFFFFFFFF and single.blend=="add", "single endpoint stays bright")
assert(endpoint("portal_black_mask"), "PX's team marker is drawn")
assert(endpoint("lightning_glow.png"), "PX's impact flash replaces the placeholder halo")
hooks.turn_end(); assert(not shared.portals.pairs[0].active)
worm.turn=false; draws={}; hooks.draw()
assert(endpoint("portal_blue.png").color==single.color, "inactive endpoint keeps its appearance between turns")
assert(not shared.portals:move(body("arrow",999,290,100,2,0)))
worm.turn=true; hooks.turn_start(); assert(shared.portals.pairs[0].active)
keys={ctrl=true}
shared.fires.portal_gun({worm=worm,airborne=true}); a=actors[#actors]
next_hit={hit=true,x=600,y=100,nx=1,ny=0}; a.on.frame(a)
assert(worm.stock==2 and shared.portals.pairs[0][2].draw_x==600, "one-shot Ctrl inversion and pair ammo")
-- Ground charge uses normalized native power; native ammo use is refunded.
keys={}; obstruction=false; next_hit=nil
shared.fires.portal_gun({worm=worm,power=.25}); a=actors[#actors]; worm.stock=worm.stock-1
local before=a.x; a.on.frame(a); assert(math.abs(a.x-before-35*.25)<2 and worm.stock==2)
keys={pause_key=true}; hooks.worm_message(worm); assert(not shared.portals.pairs[0].active)
hooks.worm_message(worm); assert(not shared.portals.pairs[0].active, "Pause is an edge")
keys={}; hooks.worm_message(worm); keys={pause_key=true}; hooks.worm_message(worm)
assert(shared.portals.pairs[0].active)
-- Complete the pair: ambience runs only while transport is active; endpoint
-- art is always submitted. Particle lifetimes/motion stay in Lua looks.
shared.portals:place(0,1,300,100,-1,0)
actors[1].on.frame(actors[1])
draws={}; hooks.draw()
assert(endpoint("portal_orange.png") and endpoint("portal_blue.png"))
local Effects=require("lib/portal_effects")
local fx=Effects.new(); fx:ambient(shared.portals.pairs[0][1]); assert(#fx.particles==1)
assert(fx.particles[1].life==15 and fx.particles[1].gravity==-0.5)
fx:transport(shared.portals.pairs[0][1]); assert(#fx.particles==6)
fx:trail(100,100,2); assert(#fx.particles==8)
fx:impact(100,100,false); assert(#fx.particles==26)
for _=1,40 do fx:tick((1 / 8)) end
assert(#fx.particles==0, "PX effects expire instead of accumulating")
assert(#hooks.body_move_opts.kinds==7, "bolts and magnets excluded from transport")
print("Portal Gun: placement, controls, air aim, transport, visibility across turns and PX effects passed")
