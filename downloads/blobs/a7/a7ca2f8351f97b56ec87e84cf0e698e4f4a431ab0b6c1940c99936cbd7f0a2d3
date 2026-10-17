-- Run from the checkout: lua mods/examples/utilities/test_collect_viewer.lua
local path = 'mods/examples/utilities/features/collect_viewer.lua'
local input = assert(io.open(path)):read('*a')
local function near(a, b) assert(math.abs(a-b) < 1e-6, a .. ' ~= ' .. b) end
local function setup(source)
  local frame, owned, hooks, quads, reads = 10, true, {}, {}, 0
  local env = setmetatable({ wa = {
    depth = { FRONT = 0x10000, EFFECTS = 0xC0000, WORMS = 0xD0000, OBJECTS = 0xE0000, TERRAIN = 0x180000, BEHIND_TERRAIN = 0x190000 },
    on = setmetatable({}, {__index = function(_, name)
      assert(name == 'weapon_grant' or name == 'draw')
      return function(fn) hooks[name] = fn end
    end}),
    weapons = { visual = function(weapon)
      return {sprite='another-pack:'..weapon,frame=3,width=24,height=8}
    end },
    world = {
      frame = function() return frame end,
      is_local_alliance = function(a) assert(a == 4); reads=reads+1; return owned end,
    },
    draw = { quad = function(q) quads[#quads+1]=q end },
    log = function() end,
    random = function() error('gameplay RNG used') end,
    actors = setmetatable({}, {__index=function() error('physics used') end}),
  } }, {__index=_G})
  assert(load(source or input, path, 't', env))()
  return {
    grant=function(amount)
      hooks.weapon_grant({x=100,y=200,frame=frame,alliance=4,
        items={{weapon='grenade',amount=amount},{weapon='jet_pack',amount=1}}})
    end,
    draw=function(f,visible)
      frame=f; owned=visible; quads={}; reads=0; hooks.draw(); return quads,reads
    end,
  }
end
local function center(q)
  return (q.points[1][1]+q.points[3][1])/(2), (q.points[1][2]+q.points[3][2])/(2)
end
local v=setup(); v.grant(4)
local start,reads=v.draw(10,true)
assert(#start==5 and reads==1)
-- Two rows, centred independently, with separate positions for every copy.
local expected={58,86,114,142,100}
for n,q in ipairs(start) do
  local x,y=center(q); near(x,expected[n]); near(y,n<=4 and 186 or 214)
  near((q.points[2][1]-q.points[1][1]),24)
  near((q.points[3][2]-q.points[2][2]),8)
  assert(q.sprite=='another-pack:'..(n<=4 and 'grenade' or 'jet_pack'))
  assert(q.frame==3 and q.color==0xffffffff and q.blend=='alpha')
end
local again=v.draw(10,true)
for n,q in ipairs(again) do local x,y=center(q);local a,b=center(start[n]);near(x,a);near(y,b) end
-- Origin stays at the recorded point; one complete sine cycle, deterministic phases.
local opacity = {[24]=255, [25]=255, [26]=252, [50]=170, [75]=85, [99]=3}
for _,age in ipairs({24,25,26,50,75,99}) do
  local drawn=v.draw(10+age,true)
  for n,q in ipairs(drawn) do
    local x,y=center(q);local sx,sy=center(start[n]);local phase=(n%4)*math.pi/2
    near(x,sx+6*(math.sin(2*math.pi*age/100+phase)-math.sin(phase)))
    near(y,sy-48*age/100)
    assert(q.color == opacity[age] * 0x1000000 + 0xffffff)
  end
end
assert(#v.draw(60,false)==0) -- local opponent/spectator or hotseat switched
assert(#v.draw(61,true)==5) -- hidden effects retain age and captured coalition
assert(#v.draw(110,true)==0 and #v.draw(111,true)==0)
-- Configuration actually controls proportional size, motion, spacing, lifetime.
local tuned=input:gsub('size = 24','size = 20'):gsub('rise = 48','rise = 80')
  :gsub('amplitude = 6','amplitude = 3'):gsub('spacing = 28','spacing = 40')
  :gsub('lifetime = 2','lifetime = 1'):gsub('fade = 1.5','fade = 0.5')
local t=setup(tuned);t.grant(1)
local a=t.draw(10,true); local ax,ay=center(a[1]);near(ax,80);near(ay,200)
near((a[1].points[2][1]-a[1].points[1][1]),20)
local b=t.draw(35,true);local bx,by=center(b[1]);near(bx,ax-6);near(by,ay-40)
assert(b[1].color==0xffffffff) -- half of the tuned one-second lifetime
assert(t.draw(36,true)[1].color==0xf5ffffff)
assert(t.draw(59,true)[1].color==0x0affffff)
assert(#t.draw(60,true)==0)
-- Zero fade is an opaque effect until expiration.
local unfaded=setup(input:gsub('fade = 1.5','fade = 0'));unfaded.grant(1)
assert(unfaded.draw(109,true)[1].color==0xffffffff)
assert(#unfaded.draw(110,true)==0)
print('collect_viewer: copies, origins, grid, phases, sizing, pause, visibility, fade and expiry passed')
