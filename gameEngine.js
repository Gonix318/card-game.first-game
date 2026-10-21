/* ==========================================================================
   GAME ENGINE - CORE MECHANICS & LOGIC CYBER CARD LEGENDS
   ========================================================================== */

// 1. TRẠNG THÁI TOÀN CỤC CỦA NGƯỜI CHƠI (PLAYER STATE)
const gameState = {
  player: {
    name: 'Tân Thủ Cyber',
    level: 1,
    exp: 0,
    maxExp: 175,
    gold: 1500,
    gems: 60,
    dust: 150,
    awakenStones: 0,
    mythicStones: 0,
    unlockedSSS: 0, // Số thẻ SSS sở hữu (MockAPI number)
    hasGodCard: false,
    bossDefeated: false
  },
  inventory: [], // Danh sách thẻ sở hữu: [{ cardId, instanceId, stars, currentHp }]
  deck: {
    main: [], // Tối đa 5 thẻ tiên phong
    sub: []   // Tối đa 2 thẻ dự bị
  },
  buffsOwned: {
    HEAL: 3,
    SHIELD: 2,
    OVERLOAD: 4,
    HASTE: 2
  },
  buffCooldowns: {
    HEAL: 0,
    SHIELD: 0,
    OVERLOAD: 0,
    HASTE: 0
  },
  selectedPackSize: 3,
  forgeSelectedInstanceId: null,

  // Trạng thái trận đấu
  battle: {
    active: false,
    isPlayerTurn: true,
    attackerIndex: null,
    hasSwappedThisTurn: false,
    activeBuffs: {
      shield: false,
      overload: false,
      haste: false
    },
    enemyType: null, // 'BOT' hoặc 'BOSS'
    botLevel: 1,
    bossConfig: null,
    playerCombatTeam: [], // 5 thẻ trên sân
    playerCombatBench: [], // 2 thẻ dự bị
    enemyCombatTeam: [],
    enemyCombatBench: []
  }
};

// ==================== 2. KHỞI CHẠY GAME & LƯU TRỮ LOCAL ====================
window.addEventListener('DOMContentLoaded', () => {
  loadLocalGameData();
  setupTabsNavigation();
  initStarterCardsIfEmpty();
  renderTopHUD();
  renderFormationDeck();
  renderCollection();
  startCooldownTimerLoop();
});

function loadLocalGameData() {
  const saved = localStorage.getItem('CYBER_CARD_SAVE');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(gameState.player, parsed.player || {});
      gameState.inventory = parsed.inventory || [];
      gameState.deck = parsed.deck || { main: [], sub: [] };
      gameState.buffsOwned = parsed.buffsOwned || gameState.buffsOwned;
    } catch (e) {
      console.warn('Lỗi đọc dữ liệu local:', e);
    }
  }
}

function saveGameData() {
  localStorage.setItem('CYBER_CARD_SAVE', JSON.stringify({
    player: gameState.player,
    inventory: gameState.inventory,
    deck: gameState.deck,
    buffsOwned: gameState.buffsOwned
  }));
  // Đồng bộ MockAPI nếu có networkSync.js
  if (typeof syncPlayerDataToMockAPI === 'function') {
    syncPlayerDataToMockAPI();
  }
}

// Khởi tạo 7 thẻ mặc định cho tân thủ nếu chưa có bài
function initStarterCardsIfEmpty() {
  if (gameState.inventory.length === 0) {
    // Tặng 5 thẻ C và 2 thẻ B
    const starterCards = ALL_500_CARDS.filter(c => c.rank === 'C').slice(0, 5);
    const starterB = ALL_500_CARDS.filter(c => c.rank === 'B').slice(0, 2);
    const initialPool = [...starterCards, ...starterB];

    initialPool.forEach(baseCard => {
      const inst = createCardInstance(baseCard.id, 0);
      gameState.inventory.push(inst);
    });

    gameState.deck.main = gameState.inventory.slice(0, 5).map(c => c.instanceId);
    gameState.deck.sub = gameState.inventory.slice(5, 7).map(c => c.instanceId);
    saveGameData();
  }
}

function createCardInstance(cardId, stars = 0) {
  return {
    instanceId: 'INST_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
    cardId: cardId,
    stars: stars
  };
}

function getCardBase(cardId) {
  return ALL_500_CARDS.find(c => c.id === cardId);
}

// Tính chỉ số thực tế sau khi cộng dồn Sao (+15% mỗi sao)
function getComputedStats(instance) {
  const base = getCardBase(instance.cardId);
  if (!base) return { atk: 10, hp: 50, spd: 50, maxHp: 50 };
  const starMultiplier = 1 + (instance.stars * 0.15);
  const maxHp = Math.floor(base.baseHp * starMultiplier);
  const atk = Math.floor(base.baseAtk * starMultiplier);
  const spd = Math.floor(base.baseSpd * starMultiplier);

  return {
    ...base,
    stars: instance.stars,
    maxHp: maxHp,
    atk: atk,
    spd: spd
  };
}

// ==================== 3. HỆ THỐNG LEVEL & KINH NGHIỆM ====================
function addPlayerExp(amount) {
  gameState.player.exp += amount;
  while (gameState.player.exp >= gameState.player.maxExp) {
    gameState.player.exp -= gameState.player.maxExp;
    gameState.player.level++;
    gameState.player.maxExp = Math.floor(gameState.player.level * 150 + Math.pow(gameState.player.level, 2) * 25);
    showLevelUpModal(gameState.player.level);
  }
  renderTopHUD();
  saveGameData();
}

function showLevelUpModal(newLv) {
  const rewardGold = newLv * 300;
  const rewardGems = 15;
  const rewardDust = newLv * 50;

  gameState.player.gold += rewardGold;
  gameState.player.gems += rewardGems;
  gameState.player.dust += rewardDust;

  document.getElementById('modalNewLevel').innerText = `Lv.${newLv}`;
  document.getElementById('modalLevelRewards').innerHTML = `
    <div>🪙 +${rewardGold.toLocaleString()} Vàng</div>
    <div>💎 +${rewardGems} Tinh Thạch</div>
    <div>🌟 +${rewardDust} Bụi Sao</div>
    <div style="color: #00f2fe; margin-top:8px;">Toàn đội hình nhận thêm +1% chỉ số vĩnh viễn!</div>
  `;
  document.getElementById('levelUpModal').classList.remove('hidden');
}

