/* ==========================================================================
   GAME ENGINE - PVE OVR SYSTEM, SMART BOT AI & EVENT COMBAT (FULL FIX)
   ========================================================================== */

// TRẠNG THÁI TOÀN CỤC CỦA NGƯỜI CHƠI
let gameState = {
  player: {
    name: 'Chiến Binh Cyber',
    level: 1,
    exp: 0,
    gold: 5000,
    gems: 50,
    normalDust: 2000,
    superDust: 10,
    benchCapacity: 2,
    buffInventory: { HEAL: 2, SHIELD: 1, OVERLOAD: 2, HASTE: 2 },
    deck: {
      main: [], // Tối đa 5 thẻ
      sub: []   // Sức chứa từ 2 đến 10
    },
    inventory: []
  },
  currentTab: 'arenaTab',
  selectedForgeCardUniqueId: null,
  activeFilterRank: 'ALL',
  activeForgeFilterRank: 'ALL',
  gachaPackSize: 25,
  minigameActive: false,
  combat: null
};

// ==================== 1. CÔNG THỨC CHIẾN LỰC (CP) & OVR ====================

function calculateCardCP(card) {
  if (!card) return 0;
  const baseAtk = card.baseAtk || 50;
  const baseHp = card.baseHp || 200;
  const baseSpd = card.baseSpd || 70;
  const stars = card.stars || 0;

  const starMultiplier = 1 + stars * 0.15;
  const curAtk = baseAtk * starMultiplier;
  const curHp = baseHp * starMultiplier;
  const curSpd = baseSpd;

  return Math.round(curAtk * 2 + curHp * 0.5 + curSpd * 1.5);
}

function calculateTeamOVR() {
  const mainCards = (gameState.player.deck && gameState.player.deck.main) ? gameState.player.deck.main : [];
  const subCards = (gameState.player.deck && gameState.player.deck.sub) ? gameState.player.deck.sub : [];

  const validMain = mainCards.filter(c => c != null);
  if (validMain.length === 0) return 0;

  const mainCpTotal = validMain.reduce((sum, c) => sum + calculateCardCP(c), 0);
  const avgMainCP = mainCpTotal / validMain.length;

  let avgSubCP = 0;
  const validSub = subCards.filter(c => c != null);
  if (validSub.length > 0) {
    const subCpTotal = validSub.reduce((sum, c) => sum + calculateCardCP(c), 0);
    avgSubCP = subCpTotal / validSub.length;
  }

  const ovr = Math.round(avgMainCP * 0.8 + avgSubCP * 0.2);
  return isNaN(ovr) ? 0 : ovr;
}

function getOVRTier(ovr) {
  if (ovr < 500) return { title: 'Tân Binh', color: '#8d99ae' };
  if (ovr < 1500) return { title: 'Chiến Binh Thép', color: '#2ec4b6' };
  if (ovr < 2500) return { title: 'Thợ Săn Hư Không', color: '#3a86ff' };
  if (ovr < 3500) return { title: 'Đại Tướng Bất Bại', color: '#ffbe0b' };
  return { title: 'Huyền Thoại Bất Diệt', color: '#ff007f' };
}

// ==================== 2. HUD & CẬP NHẬT GIAO DIỆN (CHỐNG LỖI NULL) ====================

function setElemText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function updateTopHUD() {
  setElemText('playerDisplayName', gameState.player.name);
  setElemText('playerLevelTag', `Lv.${gameState.player.level}`);

  const maxExp = gameState.player.level * 175;
  const expPercent = Math.min(100, Math.round((gameState.player.exp / maxExp) * 100));
  const expFill = document.getElementById('expFill');
  if (expFill) expFill.style.width = `${expPercent}%`;
  setElemText('expText', `${gameState.player.exp}/${maxExp} EXP (${expPercent}%)`);

  const ovr = calculateTeamOVR();
  const tier = getOVRTier(ovr);
  setElemText('teamOvrScore', ovr);

  const tierTag = document.getElementById('teamOvrTierTag');
  if (tierTag) {
    tierTag.textContent = tier.title;
    tierTag.style.color = tier.color;
    tierTag.style.borderColor = tier.color;
  }

  setElemText('goldDisplay', (gameState.player.gold || 0).toLocaleString('vi-VN'));
  setElemText('gemDisplay', (gameState.player.gems || 0).toLocaleString('vi-VN'));
  setElemText('dustDisplay', (gameState.player.normalDust || 0).toLocaleString('vi-VN'));
  setElemText('superDustDisplay', (gameState.player.superDust || 0).toLocaleString('vi-VN'));
  setElemText('totalCardsCount', (gameState.player.inventory || []).length);

  setElemText('deckSubCountBadge', gameState.player.benchCapacity);
  setElemText('currentBenchSlotsTxt', gameState.player.benchCapacity);

  const benchCost = gameState.player.benchCapacity * 15;
  setElemText('benchUpgradeCostTxt', gameState.player.benchCapacity >= 10 ? 'Đã đạt tối đa (10 ô)' : `Chi phí: ${benchCost} 💎`);
}

// Alias để tương thích nếu code cũ còn gọi renderTopHUD
const renderTopHUD = updateTopHUD;

function addPlayerExp(amount) {
  gameState.player.exp += amount;
  checkLevelUp();
  updateTopHUD();
}

function checkLevelUp() {
  const maxExp = gameState.player.level * 175;
  if (gameState.player.exp >= maxExp) {
    gameState.player.exp -= maxExp;
    gameState.player.level++;

    const goldReward = gameState.player.level * 500;
    const gemsReward = gameState.player.level * 5;
    gameState.player.gold += goldReward;
    gameState.player.gems += gemsReward;

    setElemText('modalNewLevel', `CẤP ĐỘ ${gameState.player.level}`);
    const rEl = document.getElementById('modalLevelRewards');
    if (rEl) {
      rEl.innerHTML = `
        <div>+${goldReward.toLocaleString('vi-VN')} Vàng 🪙</div>
        <div>+${gemsReward} Tinh Thạch 💎</div>
      `;
    }
    const modal = document.getElementById('levelUpModal');
    if (modal) modal.classList.remove('hidden');
    updateTopHUD();
  }
}

function closeLevelUpModal() {
  const modal = document.getElementById('levelUpModal');
  if (modal) modal.classList.add('hidden');
}

// ==================== 3. TẠO THẺ & GHÉP NHANH CÂN OVR ====================

