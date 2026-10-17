-- Ice Arrow: let WA's ArrowEntity apply the bow hit and its momentum, then
-- freeze the worm on its next frame. PX's CWorm::Message defers SetState in
-- exactly this way, so the hit's native state setup runs first.
local shared = require("lib/shared")
local pending = {} -- stable worm id -> freeze on that worm's next frame

wa.on.hurt(function(hit)
  if hit.phase == "post" and hit.source_weapon == "px.ice_arrow"
    and hit.kind == "hit" then
    pending[hit.worm.id] = true
  end
end)

wa.on.worm_message(function(worm)
  if pending[worm.id] then
    pending[worm.id] = nil
    worm:freeze()
  end
end, { msgs = { wa.msg.FRAME_FINISH } })