function closeLevelUpModal() {
  document.getElementById('levelUpModal').classList.add('hidden');
  renderTopHUD();
}

// ==================== 4. GIAO DIỆN & TABS ====================
function setupTabsNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');

      if (targetId === 'deckTab') {
        renderFormationDeck();
        renderCollection();
      } else if (targetId === 'forgeTab') {
        renderForgeCardList();
      }
    });
  });
}

function renderTopHUD() {
  document.getElementById('playerDisplayName').innerText = gameState.player.name;
  document.getElementById('playerLevelTag').innerText = `Lv.${gameState.player.level}`;
  
  const expPercent = Math.min(100, Math.floor((gameState.player.exp / gameState.player.maxExp) * 100));
  document.getElementById('expFill').style.width = `${expPercent}%`;
  document.getElementById('expText').innerText = `${gameState.player.exp}/${gameState.player.maxExp} EXP (${expPercent}%)`;

  document.getElementById('goldDisplay').innerText = gameState.player.gold.toLocaleString();
  document.getElementById('gemDisplay').innerText = gameState.player.gems.toLocaleString();
  document.getElementById('dustDisplay').innerText = gameState.player.dust.toLocaleString();
  document.getElementById('awakenStoneDisplay').innerText = gameState.player.awakenStones;
  document.getElementById('mythicStoneDisplay').innerText = gameState.player.mythicStones;
  document.getElementById('totalCardsCount').innerText = gameState.inventory.length;

  document.getElementById('countBuffHeal').innerText = gameState.buffsOwned.HEAL;
  document.getElementById('countBuffShield').innerText = gameState.buffsOwned.SHIELD;
  document.getElementById('countBuffAtk').innerText = gameState.buffsOwned.OVERLOAD;
  document.getElementById('countBuffSpeed').innerText = gameState.buffsOwned.HASTE;
}

// ==================== 5. GACHA SYSTEM & 4 PHẨM CẤP GÓI ====================
function setPackSize(size) {
  gameState.selectedPackSize = size;
  document.querySelectorAll('.btn-size').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.getAttribute('data-size')) === size);
  });

  // Cập nhật giá trên các nút
  const bCost = GACHA_PACK_TIERS.BRONZE.costPerCard * size;
  const sCost = GACHA_PACK_TIERS.SILVER.costPerCard * size;
  const gCost = GACHA_PACK_TIERS.GOLD.costPerCard * size;
  const dCost = GACHA_PACK_TIERS.DIAMOND.costPerCard * size;

  document.getElementById('btnBuyBronze').innerText = `MỞ (${bCost.toLocaleString()} 🪙)`;
  document.getElementById('btnBuySilver').innerText = `MỞ (${sCost.toLocaleString()} 🪙)`;
  document.getElementById('btnBuyGold').innerText = `MỞ (${gCost.toLocaleString()} 🪙)`;
  document.getElementById('btnBuyDiamond').innerText = `MỞ (${dCost.toLocaleString()} 🪙)`;
}

function buyGachaPack(packTierKey) {
  const packTier = GACHA_PACK_TIERS[packTierKey];
  const totalCost = packTier.costPerCard * gameState.selectedPackSize;

  if (gameState.player.gold < totalCost) {
    alert('Không đủ Vàng để mở gói này! Hãy cày thêm ở Đấu Trường hoặc Minigame.');
    return;
  }

  gameState.player.gold -= totalCost;
  addPlayerExp(gameState.selectedPackSize * 10);
  renderTopHUD();

  // Bốc thẻ theo ma trận tỷ lệ
  const drawnCards = [];
  const ranksOpened = [];

  for (let i = 0; i < gameState.selectedPackSize; i++) {
    const rolledRank = rollRankFromRates(packTier.rates);
    ranksOpened.push(rolledRank);
    const pool = ALL_500_CARDS.filter(c => c.rank === rolledRank);
    const chosenBase = pool[Math.floor(Math.random() * pool.length)];
    const inst = createCardInstance(chosenBase.id, 0);

    gameState.inventory.push(inst);
    drawnCards.push({ instance: inst, base: chosenBase });

    if (rolledRank === 'SSS') {
      gameState.player.unlockedSSS++;
      triggerGlobalAlert(`ĐẠI KỲ TÍCH: Người chơi ${gameState.player.name} vừa thức tỉnh THẦN THOẠI [${chosenBase.name}]!`);
    }
  }

  saveGameData();
  renderPackRevealView(drawnCards, ranksOpened);
}

function rollRankFromRates(rates) {
  const rand = Math.random();
  let cumulative = 0;

  for (const [rank, prob] of Object.entries(rates)) {
    cumulative += prob;
    if (rand <= cumulative) return rank;
  }
  return 'C';
}

function renderPackRevealView(drawnCards, ranksOpened) {
  document.getElementById('gachaStoreView').classList.add('hidden');
  const revealView = document.getElementById('gachaRevealView');
  revealView.classList.remove('hidden');

  const grid = document.getElementById('cardsRevealGrid');
  grid.innerHTML = '';
  document.getElementById('closeRevealBtn').classList.add('hidden');

  drawnCards.forEach((item, idx) => {
    const cWrap = document.createElement('div');
    cWrap.className = 'card-3d-wrap';
    cWrap.innerHTML = `
      <div class="card-inner">
        <div class="card-back">🎴</div>
        <div class="card-front rank-${item.base.rank.toLowerCase()}">
          <div class="card-rank-tag">${item.base.rank}</div>
          <div class="card-element-icon">${item.base.elementInfo.icon}</div>
          <div class="card-name">${item.base.name}</div>
          <div class="card-stats-row">
            <span class="atk">⚔️ ${item.base.baseAtk}</span>
            <span class="hp">🩸 ${item.base.baseHp}</span>
          </div>
        </div>
      </div>
    `;

    cWrap.addEventListener('click', () => {
      cWrap.classList.add('flipped');
      checkAllCardsFlipped();
    });

    grid.appendChild(cWrap);
  });

  // Kiểm tra Combo Đồng Rank
  checkAndTriggerComboBanner(ranksOpened);
}

