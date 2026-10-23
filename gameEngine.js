/* ==========================================================================
   GAME ENGINE - PVE OVR SYSTEM, SMART BOT AI & EVENT COMBAT
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

// CÔNG THỨC TÍNH CHIẾN LỰC (CP)
function calculateCardCP(card) {
  const starMultiplier = 1 + (card.stars || 0) * 0.15;
  const curAtk = card.baseAtk * starMultiplier;
  const curHp = card.baseHp * starMultiplier;
  const curSpd = card.baseSpd;
  return Math.round(curAtk * 2 + curHp * 0.5 + curSpd * 1.5);
}

// 1. TÍNH TOÁN TEAM OVR & PHÂN BẬC DANH HIỆU PVE
function calculateTeamOVR() {
  const mainCards = gameState.player.deck.main;
  const subCards = gameState.player.deck.sub;

  if (mainCards.length === 0) return 0;

  const mainCpTotal = mainCards.reduce((sum, c) => sum + calculateCardCP(c), 0);
  const avgMainCP = mainCpTotal / mainCards.length;

  let avgSubCP = 0;
  if (subCards.length > 0) {
    const subCpTotal = subCards.reduce((sum, c) => sum + calculateCardCP(c), 0);
    avgSubCP = subCpTotal / subCards.length;
  }

  // 80% từ đội hình chính + 20% từ ghế dự bị
  const ovr = Math.round(avgMainCP * 0.8 + avgSubCP * 0.2);
  return ovr;
}

function getOVRTier(ovr) {
  if (ovr < 500) return { title: 'Tân Binh', color: '#8d99ae' };
  if (ovr < 1500) return { title: 'Chiến Binh Thép', color: '#2ec4b6' };
  if (ovr < 2500) return { title: 'Thợ Săn Hư Không', color: '#3a86ff' };
  if (ovr < 3500) return { title: 'Đại Tướng Bất Bại', color: '#ffbe0b' };
  return { title: 'Huyền Thoại Bất Diệt', color: '#ff007f' };
}

// CẬP NHẬT GIAO DIỆN TOP HUD
function updateTopHUD() {
  document.getElementById('playerDisplayName').textContent = gameState.player.name;
  document.getElementById('playerLevelTag').textContent = `Lv.${gameState.player.level}`;

  const maxExp = gameState.player.level * 175;
  const expPercent = Math.min(100, Math.round((gameState.player.exp / maxExp) * 100));
  document.getElementById('expFill').style.width = `${expPercent}%`;
  document.getElementById('expText').textContent = `${gameState.player.exp}/${maxExp} EXP (${expPercent}%)`;

  const ovr = calculateTeamOVR();
  const tier = getOVRTier(ovr);
  document.getElementById('teamOvrScore').textContent = ovr;
  const tierTag = document.getElementById('teamOvrTierTag');
  tierTag.textContent = tier.title;
  tierTag.style.color = tier.color;
  tierTag.style.borderColor = tier.color;

  document.getElementById('goldDisplay').textContent = gameState.player.gold.toLocaleString('vi-VN');
  document.getElementById('gemDisplay').textContent = gameState.player.gems.toLocaleString('vi-VN');
  document.getElementById('dustDisplay').textContent = gameState.player.normalDust.toLocaleString('vi-VN');
  document.getElementById('superDustDisplay').textContent = gameState.player.superDust.toLocaleString('vi-VN');
  document.getElementById('totalCardsCount').textContent = gameState.player.inventory.length;

  document.getElementById('deckSubCountBadge').textContent = gameState.player.benchCapacity;
  document.getElementById('currentBenchSlotsTxt').textContent = gameState.player.benchCapacity;
  
  const benchCost = gameState.player.benchCapacity * 15;
  document.getElementById('benchUpgradeCostTxt').textContent = gameState.player.benchCapacity >= 10 ? 'Đã đạt tối đa (10 ô)' : `Chi phí: ${benchCost} 💎`;
}

// 2. TẠO THẺ CÓ ĐỘI LỆCH THEO OVR CHO BOT
function generateScaledBotCard(targetCP, rankHint = 'A') {
  const template = ALL_500_CARDS.find(c => c.rank === rankHint) || ALL_500_CARDS[0];
  const elemKeys = ['FIRE', 'ICE', 'THUNDER', 'DARK'];
  const randElem = elemKeys[Math.floor(Math.random() * elemKeys.length)];

  // Quy ngược chỉ số tương ứng theo CP mục tiêu
  // CP = ATK * 2 + HP * 0.5 + SPD * 1.5
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

// 3. TẠO ĐỘI HÌNH BOT (THƯỜNG & GHÉP NHANH CÂN OVR)
function buildBotTeam(botTier, isQuickMatch = false) {
  const cfg = BOT_LEVELS_CONFIG[botTier];
  const playerOvr = Math.max(300, calculateTeamOVR());

  let targetBotOvr = playerOvr;
  if (isQuickMatch) {
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

// 4. BẮT ĐẦU TRẬN ĐẤU (THƯỜNG HOẶC GHÉP NHANH)
function startBattle(tier) {
  initCombatSession(tier, false);
}

function startQuickMatch(tier) {
  initCombatSession(tier, true);
}

function initCombatSession(tier, isQuickMatch) {
  if (gameState.player.deck.main.length === 0) {
    alert('Đội hình chính của bạn chưa có tướng nào! Hãy vào tab "ĐỘI HÌNH & KHO" để xếp quân.');
    return;
  }

  const botData = buildBotTeam(tier, isQuickMatch);

  // Chuẩn bị dàn bài người chơi vào trận
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

  const playerSub = gameState.player.deck.sub.map(c => {
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

// 5. BOSS PHỤ BẢN CO GIÃN THEO OVR (DYNAMIC BOSS SCALING)
function startBossRaid(bossKey) {
  const bossCfg = BOSS_RAIDS_CONFIG[bossKey];
  if (gameState.player.level < bossCfg.minPlayerLevel) {
    alert(`Cần đạt Cấp độ ${bossCfg.minPlayerLevel} để khiêu chiến Boss này!`);
    return;
  }
  if (gameState.player.deck.main.length === 0) {
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

  const playerSub = gameState.player.deck.sub.map(c => {
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

// 6. GIAO DIỆN SÀN ĐẤU & HIỂN THỊ
function renderCombatArena() {
  const c = gameState.combat;
  if (!c) return;

  document.getElementById('turnIndicator').textContent = c.turn === 'PLAYER' ? 'LƯỢT CỦA BẠN' : 'LƯỢT ĐỐI THỦ';
  document.getElementById('turnIndicator').style.background = c.turn === 'PLAYER' ? '#00f2fe' : '#ff0055';
  document.getElementById('botSubCount').textContent = `Dự bị địch: ${c.botSub.length}`;
  document.getElementById('playerBenchCountTxt').textContent = `Dự bị: ${c.playerSub.length}/${gameState.player.benchCapacity}`;

  // Vẽ thẻ bot
  const botRow = document.getElementById('botFieldSlots');
  botRow.innerHTML = '';
  c.botMain.forEach((card, idx) => {
    const cardEl = createCombatCardElement(card, 'BOT', idx);
    if (c.turn === 'PLAYER' && c.selectedAttackerIdx !== null && card.currentHp > 0) {
      cardEl.classList.add('targetable');
      cardEl.onclick = () => playerExecuteAttack(c.selectedAttackerIdx, idx);
    }
    botRow.appendChild(cardEl);
  });

  // Vẽ thẻ người chơi
  const pRow = document.getElementById('playerFieldSlots');
  pRow.innerHTML = '';
  c.playerMain.forEach((card, idx) => {
    const cardEl = createCombatCardElement(card, 'PLAYER', idx);
    if (c.turn === 'PLAYER' && card.currentHp > 0) {
      if (c.selectedAttackerIdx === idx) {
        cardEl.classList.add('selected-attacker');
      }
      cardEl.onclick = () => {
        c.selectedAttackerIdx = idx;
        renderCombatArena();
        logCombat(`Đã chọn [${card.name}] sẵn sàng xuất kích. Hãy bấm vào mục tiêu địch!`);
      };
    }
    pRow.appendChild(cardEl);
  });

  // Vẽ hàng ghế dự bị
  const benchRow = document.getElementById('playerBenchSlots');
  benchRow.innerHTML = '';
  c.playerSub.forEach(card => {
    const bCard = document.createElement('div');
    bCard.className = `bench-card rank-${card.rank.toLowerCase()}`;
    bCard.innerHTML = `
      <div class="card-stars">⭐${card.stars || 0}</div>
      <div class="card-title">${card.name}</div>
      <div style="font-size: 10px; color: #00f2fe;">HP: ${card.currentHp}</div>
    `;
    benchRow.appendChild(bCard);
  });

  updateBuffButtonLabels();
}

function createCombatCardElement(card, side, idx) {
  const el = document.createElement('div');
  el.className = `battle-card rank-${card.rank.toLowerCase()} ${card.currentHp <= 0 ? 'dead' : ''}`;
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

// 7. CƠ CHẾ TẤN CÔNG & ĐÒN KỸ NĂNG EVENT HALLOWEEN CỦA PHE TA
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
  c.activeBuffs.atkBoost = 1.0; // Reset buff công sau khi đánh

  // Soi hệ khắc chế
  if (attacker.elementInfo && attacker.elementInfo.strongAgainst === target.element) {
    baseDmg *= 1.30;
    logCombat(`Khắc chế nguyên tố! Đòn đánh được +30% sát thương!`);
  }

  // A. KỸ NĂNG: DARK LORD (NỤ CƯỜI MA QUÁI - 10%)
  if (attacker.id === 'CARD_EVENT_DARK_LORD' && Math.random() < 0.10) {
    logCombat(`🎃 NỤ CƯỜI MA QUÁI! [Dark Lord] tăng 100% công, quét sạch cả 5 tướng địch và làm đối thủ mất lượt sau!`);
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

  // B. KỸ NĂNG: XINGLENG (TRU DI NGŨ TƯỚNG - 20%)
  if (attacker.id === 'CARD_EVENT_XINGLENG' && Math.random() < 0.20) {
    logCombat(`🔥 TRU DI NGŨ TƯỚNG! [Xingleng] bộc phá đòn chí mạng 170% sức mạnh xuyên giáp!`);
    showMultiHitText('TRU DI CHÍ MẠNG!');
    const critDmg = Math.round(baseDmg * 1.70);
    applyDamageToBot(target, critDmg, attacker);
    finishPlayerAttackAction();
    return;
  }

  // C. KỸ NĂNG: ARMORED DARK XINGLENG (ADX)
  if (attacker.id === 'CARD_EVENT_ADX') {
    // Kiểm tra Tất Sát (~10%)
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
      // Đòn đánh thường truyền xung lực: 100% - 25% - 10% - 5% - 1%
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

    // Cơ chế Siêu Giáp (5% sau khi tấn công)
    if (Math.random() < 0.05) {
      attacker.superArmorActive = true;
      logCombat(`🛡️ SIÊU GIÁP KÍCH HOẠT! [ADX] nhận 25% sát thương và sẵn sàng phản 120% đòn đánh tiếp theo!`);
    }

    finishPlayerAttackAction();
    return;
  }

  // D. ĐÒN ĐÁNH CỦA CÁC TƯỚNG TIÊU CHUẨN (AOE / CLEAVE / SINGLE)
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
    // Đơn mục tiêu + Multi-hit theo tốc độ
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

// 8. BỘ NÃO AI BOT THÔNG MINH THEO CẤP ĐỘ
function botExecuteSmartTurn() {
  const c = gameState.combat;
  if (!c || c.turn !== 'BOT') return;

  // Lọc lính bot còn sống
  const aliveBots = c.botMain.filter(b => b.currentHp > 0);
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

  const alivePlayers = c.playerMain.map((p, idx) => ({ p, idx })).filter(item => item.p.currentHp > 0);
  if (alivePlayers.length === 0) {
    handleBattleDefeat();
    return;
  }

  let chosenTargetItem = null;
  const aiStrategy = c.botConfig ? c.botConfig.aiStrategy : 'RANDOM';

  // CHIẾN THUẬT AI BOT:
  if (aiStrategy === 'FOCUS_FIRE') {
    // Cấp 3: Focus Fire vào tướng thấp máu nhất
    alivePlayers.sort((a, b) => a.p.currentHp - b.p.currentHp);
    chosenTargetItem = alivePlayers[0];
    logCombat(`🎯 AI Focus Fire: Đối thủ nhắm vào [${chosenTargetItem.p.name}] đang yếu máu nhất!`);
  } else if (aiStrategy === 'ELEMENT_COUNTER') {
    // Cấp 4: Tìm tướng bị khắc chế nguyên tố
    const counterItem = alivePlayers.find(item => attacker.elementInfo && attacker.elementInfo.strongAgainst === item.p.element);
    chosenTargetItem = counterItem || alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    if (counterItem) logCombat(`⚡ AI Khắc Hệ: Đối thủ chọn khắc chế tướng hệ [${chosenTargetItem.p.element}]!`);
  } else if (aiStrategy === 'TACTICAL_ASSASSIN') {
    // Cấp 5: Ưu tiên diệt thẻ AOE/CLEAVE của ta trước
    const aoeThreat = alivePlayers.find(item => item.p.targetType === 'AOE' || item.p.targetType === 'CLEAVE');
    if (aoeThreat) {
      chosenTargetItem = aoeThreat;
      logCombat(`🗡️ AI Sát Thủ: Nhắm triệt hạ [${chosenTargetItem.p.name}] để bẻ gãy hỏa lực diện rộng!`);
    } else {
      alivePlayers.sort((a, b) => a.p.currentHp - b.p.currentHp);
      chosenTargetItem = alivePlayers[0];
    }
  } else {
    // Cấp 1-2: Ngẫu nhiên
    chosenTargetItem = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
  }

  const target = chosenTargetItem.p;
  let botDmg = attacker.calcAtk || attacker.baseAtk;

  // Tính khắc hệ cho bot
  if (attacker.elementInfo && attacker.elementInfo.strongAgainst === target.element) {
    botDmg = Math.round(botDmg * 1.30);
  }

  // Kiểm tra Khiên Thần của phe ta
  if (c.activeBuffs.shieldActive) {
    logCombat(`🛡️ Khiên Hộ Thể đã hấp thụ hoàn toàn đòn đánh của [${attacker.name}]!`);
    c.activeBuffs.shieldActive = false;
  } else {
    // Kiểm tra Siêu Giáp của ADX (phe ta)
    if (target.superArmorActive) {
      const realDmg = Math.round(botDmg * 0.25);
      const reflectDmg = Math.round(botDmg * 1.20);
      target.currentHp = Math.max(0, target.currentHp - realDmg);
      target.superArmorActive = false; // Tiêu hao sau khi kích phản
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

  // Chuyển lại lượt cho người chơi
  c.turn = 'PLAYER';
  renderCombatArena();
}

// 9. THAY QUÂN DỰ BỊ TỰ ĐỘNG KHI TỬ TRẬN
function checkFieldReplacements() {
  const c = gameState.combat;
  if (!c) return;

  // Đẩy quân dự bị cho phe ta
  c.playerMain.forEach((card, idx) => {
    if (card.currentHp <= 0 && c.playerSub.length > 0) {
      const subCard = c.playerSub.shift();
      logCombat(`🔄 [${card.name}] tử trận! [${subCard.name}] lập tức từ ghế dự bị tiến lên tiếp chiến!`);
      c.playerMain[idx] = subCard;
    }
  });

  // Đẩy quân dự bị cho phe Bot
  c.botMain.forEach((card, idx) => {
    if (card.currentHp <= 0 && c.botSub.length > 0) {
      const subCard = c.botSub.shift();
      c.botMain[idx] = subCard;
    }
  });
}

// KIỂM TRA THẮNG / THUA
function checkCombatVictory() {
  const c = gameState.combat;
  const botAlive = c.botMain.some(b => b.currentHp > 0) || c.botSub.length > 0;
  const playerAlive = c.playerMain.some(p => p.currentHp > 0) || c.playerSub.length > 0;

  if (!botAlive) {
    handleBattleVictory();
    return true;
  }
  if (!playerAlive) {
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
  gameState.player.exp += rewards.exp;
  gameState.player.gems += rewards.gems || 0;
  gameState.player.normalDust += rewards.dust;
  gameState.player.superDust += rewards.superDust || 0;

  alert(`🏆 THẮNG LỢI!\nNhận thưởng: +${rewards.gold} 🪙 | +${rewards.exp} EXP | +${rewards.dust} 🌟 ${rewards.superDust ? `| +${rewards.superDust} 🌠` : ''}`);
  checkLevelUp();
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
  document.getElementById('battleArenaView').classList.add('hidden');
  document.getElementById('botSelectView').classList.remove('hidden');
  updateTopHUD();
}

// 10. KÍCH HOẠT BUFF TRONG TRẬN
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
  const inv = gameState.player.buffInventory;
  document.getElementById('countBuffHeal').textContent = inv.HEAL || 0;
  document.getElementById('countBuffShield').textContent = inv.SHIELD || 0;
  document.getElementById('countBuffAtk').textContent = inv.OVERLOAD || 0;
  document.getElementById('countBuffSpeed').textContent = inv.HASTE || 0;
}

// 11. GACHA CHIÊU MỘ (BẰNG VÀNG & BẰNG GEMS)
function setPackSize(size) {
  gameState.gachaPackSize = size;
  document.querySelectorAll('.btn-size').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.size) === size);
  });
  updateGachaButtonPrices();
}

function updateGachaButtonPrices() {
  const sz = gameState.gachaPackSize;
  document.getElementById('btnBuyBronze').textContent = `MỞ (${(40 * sz).toLocaleString('vi-VN')} 🪙)`;
  document.getElementById('btnBuySilver').textContent = `MỞ (${(100 * sz).toLocaleString('vi-VN')} 🪙)`;
  document.getElementById('btnBuyGold').textContent = `MỞ (${(250 * sz).toLocaleString('vi-VN')} 🪙)`;
  document.getElementById('btnBuyDiamond').textContent = `MỞ (${(600 * sz).toLocaleString('vi-VN')} 🪙)`;
}

function buyGachaPack(packTierKey) {
  const tierCfg = GACHA_PACK_TIERS[packTierKey];
  const totalCost = tierCfg.costPerCard * gameState.gachaPackSize;

  if (gameState.player.gold < totalCost) {
    alert(`Không đủ Vàng! Cần ${totalCost.toLocaleString('vi-VN')} 🪙 để mở gói này.`);
    return;
  }

  gameState.player.gold -= totalCost;
  updateTopHUD();

  const pulledCards = [];
  for (let i = 0; i < gameState.gachaPackSize; i++) {
    pulledCards.push(rollSingleCard(tierCfg));
  }

  displayGachaRevealView(pulledCards);
}

function buyGemGachaPack(gemTierKey, amount) {
  const tierCfg = GEMS_GACHA_TIERS[gemTierKey];
  const cost = amount === 10 ? tierCfg.pack10DiscountCost : tierCfg.costPerCard * amount;

  if (gameState.player.gems < cost) {
    alert(`Không đủ Tinh Thạch! Cần ${cost} 💎 để mở.`);
    return;
  }

  gameState.player.gems -= cost;
  updateTopHUD();

  const pulledCards = [];
  for (let i = 0; i < amount; i++) {
    pulledCards.push(rollSingleCard(tierCfg));
  }

  displayGachaRevealView(pulledCards);
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

  // Nếu rơi vào nhóm EVENT Halloween
  if (chosenRank === 'EVENT') {
    const eRand = Math.random();
    let eCardId = 'CARD_EVENT_XINGLENG';
    if (eRand < 0.30) eCardId = 'CARD_EVENT_DARK_LORD';
    else if (eRand < 0.70) eCardId = 'CARD_EVENT_XINGLENG';
    else eCardId = 'CARD_EVENT_ADX';

    const baseTemplate = HALLOWEEN_EVENT_CARDS.find(c => c.id === eCardId);
    return createNewCardInstance(baseTemplate);
  }

  // Rút thẻ tiêu chuẩn
  const candidates = ALL_500_CARDS.filter(c => c.rank === chosenRank);
  const selectedTemplate = candidates[Math.floor(Math.random() * candidates.length)];
  return createNewCardInstance(selectedTemplate);
}

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

// HIỂN THỊ MÀN HÌNH LẬT BÀI GACHA
function displayGachaRevealView(cards) {
  document.getElementById('gachaStoreView').classList.add('hidden');
  const revealView = document.getElementById('gachaRevealView');
  revealView.classList.remove('hidden');

  const grid = document.getElementById('cardsRevealGrid');
  grid.innerHTML = '';

  cards.forEach(card => {
    gameState.player.inventory.push(card);
    const wrap = document.createElement('div');
    wrap.className = 'card-3d-wrap';
    wrap.innerHTML = `
      <div class="card-inner">
        <div class="card-back">🎴</div>
        <div class="card-front rank-${card.rank.toLowerCase()}">
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

  document.getElementById('closeRevealBtn').classList.remove('hidden');
}

function skipPackReveal() {
  document.querySelectorAll('.card-3d-wrap').forEach(w => w.classList.add('flipped'));
}

function finishPackOpening() {
  document.getElementById('gachaRevealView').classList.add('hidden');
  document.getElementById('gachaStoreView').classList.remove('hidden');
  renderDeckAndCollection();
  renderForgePickerList();
  updateTopHUD();
}

// 12. CỬA HÀNG TRAO ĐỔI TÀI NGUYÊN (EXCHANGE MARKET)
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
}

// 13. LÒ RÈN & NÂNG SAO THẺ BÀI
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
    box.innerHTML = '<div class="forge-empty-prompt">Bấm "Chọn Rèn" ở danh sách bên phải để đưa thẻ vào lò</div>';
    btnUpgrade.disabled = true;
    btnScrap.disabled = true;
    document.getElementById('scrapValuePreview').textContent = 'Giá trị: - Bụi Sao';
    return;
  }

  const card = gameState.player.inventory.find(c => c.uniqueId === gameState.selectedForgeCardUniqueId);
  if (!card) return;

  const currentStars = card.stars || 0;
  const nextStar = currentStars + 1;
  const scrapVal = CARD_SCRAP_VALUES[card.rank];

  box.innerHTML = `
    <div class="battle-card rank-${card.rank.toLowerCase()}" style="cursor: default;">
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

  document.getElementById('forgeUpgradeTitle').textContent = nextStar <= 7 ? `YÊU CẦU NÂNG CẤP LÊN ${nextStar} SAO ⭐` : 'ĐÃ ĐẠT CỰC HẠN 7 SAO ⭐';
  document.getElementById('scrapValuePreview').textContent = `Nhận: +${scrapVal.normalDust} 🌟 ${scrapVal.superDust ? `| +${scrapVal.superDust} 🌠` : ''}`;

  btnScrap.disabled = false;

  if (nextStar > 7) {
    document.getElementById('reqDust').textContent = 'Đã đạt mốc cao nhất';
    document.getElementById('reqSuperDust').textContent = 'Không cần thêm';
    btnUpgrade.disabled = true;
    return;
  }

  const req = STAR_UPGRADE_REQUIREMENTS[nextStar];
  document.getElementById('reqDust').textContent = `🌟 Bụi Sao Thường: ${gameState.player.normalDust.toLocaleString('vi-VN')} / ${req.normalDust.toLocaleString('vi-VN')}`;
  document.getElementById('reqSuperDust').textContent = req.superDust > 0 ? `🌠 Bụi Sao Siêu Cấp: ${gameState.player.superDust} / ${req.superDust}` : '🌠 Bụi Sao Siêu Cấp: Không cần';

  const canAfford = gameState.player.normalDust >= req.normalDust && gameState.player.superDust >= req.superDust;
  btnUpgrade.disabled = !canAfford;
}

function executeCardUpgrade() {
  const card = gameState.player.inventory.find(c => c.uniqueId === gameState.selectedForgeCardUniqueId);
  if (!card) return;

  const nextStar = (card.stars || 0) + 1;
  const req = STAR_UPGRADE_REQUIREMENTS[nextStar];

  gameState.player.normalDust -= req.normalDust;
  gameState.player.superDust -= req.superDust;
  card.stars = nextStar;

  updateTopHUD();
  renderForgeTargetPanel();
  renderDeckAndCollection();
}

function scrapSelectedCard() {
  const card = gameState.player.inventory.find(c => c.uniqueId === gameState.selectedForgeCardUniqueId);
  if (!card) return;

  const inDeck = gameState.player.deck.main.some(c => c.uniqueId === card.uniqueId) || gameState.player.deck.sub.some(c => c.uniqueId === card.uniqueId);
  if (inDeck) {
    alert('Không thể phân tách thẻ đang nằm trong Đội Hình!');
    return;
  }

  const scrapVal = CARD_SCRAP_VALUES[card.rank];
  if (confirm(`Phân tách [${card.name}] để nhận ${scrapVal.normalDust} 🌟 ${scrapVal.superDust ? `và ${scrapVal.superDust} 🌠` : ''}?`)) {
    gameState.player.normalDust += scrapVal.normalDust;
    gameState.player.superDust += scrapVal.superDust;
    gameState.player.inventory = gameState.player.inventory.filter(c => c.uniqueId !== card.uniqueId);
    gameState.selectedForgeCardUniqueId = null;

    updateTopHUD();
    renderForgeTargetPanel();
    renderForgePickerList();
    renderDeckAndCollection();
  }
}

// 14. PHÂN TÁCH HÀNG LOẠT THEO RANK (MULTI-RANK BATCH SCRAP)
function openBatchScrapModal() {
  document.getElementById('batchScrapModal').classList.remove('hidden');
  updateBatchScrapPreview();
}

function closeBatchScrapModal() {
  document.getElementById('batchScrapModal').classList.add('hidden');
}

function getBatchScrapCandidates() {
  const chkC = document.getElementById('chkScrapC').checked;
  const chkB = document.getElementById('chkScrapB').checked;
  const chkA = document.getElementById('chkScrapA').checked;
  const chkS = document.getElementById('chkScrapS').checked;
  const chkSSS = document.getElementById('chkScrapSSS').checked;

  const equippedIds = new Set([
    ...gameState.player.deck.main.map(c => c.uniqueId),
    ...gameState.player.deck.sub.map(c => c.uniqueId)
  ]);

  return gameState.player.inventory.filter(c => {
    if (c.stars && c.stars > 0) return false; // Khóa bảo vệ thẻ đã có sao
    if (equippedIds.has(c.uniqueId)) return false; // Không chạm thẻ trong đội hình

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
    const val = CARD_SCRAP_VALUES[c.rank];
    totalDust += val.normalDust;
    totalSuperDust += val.superDust;
  });

  document.getElementById('batchScrapCount').textContent = candidates.length;
  document.getElementById('batchDustPreview').textContent = `+${totalDust.toLocaleString('vi-VN')}`;
  document.getElementById('batchSuperDustPreview').textContent = `+${totalSuperDust}`;
  document.getElementById('btnConfirmBatchScrap').disabled = candidates.length === 0;
}

function executeBatchScrap() {
  const candidates = getBatchScrapCandidates();
  if (candidates.length === 0) return;

  const chkSSS = document.getElementById('chkScrapSSS').checked;
  if (chkSSS && candidates.some(c => c.rank === 'SSS')) {
    if (!confirm('CẢNH BÁO: Danh sách tách có chứa thẻ RANK SSS! Bạn có chắc chắn 100% muốn phân tách?')) return;
  }

  let totalDust = 0;
  let totalSuperDust = 0;
  const candidateIds = new Set(candidates.map(c => c.uniqueId));

  candidates.forEach(c => {
    const val = CARD_SCRAP_VALUES[c.rank];
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
  alert(`Đã phân tách thành công ${candidates.length} thẻ!\nThu về: +${totalDust.toLocaleString('vi-VN')} 🌟 | +${totalSuperDust} 🌠`);
}

// 15. BỐ TRÍ ĐỘI HÌNH & TỰ ĐỘNG TỐI ƯU HÓA CP
function autoOptimizeFormation() {
  const sorted = [...gameState.player.inventory].sort((a, b) => calculateCardCP(b) - calculateCardCP(a));

  gameState.player.deck.main = sorted.slice(0, 5);
  gameState.player.deck.sub = sorted.slice(5, 5 + gameState.player.benchCapacity);

  renderDeckAndCollection();
  updateTopHUD();
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
}

function renderDeckAndCollection() {
  // Render Main Deck
  const mainRow = document.getElementById('deckMainRow');
  mainRow.innerHTML = '';
  gameState.player.deck.main.forEach((card, idx) => {
    const el = createDeckCardElement(card, 'MAIN', idx);
    mainRow.appendChild(el);
  });

  // Render Sub Deck
  const subRow = document.getElementById('deckSubRow');
  subRow.innerHTML = '';
  for (let i = 0; i < gameState.player.benchCapacity; i++) {
    const card = gameState.player.deck.sub[i];
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

  // Render Collection
  const grid = document.getElementById('collectionGrid');
  grid.innerHTML = '';
  const filtered = gameState.player.inventory.filter(c => gameState.activeFilterRank === 'ALL' || c.rank === gameState.activeFilterRank);

  filtered.forEach(card => {
    const el = document.createElement('div');
    el.className = `battle-card rank-${card.rank.toLowerCase()}`;
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

function equipToMainDeck(uniqueId) {
  const card = gameState.player.inventory.find(c => c.uniqueId === uniqueId);
  if (!card) return;

  // Nếu đã nằm trong main deck thì bỏ qua
  if (gameState.player.deck.main.some(c => c.uniqueId === uniqueId)) return;

  // Xóa khỏi sub nếu có
  gameState.player.deck.sub = gameState.player.deck.sub.filter(c => c.uniqueId !== uniqueId);

  if (gameState.player.deck.main.length < 5) {
    gameState.player.deck.main.push(card);
  } else {
    gameState.player.deck.main[4] = card; // Thay thế vị trí số 5
  }

  renderDeckAndCollection();
  updateTopHUD();
}

function createDeckCardElement(card, slotType, idx) {
  const el = document.createElement('div');
  el.className = `bench-card rank-${card.rank.toLowerCase()}`;
  el.draggable = true;

  el.innerHTML = `
    <div class="card-stars ${card.stars >= 6 ? 'mythic-stars' : ''}">★ ${card.stars || 0}</div>
    <div class="card-art-emoji" style="font-size: 24px;">${card.elementInfo ? card.elementInfo.icon : '⚔️'}</div>
    <div class="card-title">${card.name}</div>
    <div style="font-size: 10px; color: #ffbe0b;">CP: ${calculateCardCP(card)}</div>
  `;

  // Kéo thả đảo vị trí (Drag and Drop)
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
  list.innerHTML = '';

  const filtered = gameState.player.inventory.filter(c => gameState.activeForgeFilterRank === 'ALL' || c.rank === gameState.activeForgeFilterRank);

  filtered.forEach(card => {
    const item = document.createElement('div');
    item.className = `picker-card-item rank-${card.rank.toLowerCase()} ${card.uniqueId === gameState.selectedForgeCardUniqueId ? 'selected-target' : ''}`;
    item.innerHTML = `
      <div style="font-size: 10px; font-weight: 700;">★ ${card.stars || 0}</div>
      <div style="font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px;">${card.name}</div>
      <button class="btn-select-for-forge" style="margin-top: 4px;" onclick="selectCardForForge('${card.uniqueId}')">Chọn Rèn</button>
    `;
    list.appendChild(item);
  });
}

// 16. TIỆM MUA BUFF TRẬN ĐẤU
function buyBuff(buffKey, gemCost) {
  if (gameState.player.gems < gemCost) return alert(`Không đủ Tinh Thạch! Cần ${gemCost} 💎 để mua.`);
  gameState.player.gems -= gemCost;
  gameState.player.buffInventory[buffKey] = (gameState.player.buffInventory[buffKey] || 0) + 1;
  updateTopHUD();
  updateBuffButtonLabels();
  alert('Đã mua thành công 1 Buff chiến thuật!');
}

// 17. MINIGAME 30 GIÂY CÀY TIỀN & GEMS
let minigameInterval = null;
let minigameTimerSec = 30;
let minigameScore = 0;
let minigameGems = 0;

function startMinigame() {
  const board = document.getElementById('minigameField');
  board.innerHTML = '';

  minigameTimerSec = 30;
  minigameScore = 0;
  minigameGems = 0;
  gameState.minigameActive = true;

  document.getElementById('minigameTimer').textContent = '30s';
  document.getElementById('minigameScore').textContent = '0';
  document.getElementById('minigameGoldEarned').textContent = '0';
  document.getElementById('minigameGemsEarned').textContent = '0';

  minigameInterval = setInterval(() => {
    minigameTimerSec--;
    document.getElementById('minigameTimer').textContent = `${minigameTimerSec}s`;

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
  board.innerHTML = '';

  const randX = Math.floor(Math.random() * (board.clientWidth - 60));
  const randY = Math.floor(Math.random() * (board.clientHeight - 60));

  const target = document.createElement('div');
  const roll = Math.random();

  if (roll < 0.15) {
    // 💎 Gems may mắn
    target.className = 'gem-target';
    target.textContent = '💎';
    target.style.left = `${randX}px`;
    target.style.top = `${randY}px`;
    target.onclick = () => {
      minigameGems++;
      document.getElementById('minigameGemsEarned').textContent = minigameGems;
      target.remove();
    };
  } else if (roll < 0.30) {
    // 💣 Quả bom trừ thời gian
    target.className = 'bomb-target';
    target.textContent = '💣';
    target.style.left = `${randX}px`;
    target.style.top = `${randY}px`;
    target.onclick = () => {
      minigameTimerSec = Math.max(1, minigameTimerSec - 3);
      document.getElementById('minigameTimer').textContent = `${minigameTimerSec}s`;
      target.remove();
    };
  } else {
    // 🪙 Xu vàng tiêu chuẩn
    target.className = 'coin-target';
    target.textContent = '🪙';
    target.style.left = `${randX}px`;
    target.style.top = `${randY}px`;
    target.onclick = () => {
      minigameScore += 10;
      const goldEarned = Math.round(minigameScore * 2.5);
      document.getElementById('minigameScore').textContent = minigameScore;
      document.getElementById('minigameGoldEarned').textContent = goldEarned;
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
  updateTopHUD();

  const board = document.getElementById('minigameField');
  board.innerHTML = `
    <div style="text-align:center;">
      <h3>HẾT GIỜ!</h3>
      <p style="margin: 10px 0;">Thu về: +${totalGoldEarned.toLocaleString('vi-VN')} 🪙 | +${minigameGems} 💎</p>
      <button class="btn-gold" onclick="startMinigame()">CHƠI TIẾP 🪙</button>
    </div>
  `;
}

// 18. LÊN CẤP NGƯỜI CHƠI
function checkLevelUp() {
  const maxExp = gameState.player.level * 175;
  if (gameState.player.exp >= maxExp) {
    gameState.player.exp -= maxExp;
    gameState.player.level++;

    const goldReward = gameState.player.level * 500;
    const gemsReward = gameState.player.level * 5;
    gameState.player.gold += goldReward;
    gameState.player.gems += gemsReward;

    document.getElementById('modalNewLevel').textContent = `CẤP ĐỘ ${gameState.player.level}`;
    document.getElementById('modalLevelRewards').innerHTML = `
      <div>+${goldReward.toLocaleString('vi-VN')} Vàng 🪙</div>
      <div>+${gemsReward} Tinh Thạch 💎</div>
    `;
    document.getElementById('levelUpModal').classList.remove('hidden');
    updateTopHUD();
  }
}

function closeLevelUpModal() {
  document.getElementById('levelUpModal').classList.add('hidden');
}

// 19. HỖ TRỢ HIỆU ỨNG CHIẾN ĐẤU & NHẬT KÝ
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

// ĐIỀU HƯỚNG TABS
document.querySelectorAll('.main-navigation .nav-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.main-navigation .nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    const tabId = btn.dataset.tab;
    document.getElementById(tabId).classList.add('active');
    gameState.currentTab = tabId;

    if (tabId === 'deckTab') renderDeckAndCollection();
    if (tabId === 'forgeTab') {
      renderForgeTargetPanel();
      renderForgePickerList();
    }
  };
});

// KHỞI ĐỘNG GAME LẦN ĐẦU
window.onload = () => {
  // Tặng tân thủ một số thẻ để trải nghiệm
  if (gameState.player.inventory.length === 0) {
    for (let i = 0; i < 7; i++) {
      gameState.player.inventory.push(createNewCardInstance(ALL_500_CARDS[i]));
    }
    autoOptimizeFormation();
  }
  updateTopHUD();
  updateGachaButtonPrices();
};
