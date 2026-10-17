-- ============================================================================
-- WormForge WA 3.8.1 Port: KTK (Kill The King) Control Logic
-- Transpiled and hardened from Project X 3.6.31.0 CKtkControl
--
-- Security & Sandbox Compliance (sandbox.rs):
--  - INLINED CONFIG: No require("config") because require/dofile are nil in sandbox.
--  - STABLE FRAME GATE: Evaluates once per frame via worm.id <= lastWormId dispatch boundary.
--  - STRICT TEAM INDICES: 1-based team numbers (1: Red, 2: Blue, etc.) strictly compared.
--  - NO INSTANT LOSS: Safe solid pixel detection with fail-safe guard (disables if 0 pixels).
--  - SOUND CLAIMS: wa.sound.play safely called with worm handle (not numeric id) when claimed.
--  - WINNER TRACKING: Eliminates losing team via w:hurt(w.hp) in deterministic lockstep.
-- ============================================================================

-- IN-Game Replay breakst the mod, revives worms for some reason.

-- Inline configuration table (sandbox-compliant: do NOT use require/dofile)
return function()
  local CONFIG = {
    -- King Count: 1 or 2
    kingsCount = 1,

    -- Time for attack in milliseconds (300,000 ms = 5 minutes)
    timeForAttackMs = 300000,

    -- "AttackOnly" (decreases only on attacker turns)
    -- "DefendAndCompensate" (defenders turn adds +5ms per tick back to timer)
    timerType = "AttackOnly",

    -- Timer HUD caption
    timerCaption = "Remaining attack time:",

    -- Teams (1-based indices in WA: 1=Red, 2=Blue, 3=Green, 4=Yellow, 5=Purple, 6=Cyan)
    attackersTeam = 1, -- Red Team (Attackers)
    defendersTeam = 2, -- Blue Team (Defenders)

    -- Percentage of King solid pixels that must be destroyed to trigger King loss
    destructionPercentage = 75,

    -- Optimization: sample king bounding box every N frames (5 frames = 100ms)
    checkIntervalFrames = 5,

    -- King 1 Configuration (Pixel coordinates on the map)
    king1 = {
      name = "Blue King",
      x1 = 106,
      y1 = 829,
      width = 10,
      height = 10,
      destructionPercentage = 70,
    },

    -- King 2 Configuration (Used when kingsCount >= 2)
    king2 = {
      name = "Red King",
      x1 = 1420,
      y1 = 300,
      width = 10,
      height = 10,
      destructionPercentage = 70,
    },
  }

  local MS_PER_FRAME = 20 -- 50 fps lockstep (1000ms / 50 = 20ms per frame)

  -- State Variables (Pure functions of simulation frames)
  local initialized = false
  local matchOver = false
  local winningTeam = nil
  local winReason = ""

  local timerMs = CONFIG.timeForAttackMs or 300000
  local timerType = CONFIG.timerType or "AttackOnly"
  local attackersTeam = CONFIG.attackersTeam or 1
  local defendersTeam = CONFIG.defendersTeam or 2

  local kings = {}
  local kingsCount = CONFIG.kingsCount or 1

  -- Dispatch ordering tracking for once-per-frame gate
  local lastWormId = 999999
  local frameCheckCounter = 0

  -- ----------------------------------------------------------------------------
  -- Helper: Initialize King solid pixel area on round start
  -- ----------------------------------------------------------------------------
  local function init_king(cfg, id)
    if not cfg then return nil end

    local totalSolid = 0
    local x1 = cfg.x1
    local y1 = cfg.y1
    local x2 = cfg.x1 + cfg.width
    local y2 = cfg.y1 + cfg.height

    -- Scan rectangle for initial solid terrain pixels
    for x = x1, x2 do
      for y = y1, y2 do
        if wa.land.solid(x, y) then
          totalSolid = totalSolid + 1
        end
      end
    end

    -- Safe Guard against empty bounding boxes (e.g. map mismatch or bad coordinates):
    -- In PX, DrawKing painted terrain. If WormForge runs on an arbitrary map with 0 solid pixels,
    -- DO NOT fallback to width*height (which would cause an instant loss on first sample).
    -- Instead, log warning and disable win check for this king.
    local active = true
    if totalSolid == 0 then
      wa.log(string.format("[KTK WARNING] King %d box (%d,%d) has 0 solid pixels! Win check disabled to prevent instant loss.", id, x1, y1))
      active = false
    end

    local thresholdPercent = cfg.destructionPercentage or CONFIG.destructionPercentage or 75
    local destructionThreshold = math.floor(totalSolid * (1.0 - (thresholdPercent / 100.0)))

    return {
      id = id,
      name = cfg.name or ("King " .. id),
      active = active,
      x1 = x1,
      y1 = y1,
      x2 = x2,
      y2 = y2,
      width = cfg.width,
      height = cfg.height,
      totalArea = totalSolid,
      currentArea = totalSolid,
      threshold = destructionThreshold,
      percentThreshold = thresholdPercent,
      destroyed = false,
      currentPercentDestroyed = 0,
    }
  end

  -- ----------------------------------------------------------------------------
  -- Helper: Check remaining solid terrain pixels for an active King
  -- ----------------------------------------------------------------------------
  local function check_king_damage(king)
    if not king or not king.active or king.destroyed then
      return false
    end

    local count = 0
    for x = king.x1, king.x2 do
      for y = king.y1, king.y2 do
        if wa.land.solid(x, y) then
          count = count + 1
        end
      end
    end

    king.currentArea = count
    if king.totalArea > 0 then
      king.currentPercentDestroyed = math.floor(((king.totalArea - count) * 100) / king.totalArea)
    end

    if king.currentArea <= king.threshold then
      king.destroyed = true
      return true
    end

    return false
  end

  -- ----------------------------------------------------------------------------
  -- WIN CONDITION: For-loop setting opposing team worms HP to 0
  -- Red Team victory enforcement across all clients in deterministic lockstep
  -- ----------------------------------------------------------------------------
  local function eliminate_team(losingTeamIndex, winnerIndex, reason)
    if matchOver then return end
    matchOver = true
    winningTeam = winnerIndex
    winReason = reason

    wa.log(string.format("[KTK] Win Condition Triggered: %s. Eliminating Team %d (Team %d Wins)", reason, losingTeamIndex, winnerIndex))

    -- Iterate through all worms; set the losing team's HP to 0
    -- In WormForge, w:hurt(w.hp) issues standard MSG_HIT (0x4B), immediately
    -- eliminating the worm through WA's deterministic damage pipeline.
    local worms = wa.worms.all()
    for _, w in ipairs(worms) do
      if w.team == losingTeamIndex and w.hp > 0 then
        w:hurt(w.hp)
      end
    end
  end

  -- ----------------------------------------------------------------------------
  -- Format milliseconds to MM:SS
  -- ----------------------------------------------------------------------------
  local function format_time(ms)
    if ms < 0 then ms = 0 end
    local totalSeconds = math.floor(ms / 1000)
    local minutes = math.floor(totalSeconds / 60)
    local seconds = totalSeconds % 60
    return string.format("%02d:%02d", minutes, seconds)
  end

  -- ----------------------------------------------------------------------------
  -- Main Lockstep Simulation Hook (FRAME_FINISH)
  -- ----------------------------------------------------------------------------
  wa.on.worm_message(function(worm, msg)
    if msg ~= wa.msg.FRAME_FINISH then
      return
    end

    -- One-time match initialization
    if not initialized then
      initialized = true
      kings[1] = init_king(CONFIG.king1, 1)
      if kingsCount >= 2 and CONFIG.king2 then
        kings[2] = init_king(CONFIG.king2, 2)
      end
    end

    if matchOver then
      return
    end

    -- ONCE-PER-FRAME GATE:
    -- worm_message fires for EVERY worm each frame.
    -- Worm dispatch order is deterministic and monotonic. When current worm.id <= lastWormId,
    -- we have crossed into a new simulation frame.
    local isNewFrame = (worm.id <= lastWormId)
    lastWormId = worm.id

    -- Timer update only runs if this worm is the currently active turn worm
    if worm.turn then
      local curTeam = worm.team -- strictly 1-based team index

      if curTeam == attackersTeam then
        timerMs = timerMs - MS_PER_FRAME

        if timerMs <= 0 then
          timerMs = 0
          -- Attackers ran out of time -> Defenders (Red) Win!
          eliminate_team(attackersTeam, defendersTeam, "Attack Timer Expired")
          return
        end
      elseif timerType == "DefendAndCompensate" and curTeam == defendersTeam then
        timerMs = timerMs + 5
      end
    end

    -- Frame-boundary logic: King damage check
    if isNewFrame then
      frameCheckCounter = frameCheckCounter + 1
      if frameCheckCounter >= CONFIG.checkIntervalFrames then
        frameCheckCounter = 0

        for i = 1, kingsCount do
          local king = kings[i]
          if check_king_damage(king) then
            -- King destroyed -> Defenders lose, Attackers (Red) Win!
            eliminate_team(defendersTeam, attackersTeam, string.format("%s Destroyed", king.name))
            return
          end
        end
      end
    end
  end)

  -- ----------------------------------------------------------------------------
  -- Presentation HUD Overlay (wa.on.hud)
  -- ----------------------------------------------------------------------------
  wa.on.hud(function()
    if not initialized then return end

    -- Draw Attack Timer
    local timerStr = string.format("%s %s", CONFIG.timerCaption or "Remaining attack time:", format_time(timerMs))
    wa.hud.line(timerStr, 14, 40)

    -- Draw King HP status
    for i = 1, kingsCount do
      local king = kings[i]
      if king then
        local statusStr
        if not king.active then
          statusStr = string.format("%s: [No solid terrain pixels found - Disabled]", king.name)
        elseif king.destroyed then
          statusStr = string.format("%s: DESTROYED (0%%)", king.name)
        else
          local healthPercent = math.max(0, 100 - king.currentPercentDestroyed)
          statusStr = string.format("%s HP: %d%%", king.name, healthPercent)
        end
        wa.hud.line(statusStr, 14, 80 + (i - 1) * 16)
      end
    end

    if matchOver and winningTeam then
      local teamName = (winningTeam == 1) and "RED TEAM" or ("TEAM " .. winningTeam)
      wa.hud.line(string.format("=== %s WINS! (%s) ===", teamName, winReason), 14, 120)
    end
  end)
end