function skipPackReveal() {
  document.querySelectorAll('.card-3d-wrap').forEach(wrap => wrap.classList.add('flipped'));
  document.getElementById('closeRevealBtn').classList.remove('hidden');
}

function checkAllCardsFlipped() {
  const allCards = document.querySelectorAll('.card-3d-wrap');
  const flipped = document.querySelectorAll('.card-3d-wrap.flipped');
  if (allCards.length === flipped.length) {
    document.getElementById('closeRevealBtn').classList.remove('hidden');
  }
}

function finishPackOpening() {
  document.getElementById('gachaRevealView').classList.add('hidden');
  document.getElementById('gachaStoreView').classList.remove('hidden');
  renderTopHUD();
}

function checkAndTriggerComboBanner(ranks) {
  const counts = {};
  ranks.forEach(r => counts[r] = (counts[r] || 0) + 1);

  let comboMsg = null;
  if (counts['SSS'] >= 3) {
    comboMsg = { title: 'THẦN MA GIÁNG THẾ', sub: 'Mở được từ 3 thẻ SSS trở lên trong một gói!' };
  } else if (Object.values(counts).some(cnt => cnt >= 10)) {
    comboMsg = { title: 'THẬP TOÀN THẬP MỸ', sub: '10 Thẻ Đồng Rank Xuất Hiện!' };
  } else if (Object.values(counts).some(cnt => cnt >= 5)) {
    comboMsg = { title: 'NGŨ QUÝ BỘ BÀI', sub: '5 Thẻ Đồng Rank Cùng Giáng Trần!' };
  } else if (Object.values(counts).some(cnt => cnt >= 3)) {
    comboMsg = { title: 'TAM HOA TỤ ĐỈNH', sub: '3 Thẻ Đồng Rank Phát Quang!' };
  }

  if (comboMsg) {
    document.getElementById('comboTitle').innerText = comboMsg.title;
    document.getElementById('comboSub').innerText = comboMsg.sub;
    document.getElementById('comboBannerModal').classList.remove('hidden');
  }
}

function closeComboBanner() {
  document.getElementById('comboBannerModal').classList.add('hidden');
}

// ==================== 6. QUẢN LÝ ĐỘI HÌNH (5 CHÍNH + 2 DỰ BỊ) ====================
function renderFormationDeck() {
  const mainRow = document.getElementById('deckMainRow');
  const subRow = document.getElementById('deckSubRow');
  mainRow.innerHTML = '';
  subRow.innerHTML = '';

  // 5 Ô chính
  for (let i = 0; i < 5; i++) {
    const instId = gameState.deck.main[i];
    const inst = gameState.inventory.find(c => c.instanceId === instId);
    mainRow.appendChild(createDeckSlotElement(inst, i, 'MAIN'));
  }

  // 2 Ô dự bị
  for (let j = 0; j < 2; j++) {
    const instId = gameState.deck.sub[j];
    const inst = gameState.inventory.find(c => c.instanceId === instId);
    subRow.appendChild(createDeckSlotElement(inst, j, 'SUB'));
  }
}

function createDeckSlotElement(instance, slotIndex, groupType) {
  const el = document.createElement('div');
  el.className = 'bench-card';
  if (!instance) {
    el.innerHTML = `<div style="font-size:11px; color:#555; padding: 25px 0;">[Trống]</div>`;
    return el;
  }

  const computed = getComputedStats(instance);
  el.classList.add(`rank-${computed.rank.toLowerCase()}`);
  el.innerHTML = `
    <div class="card-stars ${computed.stars >= 6 ? 'mythic-stars' : ''}">★ ${computed.stars}</div>
    <div style="font-size:18px;">${computed.elementInfo.icon}</div>
    <div class="card-title">${computed.name}</div>
    <div class="card-combat-stats">
      <span class="atk">⚔️${computed.atk}</span>
      <span class="spd">⚡${computed.spd}</span>
    </div>
  `;
  return el;
}

function renderCollection(filterRank = 'ALL') {
  const grid = document.getElementById('collectionGrid');
  grid.innerHTML = '';

  const list = gameState.inventory.filter(inst => {
    const base = getCardBase(inst.cardId);
    return filterRank === 'ALL' || base.rank === filterRank;
  });

  list.forEach(inst => {
    const computed = getComputedStats(inst);
    const cardEl = document.createElement('div');
    cardEl.className = `battle-card rank-${computed.rank.toLowerCase()}`;
    cardEl.innerHTML = `
      <div class="card-stars ${computed.stars >= 6 ? 'mythic-stars' : ''}">★ ${computed.stars}</div>
      <div class="card-art-emoji">${computed.elementInfo.icon}</div>
      <div class="card-title">${computed.name}</div>
      <div class="card-combat-stats">
        <span class="atk">⚔️${computed.atk}</span>
        <span class="spd">⚡${computed.spd}</span>
      </div>
      <button class="btn-small" style="margin-top:6px; font-size:10px;" onclick="assignCardToDeck('${inst.instanceId}')">Trang Bị</button>
    `;
    grid.appendChild(cardEl);
  });
}

function filterCards(rank) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  renderCollection(rank);
}

function assignCardToDeck(instanceId) {
  if (gameState.deck.main.includes(instanceId) || gameState.deck.sub.includes(instanceId)) {
    alert('Thẻ này đã có trong đội hình ra trận!');
    return;
  }

  if (gameState.deck.main.length < 5) {
    gameState.deck.main.push(instanceId);
  } else if (gameState.deck.sub.length < 2) {
    gameState.deck.sub.push(instanceId);
  } else {
    // Nếu đầy cả 7 ô, thế chỗ ô cuối của đội hình chính
    gameState.deck.main[4] = instanceId;
  }
  saveGameData();
  renderFormationDeck();
}