function createNewCardInstance(template) {
  return {
    uniqueId: `CARD_UID_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    id: template.id,
    name: template.name,
    rank: template.rank,
    element: template.element,
    elementInfo: template.elementInfo,
    baseAtk: template.baseAtk,
    baseHp: template.baseHp,
    baseSpd: template.baseSpd,
    stars: 0,
    targetType: template.targetType,
    unlockedSkill: template.unlockedSkill
  };
}

function generateScaledBotCard(targetCP, rankHint = 'A') {
  const template = ALL_500_CARDS.find(c => c.rank === rankHint) || ALL_500_CARDS[0];
  const elemKeys = ['FIRE', 'ICE', 'THUNDER', 'DARK'];
  const randElem = elemKeys[Math.floor(Math.random() * elemKeys.length)];

  const baseAtk = Math.max(30, Math.round(targetCP * 0.22));
  const baseHp = Math.max(120, Math.round(targetCP * 0.85));
  const baseSpd = Math.max(50, Math.round(targetCP * 0.12));

  return {
    uniqueId: `BOT_${Math.random().toString(36).substr(2, 9)}`,
    id: template.id,
    name: template.name,
    rank: rankHint,
    element: randElem,
    elementInfo: ELEMENTS[randElem],
    baseAtk: baseAtk,
    baseHp: baseHp,
    baseSpd: baseSpd,
    stars: 0,
    targetType: template.targetType,
    currentHp: baseHp,
    maxHp: baseHp,
    superArmorActive: false,
    skipNextTurn: false
  };
}

function buildBotTeam(botTier, isQuickMatch = false) {
  const cfg = BOT_LEVELS_CONFIG[botTier];
  const playerOvr = Math.max(300, calculateTeamOVR());

  let targetBotOvr = playerOvr;
  if (isQuickMatch && cfg.ovrRatio) {
    const ratio = cfg.ovrRatio[0] + Math.random() * (cfg.ovrRatio[1] - cfg.ovrRatio[0]);
    targetBotOvr = Math.round(playerOvr * ratio);
  }

  const mainTeam = [];
  const subTeam = [];

  for (let i = 0; i < 5; i++) {
    const rank = cfg.cardRanks[Math.floor(Math.random() * cfg.cardRanks.length)];
    mainTeam.push(generateScaledBotCard(targetBotOvr, rank));
  }

  for (let i = 0; i < cfg.subSlots; i++) {
    const rank = cfg.cardRanks[Math.floor(Math.random() * cfg.cardRanks.length)];
    subTeam.push(generateScaledBotCard(Math.round(targetBotOvr * 0.85), rank));
  }

  return { main: mainTeam, sub: subTeam, config: cfg, targetOvr: targetBotOvr };
}

function startBattle(tier) {
  initCombatSession(tier, false);
}

function startQuickMatch(tier) {
  initCombatSession(tier, true);
}

function initCombatSession(tier, isQuickMatch) {
  if (!gameState.player.deck.main || gameState.player.deck.main.length === 0) {
    alert('Đội hình chính của bạn chưa có tướng nào! Hãy vào tab "ĐỘI HÌNH & KHO" để xếp quân.');
    return;
  }

  const botData = buildBotTeam(tier, isQuickMatch);

  const playerMain = gameState.player.deck.main.map(c => {
    const mult = 1 + (c.stars || 0) * 0.15;
    const maxHp = Math.round(c.baseHp * mult);
    return {
      ...c,
      currentHp: maxHp,
      maxHp: maxHp,
      calcAtk: Math.round(c.baseAtk * mult),
      calcSpd: c.baseSpd,
      superArmorActive: false,
      skipNextTurn: false
    };
  });

  const playerSub = (gameState.player.deck.sub || []).map(c => {
    const mult = 1 + (c.stars || 0) * 0.15;
    const maxHp = Math.round(c.baseHp * mult);
    return {
      ...c,
      currentHp: maxHp,
      maxHp: maxHp,
      calcAtk: Math.round(c.baseAtk * mult),
      calcSpd: c.baseSpd,
      superArmorActive: false,
      skipNextTurn: false
    };
  });

  gameState.combat = {
    botTier: tier,
    botConfig: botData.config,
    isBossRaid: false,
    botMain: botData.main,
    botSub: botData.sub,
    playerMain: playerMain,
    playerSub: playerSub,
    turn: 'PLAYER',
    selectedAttackerIdx: null,
    buffCooldowns: { HEAL: 0, SHIELD: 0, OVERLOAD: 0, HASTE: 0 },
    activeBuffs: { shieldActive: false, atkBoost: 1.0, hasteActive: false }
  };

  document.getElementById('botSelectView').classList.add('hidden');
  document.getElementById('battleArenaView').classList.remove('hidden');
  renderCombatArena();
  logCombat(`Trận đấu bắt đầu! Đối thủ: ${botData.config.name} (OVR Bot: ${botData.targetOvr})`);
}

function startBossRaid(bossKey) {
  const bossCfg = BOSS_RAIDS_CONFIG[bossKey];
  if (gameState.player.level < bossCfg.minPlayerLevel) {
    alert(`Cần đạt Cấp độ ${bossCfg.minPlayerLevel} để khiêu chiến Boss này!`);
    return;
  }
  if (!gameState.player.deck.main || gameState.player.deck.main.length === 0) {
    alert('Hãy xếp đội hình chính trước khi khiêu chiến Boss!');
    return;
  }

  const playerOvr = Math.max(400, calculateTeamOVR());
  const bossHp = Math.round(playerOvr * bossCfg.baseHpMultiplier * 5);
  const bossAtk = Math.round(playerOvr * bossCfg.baseAtkMultiplier);

  const bossCard = {
    uniqueId: `BOSS_${bossKey}`,
    id: bossKey,
    name: bossCfg.name,
    rank: 'SSS',
    element: bossCfg.element,
    elementInfo: ELEMENTS[bossCfg.element],
    baseAtk: bossAtk,
    baseHp: bossHp,
    baseSpd: 90,
    stars: 5,
    targetType: 'AOE',
    currentHp: bossHp,
    maxHp: bossHp,
    isWorldBoss: true
  };

  const playerMain = gameState.player.deck.main.map(c => {
    const mult = 1 + (c.stars || 0) * 0.15;
    const maxHp = Math.round(c.baseHp * mult);
    return {
      ...c,
      currentHp: maxHp,
      maxHp: maxHp,
      calcAtk: Math.round(c.baseAtk * mult),
      calcSpd: c.baseSpd,
      superArmorActive: false,
      skipNextTurn: false
    };
  });

  const playerSub = (gameState.player.deck.sub || []).map(c => {
    const mult = 1 + (c.stars || 0) * 0.15;
    const maxHp = Math.round(c.baseHp * mult);
    return {
      ...c,
      currentHp: maxHp,
      maxHp: maxHp,
      calcAtk: Math.round(c.baseAtk * mult),
      calcSpd: c.baseSpd,
      superArmorActive: false,
      skipNextTurn: false
    };
  });

  gameState.combat = {
    isBossRaid: true,
    bossConfig: bossCfg,
    botMain: [bossCard],
    botSub: [],
    playerMain: playerMain,
    playerSub: playerSub,
    turn: 'PLAYER',
    selectedAttackerIdx: null,
    buffCooldowns: { HEAL: 0, SHIELD: 0, OVERLOAD: 0, HASTE: 0 },
    activeBuffs: { shieldActive: false, atkBoost: 1.0, hasteActive: false }
  };

  document.getElementById('botSelectView').classList.add('hidden');
  document.getElementById('battleArenaView').classList.remove('hidden');
  renderCombatArena();
  logCombat(`⚡ CẢNH BÁO BOSS: ${bossCfg.name} xuất hiện với HP: ${bossHp.toLocaleString('vi-VN')}!`);
}

// ==================== 4. SÀN ĐẤU & COMBAT SYSTEM ====================

function renderCombatArena() {
  const c = gameState.combat;
  if (!c) return;

  const tInd = document.getElementById('turnIndicator');
  if (tInd) {
    tInd.textContent = c.turn === 'PLAYER' ? 'LƯỢT CỦA BẠN' : 'LƯỢT ĐỐI THỦ';
    tInd.style.background = c.turn === 'PLAYER' ? '#00f2fe' : '#ff0055';
  }
  setElemText('botSubCount', `Dự bị địch: ${c.botSub.length}`);
  setElemText('playerBenchCountTxt', `Dự bị: ${c.playerSub.length}/${gameState.player.benchCapacity}`);

  const botRow = document.getElementById('botFieldSlots');
  if (botRow) {
    botRow.innerHTML = '';
    c.botMain.forEach((card, idx) => {
      const cardEl = createCombatCardElement(card, 'BOT', idx);
      if (c.turn === 'PLAYER' && c.selectedAttackerIdx !== null && card.currentHp > 0) {
        cardEl.classList.add('targetable');
        cardEl.onclick = () => playerExecuteAttack(c.selectedAttackerIdx, idx);
      }
      botRow.appendChild(cardEl);
    });
  }

  const pRow = document.getElementById('playerFieldSlots');
  if (pRow) {
    pRow.innerHTML = '';
    c.playerMain.forEach((card, idx) => {
      const cardEl = createCombatCardElement(card, 'PLAYER', idx);
      if (c.turn === 'PLAYER' && card.currentHp > 0) {
        if (c.selectedAttackerIdx === idx) cardEl.classList.add('selected-attacker');
        cardEl.onclick = () => {
          c.selectedAttackerIdx = idx;
          renderCombatArena();
          logCombat(`Đã chọn [${card.name}] sẵn sàng xuất kích. Hãy bấm vào mục tiêu địch!`);
        };
      }
      pRow.appendChild(cardEl);
    });
  }

  const benchRow = document.getElementById('playerBenchSlots');
  if (benchRow) {
    benchRow.innerHTML = '';
    c.playerSub.forEach(card => {
      const bCard = document.createElement('div');
      bCard.className = `bench-card rank-${(card.rank || 'c').toLowerCase()}`;
      bCard.innerHTML = `
        <div class="card-stars">⭐${card.stars || 0}</div>
        <div class="card-title">${card.name}</div>
        <div style="font-size: 10px; color: #00f2fe;">HP: ${card.currentHp}</div>
      `;
      benchRow.appendChild(bCard);
    });
  }

  updateBuffButtonLabels();
}

function createCombatCardElement(card, side, idx) {
  const el = document.createElement('div');
  const rankClass = (card.rank || 'c').toLowerCase();
  el.className = `battle-card rank-${rankClass} ${card.currentHp <= 0 ? 'dead' : ''}`;
  const hpPct = Math.max(0, Math.min(100, (card.currentHp / card.maxHp) * 100));

  let armorTag = card.superArmorActive ? '<div style="color: #ffbe0b; font-size: 9px; font-weight: 900;">🛡️ SIÊU GIÁP</div>' : '';
  let skipTag = card.skipNextTurn ? '<div style="color: #ff007f; font-size: 9px; font-weight: 900;">❄️ MẤT LƯỢT</div>' : '';

  el.innerHTML = `
    <div class="card-stars ${card.stars >= 6 ? 'mythic-stars' : ''}">★ ${card.stars || 0}</div>
    <div class="card-art-emoji">${card.elementInfo ? card.elementInfo.icon : '⚔️'}</div>
    <div class="card-title">${card.name}</div>
    ${armorTag}
    ${skipTag}
    <div class="card-hp-bar"><div class="card-hp-fill" style="width: ${hpPct}%;"></div></div>
    <div class="card-combat-stats">
      <span class="atk">⚔️${card.calcAtk || card.baseAtk}</span>
      <span class="spd">⚡${card.calcSpd || card.baseSpd}</span>
      <span style="color:#00f076;">❤️${card.currentHp}/${card.maxHp}</span>
    </div>
  `;
  return el;
}

function playerExecuteAttack(attackerIdx, targetIdx) {
  const c = gameState.combat;
  const attacker = c.playerMain[attackerIdx];
  const target = c.botMain[targetIdx];

  if (!attacker || !target || attacker.currentHp <= 0 || target.currentHp <= 0) return;

  if (attacker.skipNextTurn) {
    logCombat(`[${attacker.name}] đang bị hoảng loạn và mất lượt đánh!`);
    attacker.skipNextTurn = false;
    c.selectedAttackerIdx = null;
    endPlayerTurn();
    return;
  }

  let baseDmg = (attacker.calcAtk || attacker.baseAtk) * c.activeBuffs.atkBoost;
  c.activeBuffs.atkBoost = 1.0;

  if (attacker.elementInfo && attacker.elementInfo.strongAgainst === target.element) {
    baseDmg *= 1.30;
    logCombat(`Khắc chế nguyên tố! Đòn đánh được +30% sát thương!`);
  }

  // A. DARK LORD
  if (attacker.id === 'CARD_EVENT_DARK_LORD' && Math.random() < 0.10) {
    logCombat(`🎃 NỤ CƯỜI MA QUÁI! [Dark Lord] tăng 100% công, quét sạch toàn đội địch và làm đối thủ mất lượt sau!`);
    showMultiHitText('NỤ CƯỜI MA QUÁI!');
    const aoeDmg = Math.round(baseDmg * 2.0);
    c.botMain.forEach(b => {
      if (b.currentHp > 0) {
        applyDamageToBot(b, aoeDmg, attacker);
        b.skipNextTurn = true;
      }
    });
    finishPlayerAttackAction();
    return;
  }

  // B. XINGLENG
  if (attacker.id === 'CARD_EVENT_XINGLENG' && Math.random() < 0.20) {
    logCombat(`🔥 TRU DI NGŨ TƯỚNG! [Xingleng] bộc phá đòn chí mạng 170% sức mạnh xuyên giáp!`);
    showMultiHitText('TRU DI CHÍ MẠNG!');
    const critDmg = Math.round(baseDmg * 1.70);
    applyDamageToBot(target, critDmg, attacker);
    finishPlayerAttackAction();
    return;
  }

  // C. ADX (ARMORED DARK XINGLENG)
  if (attacker.id === 'CARD_EVENT_ADX') {
    if (Math.random() < 0.10) {
      logCombat(`💥 TẤT SÁT BÁT QUÁI CÔN! [ADX] quét diện rộng theo sơ đồ 100-75-50-25%!`);
      showMultiHitText('TẤT SÁT DIỆN RỘNG!');
      const spreadRates = [1.00, 0.75, 0.50, 0.25];
      c.botMain.forEach((b, bIdx) => {
        if (b.currentHp > 0) {
          const dist = Math.abs(bIdx - targetIdx);
          const rate = dist < spreadRates.length ? spreadRates[dist] : 0.10;
          applyDamageToBot(b, Math.round(baseDmg * rate), attacker);
        }
      });
    } else {
      logCombat(`🥢 [ADX] xuất côn truyền lực chấn động dọc đội hình đối thủ!`);
      const chainRates = [1.00, 0.25, 0.10, 0.05, 0.01];
      c.botMain.forEach((b, bIdx) => {
        if (b.currentHp > 0) {
          const dist = Math.abs(bIdx - targetIdx);
          const rate = dist < chainRates.length ? chainRates[dist] : 0.01;
          applyDamageToBot(b, Math.round(baseDmg * rate), attacker);
        }
      });
    }

    if (Math.random() < 0.05) {
      attacker.superArmorActive = true;
      logCombat(`🛡️ SIÊU GIÁP KÍCH HOẠT! [ADX] nhận 25% sát thương và sẵn sàng phản 120% đòn đánh tiếp theo!`);
    }

    finishPlayerAttackAction();
    return;
  }

  // D. THƯỜNG / AOE / CLEAVE
  if (attacker.targetType === 'AOE') {
    logCombat(`[${attacker.name}] tung Tuyệt kỹ Quét Toàn Sàn (AOE)!`);
    c.botMain.forEach(b => {
      if (b.currentHp > 0) applyDamageToBot(b, Math.round(baseDmg * 0.75), attacker);
    });
  } else if (attacker.targetType === 'CLEAVE') {
    logCombat(`[${attacker.name}] chém lan 3 mục tiêu kề nhau (Cleave)!`);
    [-1, 0, 1].forEach(offset => {
      const idx = targetIdx + offset;
      if (idx >= 0 && idx < c.botMain.length && c.botMain[idx].currentHp > 0) {
        applyDamageToBot(c.botMain[idx], Math.round(baseDmg * (offset === 0 ? 1 : 0.5)), attacker);
      }
    });
  } else {
    const hits = c.activeBuffs.hasteActive ? 8 : (attacker.calcSpd > 130 ? 6 : (attacker.calcSpd > 90 ? 3 : 1));
    c.activeBuffs.hasteActive = false;
    if (hits > 1) showMultiHitText(`${hits} HITS COMBO!`);
    const dmgPerHit = Math.round(baseDmg / (hits * 0.7));
    for (let i = 0; i < hits; i++) {
      applyDamageToBot(target, dmgPerHit, attacker);
    }
  }

  finishPlayerAttackAction();
}

function applyDamageToBot(botCard, dmg, attacker) {
  botCard.currentHp = Math.max(0, botCard.currentHp - dmg);
  logCombat(`➔ [${botCard.name}] nhận ${dmg} sát thương từ [${attacker.name}]!`);
}

function finishPlayerAttackAction() {
  const c = gameState.combat;
  c.selectedAttackerIdx = null;
  checkFieldReplacements();
  renderCombatArena();

  if (checkCombatVictory()) return;
  endPlayerTurn();
}

function endPlayerTurn() {
  const c = gameState.combat;
  c.turn = 'BOT';
  renderCombatArena();
  setTimeout(() => botExecuteSmartTurn(), 1000);
}

function botExecuteSmartTurn() {
  const c = gameState.combat;
  if (!c || c.turn !== 'BOT') return;

  const aliveBots = c.botMain.filter(b => b != null && b.currentHp > 0);
  if (aliveBots.length === 0) {
    checkCombatVictory();
    return;
  }

  const attacker = aliveBots[Math.floor(Math.random() * aliveBots.length)];

  if (attacker.skipNextTurn) {
    logCombat(`[${attacker.name}] (Địch) bị dính hiệu ứng hoảng loạn, bỏ qua lượt này!`);
    attacker.skipNextTurn = false;
    c.turn = 'PLAYER';
    renderCombatArena();
    return;
  }

  const alivePlayers = c.playerMain.map((p, idx) => ({ p, idx })).filter(item => item.p != null && item.p.currentHp > 0);
  if (alivePlayers.length === 0) {
    handleBattleDefeat();
    return;
  }

  let chosenTargetItem = null;
  const aiStrategy = c.botConfig ? c.botConfig.aiStrategy : 'RANDOM';

  if (aiStrategy === 'FOCUS_FIRE') {
    alivePlayers.sort((a, b) => a.p.currentHp - b.p.currentHp);
    chosenTargetItem = alivePlayers[0];
    logCombat(`🎯 AI Focus Fire: Đối thủ nhắm vào [${chosenTargetItem.p.name}] đang yếu máu nhất!`);
  } else if (aiStrategy === 'ELEMENT_COUNTER') {
    const counterItem = alivePlayers.find(item => attacker.elementInfo && attacker.elementInfo.strongAgainst === item.p.element);
    chosenTargetItem = counterItem || alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    if (counterItem) logCombat(`⚡ AI Khắc Hệ: Đối thủ chọn khắc chế tướng hệ [${chosenTargetItem.p.element}]!`);
  } else if (aiStrategy === 'TACTICAL_ASSASSIN') {
    const aoeThreat = alivePlayers.find(item => item.p.targetType === 'AOE' || item.p.targetType === 'CLEAVE');
    if (aoeThreat) {
      chosenTargetItem = aoeThreat;
      logCombat(`🗡️ AI Sát Thủ: Nhắm triệt hạ [${chosenTargetItem.p.name}] để bẻ gãy hỏa lực diện rộng!`);
    } else {
      alivePlayers.sort((a, b) => a.p.currentHp - b.p.currentHp);
      chosenTargetItem = alivePlayers[0];
    }
  } else {
    chosenTargetItem = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
  }

  const target = chosenTargetItem.p;
  let botDmg = attacker.calcAtk || attacker.baseAtk;

  if (attacker.elementInfo && attacker.elementInfo.strongAgainst === target.element) {
    botDmg = Math.round(botDmg * 1.30);
  }

  if (c.activeBuffs.shieldActive) {
    logCombat(`🛡️ Khiên Hộ Thể đã hấp thụ hoàn toàn đòn đánh của [${attacker.name}]!`);
    c.activeBuffs.shieldActive = false;
  } else {
    if (target.superArmorActive) {
      const realDmg = Math.round(botDmg * 0.25);
      const reflectDmg = Math.round(botDmg * 1.20);
      target.currentHp = Math.max(0, target.currentHp - realDmg);
      target.superArmorActive = false;
      logCombat(`🛡️ SIÊU GIÁP PHẢN PHÁCH! [ADX] chỉ chịu ${realDmg} sát thương và phản ngược ${reflectDmg} thẳng vào [${attacker.name}]!`);
      attacker.currentHp = Math.max(0, attacker.currentHp - reflectDmg);
    } else {
      target.currentHp = Math.max(0, target.currentHp - botDmg);
      logCombat(`💥 [${attacker.name}] gây ${botDmg} sát thương lên [${target.name}]!`);
    }
  }

  checkFieldReplacements();
  renderCombatArena();

  if (checkCombatVictory()) return;

  c.turn = 'PLAYER';
  renderCombatArena();
}

function checkFieldReplacements() {
  const c = gameState.combat;
  if (!c) return;

  for (let idx = 0; idx < c.playerMain.length; idx++) {
    if (c.playerMain[idx].currentHp <= 0) {
      const nextSubIdx = c.playerSub.findIndex(s => s != null && s.currentHp > 0);
      if (nextSubIdx !== -1) {
        const subCard = c.playerSub.splice(nextSubIdx, 1)[0];
        logCombat(`🔄 [${c.playerMain[idx].name}] tử trận! [${subCard.name}] lập tức lên sàn đấu!`);
        c.playerMain[idx] = subCard;
      }
    }
  }

  for (let idx = 0; idx < c.botMain.length; idx++) {
    if (c.botMain[idx].currentHp <= 0) {
      const nextSubIdx = c.botSub.findIndex(s => s != null && s.currentHp > 0);
      if (nextSubIdx !== -1) {
        const subCard = c.botSub.splice(nextSubIdx, 1)[0];
        c.botMain[idx] = subCard;
      }
    }
  }
}

function checkCombatVictory() {
  const c = gameState.combat;
  if (!c) return false;

  const botAliveOnField = c.botMain.filter(b => b != null && b.currentHp > 0);
  const botHasSubs = (c.botSub || []).filter(b => b != null && b.currentHp > 0).length > 0;
  const isBotAlive = botAliveOnField.length > 0 || botHasSubs;

  const playerAliveOnField = c.playerMain.filter(p => p != null && p.currentHp > 0);
  const playerHasSubs = (c.playerSub || []).filter(p => p != null && p.currentHp > 0).length > 0;
  const isPlayerAlive = playerAliveOnField.length > 0 || playerHasSubs;

  if (!isBotAlive) {
    handleBattleVictory();
    return true;
  }
  if (!isPlayerAlive) {
    handleBattleDefeat();
    return true;
  }
  return false;
}

function handleBattleVictory() {
  const c = gameState.combat;
  logCombat(`🎉 CHIẾN THẮNG TUYỆT ĐỐI!`);

  let rewards = { gold: 200, exp: 100, gems: 2, dust: 50, superDust: 0 };
  if (c.isBossRaid) {
    const bCfg = c.bossConfig.rewards;
    rewards.dust = Math.floor(bCfg.dustMin + Math.random() * (bCfg.dustMax - bCfg.dustMin));
    rewards.superDust = bCfg.superDustMin ? Math.floor(bCfg.superDustMin + Math.random() * (bCfg.superDustMax - bCfg.superDustMin + 1)) : 0;
    rewards.gold = bCfg.gold;
    rewards.exp = bCfg.exp;
  } else if (c.botConfig) {
    rewards = { ...c.botConfig.rewards };
  }

  gameState.player.gold += rewards.gold;
  gameState.player.gems += rewards.gems || 0;
  gameState.player.normalDust += rewards.dust;
  gameState.player.superDust += rewards.superDust || 0;

  alert(`🏆 THẮNG LỢI!\nNhận thưởng: +${rewards.gold} 🪙 | +${rewards.exp} EXP | +${rewards.dust} 🌟 ${rewards.superDust ? `| +${rewards.superDust} 🌠` : ''}`);
  addPlayerExp(rewards.exp);
  returnToArenaLobby();
}

function handleBattleDefeat() {
  logCombat(`💀 ĐỘI HÌNH ĐÃ THẤT THỦ! Hãy cường hóa thêm thẻ bài và nâng Team OVR!`);
  alert('Đội hình của bạn đã bị tiêu diệt hoàn toàn. Hãy quay về rèn sao và bố trí lại!');
  returnToArenaLobby();
}

function surrenderBattle() {
  if (confirm('Bạn có chắc muốn bỏ cuộc trận này không?')) {
    returnToArenaLobby();
  }
}

function returnToArenaLobby() {
  gameState.combat = null;
  const arenaV = document.getElementById('battleArenaView');
  const lobbyV = document.getElementById('botSelectView');
  if (arenaV) arenaV.classList.add('hidden');
  if (lobbyV) lobbyV.classList.remove('hidden');
  updateTopHUD();
}

// ==================== 5. KỸ NĂNG BUFF TRONG TRẬN ====================

function triggerBuff(buffKey) {
  const c = gameState.combat;
  if (!c || c.turn !== 'PLAYER') return;

  const inv = gameState.player.buffInventory;
  if (!inv[buffKey] || inv[buffKey] <= 0) {
    alert('Bạn đã hết loại Buff này! Hãy mua thêm trong Cửa Hàng.');
    return;
  }

  inv[buffKey]--;

  if (buffKey === 'HEAL') {
    c.playerMain.forEach(p => {
      if (p.currentHp > 0) {
        const healAmt = Math.round(p.maxHp * 0.35);
        p.currentHp = Math.min(p.maxHp, p.currentHp + healAmt);
      }
    });
    logCombat(`🧪 Sử dụng Huyết Dược! Hồi 35% HP toàn đội!`);
  } else if (buffKey === 'SHIELD') {
    c.activeBuffs.shieldActive = true;
    logCombat(`🛡️ Đã bật Khiên Hộ Thể! Đòn đánh kế tiếp của địch sẽ bị chặn hoàn toàn!`);
  } else if (buffKey === 'OVERLOAD') {
    c.activeBuffs.atkBoost = 1.60;
    logCombat(`⚡ Bạo Kích Overload! Tăng +60% công kích cho đòn đánh kế tiếp!`);
  } else if (buffKey === 'HASTE') {
    c.activeBuffs.hasteActive = true;
    logCombat(`🌪️ Kích hoạt Thần Tốc! Đòn tiếp theo sẽ xả tối đa 8 cú đánh liên hoàn!`);
  }

  renderCombatArena();
}

function updateBuffButtonLabels() {
  const inv = gameState.player.buffInventory || {};
  setElemText('countBuffHeal', inv.HEAL || 0);
  setElemText('countBuffShield', inv.SHIELD || 0);
  setElemText('countBuffAtk', inv.OVERLOAD || 0);
  setElemText('countBuffSpeed', inv.HASTE || 0);
}

function buyBuff(buffKey, gemCost) {
  if (gameState.player.gems < gemCost) return alert(`Không đủ Tinh Thạch! Cần ${gemCost} 💎 để mua.`);
  gameState.player.gems -= gemCost;
  if (!gameState.player.buffInventory) gameState.player.buffInventory = {};
  gameState.player.buffInventory[buffKey] = (gameState.player.buffInventory[buffKey] || 0) + 1;
  updateTopHUD();
  updateBuffButtonLabels();
  alert('Đã mua thành công 1 Buff chiến thuật!');
}

// ==================== 6. GACHA CHIÊU MỘ (VÀNG & GEMS) ====================

function setPackSize(size) {
  gameState.gachaPackSize = size;
  document.querySelectorAll('.btn-size').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.size) === size);
  });
  updateGachaButtonPrices();
}

function updateGachaButtonPrices() {
  const sz = gameState.gachaPackSize || 1;
  setElemText('btnBuyBronze', `MỞ (${(40 * sz).toLocaleString('vi-VN')} 🪙)`);
  setElemText('btnBuySilver', `MỞ (${(100 * sz).toLocaleString('vi-VN')} 🪙)`);
  setElemText('btnBuyGold', `MỞ (${(250 * sz).toLocaleString('vi-VN')} 🪙)`);
  setElemText('btnBuyDiamond', `MỞ (${(600 * sz).toLocaleString('vi-VN')} 🪙)`);
}

function rollSingleCard(cfg) {
  const rand = Math.random();
  let cumulative = 0;
  let chosenRank = 'C';

  for (const [rank, rate] of Object.entries(cfg.rates)) {
    cumulative += rate;
    if (rand <= cumulative) {
      chosenRank = rank;
      break;
    }
  }

  if (chosenRank === 'EVENT') {
    const eRand = Math.random();
    let eCardId = 'CARD_EVENT_XINGLENG';
    if (eRand < 0.30) eCardId = 'CARD_EVENT_DARK_LORD';
    else if (eRand < 0.70) eCardId = 'CARD_EVENT_XINGLENG';
    else eCardId = 'CARD_EVENT_ADX';

    const baseTemplate = HALLOWEEN_EVENT_CARDS.find(c => c.id === eCardId);
    return createNewCardInstance(baseTemplate);
  }

  const candidates = ALL_500_CARDS.filter(c => c.rank === chosenRank);
  const selectedTemplate = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : ALL_500_CARDS[0];
  return createNewCardInstance(selectedTemplate);
}

function buyGachaPack(packTierKey) {
  const tierCfg = GACHA_PACK_TIERS[packTierKey];
  if (!tierCfg) return;

  const packSize = gameState.gachaPackSize || 1;
  const totalCost = tierCfg.costPerCard * packSize;

  if (gameState.player.gold < totalCost) {
    alert(`Không đủ Vàng! Cần ${totalCost.toLocaleString('vi-VN')} 🪙 để mở gói này.`);
    return;
  }

  gameState.player.gold -= totalCost;
  addPlayerExp(packSize * 5);

  const pulledCards = [];
  for (let i = 0; i < packSize; i++) {
    pulledCards.push(rollSingleCard(tierCfg));
  }

  displayGachaRevealView(pulledCards);
  if (typeof saveLocalState === 'function') saveLocalState();
}

function buyGemGachaPack(gemTierKey, amount) {
  const tierCfg = GEMS_GACHA_TIERS[gemTierKey];
  if (!tierCfg) return;

  const cost = amount === 10 ? tierCfg.pack10DiscountCost : (tierCfg.costPerCard * amount);

  if (gameState.player.gems < cost) {
    alert(`Không đủ Tinh Thạch! Cần ${cost} 💎 để mở gói này.`);
    return;
  }

  gameState.player.gems -= cost;
  addPlayerExp(amount * 15);

  const pulledCards = [];
  for (let i = 0; i < amount; i++) {
    pulledCards.push(rollSingleCard(tierCfg));
  }

  displayGachaRevealView(pulledCards);
  if (typeof saveLocalState === 'function') saveLocalState();
}

function displayGachaRevealView(cards) {
  const storeV = document.getElementById('gachaStoreView');
  const revealV = document.getElementById('gachaRevealView');
  if (storeV) storeV.classList.add('hidden');
  if (revealV) revealV.classList.remove('hidden');

  const grid = document.getElementById('cardsRevealGrid');
  if (!grid) return;
  grid.innerHTML = '';

  cards.forEach(card => {
    gameState.player.inventory.push(card);
    const wrap = document.createElement('div');
    wrap.className = 'card-3d-wrap';
    const rankClass = (card.rank || 'c').toLowerCase();
    wrap.innerHTML = `
      <div class="card-inner">
        <div class="card-back">🎴</div>
        <div class="card-front rank-${rankClass}">
          <div class="card-stars">★ ${card.rank}</div>
          <div class="card-art-emoji">${card.elementInfo ? card.elementInfo.icon : '⚔️'}</div>
          <div class="card-title">${card.name}</div>
          <div style="font-size: 11px; color: #ff5964;">⚔️ ${card.baseAtk}</div>
        </div>
      </div>
    `;
    wrap.onclick = () => wrap.classList.add('flipped');
    grid.appendChild(wrap);
  });

  const closeBtn = document.getElementById('closeRevealBtn');
  if (closeBtn) closeBtn.classList.remove('hidden');
}

function skipPackReveal() {
  document.querySelectorAll('.card-3d-wrap').forEach(w => w.classList.add('flipped'));
}

function finishPackOpening() {
  const revealV = document.getElementById('gachaRevealView');
  const storeV = document.getElementById('gachaStoreView');
  if (revealV) revealV.classList.add('hidden');
  if (storeV) storeV.classList.remove('hidden');
  renderDeckAndCollection();
  renderForgePickerList();
  updateTopHUD();
}

// ==================== 7. CỬA HÀNG TRAO ĐỔI TÀI NGUYÊN (EXCHANGE MARKET) ====================

function exchangeResource(type) {
  const p = gameState.player;

  switch (type) {
    case 'GOLD_TO_GEMS':
      if (p.gold < 10000) return alert('Không đủ 10.000 🪙!');
      p.gold -= 10000; p.gems += 15;
      break;
    case 'GOLD_TO_DUST':
      if (p.gold < 8000) return alert('Không đủ 8.000 🪙!');
      p.gold -= 8000; p.normalDust += 250;
      break;
    case 'GOLD_TO_SUPERDUST':
      if (p.gold < 35000) return alert('Không đủ 35.000 🪙!');
      p.gold -= 35000; p.superDust += 1;
      break;

    case 'GEMS_TO_GOLD':
      if (p.gems < 20) return alert('Không đủ 20 💎!');
      p.gems -= 20; p.gold += 10000;
      break;
    case 'GEMS_TO_DUST':
      if (p.gems < 20) return alert('Không đủ 20 💎!');
      p.gems -= 20; p.normalDust += 500;
      break;
    case 'GEMS_TO_SUPERDUST':
      if (p.gems < 35) return alert('Không đủ 35 💎!');
      p.gems -= 35; p.superDust += 1;
      break;

    case 'DUST_TO_GOLD':
      if (p.normalDust < 500) return alert('Không đủ 500 🌟!');
      p.normalDust -= 500; p.gold += 4000;
      break;
    case 'DUST_TO_GEMS':
      if (p.normalDust < 800) return alert('Không đủ 800 🌟!');
      p.normalDust -= 800; p.gems += 15;
      break;
    case 'DUST_TO_SUPERDUST':
      if (p.normalDust < 1000) return alert('Không đủ 1.000 🌟!');
      p.normalDust -= 1000; p.superDust += 1;
      break;

    case 'SUPERDUST_TO_DUST':
      if (p.superDust < 1) return alert('Không đủ 1 🌠!');
      p.superDust -= 1; p.normalDust += 650;
      break;
    case 'SUPERDUST_TO_GEMS':
      if (p.superDust < 1) return alert('Không đủ 1 🌠!');
      p.superDust -= 1; p.gems += 20;
      break;
    case 'SUPERDUST_TO_GOLD':
      if (p.superDust < 1) return alert('Không đủ 1 🌠!');
      p.superDust -= 1; p.gold += 20000;
      break;
  }

  updateTopHUD();
  if (typeof saveLocalState === 'function') saveLocalState();
}

// ==================== 8. LÒ RÈN & NÂNG SAO THẺ BÀI ====================

let isUpgradingLock = false;

function selectCardForForge(uniqueId) {
  gameState.selectedForgeCardUniqueId = uniqueId;
  renderForgeTargetPanel();
  renderForgePickerList();
}

function renderForgeTargetPanel() {
  const box = document.getElementById('forgeTargetBox');
  const btnUpgrade = document.getElementById('btnExecuteUpgrade');
  const btnScrap = document.getElementById('btnScrapSelectedCard');

  if (!gameState.selectedForgeCardUniqueId) {
    if (box) box.innerHTML = '<div class="forge-empty-prompt">Bấm "Chọn Rèn" ở danh sách bên phải để đưa thẻ vào lò</div>';
    if (btnUpgrade) btnUpgrade.disabled = true;
    if (btnScrap) btnScrap.disabled = true;
    setElemText('scrapValuePreview', 'Giá trị: - Bụi Sao');
    return;
  }

  const card = gameState.player.inventory.find(c => c.uniqueId === gameState.selectedForgeCardUniqueId);
  if (!card) return;

  const currentStars = card.stars || 0;
  const nextStar = currentStars + 1;
  const scrapVal = CARD_SCRAP_VALUES[card.rank] || { normalDust: 15, superDust: 0 };

  if (box) {
    const rankClass = (card.rank || 'c').toLowerCase();
    box.innerHTML = `
      <div class="battle-card rank-${rankClass}" style="cursor: default;">
        <div class="card-stars ${currentStars >= 6 ? 'mythic-stars' : ''}">★ ${currentStars}</div>
        <div class="card-art-emoji">${card.elementInfo ? card.elementInfo.icon : '⚔️'}</div>
        <div class="card-title">${card.name}</div>
        <div class="card-combat-stats">
          <span class="atk">⚔️ ${Math.round(card.baseAtk * (1 + currentStars * 0.15))}</span>
          <span class="spd">⚡ ${card.baseSpd}</span>
        </div>
        <div style="font-size: 10px; color: #ffbe0b;">CP: ${calculateCardCP(card)}</div>
      </div>
    `;
  }

  setElemText('forgeUpgradeTitle', nextStar <= 7 ? `YÊU CẦU NÂNG CẤP LÊN ${nextStar} SAO ⭐` : 'ĐÃ ĐẠT CỰC HẠN 7 SAO ⭐');
  setElemText('scrapValuePreview', `Nhận: +${scrapVal.normalDust} 🌟 ${scrapVal.superDust ? `| +${scrapVal.superDust} 🌠` : ''}`);

  if (btnScrap) btnScrap.disabled = false;

  if (nextStar > 7) {
    setElemText('reqDust', 'Đã đạt mốc cao nhất');
    setElemText('reqSuperDust', 'Không cần thêm');
    if (btnUpgrade) btnUpgrade.disabled = true;
    return;
  }

  const req = STAR_UPGRADE_REQUIREMENTS[nextStar];
  if (!req) return;

  setElemText('reqDust', `🌟 Bụi Sao Thường: ${(gameState.player.normalDust || 0).toLocaleString('vi-VN')} / ${req.normalDust.toLocaleString('vi-VN')}`);
  setElemText('reqSuperDust', req.superDust > 0 ? `🌠 Bụi Sao Siêu Cấp: ${gameState.player.superDust || 0} / ${req.superDust}` : '🌠 Bụi Sao Siêu Cấp: Không cần');

  const canAfford = (gameState.player.normalDust >= req.normalDust) && (gameState.player.superDust >= req.superDust);
  if (btnUpgrade) btnUpgrade.disabled = !canAfford;
}

function executeCardUpgrade() {
  if (isUpgradingLock) return;

  const card = gameState.player.inventory.find(c => c.uniqueId === gameState.selectedForgeCardUniqueId);
  if (!card) return;

  const nextStar = (card.stars || 0) + 1;
  if (nextStar > 7) return;

  const req = STAR_UPGRADE_REQUIREMENTS[nextStar];
  if (!req) return;

  if (gameState.player.normalDust < req.normalDust || gameState.player.superDust < req.superDust) {
    alert('Không đủ Bụi Sao để nâng cấp!');
    renderForgeTargetPanel();
    return;
  }

  isUpgradingLock = true;
  gameState.player.normalDust = Math.max(0, gameState.player.normalDust - req.normalDust);
  gameState.player.superDust = Math.max(0, gameState.player.superDust - req.superDust);
  card.stars = nextStar;

  const updateInDeck = (deckList) => {
    if (!deckList) return;
    const dCard = deckList.find(c => c && c.uniqueId === card.uniqueId);
    if (dCard) dCard.stars = nextStar;
  };
  updateInDeck(gameState.player.deck.main);
  updateInDeck(gameState.player.deck.sub);

  addPlayerExp(nextStar * 20);
  renderForgeTargetPanel();
  renderDeckAndCollection();
  if (typeof saveLocalState === 'function') saveLocalState();

  setTimeout(() => {
    isUpgradingLock = false;
  }, 300);
}

function scrapSelectedCard() {
  const card = gameState.player.inventory.find(c => c.uniqueId === gameState.selectedForgeCardUniqueId);
  if (!card) return;

  const inDeck = (gameState.player.deck.main || []).some(c => c && c.uniqueId === card.uniqueId) || 
                 (gameState.player.deck.sub || []).some(c => c && c.uniqueId === card.uniqueId);
  if (inDeck) {
    alert('Không thể phân tách thẻ đang nằm trong Đội Hình!');
    return;
  }

  const scrapVal = CARD_SCRAP_VALUES[card.rank] || { normalDust: 15, superDust: 0 };
  if (confirm(`Phân tách [${card.name}] để nhận ${scrapVal.normalDust} 🌟 ${scrapVal.superDust ? `và ${scrapVal.superDust} 🌠` : ''}?`)) {
    gameState.player.normalDust += scrapVal.normalDust;
    gameState.player.superDust += scrapVal.superDust;
    gameState.player.inventory = gameState.player.inventory.filter(c => c.uniqueId !== card.uniqueId);
    gameState.selectedForgeCardUniqueId = null;

    updateTopHUD();
    renderForgeTargetPanel();
    renderForgePickerList();
    renderDeckAndCollection();
    if (typeof saveLocalState === 'function') saveLocalState();
  }
}

// ==================== 9. PHÂN TÁCH HÀNG LOẠT (MULTI-RANK BATCH SCRAP) ====================

function openBatchScrapModal() {
  const modal = document.getElementById('batchScrapModal');
  if (modal) {
    modal.classList.remove('hidden');
    updateBatchScrapPreview();
  }
}

function closeBatchScrapModal() {
  const modal = document.getElementById('batchScrapModal');
  if (modal) modal.classList.add('hidden');
}

function getBatchScrapCandidates() {
  const chkC = document.getElementById('chkScrapC')?.checked || false;
  const chkB = document.getElementById('chkScrapB')?.checked || false;
  const chkA = document.getElementById('chkScrapA')?.checked || false;
  const chkS = document.getElementById('chkScrapS')?.checked || false;
  const chkSSS = document.getElementById('chkScrapSSS')?.checked || false;

  const equippedIds = new Set([
    ...(gameState.player.deck.main || []).filter(c => c != null).map(c => c.uniqueId),
    ...(gameState.player.deck.sub || []).filter(c => c != null).map(c => c.uniqueId)
  ]);

  return (gameState.player.inventory || []).filter(c => {
    if (c.stars && c.stars > 0) return false;
    if (equippedIds.has(c.uniqueId)) return false;

    if (c.rank === 'C' && chkC) return true;
    if (c.rank === 'B' && chkB) return true;
    if (c.rank === 'A' && chkA) return true;
    if (c.rank === 'S' && chkS) return true;
    if (c.rank === 'SSS' && chkSSS) return true;
    return false;
  });
}

function updateBatchScrapPreview() {
  const candidates = getBatchScrapCandidates();
  let totalDust = 0;
  let totalSuperDust = 0;

  candidates.forEach(c => {
    const val = CARD_SCRAP_VALUES[c.rank] || { normalDust: 0, superDust: 0 };
    totalDust += val.normalDust;
    totalSuperDust += val.superDust;
  });

  setElemText('batchScrapCount', candidates.length);
  setElemText('batchDustPreview', `+${totalDust.toLocaleString('vi-VN')}`);
  setElemText('batchSuperDustPreview', `+${totalSuperDust}`);

  const btnConfirm = document.getElementById('btnConfirmBatchScrap');
  if (btnConfirm) btnConfirm.disabled = candidates.length === 0;
}

function executeBatchScrap() {
  const candidates = getBatchScrapCandidates();
  if (candidates.length === 0) return;

  const chkSSS = document.getElementById('chkScrapSSS')?.checked;
  if (chkSSS && candidates.some(c => c.rank === 'SSS')) {
    if (!confirm('CẢNH BÁO: Danh sách tách có chứa thẻ RANK SSS! Bạn có chắc chắn 100% muốn phân tách?')) return;
  }

  let totalDust = 0;
  let totalSuperDust = 0;
  const candidateIds = new Set(candidates.map(c => c.uniqueId));

  candidates.forEach(c => {
    const val = CARD_SCRAP_VALUES[c.rank] || { normalDust: 0, superDust: 0 };
    totalDust += val.normalDust;
    totalSuperDust += val.superDust;
  });

  gameState.player.normalDust += totalDust;
  gameState.player.superDust += totalSuperDust;
  gameState.player.inventory = gameState.player.inventory.filter(c => !candidateIds.has(c.uniqueId));

  closeBatchScrapModal();
  updateTopHUD();
  renderForgePickerList();
  renderDeckAndCollection();
  if (typeof saveLocalState === 'function') saveLocalState();
  alert(`Đã phân tách thành công ${candidates.length} thẻ!\nThu về: +${totalDust.toLocaleString('vi-VN')} 🌟 | +${totalSuperDust} 🌠`);
}

// ==================== 10. BỐ TRÍ ĐỘI HÌNH & KHO BÀI ====================

function autoOptimizeFormation() {
  const sorted = [...(gameState.player.inventory || [])].sort((a, b) => calculateCardCP(b) - calculateCardCP(a));
  gameState.player.deck.main = sorted.slice(0, 5);
  gameState.player.deck.sub = sorted.slice(5, 5 + gameState.player.benchCapacity);

  renderDeckAndCollection();
  updateTopHUD();
  if (typeof saveLocalState === 'function') saveLocalState();
  alert('Đã tự động sắp xếp 5 thẻ Tiên Phong và dàn Dự Bị có lực chiến (CP) cao nhất!');
}

function upgradeBenchCapacity() {
  if (gameState.player.benchCapacity >= 10) return alert('Đã đạt số lượng ghế dự bị tối đa (10 ô)!');
  const cost = gameState.player.benchCapacity * 15;
  if (gameState.player.gems < cost) return alert(`Không đủ Tinh Thạch! Cần ${cost} 💎 để mở rộng ô dự bị.`);

  gameState.player.gems -= cost;
  gameState.player.benchCapacity++;
  updateTopHUD();
  renderDeckAndCollection();
  if (typeof saveLocalState === 'function') saveLocalState();
}

function renderDeckAndCollection() {
  const mainRow = document.getElementById('deckMainRow');
  if (mainRow) {
    mainRow.innerHTML = '';
    (gameState.player.deck.main || []).forEach((card, idx) => {
      mainRow.appendChild(createDeckCardElement(card, 'MAIN', idx));
    });
  }

  const subRow = document.getElementById('deckSubRow');
  if (subRow) {
    subRow.innerHTML = '';
    for (let i = 0; i < gameState.player.benchCapacity; i++) {
      const card = (gameState.player.deck.sub || [])[i];
      if (card) {
        subRow.appendChild(createDeckCardElement(card, 'SUB', i));
      } else {
        const emptySlot = document.createElement('div');
        emptySlot.className = 'bench-card';
        emptySlot.style.borderStyle = 'dashed';
        emptySlot.style.opacity = '0.5';
        emptySlot.innerHTML = `<div style="font-size: 10px; color: #7f8b9f; margin-top: 50px;">Ô Trống ${i + 1}</div>`;
        subRow.appendChild(emptySlot);
      }
    }
  }

  const grid = document.getElementById('collectionGrid');
  if (grid) {
    grid.innerHTML = '';
    const filtered = (gameState.player.inventory || []).filter(c => gameState.activeFilterRank === 'ALL' || c.rank === gameState.activeFilterRank);

    filtered.forEach(card => {
      const el = document.createElement('div');
      const rankClass = (card.rank || 'c').toLowerCase();
      el.className = `battle-card rank-${rankClass}`;
      const cp = calculateCardCP(card);

      el.innerHTML = `
        <div class="card-stars ${card.stars >= 6 ? 'mythic-stars' : ''}">★ ${card.stars || 0}</div>
        <div class="card-art-emoji">${card.elementInfo ? card.elementInfo.icon : '⚔️'}</div>
        <div class="card-title">${card.name}</div>
        <div class="card-combat-stats">
          <span class="atk">⚔️ ${Math.round(card.baseAtk * (1 + (card.stars || 0) * 0.15))}</span>
          <span class="spd">⚡ ${card.baseSpd}</span>
        </div>
        <div style="font-size: 10px; color: #ffbe0b;">CP: ${cp}</div>
        <button class="btn-select-for-forge" style="margin-top: 4px;" onclick="equipToMainDeck('${card.uniqueId}')">Trang Bị</button>
      `;
      grid.appendChild(el);
    });
  }
}

function equipToMainDeck(uniqueId) {
  const card = gameState.player.inventory.find(c => c.uniqueId === uniqueId);
  if (!card) return;

  if (gameState.player.deck.main.some(c => c && c.uniqueId === uniqueId)) return;

  gameState.player.deck.sub = gameState.player.deck.sub.filter(c => c && c.uniqueId !== uniqueId);

  if (gameState.player.deck.main.length < 5) {
    gameState.player.deck.main.push(card);
  } else {
    gameState.player.deck.main[4] = card;
  }

  renderDeckAndCollection();
  updateTopHUD();
  if (typeof saveLocalState === 'function') saveLocalState();
}

function createDeckCardElement(card, slotType, idx) {
  const el = document.createElement('div');
  const rankClass = (card.rank || 'c').toLowerCase();
  el.className = `bench-card rank-${rankClass}`;
  el.draggable = true;

  el.innerHTML = `
    <div class="card-stars ${card.stars >= 6 ? 'mythic-stars' : ''}">★ ${card.stars || 0}</div>
    <div class="card-art-emoji" style="font-size: 24px;">${card.elementInfo ? card.elementInfo.icon : '⚔️'}</div>
    <div class="card-title">${card.name}</div>
    <div style="font-size: 10px; color: #ffbe0b;">CP: ${calculateCardCP(card)}</div>
  `;

  el.ondragstart = (e) => e.dataTransfer.setData('text/plain', JSON.stringify({ slotType, idx }));
  el.ondragover = (e) => e.preventDefault();
  el.ondrop = (e) => {
    e.preventDefault();
    const src = JSON.parse(e.dataTransfer.getData('text/plain'));
    swapDeckCards(src, { slotType, idx });
  };

  return el;
}

function swapDeckCards(src, dest) {
  const srcList = src.slotType === 'MAIN' ? gameState.player.deck.main : gameState.player.deck.sub;
  const destList = dest.slotType === 'MAIN' ? gameState.player.deck.main : gameState.player.deck.sub;

  const temp = srcList[src.idx];
  srcList[src.idx] = destList[dest.idx];
  destList[dest.idx] = temp;

  renderDeckAndCollection();
  updateTopHUD();
  if (typeof saveLocalState === 'function') saveLocalState();
}

function filterCards(rank) {
  gameState.activeFilterRank = rank;
  document.querySelectorAll('.filter-group .filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.includes(rank === 'ALL' ? 'Tất Cả' : rank));
  });
  renderDeckAndCollection();
}

function filterForgeCards(rank) {
  gameState.activeForgeFilterRank = rank;
  document.querySelectorAll('.forge-filter-row .filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.includes(rank === 'ALL' ? 'Tất Cả' : rank));
  });
  renderForgePickerList();
}

function renderForgePickerList() {
  const list = document.getElementById('forgeCardsPicker');
  if (!list) return;
  list.innerHTML = '';

  const filtered = (gameState.player.inventory || []).filter(c => gameState.activeForgeFilterRank === 'ALL' || c.rank === gameState.activeForgeFilterRank);

  filtered.forEach(card => {
    const item = document.createElement('div');
    const rankClass = (card.rank || 'c').toLowerCase();
    item.className = `picker-card-item rank-${rankClass} ${card.uniqueId === gameState.selectedForgeCardUniqueId ? 'selected-target' : ''}`;
    item.innerHTML = `
      <div style="font-size: 10px; font-weight: 700;">★ ${card.stars || 0}</div>
      <div style="font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px;">${card.name}</div>
      <button class="btn-select-for-forge" style="margin-top: 4px;" onclick="selectCardForForge('${card.uniqueId}')">Chọn Rèn</button>
    `;
    list.appendChild(item);
  });
}

// ==================== 11. MINIGAME 30 GIÂY ====================

let minigameInterval = null;
let minigameTimerSec = 30;
let minigameScore = 0;
let minigameGems = 0;

function startMinigame() {
  const board = document.getElementById('minigameField');
  if (!board) return;
  board.innerHTML = '';

  minigameTimerSec = 30;
  minigameScore = 0;
  minigameGems = 0;
  gameState.minigameActive = true;

  setElemText('minigameTimer', '30s');
  setElemText('minigameScore', '0');
  setElemText('minigameGoldEarned', '0');
  setElemText('minigameGemsEarned', '0');

  minigameInterval = setInterval(() => {
    minigameTimerSec--;
    setElemText('minigameTimer', `${minigameTimerSec}s`);

    if (minigameTimerSec <= 0) {
      endMinigame();
    } else {
      spawnMinigameTargets();
    }
  }, 1000);

  spawnMinigameTargets();
}

function spawnMinigameTargets() {
  if (!gameState.minigameActive) return;
  const board = document.getElementById('minigameField');
  if (!board) return;
  board.innerHTML = '';

  const randX = Math.floor(Math.random() * (board.clientWidth - 60));
  const randY = Math.floor(Math.random() * (board.clientHeight - 60));

  const target = document.createElement('div');
  const roll = Math.random();

  if (roll < 0.15) {
    target.className = 'gem-target';
    target.textContent = '💎';
    target.style.left = `${randX}px`;
    target.style.top = `${randY}px`;
    target.onclick = () => {
      minigameGems++;
      setElemText('minigameGemsEarned', minigameGems);
      target.remove();
    };
  } else if (roll < 0.30) {
    target.className = 'bomb-target';
    target.textContent = '💣';
    target.style.left = `${randX}px`;
    target.style.top = `${randY}px`;
    target.onclick = () => {
      minigameTimerSec = Math.max(1, minigameTimerSec - 3);
      setElemText('minigameTimer', `${minigameTimerSec}s`);
      target.remove();
    };
  } else {
    target.className = 'coin-target';
    target.textContent = '🪙';
    target.style.left = `${randX}px`;
    target.style.top = `${randY}px`;
    target.onclick = () => {
      minigameScore += 10;
      const goldEarned = Math.round(minigameScore * 2.5);
      setElemText('minigameScore', minigameScore);
      setElemText('minigameGoldEarned', goldEarned);
      target.remove();
      spawnMinigameTargets();
    };
  }

  board.appendChild(target);
}

function endMinigame() {
  clearInterval(minigameInterval);
  gameState.minigameActive = false;
  const totalGoldEarned = Math.round(minigameScore * 2.5);

  gameState.player.gold += totalGoldEarned;
  gameState.player.gems += minigameGems;
  addPlayerExp(Math.round(totalGoldEarned * 0.1));

  const board = document.getElementById('minigameField');
  if (board) {
    board.innerHTML = `
      <div style="text-align:center;">
        <h3>HẾT GIỜ!</h3>
        <p style="margin: 10px 0;">Thu về: +${totalGoldEarned.toLocaleString('vi-VN')} 🪙 | +${minigameGems} 💎</p>
        <button class="btn-gold" onclick="startMinigame()">CHƠI TIẾP 🪙</button>
      </div>
    `;
  }
}

// ==================== 12. LOG COMBAT & HIỆU ỨNG ====================

function logCombat(msg) {
  const logEl = document.getElementById('combatLogText');
  if (logEl) logEl.textContent = msg;
}

function showMultiHitText(text) {
  const popup = document.getElementById('multiHitBurst');
  if (!popup) return;
  popup.textContent = text;
  popup.classList.remove('hidden');
  setTimeout(() => popup.classList.add('hidden'), 900);
}

// ==================== 13. ĐIỀU HƯỚNG TABS & KHỞI TẠO ====================

document.querySelectorAll('.main-navigation .nav-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.main-navigation .nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    const tabId = btn.dataset.tab;
    const targetPane = document.getElementById(tabId);
    if (targetPane) targetPane.classList.add('active');
    gameState.currentTab = tabId;

    if (tabId === 'deckTab') renderDeckAndCollection();
    if (tabId === 'forgeTab') {
      renderForgeTargetPanel();
      renderForgePickerList();
    }
  };
});

window.onload = () => {
  if (!gameState.player.inventory || gameState.player.inventory.length === 0) {
    for (let i = 0; i < 7; i++) {
      if (ALL_500_CARDS[i]) {
        gameState.player.inventory.push(createNewCardInstance(ALL_500_CARDS[i]));
      }
    }
    autoOptimizeFormation();
  }
  updateTopHUD();
  updateGachaButtonPrices();
};