// ==================== 7. LÒ RÈN NÂNG SAO & THỨC TỈNH (0⭐ -> 7⭐) ====================
function renderForgeCardList() {
  const box = document.getElementById('forgeTargetBox');
  if (!gameState.forgeSelectedInstanceId) {
    box.innerHTML = `<div class="forge-empty-prompt">Bấm chọn một thẻ trong Kho Thẻ để đưa vào Lò Rèn</div>`;
    updateForgeUpgradePanel(null);
    return;
  }

  const inst = gameState.inventory.find(c => c.instanceId === gameState.forgeSelectedInstanceId);
  if (!inst) return;
  const computed = getComputedStats(inst);

  box.innerHTML = `
    <div class="battle-card rank-${computed.rank.toLowerCase()}" style="width:160px; pointer-events:none;">
      <div class="card-stars ${computed.stars >= 6 ? 'mythic-stars' : ''}">★ ${computed.stars}</div>
      <div class="card-art-emoji" style="font-size:36px;">${computed.elementInfo.icon}</div>
      <div class="card-title">${computed.name}</div>
      <div class="card-combat-stats" style="margin-top:8px;">
        <span class="atk">ATK: ${computed.atk}</span>
        <span class="spd">SPD: ${computed.spd}</span>
      </div>
      <div style="font-size:11px; color:#00f076; margin-top:4px;">HP: ${computed.maxHp}</div>
    </div>
  `;

  updateForgeUpgradePanel(inst);
}

function updateForgeUpgradePanel(instance) {
  const title = document.getElementById('forgeUpgradeTitle');
  const fodderReq = document.getElementById('reqFodder');
  const dustReq = document.getElementById('reqDust');
  const stoneReq = document.getElementById('reqStone');
  const btn = document.getElementById('btnExecuteUpgrade');

  if (!instance) {
    title.innerText = 'YÊU CẦU NÂNG CẤP';
    btn.disabled = true;
    return;
  }

  const base = getCardBase(instance.cardId);
  const nextStar = instance.stars + 1;

  if (nextStar > 7 || (nextStar > 5 && !['S', 'SSS'].includes(base.rank))) {
    title.innerText = `ĐÃ ĐẠT GIỚI HẠN TỐI ĐA (${instance.stars}⭐)`;
    fodderReq.innerHTML = `Thẻ đã đạt cảnh giới tối thượng`;
    dustReq.innerHTML = `-`;
    stoneReq.innerHTML = `-`;
    btn.disabled = true;
    return;
  }

  const req = STAR_UPGRADE_REQUIREMENTS[nextStar];
  title.innerText = `NÂNG CẤP LÊN ${nextStar} SAO ⭐`;

  // Đếm thẻ phôi cùng rank trong túi (không tính chính nó và không tính thẻ đang gắn trên Deck)
  const fodderAvailable = gameState.inventory.filter(c => {
    if (c.instanceId === instance.instanceId) return false;
    if (gameState.deck.main.includes(c.instanceId) || gameState.deck.sub.includes(c.instanceId)) return false;
    const cBase = getCardBase(c.cardId);
    return cBase.rank === base.rank;
  }).length;

  fodderReq.innerHTML = `🔹 Thẻ phôi cùng Rank: <b>${fodderAvailable}/${req.fodderSameRankCount}</b>`;
  dustReq.innerHTML = `🌟 Bụi Sao: <b>${gameState.player.dust}/${req.dust}</b>`;

  let stoneText = `Không cần`;
  let hasEnoughStones = true;

  if (req.awakenStone > 0) {
    stoneText = `🔮 Đá Thức Tỉnh: <b>${gameState.player.awakenStones}/${req.awakenStone}</b>`;
    if (gameState.player.awakenStones < req.awakenStone) hasEnoughStones = false;
  }
  if (req.mythicStone > 0) {
    stoneText += ` | 💠 Đá Tối Thượng: <b>${gameState.player.mythicStones}/${req.mythicStone}</b>`;
    if (gameState.player.mythicStones < req.mythicStone) hasEnoughStones = false;
  }
  stoneReq.innerHTML = stoneText;

  const canUpgrade = (fodderAvailable >= req.fodderSameRankCount) &&
                     (gameState.player.dust >= req.dust) &&
                     hasEnoughStones;

  btn.disabled = !canUpgrade;
}

function executeCardUpgrade() {
  const inst = gameState.inventory.find(c => c.instanceId === gameState.forgeSelectedInstanceId);
  if (!inst) return;
  const base = getCardBase(inst.cardId);
  const nextStar = inst.stars + 1;
  const req = STAR_UPGRADE_REQUIREMENTS[nextStar];

  // Trừ tài nguyên
  gameState.player.dust -= req.dust;
  gameState.player.awakenStones -= req.awakenStone;
  gameState.player.mythicStones -= req.mythicStone;

  // Lọc và xóa các thẻ phôi cùng rank
  let deletedCount = 0;
  gameState.inventory = gameState.inventory.filter(c => {
    if (deletedCount < req.fodderSameRankCount &&
        c.instanceId !== inst.instanceId &&
        !gameState.deck.main.includes(c.instanceId) &&
        !gameState.deck.sub.includes(c.instanceId) &&
        getCardBase(c.cardId).rank === base.rank) {
      deletedCount++;
      return false;
    }
    return true;
  });

  inst.stars = nextStar;

  if (nextStar === 7) {
    gameState.player.hasGodCard = true;
    triggerGlobalAlert(`THẦN THOẠI XUẤT THẾ: Người chơi ${gameState.player.name} vừa rèn thành công ${base.name} LÊN 7 SAO TỐI THƯỢNG!`);
  }

  addPlayerExp(nextStar * 80);
  saveGameData();
  renderTopHUD();
  renderForgeCardList();
}

// ==================== 8. TURN-BASED COMBAT ENGINE & MULTI-HIT ====================
function startBattle(botLevelKey) {
  const botConfig = BOT_LEVELS_CONFIG[botLevelKey];
  gameState.battle.enemyType = 'BOT';
  gameState.battle.botLevel = botLevelKey;
  gameState.battle.bossConfig = null;

  prepareCombatTeams(botConfig);
  launchBattleView();
}

function startBossRaid(bossKey) {
  const boss = BOSS_RAIDS_CONFIG[bossKey];
  if (gameState.player.level < boss.minPlayerLevel) {
    alert(`Yêu cầu cấp độ người chơi đạt Lv.${boss.minPlayerLevel} trở lên!`);
    return;
  }

  gameState.battle.enemyType = 'BOSS';
  gameState.battle.bossConfig = boss;

  prepareCombatBossTeam(boss);
  launchBattleView();
}

function prepareCombatTeams(botConfig) {
  // Lấy 5 thẻ chính và 2 thẻ phụ của người chơi (hồi 100% HP)
  gameState.battle.playerCombatTeam = gameState.deck.main.map(id => {
    const inst = gameState.inventory.find(c => c.instanceId === id);
    const comp = getComputedStats(inst);
    return { ...comp, currentHp: comp.maxHp, isDead: false };
  });

  gameState.battle.playerCombatBench = gameState.deck.sub.map(id => {
    const inst = gameState.inventory.find(c => c.instanceId === id);
    const comp = getComputedStats(inst);
    return { ...comp, currentHp: comp.maxHp, isDead: false };
  });

  // Sinh đội hình Bot (5 chính + 2 dự bị)
  const botPool = ALL_500_CARDS.filter(c => botConfig.cardRanks.includes(c.rank));
  const generateBotFighter = (forceSSS = false) => {
    let base = botPool[Math.floor(Math.random() * botPool.length)];
    let stars = Math.floor(Math.random() * (botConfig.starRange[1] - botConfig.starRange[0] + 1)) + botConfig.starRange[0];

    if (forceSSS) {
      const sssPool = ALL_500_CARDS.filter(c => c.rank === 'SSS');
      base = sssPool[Math.floor(Math.random() * sssPool.length)];
      stars = 7;
    }

    const mult = 1 + (stars * 0.15);
    const hp = Math.floor(base.baseHp * mult);
    return {
      ...base,
      stars: stars,
      maxHp: hp,
      currentHp: hp,
      atk: Math.floor(base.baseAtk * mult),
      spd: Math.floor(base.baseSpd * mult),
      isDead: false
    };
  };

  const hasBossSSS = botConfig.hasSSSChance && (Math.random() < botConfig.sssChanceRate);

  gameState.battle.enemyCombatTeam = [];
  for (let i = 0; i < 5; i++) {
    const isSpecialSSS = (hasBossSSS && i === 0);
    gameState.battle.enemyCombatTeam.push(generateBotFighter(isSpecialSSS));
  }

  gameState.battle.enemyCombatBench = [generateBotFighter(), generateBotFighter()];
}

function prepareCombatBossTeam(boss) {
  // Phe ta vẫn dùng đội hình 5 chính + 2 dự bị
  gameState.battle.playerCombatTeam = gameState.deck.main.map(id => {
    const inst = gameState.inventory.find(c => c.instanceId === id);
    const comp = getComputedStats(inst);
    return { ...comp, currentHp: comp.maxHp, isDead: false };
  });

  gameState.battle.playerCombatBench = gameState.deck.sub.map(id => {
    const inst = gameState.inventory.find(c => c.instanceId === id);
    const comp = getComputedStats(inst);
    return { ...comp, currentHp: comp.maxHp, isDead: false };
  });

  // Boss là 1 đại thực thể khổng lồ ở giữa, 4 vị trí còn lại là tay sai
  const mainBossUnit = {
    id: boss.id,
    name: boss.name,
    rank: 'SSS',
    stars: 7,
    element: boss.element,
    elementInfo: ELEMENTS[boss.element],
    maxHp: boss.totalHp,
    currentHp: boss.totalHp,
    atk: boss.atk,
    spd: boss.spd,
    targetType: 'AOE',
    isDead: false
  };

  gameState.battle.enemyCombatTeam = [mainBossUnit];
  gameState.battle.enemyCombatBench = [];
}

function launchBattleView() {
  document.getElementById('botSelectView').classList.add('hidden');
  document.getElementById('battleArenaView').classList.remove('hidden');

  gameState.battle.active = true;
  gameState.battle.isPlayerTurn = true;
  gameState.battle.attackerIndex = null;
  gameState.battle.hasSwappedThisTurn = false;

  renderBattlefield();
  logCombat('Trận đấu bắt đầu! Hãy click chọn 1 thẻ tiên phong của bạn để tấn công.');
}

function renderBattlefield() {
  const botSlots = document.getElementById('botFieldSlots');
  const playerSlots = document.getElementById('playerFieldSlots');
  const benchSlots = document.getElementById('playerBenchSlots');

  botSlots.innerHTML = '';
  playerSlots.innerHTML = '';
  benchSlots.innerHTML = '';

  // Render Bot Team
  gameState.battle.enemyCombatTeam.forEach((card, idx) => {
    const el = document.createElement('div');
    el.className = `battle-card rank-${card.rank.toLowerCase()} ${card.isDead ? 'dead' : ''}`;
    if (gameState.battle.attackerIndex !== null && !card.isDead) {
      el.classList.add('targetable');
      el.onclick = () => executePlayerAttack(idx);
    }

    const hpPercent = Math.max(0, Math.floor((card.currentHp / card.maxHp) * 100));
    el.innerHTML = `
      <div class="card-stars ${card.stars >= 6 ? 'mythic-stars' : ''}">★ ${card.stars}</div>
      <div class="card-art-emoji">${card.elementInfo.icon}</div>
      <div class="card-title">${card.name}</div>
      <div class="card-hp-bar"><div class="card-hp-fill" style="width:${hpPercent}%"></div></div>
      <div class="card-combat-stats">
        <span class="atk">⚔️${card.atk}</span>
        <span class="spd">⚡${card.spd}</span>
      </div>
    `;
    botSlots.appendChild(el);
  });

  // Render Player Team
  gameState.battle.playerCombatTeam.forEach((card, idx) => {
    const el = document.createElement('div');
    el.className = `battle-card rank-${card.rank.toLowerCase()} ${card.isDead ? 'dead' : ''}`;
    if (idx === gameState.battle.attackerIndex) {
      el.classList.add('selected-attacker');
    }

    if (gameState.battle.isPlayerTurn && !card.isDead) {
      el.onclick = () => selectAttacker(idx);
    }

    const hpPercent = Math.max(0, Math.floor((card.currentHp / card.maxHp) * 100));
    el.innerHTML = `
      <div class="card-stars ${card.stars >= 6 ? 'mythic-stars' : ''}">★ ${card.stars}</div>
      <div class="card-art-emoji">${card.elementInfo.icon}</div>
      <div class="card-title">${card.name}</div>
      <div class="card-hp-bar"><div class="card-hp-fill" style="width:${hpPercent}%"></div></div>
      <div class="card-combat-stats">
        <span class="atk">⚔️${card.atk}</span>
        <span class="spd">⚡${card.spd}</span>
      </div>
    `;
    playerSlots.appendChild(el);
  });

  // Render Bench
  gameState.battle.playerCombatBench.forEach((card, bIdx) => {
    const el = document.createElement('div');
    el.className = `bench-card ${card.isDead ? 'dead' : ''}`;
    if (!card.isDead) {
      el.title = 'Click để đổi thẻ này lên sân (Không tốn lượt đánh)';
      el.onclick = () => swapBenchToField(bIdx);
    }
    el.innerHTML = `
      <div style="font-size:10px; color:#ffbe0b;">DỰ BỊ ★${card.stars}</div>
      <div style="font-size:18px;">${card.elementInfo.icon}</div>
      <div class="card-title">${card.name}</div>
      <div style="font-size:10px; color:#00f076;">HP: ${card.currentHp}</div>
    `;
    benchSlots.appendChild(el);
  });

  document.getElementById('turnIndicator').innerText = gameState.battle.isPlayerTurn ? 'LƯỢT CỦA BẠN' : 'ĐỐI THỦ PHẢN ĐÒN';
}

function selectAttacker(index) {
  if (!gameState.battle.isPlayerTurn) return;
  gameState.battle.attackerIndex = index;
  renderBattlefield();
  logCombat(`Đã chọn [${gameState.battle.playerCombatTeam[index].name}]. Giờ hãy click chọn 1 mục tiêu bên địch!`);
}

// ĐỔI DỰ BỊ VÀO SÂN TỰ DO (FREE SWITCH KHÔNG MẤT LƯỢT)
function swapBenchToField(benchIdx) {
  if (!gameState.battle.isPlayerTurn) {
    alert('Chỉ có thể thay người trong lượt của bạn!');
    return;
  }
  if (gameState.battle.attackerIndex === null) {
    alert('Hãy click chọn 1 thẻ trên sân trước để chỉ định vị trí cần thay ra!');
    return;
  }

  const fieldIdx = gameState.battle.attackerIndex;
  const temp = gameState.battle.playerCombatTeam[fieldIdx];
  gameState.battle.playerCombatTeam[fieldIdx] = gameState.battle.playerCombatBench[benchIdx];
  gameState.battle.playerCombatBench[benchIdx] = temp;

  logCombat(`Chiến thuật: Rút [${temp.name}] về nghỉ, đưa [${gameState.battle.playerCombatTeam[fieldIdx].name}] xuất trận!`);
  gameState.battle.attackerIndex = fieldIdx;
  renderBattlefield();
}

// THI HÀNH ĐÒN ĐÁNH MULTI-HIT VÀ KHẮC NGUYÊN TỐ
function executePlayerAttack(targetIndex) {
  if (!gameState.battle.isPlayerTurn || gameState.battle.attackerIndex === null) return;

  const attacker = gameState.battle.playerCombatTeam[gameState.battle.attackerIndex];
  const target = gameState.battle.enemyCombatTeam[targetIndex];

  gameState.battle.isPlayerTurn = false;
  gameState.battle.attackerIndex = null;

  // Tính số đòn đánh (Multi-hit) dựa theo chênh lệch tốc độ (SPD)
  let speedRatio = attacker.spd / Math.max(1, target.spd);
  if (gameState.battle.activeBuffs.haste) speedRatio *= 2.0;

  let hitCount = 1;
  if (speedRatio >= 2.0) hitCount = Math.floor(Math.random() * 3) + 6; // 6, 7 hoặc 8 hit
  else if (speedRatio >= 1.5) hitCount = Math.floor(Math.random() * 2) + 4; // 4 hoặc 5 hit
  else if (speedRatio >= 1.2) hitCount = Math.floor(Math.random() * 2) + 2; // 2 hoặc 3 hit

  // Tính sát thương mỗi hit & khắc hệ
  let baseDamagePerHit = Math.max(5, Math.floor(attacker.atk / (hitCount > 1 ? (hitCount * 0.7) : 1)));
  if (gameState.battle.activeBuffs.overload) {
    baseDamagePerHit = Math.floor(baseDamagePerHit * 1.6);
    gameState.battle.activeBuffs.overload = false;
  }

  // Khắc hệ nguyên tố (+30%)
  const isElementalAdvantage = ELEMENTS[attacker.element].strongAgainst === target.element;
  if (isElementalAdvantage) {
    baseDamagePerHit = Math.floor(baseDamagePerHit * 1.3);
  }

  showMultiHitBurst(hitCount);

  // Xả sát thương theo tầm đánh (SINGLE, CLEAVE, AOE)
  let totalDmgDealt = 0;
  for (let h = 0; h < hitCount; h++) {
    const dmg = baseDamagePerHit + Math.floor(Math.random() * 4);
    totalDmgDealt += dmg;
    target.currentHp = Math.max(0, target.currentHp - dmg);

    // Nếu đánh lan CLEAVE: chia 50% dmg cho con bên cạnh
    if (attacker.targetType === 'CLEAVE') {
      [targetIndex - 1, targetIndex + 1].forEach(sideIdx => {
        const sideTarget = gameState.battle.enemyCombatTeam[sideIdx];
        if (sideTarget && !sideTarget.isDead) {
          sideTarget.currentHp = Math.max(0, sideTarget.currentHp - Math.floor(dmg * 0.5));
          if (sideTarget.currentHp === 0) sideTarget.isDead = true;
        }
      });
    }

    // Nếu đánh toàn sàn AOE
    if (attacker.targetType === 'AOE') {
      gameState.battle.enemyCombatTeam.forEach((other, oIdx) => {
        if (oIdx !== targetIndex && !other.isDead) {
          other.currentHp = Math.max(0, other.currentHp - Math.floor(dmg * 0.4));
          if (other.currentHp === 0) other.isDead = true;
        }
      });
    }
  }

  if (target.currentHp === 0) target.isDead = true;

  logCombat(`[${attacker.name}] bộc phá ${hitCount} HITS liên hoàn vào [${target.name}], gây tổng cộng ${totalDmgDealt} sát thương! ${isElementalAdvantage ? '(Khắc hệ +30%)' : ''}`);
  renderBattlefield();

  // Kiểm tra thắng trận
  if (checkBattleEnd()) return;

  // Tới lượt Bot phản đòn sau 1 giây
  setTimeout(executeBotTurn, 1000);
}

function showMultiHitBurst(hits) {
  const burst = document.getElementById('multiHitBurst');
  burst.innerText = `${hits} HITS COMBO!`;
  burst.classList.remove('hidden');
  setTimeout(() => burst.classList.add('hidden'), 900);
}

function executeBotTurn() {
  if (!gameState.battle.active) return;

  // Tìm 1 con bot còn sống để tấn công
  const aliveBots = gameState.battle.enemyCombatTeam.filter(c => !c.isDead);
  if (aliveBots.length === 0) {
    checkBattleEnd();
    return;
  }
  const attacker = aliveBots[Math.floor(Math.random() * aliveBots.length)];

  // Tìm mục tiêu bên người chơi (ưu tiên con còn ít máu)
  const alivePlayers = gameState.battle.playerCombatTeam.filter(c => !c.isDead);
  if (alivePlayers.length === 0) {
    checkBattleEnd();
    return;
  }
  const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];

  // Kiểm tra khiên hộ thể
  if (gameState.battle.activeBuffs.shield) {
    logCombat(`Khiên Hộ Thể đã chặn đứng 100% sát thương từ đòn đánh của [${attacker.name}]!`);
    gameState.battle.activeBuffs.shield = false;
  } else {
    const dmg = Math.max(10, Math.floor(attacker.atk * (0.8 + Math.random() * 0.4)));
    target.currentHp = Math.max(0, target.currentHp - dmg);
    if (target.currentHp === 0) target.isDead = true;
    logCombat(`Đối phương [${attacker.name}] phản kích, gây ${dmg} sát thương lên [${target.name}]!`);
  }

  renderBattlefield();

  if (checkBattleEnd()) return;

  // Trả lượt cho người chơi
  gameState.battle.isPlayerTurn = true;
  gameState.battle.activeBuffs.haste = false;
  renderBattlefield();
}

function checkBattleEnd() {
  const isAllEnemiesDead = gameState.battle.enemyCombatTeam.every(c => c.isDead);
  const isAllPlayersDead = gameState.battle.playerCombatTeam.every(c => c.isDead);

  if (isAllEnemiesDead) {
    finishBattle(true);
    return true;
  } else if (isAllPlayersDead) {
    // Nếu cả 5 con chính chết, kiểm tra xem còn dự bị không
    const aliveBench = gameState.battle.playerCombatBench.filter(c => !c.isDead);
    if (aliveBench.length === 0) {
      finishBattle(false);
      return true;
    }
  }
  return false;
}

function finishBattle(isVictory) {
  gameState.battle.active = false;

  if (isVictory) {
    if (gameState.battle.enemyType === 'BOT') {
      const cfg = BOT_LEVELS_CONFIG[gameState.battle.botLevel];
      gameState.player.gold += cfg.rewards.gold;
      gameState.player.gems += cfg.rewards.gems;
      gameState.player.dust += cfg.rewards.dust;
      addPlayerExp(cfg.rewards.exp);

      if (cfg.rewards.awakenStone) gameState.player.awakenStones += cfg.rewards.awakenStone;
      if (cfg.rewards.mythicStone) gameState.player.mythicStones += cfg.rewards.mythicStone;

      alert(`CHIẾN THẮNG HOÀNH TRÁNG!\nNhận: 🪙 +${cfg.rewards.gold} | 🌟 +${cfg.rewards.exp} EXP | 🌟 +${cfg.rewards.dust} Bụi Sao`);
    } else {
      // Thắng Boss
      const bCfg = gameState.battle.bossConfig;
      const dustReward = Math.floor(Math.random() * (bCfg.rewards.dustMax - bCfg.rewards.dustMin)) + bCfg.rewards.dustMin;
      gameState.player.gold += bCfg.rewards.gold;
      gameState.player.dust += dustReward;
      addPlayerExp(bCfg.rewards.exp);

      if (bCfg.rewards.awakenStoneMin) {
        const stones = Math.floor(Math.random() * (bCfg.rewards.awakenStoneMax - bCfg.rewards.awakenStoneMin + 1)) + bCfg.rewards.awakenStoneMin;
        gameState.player.awakenStones += stones;
      }
      if (bCfg.rewards.mythicStoneMin) {
        const mStones = Math.floor(Math.random() * (bCfg.rewards.mythicStoneMax - bCfg.rewards.mythicStoneMin + 1)) + bCfg.rewards.mythicStoneMin;
        gameState.player.mythicStones += mStones;
      }

      gameState.player.bossDefeated = true;
      triggerGlobalAlert(`CHIẾN THẦN TRẢM MA: Người chơi ${gameState.player.name} vừa hạ gục Đại Thủ Lĩnh [${bCfg.name}]!`);
      alert(`ĐÃ HẠ GỤC BOSS THẾ GIỚI!\nNhận: 🌟 +${dustReward} Bụi Sao và các viên Đá Tiến Hóa quý giá!`);
    }
  } else {
    alert('THẤT BẠI! Hãy nâng sao cho đội hình và trang bị thêm Buff để phục thù!');
  }

  // Tự hồi 100% HP cho toàn bộ thẻ sau trận
  document.getElementById('battleArenaView').classList.add('hidden');
  document.getElementById('botSelectView').classList.remove('hidden');
  saveGameData();
  renderTopHUD();
}

function surrenderBattle() {
  if (confirm('Bạn có chắc chắn muốn bỏ cuộc trận này?')) {
    finishBattle(false);
  }
}

function logCombat(text) {
  const logEl = document.getElementById('combatLogText');
  if (logEl) logEl.innerText = text;
}

// ==================== 9. KỸ NĂNG BUFF TRONG TRẬN & COOLDOWN ====================
function triggerBuff(buffKey) {
  if (!gameState.battle.active) {
    alert('Chỉ có thể dùng Buff khi đang trong trận đấu!');
    return;
  }
  if (gameState.buffCooldowns[buffKey] > 0) {
    alert(`Kỹ năng đang hồi chiêu! Còn ${gameState.buffCooldowns[buffKey]}s`);
    return;
  }
  if (gameState.buffsOwned[buffKey] <= 0) {
    alert('Bạn đã hết lượt dùng kỹ năng này, hãy mua thêm trong Cửa Hàng Buff!');
    return;
  }

  gameState.buffsOwned[buffKey]--;
  gameState.buffCooldowns[buffKey] = BATTLE_BUFFS[buffKey].cooldownSec;

  if (buffKey === 'HEAL') {
    // Hồi 35% máu cho toàn bộ thẻ đang còn sống trên sân
    gameState.battle.playerCombatTeam.forEach(c => {
      if (!c.isDead) {
        c.currentHp = Math.min(c.maxHp, c.currentHp + Math.floor(c.maxHp * 0.35));
      }
    });
    logCombat('Kích hoạt Huyết Dược! Toàn đội hồi phục 35% HP.');
  } else if (buffKey === 'SHIELD') {
    gameState.battle.activeBuffs.shield = true;
    logCombat('Kích hoạt Khiên Bất Tử! Đòn tấn công kế tiếp của địch sẽ vô hiệu.');
  } else if (buffKey === 'OVERLOAD') {
    gameState.battle.activeBuffs.overload = true;
    logCombat('Kích hoạt Bạo Kích! Đòn đánh kế tiếp tăng +60% ATK.');
  } else if (buffKey === 'HASTE') {
    gameState.battle.activeBuffs.haste = true;
    logCombat('Kích hoạt Thần Tốc! Tốc độ tăng vọt, sẵn sàng xả 8 hits combo.');
  }

  renderBattlefield();
  renderTopHUD();
}

function startCooldownTimerLoop() {
  setInterval(() => {
    ['HEAL', 'SHIELD', 'OVERLOAD', 'HASTE'].forEach(key => {
      if (gameState.buffCooldowns[key] > 0) {
        gameState.buffCooldowns[key]--;
        updateBuffCooldownUI(key);
      }
    });
  }, 1000);
}

function updateBuffCooldownUI(buffKey) {
  const overlayMap = {
    HEAL: 'cdOverlayHeal',
    SHIELD: 'cdOverlayShield',
    OVERLOAD: 'cdOverlayAtk',
    HASTE: 'cdOverlaySpeed'
  };

  const overlay = document.getElementById(overlayMap[buffKey]);
  if (!overlay) return;

  const cd = gameState.buffCooldowns[buffKey];
  if (cd > 0) {
    overlay.classList.remove('hidden');
    overlay.querySelector('.cd-number').innerText = cd;
  } else {
    overlay.classList.add('hidden');
  }
}

function buyBuff(buffKey, costGem) {
  if (gameState.player.gems < costGem) {
    alert('Không đủ Tinh Thạch 💎!');
    return;
  }
  gameState.player.gems -= costGem;
  gameState.buffsOwned[buffKey]++;
  saveGameData();
  renderTopHUD();
}

// ==================== 10. MINIGAME CÀY VÀNG ====================
let minigameInterval = null;
let minigameTargetTimer = null;
let currentMinigameScore = 0;
let minigameTimeLeft = 30;

function startMinigame() {
  currentMinigameScore = 0;
  minigameTimeLeft = 30;
  document.getElementById('minigameScore').innerText = '0';
  document.getElementById('minigameTimer').innerText = '30s';
  document.getElementById('minigameGoldEarned').innerText = '0';

  const field = document.getElementById('minigameField');
  field.innerHTML = '';

  minigameInterval = setInterval(() => {
    minigameTimeLeft--;
    document.getElementById('minigameTimer').innerText = `${minigameTimeLeft}s`;
    if (minigameTimeLeft <= 0) {
      endMinigame();
    }
  }, 1000);

  spawnCoinTarget();
}

function spawnCoinTarget() {
  if (minigameTimeLeft <= 0) return;
  const field = document.getElementById('minigameField');
  field.innerHTML = '';

  const coin = document.createElement('div');
  coin.className = 'coin-target';
  coin.innerText = '🪙';

  const maxX = field.clientWidth - 60;
  const maxY = field.clientHeight - 60;
  coin.style.left = `${Math.floor(Math.random() * Math.max(10, maxX))}px`;
  coin.style.top = `${Math.floor(Math.random() * Math.max(10, maxY))}px`;

  coin.onclick = () => {
    currentMinigameScore += 10;
    const earned = currentMinigameScore * 5;
    document.getElementById('minigameScore').innerText = currentMinigameScore;
    document.getElementById('minigameGoldEarned').innerText = earned.toLocaleString();
    spawnCoinTarget();
  };

  field.appendChild(coin);
}

function endMinigame() {
  clearInterval(minigameInterval);
  const earned = currentMinigameScore * 5;
  gameState.player.gold += earned;
  addPlayerExp(Math.floor(currentMinigameScore * 1.5));
  saveGameData();
  renderTopHUD();

  const field = document.getElementById('minigameField');
  field.innerHTML = `<button id="startMinigameBtn" class="btn-gold" onclick="startMinigame()">BẮT ĐẦU CÀY TIỀN 🪙</button>`;
  alert(`KẾT THÚC MINIGAME!\nBạn đã thu hoạch được ${earned.toLocaleString()} Vàng 🪙!`);
}

// Báo động toàn server
function triggerGlobalAlert(message) {
  const alertBar = document.getElementById('globalServerAlert');
  const msgEl = document.getElementById('alertMessage');
  msgEl.innerText = message;
  alertBar.classList.remove('hidden');

  // Ghi nhận alert để networkSync đẩy lên MockAPI
  if (typeof broadcastServerAlert === 'function') {
    broadcastServerAlert(message);
  }

  setTimeout(() => alertBar.classList.add('hidden'), 6000);
}
