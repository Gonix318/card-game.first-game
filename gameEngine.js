/* ==========================================================================
   GAME ENGINE - CORE LOGIC, AUTO-DEPLOY & DRAG-DROP CYBER CARD LEGENDS
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
    superDust: 0,
    awakenStones: 0,
    mythicStones: 0,
    unlockedSSS: 0,
    hasGodCard: false,
    bossDefeated: false,
    maxBenchSlots: 2 // Tối thiểu 2, nâng tối đa 10
  },
  inventory: [],
  deck: {
    main: [], // Tối đa 5 thẻ
    sub: []   // Tối đa maxBenchSlots
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
  forgeFilterRank: 'ALL',

  // Biến tạm cho thao tác kéo thả Drag & Drop
  draggedCardData: null,

  // Trạng thái trận đấu
  battle: {
    active: false,
    isPlayerTurn: true,
    attackerIndex: null,
    activeBuffs: {
      shield: false,
      overload: false,
      haste: false
    },
    enemyType: null,
    botLevel: 1,
    bossConfig: null,
    playerCombatTeam: [],
    playerCombatBench: [],
    enemyCombatTeam: [],
    enemyCombatBench: []
  }
};

// ==================== 2. KHỞI CHẠY & NẠP DỮ LIỆU LOCAL ====================
window.addEventListener('DOMContentLoaded', () => {
  loadLocalGameData();
  setupTabsNavigation();
  initStarterCardsIfEmpty();
  renderTopHUD();
  renderFormationDeck();
  renderCollection();
  renderForgeCardList();
  startCooldownTimerLoop();
});

function loadLocalGameData() {
  const saved = localStorage.getItem('CYBER_CARD_SAVE');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(gameState.player, parsed.player || {});
      gameState.player.maxBenchSlots = gameState.player.maxBenchSlots || 2;
      gameState.player.superDust = gameState.player.superDust || 0;
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
  if (typeof syncPlayerDataToMockAPI === 'function') {
    syncPlayerDataToMockAPI();
  }
}

function initStarterCardsIfEmpty() {
  if (gameState.inventory.length === 0) {
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

function getComputedStats(instance) {
  const base = getCardBase(instance.cardId);
  if (!base) return { atk: 10, hp: 50, spd: 50, maxHp: 50, rank: 'C', name: 'Vô Danh', elementInfo: { icon: '❓' } };
  const starMultiplier = 1 + (instance.stars * 0.15);
  const maxHp = Math.floor(base.baseHp * starMultiplier);
  const atk = Math.floor(base.baseAtk * starMultiplier);
  const spd = Math.floor(base.baseSpd * starMultiplier);

  // Điểm chiến lực CP
  const cp = Math.floor(atk * 2 + maxHp * 0.5 + spd * 1.5 + (instance.stars * 100));

  return {
    ...base,
    instanceId: instance.instanceId,
    stars: instance.stars,
    maxHp: maxHp,
    atk: atk,
    spd: spd,
    cp: cp
  };
}

// ==================== 3. HỆ THỐNG LEVEL & HUD ====================
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
  const rewardDust = newLv * 60;

  gameState.player.gold += rewardGold;
  gameState.player.gems += rewardGems;
  gameState.player.dust += rewardDust;

  document.getElementById('modalNewLevel').innerText = `Lv.${newLv}`;
  document.getElementById('modalLevelRewards').innerHTML = `
    <div>🪙 +${rewardGold.toLocaleString()} Vàng</div>
    <div>💎 +${rewardGems} Tinh Thạch</div>
    <div>🌟 +${rewardDust} Bụi Sao</div>
    <div style="color: #00f2fe; margin-top:8px;">Chỉ số toàn đội hình tăng trưởng theo cấp độ!</div>
  `;
  document.getElementById('levelUpModal').classList.remove('hidden');
}

function closeLevelUpModal() {
  document.getElementById('levelUpModal').classList.add('hidden');
  renderTopHUD();
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
  document.getElementById('superDustDisplay').innerText = gameState.player.superDust.toLocaleString();
  document.getElementById('awakenStoneDisplay').innerText = gameState.player.awakenStones;
  document.getElementById('mythicStoneDisplay').innerText = gameState.player.mythicStones;
  document.getElementById('totalCardsCount').innerText = gameState.inventory.length;

  document.getElementById('countBuffHeal').innerText = gameState.buffsOwned.HEAL;
  document.getElementById('countBuffShield').innerText = gameState.buffsOwned.SHIELD;
  document.getElementById('countBuffAtk').innerText = gameState.buffsOwned.OVERLOAD;
  document.getElementById('countBuffSpeed').innerText = gameState.buffsOwned.HASTE;
}

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

// ==================== 4. TỐI ƯU ĐỘI HÌNH & KÉO THẢ (DRAG & DROP) ====================
function autoOptimizeFormation() {
  if (gameState.inventory.length === 0) return;

  // Tính CP và sắp xếp toàn bộ thẻ giảm dần
  const sortedInventory = [...gameState.inventory].map(inst => getComputedStats(inst))
    .sort((a, b) => b.cp - a.cp);

  // Lấy 5 thẻ có CP cao nhất làm Tiên Phong
  const top5Main = sortedInventory.slice(0, 5).map(c => c.instanceId);
  gameState.deck.main = top5Main;

  // Lấy các thẻ tiếp theo điền kín số Slot dự bị hiện có
  const maxSub = gameState.player.maxBenchSlots || 2;
  const topSub = sortedInventory.slice(5, 5 + maxSub).map(c => c.instanceId);
  gameState.deck.sub = topSub;

  saveGameData();
  renderFormationDeck();
  alert('ĐÃ TỐI ƯU ĐỘI HÌNH!\nHệ thống đã tự động bố trí các chiến binh có Lực Chiến (CP) cao nhất ra trận!');
}

function renderFormationDeck() {
  const mainRow = document.getElementById('deckMainRow');
  const subRow = document.getElementById('deckSubRow');
  const subBadge = document.getElementById('deckSubCountBadge');
  if (!mainRow || !subRow) return;

  mainRow.innerHTML = '';
  subRow.innerHTML = '';

  const maxSub = gameState.player.maxBenchSlots || 2;
  if (subBadge) subBadge.innerText = maxSub;

  // Render 5 Tiên Phong
  for (let i = 0; i < 5; i++) {
    const instId = gameState.deck.main[i];
    const inst = gameState.inventory.find(c => c.instanceId === instId);
    mainRow.appendChild(createFormationSlotElement(inst, i, 'MAIN'));
  }

  // Render Ghế Dự Bị
  for (let j = 0; j < maxSub; j++) {
    const instId = gameState.deck.sub[j];
    const inst = gameState.inventory.find(c => c.instanceId === instId);
    subRow.appendChild(createFormationSlotElement(inst, j, 'SUB'));
  }

  updateBenchUpgradeUI();
}

function createFormationSlotElement(instance, slotIndex, groupType) {
  const el = document.createElement('div');
  el.className = 'bench-card';
  el.setAttribute('data-group', groupType);
  el.setAttribute('data-slot', slotIndex);

  if (!instance) {
    el.innerHTML = `<div style="font-size:11px; color:#555; padding: 30px 0;">[Trống]</div>`;
  } else {
    const comp = getComputedStats(instance);
    el.classList.add(`rank-${comp.rank.toLowerCase()}`);
    el.setAttribute('draggable', 'true');
    el.innerHTML = `
      <div class="card-stars ${comp.stars >= 6 ? 'mythic-stars' : ''}">★ ${comp.stars}</div>
      <div style="font-size:20px;">${comp.elementInfo.icon}</div>
      <div class="card-title">${comp.name}</div>
      <div class="card-combat-stats">
        <span class="atk">⚔️${comp.atk}</span>
        <span class="spd">⚡${comp.spd}</span>
      </div>
      <div style="font-size:10px; color:#00f2fe; margin-top:2px;">CP: ${comp.cp}</div>
    `;

    // Sự kiện Drag
    el.addEventListener('dragstart', (e) => {
      gameState.draggedCardData = { groupType, slotIndex, instanceId: instance.instanceId };
      el.classList.add('dragging');
      e.dataTransfer.setData('text/plain', instance.instanceId);
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      document.querySelectorAll('.drag-over').forEach(box => box.classList.remove('drag-over'));
    });
  }

  // Sự kiện Drop tiếp nhận
  el.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.classList.add('drag-over');
  });

  el.addEventListener('dragleave', () => {
    el.classList.remove('drag-over');
  });

  el.addEventListener('drop', (e) => {
    e.preventDefault();
    el.classList.remove('drag-over');
    handleCardDropSwap(groupType, slotIndex);
  });

  return el;
}

// Xử lý hoán đổi vị trí thẻ khi thả chuột
function handleCardDropSwap(targetGroup, targetSlot) {
  const source = gameState.draggedCardData;
  if (!source) return;

  const sourceList = source.groupType === 'MAIN' ? gameState.deck.main : gameState.deck.sub;
  const targetList = targetGroup === 'MAIN' ? gameState.deck.main : gameState.deck.sub;

  const temp = targetList[targetSlot];
  targetList[targetSlot] = sourceList[source.slotIndex];
  sourceList[source.slotIndex] = temp;

  saveGameData();
  renderFormationDeck();
}

function renderCollection(filterRank = 'ALL') {
  const grid = document.getElementById('collectionGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const list = gameState.inventory.filter(inst => {
    const base = getCardBase(inst.cardId);
    return filterRank === 'ALL' || base.rank === filterRank;
  });

  list.forEach(inst => {
    const comp = getComputedStats(inst);
    const cardEl = document.createElement('div');
    cardEl.className = `battle-card rank-${comp.rank.toLowerCase()}`;
    cardEl.innerHTML = `
      <div class="card-stars ${comp.stars >= 6 ? 'mythic-stars' : ''}">★ ${comp.stars}</div>
      <div class="card-art-emoji">${comp.elementInfo.icon}</div>
      <div class="card-title">${comp.name}</div>
      <div class="card-combat-stats">
        <span class="atk">⚔️${comp.atk}</span>
        <span class="spd">⚡${comp.spd}</span>
      </div>
      <div style="font-size:10px; color:#00f2fe; margin-top:2px;">CP: ${comp.cp}</div>
      <button class="btn-small" style="margin-top:6px; font-size:10px;" onclick="assignCardToDeck('${inst.instanceId}')">Trang Bị</button>
    `;
    grid.appendChild(cardEl);
  });
}

function filterCards(rank) {
  document.querySelectorAll('#deckTab .filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  renderCollection(rank);
}

function assignCardToDeck(instanceId) {
  if (gameState.deck.main.includes(instanceId) || gameState.deck.sub.includes(instanceId)) {
    alert('Thẻ này đã có trong đội hình ra trận!');
    return;
  }

  const maxSub = gameState.player.maxBenchSlots || 2;
  if (gameState.deck.main.length < 5) {
    gameState.deck.main.push(instanceId);
  } else if (gameState.deck.sub.length < maxSub) {
    gameState.deck.sub.push(instanceId);
  } else {
    gameState.deck.main[4] = instanceId;
  }
  saveGameData();
  renderFormationDeck();
}

// ==================== 5. NÂNG CẤP KHO QUÂN DỰ BỊ (2 -> 10 SLOTS) ====================
function getBenchUpgradeCost(currentSlots) {
  const step = currentSlots - 1;
  return {
    gold: step * 5000,
    gems: step * 80,
    dust: step * 400
  };
}

function updateBenchUpgradeUI() {
  const curSlots = gameState.player.maxBenchSlots || 2;
  const slotTxt = document.getElementById('currentBenchSlotsTxt');
  const costTxt = document.getElementById('benchUpgradeCostTxt');
  const btn = document.getElementById('btnUpgradeBench');

  if (slotTxt) slotTxt.innerText = curSlots;

  if (curSlots >= 10) {
    if (costTxt) costTxt.innerText = 'ĐÃ ĐẠT GIỚI HẠN TỐI ĐA (10/10 Ô DỰ BỊ)';
    if (btn) btn.disabled = true;
    return;
  }

  const cost = getBenchUpgradeCost(curSlots);
  if (costTxt) {
    costTxt.innerText = `Chi phí: ${cost.gold.toLocaleString()} 🪙 | ${cost.gems} 💎 | ${cost.dust.toLocaleString()} 🌟`;
  }
  if (btn) {
    const canAfford = (gameState.player.gold >= cost.gold &&
                       gameState.player.gems >= cost.gems &&
                       gameState.player.dust >= cost.dust);
    btn.disabled = !canAfford;
  }
}

function upgradeBenchCapacity() {
  const curSlots = gameState.player.maxBenchSlots || 2;
  if (curSlots >= 10) {
    alert('Kho quân dự bị đã đạt tối đa 10 slot!');
    return;
  }

  const cost = getBenchUpgradeCost(curSlots);
  if (gameState.player.gold < cost.gold || gameState.player.gems < cost.gems || gameState.player.dust < cost.dust) {
    alert('Không đủ tài nguyên để mở thêm ô dự bị!');
    return;
  }

  gameState.player.gold -= cost.gold;
  gameState.player.gems -= cost.gems;
  gameState.player.dust -= cost.dust;
  gameState.player.maxBenchSlots = curSlots + 1;

  alert(`NÂNG CẤP THÀNH CÔNG! Sức chứa quân dự bị tăng lên ${gameState.player.maxBenchSlots} Slot!`);
  saveGameData();
  renderTopHUD();
  updateBenchUpgradeUI();
  renderFormationDeck();
}

// ==================== 6. LÒ RÈN: CHỌN THẺ, NÂNG SAO & PHÂN TÁCH BỤI ====================
function renderForgeCardList() {
  renderForgePicker();
  renderForgeTargetBox();
  updateBenchUpgradeUI();
}

function renderForgePicker() {
  const picker = document.getElementById('forgeCardsPicker');
  if (!picker) return;
  picker.innerHTML = '';

  const list = gameState.inventory.filter(inst => {
    const base = getCardBase(inst.cardId);
    return gameState.forgeFilterRank === 'ALL' || base.rank === gameState.forgeFilterRank;
  });

  if (list.length === 0) {
    picker.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color:#718096; padding: 20px;">Không có thẻ nào thuộc phẩm cấp này.</div>`;
    return;
  }

  list.forEach(inst => {
    const comp = getComputedStats(inst);
    const item = document.createElement('div');
    item.className = `picker-card-item rank-${comp.rank.toLowerCase()} ${inst.instanceId === gameState.forgeSelectedInstanceId ? 'selected-target' : ''}`;

    const isMax = (comp.stars >= 7) || (comp.stars >= 5 && !['S', 'SSS'].includes(comp.rank));

    item.innerHTML = `
      <div class="card-stars ${comp.stars >= 6 ? 'mythic-stars' : ''}">★ ${comp.stars}</div>
      <div style="font-size:18px;">${comp.elementInfo.icon}</div>
      <div class="card-title">${comp.name}</div>
      <div class="card-combat-stats" style="margin: 4px 0;">
        <span class="atk">⚔️${comp.atk}</span>
        <span class="spd">⚡${comp.spd}</span>
      </div>
      ${isMax ? `<div class="max-star-badge">[MAX SAO]</div>` : `<button class="btn-select-for-forge" onclick="selectCardForForge('${inst.instanceId}')">Chọn Rèn</button>`}
    `;
    picker.appendChild(item);
  });
}

function filterForgeCards(rank) {
  gameState.forgeFilterRank = rank;
  document.querySelectorAll('.forge-filter-row .filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  renderForgePicker();
}

function selectCardForForge(instanceId) {
  gameState.forgeSelectedInstanceId = instanceId;
  renderForgePicker();
  renderForgeTargetBox();
}

function renderForgeTargetBox() {
  const box = document.getElementById('forgeTargetBox');
  const scrapBtn = document.getElementById('btnScrapSelectedCard');
  const scrapTxt = document.getElementById('scrapValuePreview');

  if (!gameState.forgeSelectedInstanceId) {
    box.innerHTML = `<div class="forge-empty-prompt">Bấm nút "Chọn Rèn" ở danh sách bên phải để đưa thẻ vào lò</div>`;
    updateForgeUpgradePanel(null);
    if (scrapBtn) scrapBtn.disabled = true;
    if (scrapTxt) scrapTxt.innerText = `Giá trị: - Bụi Sao`;
    return;
  }

  const inst = gameState.inventory.find(c => c.instanceId === gameState.forgeSelectedInstanceId);
  if (!inst) return;
  const comp = getComputedStats(inst);

  box.innerHTML = `
    <div class="battle-card rank-${comp.rank.toLowerCase()}" style="width:160px; pointer-events:none;">
      <div class="card-stars ${comp.stars >= 6 ? 'mythic-stars' : ''}">★ ${comp.stars}</div>
      <div class="card-art-emoji" style="font-size:36px;">${comp.elementInfo.icon}</div>
      <div class="card-title">${comp.name}</div>
      <div class="card-combat-stats" style="margin-top:8px;">
        <span class="atk">ATK: ${comp.atk}</span>
        <span class="spd">SPD: ${comp.spd}</span>
      </div>
      <div style="font-size:11px; color:#00f076; margin-top:4px;">HP: ${comp.maxHp}</div>
      <div style="font-size:10px; color:#00f2fe; margin-top:2px;">CP: ${comp.cp}</div>
    </div>
  `;

  // Cập nhật giá trị phân tách
  const scrapVal = CARD_SCRAP_VALUES[comp.rank];
  const bonusDust = comp.stars * 50;
  if (scrapTxt) {
    scrapTxt.innerText = `Nhận: ${scrapVal.normalDust + bonusDust} 🌟 ${scrapVal.superDust > 0 ? `+ ${scrapVal.superDust} 🌠` : ''}`;
  }
  if (scrapBtn) scrapBtn.disabled = false;

  updateForgeUpgradePanel(inst);
}

function updateForgeUpgradePanel(instance) {
  const title = document.getElementById('forgeUpgradeTitle');
  const dustReq = document.getElementById('reqDust');
  const superDustReq = document.getElementById('reqSuperDust');
  const btn = document.getElementById('btnExecuteUpgrade');

  if (!instance) {
    title.innerText = 'YÊU CẦU NÂNG SAO';
    btn.disabled = true;
    return;
  }

  const base = getCardBase(instance.cardId);
  const nextStar = instance.stars + 1;

  if (nextStar > 7 || (nextStar > 5 && !['S', 'SSS'].includes(base.rank))) {
    title.innerText = `ĐÃ ĐẠT GIỚI HẠN TỐI ĐA (${instance.stars}⭐)`;
    dustReq.innerHTML = `🌟 Thẻ đã đạt cảnh giới tối thượng`;
    superDustReq.innerHTML = `🌠 -`;
    btn.disabled = true;
    return;
  }

  const req = STAR_UPGRADE_REQUIREMENTS[nextStar];
  title.innerText = `NÂNG CẤP LÊN ${nextStar} SAO ⭐`;

  dustReq.innerHTML = `🌟 Bụi Sao Thường: <b>${gameState.player.dust.toLocaleString()} / ${req.normalDust.toLocaleString()}</b>`;

  if (req.superDust > 0) {
    superDustReq.innerHTML = `🌠 Bụi Sao Siêu Cấp: <b>${gameState.player.superDust} / ${req.superDust}</b>`;
  } else {
    superDustReq.innerHTML = `🌠 Bụi Sao Siêu Cấp: <b>Không cần</b>`;
  }

  const canAfford = (gameState.player.dust >= req.normalDust) && (gameState.player.superDust >= req.superDust);
  btn.disabled = !canAfford;
}

function executeCardUpgrade() {
  const inst = gameState.inventory.find(c => c.instanceId === gameState.forgeSelectedInstanceId);
  if (!inst) return;
  const base = getCardBase(inst.cardId);
  const nextStar = inst.stars + 1;
  const req = STAR_UPGRADE_REQUIREMENTS[nextStar];

  gameState.player.dust -= req.normalDust;
  gameState.player.superDust -= req.superDust;
  inst.stars = nextStar;

  if (nextStar === 7) {
    gameState.player.hasGodCard = true;
    triggerGlobalAlert(`THẦN THOẠI XUẤT THẾ: Người chơi ${gameState.player.name} vừa nâng ${base.name} LÊN 7 SAO TỐI THƯỢNG!`);
  }

  addPlayerExp(nextStar * 80);
  saveGameData();
  renderTopHUD();
  renderForgeCardList();
  renderFormationDeck();
}

// Phân tách thẻ đang chọn thành Bụi
function scrapSelectedCard() {
  const instId = gameState.forgeSelectedInstanceId;
  if (!instId) return;

  if (gameState.deck.main.includes(instId) || gameState.deck.sub.includes(instId)) {
    alert('Thẻ này đang nằm trong Đội Hình Ra Trận! Hãy tháo ra trước khi phân tách.');
    return;
  }

  const inst = gameState.inventory.find(c => c.instanceId === instId);
  if (!inst) return;
  const comp = getComputedStats(inst);
  const scrapVal = CARD_SCRAP_VALUES[comp.rank];
  const bonusDust = comp.stars * 50;

  if (!confirm(`Bạn có chắc muốn phân tách [${comp.name}] để thu hồi ${scrapVal.normalDust + bonusDust} Bụi Sao?`)) {
    return;
  }

  gameState.player.dust += (scrapVal.normalDust + bonusDust);
  gameState.player.superDust += scrapVal.superDust;

  // Xóa thẻ khỏi túi
  gameState.inventory = gameState.inventory.filter(c => c.instanceId !== instId);
  gameState.forgeSelectedInstanceId = null;

  saveGameData();
  renderTopHUD();
  renderForgeCardList();
  renderCollection();
}

// Tách nhanh toàn bộ thẻ Rank C và B (0 sao)
function scrapAllTrashCards() {
  const trashCards = gameState.inventory.filter(c => {
    if (gameState.deck.main.includes(c.instanceId) || gameState.deck.sub.includes(c.instanceId)) return false;
    const base = getCardBase(c.cardId);
    return (base.rank === 'C' || base.rank === 'B') && c.stars === 0;
  });

  if (trashCards.length === 0) {
    alert('Không tìm thấy thẻ C hoặc B (0 sao) nào chưa trang bị để phân tách!');
    return;
  }

  let totalDustEarned = 0;
  trashCards.forEach(c => {
    const base = getCardBase(c.cardId);
    totalDustEarned += CARD_SCRAP_VALUES[base.rank].normalDust;
  });

  if (!confirm(`Tìm thấy ${trashCards.length} thẻ C/B rác. Phân tách tất cả để thu về ${totalDustEarned.toLocaleString()} Bụi Sao?`)) {
    return;
  }

  const trashIds = trashCards.map(c => c.instanceId);
  gameState.inventory = gameState.inventory.filter(c => !trashIds.includes(c.instanceId));
  gameState.player.dust += totalDustEarned;

  if (trashIds.includes(gameState.forgeSelectedInstanceId)) {
    gameState.forgeSelectedInstanceId = null;
  }

  saveGameData();
  renderTopHUD();
  renderForgeCardList();
  renderCollection();
  alert(`ĐÃ PHÂN TÁCH THÀNH CÔNG!\nThu hoạch được: +${totalDustEarned.toLocaleString()} Bụi Sao 🌟!`);
}

// Mua Bụi Siêu Cấp trong cửa hàng Buff
function buySuperDustWithGems() {
  if (gameState.player.gems < 30) {
    alert('Không đủ Tinh Thạch 💎 (Cần 30 Gems)!');
    return;
  }
  gameState.player.gems -= 30;
  gameState.player.superDust += 1;
  saveGameData();
  renderTopHUD();
  alert('Đã đổi thành công 1x Bụi Sao Siêu Cấp 🌠!');
}

function buySuperDustWithNormalDust() {
  if (gameState.player.dust < 800) {
    alert('Không đủ Bụi Sao Thường 🌟 (Cần 800 Bụi)!');
    return;
  }
  gameState.player.dust -= 800;
  gameState.player.superDust += 1;
  saveGameData();
  renderTopHUD();
  alert('Đã nén thành công 800 Bụi Sao thành 1x Bụi Sao Siêu Cấp 🌠!');
}

// ==================== 7. CHIẾN TRƯỜNG & TỰ ĐỘNG ĐẨY LÍNH DỰ BỊ (AUTO-DEPLOY) ====================
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
  // Lấy 5 thẻ tiên phong
  gameState.battle.playerCombatTeam = gameState.deck.main.slice(0, 5).map(id => {
    const inst = gameState.inventory.find(c => c.instanceId === id);
    const comp = getComputedStats(inst);
    return { ...comp, currentHp: comp.maxHp, isDead: false };
  });

  // Lấy toàn bộ hàng ghế dự bị theo sức chứa hiện tại
  const maxSub = gameState.player.maxBenchSlots || 2;
  gameState.battle.playerCombatBench = gameState.deck.sub.slice(0, maxSub).map(id => {
    const inst = gameState.inventory.find(c => c.instanceId === id);
    const comp = getComputedStats(inst);
    return { ...comp, currentHp: comp.maxHp, isDead: false };
  });

  // Sinh đội hình Bot
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

  // Dự bị của Bot tăng từ 2 lên tối đa 10 theo cấu hình
  gameState.battle.enemyCombatBench = [];
  for (let b = 0; b < botConfig.subSlots; b++) {
    gameState.battle.enemyCombatBench.push(generateBotFighter());
  }
}

function prepareCombatBossTeam(boss) {
  gameState.battle.playerCombatTeam = gameState.deck.main.slice(0, 5).map(id => {
    const inst = gameState.inventory.find(c => c.instanceId === id);
    const comp = getComputedStats(inst);
    return { ...comp, currentHp: comp.maxHp, isDead: false };
  });

  const maxSub = gameState.player.maxBenchSlots || 2;
  gameState.battle.playerCombatBench = gameState.deck.sub.slice(0, maxSub).map(id => {
    const inst = gameState.inventory.find(c => c.instanceId === id);
    const comp = getComputedStats(inst);
    return { ...comp, currentHp: comp.maxHp, isDead: false };
  });

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

  renderBattlefield();
  logCombat('Trận đấu bắt đầu! Hãy chọn 1 chiến binh bên bạn để xuất kích.');
}

// TỰ ĐỘNG ĐẨY LÍNH DỰ BỊ VÀO VỊ TRÍ TỬ TRẬN
function autoDeployBenchReplacements() {
  // 1. Phe Ta
  gameState.battle.playerCombatTeam.forEach((card, idx) => {
    if (card.isDead || card.currentHp <= 0) {
      const availIdx = gameState.battle.playerCombatBench.findIndex(c => !c.isDead && c.currentHp > 0);
      if (availIdx !== -1) {
        const rep = gameState.battle.playerCombatBench.splice(availIdx, 1)[0];
        logCombat(`🚨 [${card.name}] ngã xuống! Viện binh [${rep.name}] lập tức xông vào trận!`);
        gameState.battle.playerCombatTeam[idx] = rep;
      }
    }
  });

  // 2. Phe Bot
  gameState.battle.enemyCombatTeam.forEach((card, idx) => {
    if (card.isDead || card.currentHp <= 0) {
      const availIdx = gameState.battle.enemyCombatBench.findIndex(c => !c.isDead && c.currentHp > 0);
      if (availIdx !== -1) {
        const rep = gameState.battle.enemyCombatBench.splice(availIdx, 1)[0];
        logCombat(`⚠️ Địch ngã gục! Bot điều ngay viện binh [${rep.name}] lên thay thế!`);
        gameState.battle.enemyCombatTeam[idx] = rep;
      }
    }
  });

  // Cập nhật số lượng hiển thị trên giao diện
  const botSubEl = document.getElementById('botSubCount');
  if (botSubEl) {
    const remain = gameState.battle.enemyCombatBench.filter(c => !c.isDead).length;
    botSubEl.innerText = `Dự bị còn: ${remain}`;
  }

  const pSubEl = document.getElementById('playerBenchCountTxt');
  if (pSubEl) {
    const pRemain = gameState.battle.playerCombatBench.filter(c => !c.isDead).length;
    pSubEl.innerText = `${pRemain}/${gameState.player.maxBenchSlots || 2}`;
  }
}

function renderBattlefield() {
  const botSlots = document.getElementById('botFieldSlots');
  const playerSlots = document.getElementById('playerFieldSlots');
  const benchSlots = document.getElementById('playerBenchSlots');

  botSlots.innerHTML = '';
  playerSlots.innerHTML = '';
  benchSlots.innerHTML = '';

  // Render Bot
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
      el.title = 'Click để đổi lên sân thủ công';
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
  logCombat(`Đã chọn [${gameState.battle.playerCombatTeam[index].name}]. Hãy click chọn mục tiêu bên địch!`);
}

function swapBenchToField(benchIdx) {
  if (!gameState.battle.isPlayerTurn) {
    alert('Chỉ có thể thay người trong lượt của bạn!');
    return;
  }
  if (gameState.battle.attackerIndex === null) {
    alert('Hãy click chọn 1 thẻ trên sân trước để chỉ định vị trí cần thay!');
    return;
  }

  const fieldIdx = gameState.battle.attackerIndex;
  const temp = gameState.battle.playerCombatTeam[fieldIdx];
  gameState.battle.playerCombatTeam[fieldIdx] = gameState.battle.playerCombatBench[benchIdx];
  gameState.battle.playerCombatBench[benchIdx] = temp;

  logCombat(`Chiến thuật: [${temp.name}] lui về ghế dự bị, [${gameState.battle.playerCombatTeam[fieldIdx].name}] xuất kích!`);
  gameState.battle.attackerIndex = fieldIdx;
  renderBattlefield();
}

function executePlayerAttack(targetIndex) {
  if (!gameState.battle.isPlayerTurn || gameState.battle.attackerIndex === null) return;

  const attacker = gameState.battle.playerCombatTeam[gameState.battle.attackerIndex];
  const target = gameState.battle.enemyCombatTeam[targetIndex];

  gameState.battle.isPlayerTurn = false;
  gameState.battle.attackerIndex = null;

  // Tính số đòn multi-hit theo tốc độ
  let speedRatio = attacker.spd / Math.max(1, target.spd);
  if (gameState.battle.activeBuffs.haste) speedRatio *= 2.0;

  let hitCount = 1;
  if (speedRatio >= 2.0) hitCount = Math.floor(Math.random() * 3) + 6;
  else if (speedRatio >= 1.5) hitCount = Math.floor(Math.random() * 2) + 4;
  else if (speedRatio >= 1.2) hitCount = Math.floor(Math.random() * 2) + 2;

  let baseDamagePerHit = Math.max(5, Math.floor(attacker.atk / (hitCount > 1 ? (hitCount * 0.7) : 1)));
  if (gameState.battle.activeBuffs.overload) {
    baseDamagePerHit = Math.floor(baseDamagePerHit * 1.6);
    gameState.battle.activeBuffs.overload = false;
  }

  const isAdvantage = ELEMENTS[attacker.element].strongAgainst === target.element;
  if (isAdvantage) {
    baseDamagePerHit = Math.floor(baseDamagePerHit * 1.3);
  }

  showMultiHitBurst(hitCount);

  let totalDmg = 0;
  for (let h = 0; h < hitCount; h++) {
    const dmg = baseDamagePerHit + Math.floor(Math.random() * 4);
    totalDmg += dmg;
    target.currentHp = Math.max(0, target.currentHp - dmg);

    if (attacker.targetType === 'CLEAVE') {
      [targetIndex - 1, targetIndex + 1].forEach(sideIdx => {
        const sideTarget = gameState.battle.enemyCombatTeam[sideIdx];
        if (sideTarget && !sideTarget.isDead) {
          sideTarget.currentHp = Math.max(0, sideTarget.currentHp - Math.floor(dmg * 0.5));
          if (sideTarget.currentHp === 0) sideTarget.isDead = true;
        }
      });
    }

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

  logCombat(`[${attacker.name}] giáng ${hitCount} HITS vào [${target.name}], gây ${totalDmg} sát thương! ${isAdvantage ? '(Khắc hệ +30%)' : ''}`);

  // TỰ ĐỘNG ĐẨY LÍNH DỰ BỊ VÀO SÂN KHI CÓ QUÂN CHẾT
  autoDeployBenchReplacements();
  renderBattlefield();

  if (checkBattleEnd()) return;

  setTimeout(executeBotTurn, 1000);
}

function showMultiHitBurst(hits) {
  const burst = document.getElementById('multiHitBurst');
  if (!burst) return;
  burst.innerText = `${hits} HITS COMBO!`;
  burst.classList.remove('hidden');
  setTimeout(() => burst.classList.add('hidden'), 900);
}

function executeBotTurn() {
  if (!gameState.battle.active) return;

  const aliveBots = gameState.battle.enemyCombatTeam.filter(c => !c.isDead && c.currentHp > 0);
  if (aliveBots.length === 0) {
    checkBattleEnd();
    return;
  }
  const attacker = aliveBots[Math.floor(Math.random() * aliveBots.length)];

  const alivePlayers = gameState.battle.playerCombatTeam.filter(c => !c.isDead && c.currentHp > 0);
  if (alivePlayers.length === 0) {
    checkBattleEnd();
    return;
  }
  const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];

  if (gameState.battle.activeBuffs.shield) {
    logCombat(`Khiên Hộ Thể đã chặn đứng 100% sát thương từ đòn đánh của [${attacker.name}]!`);
    gameState.battle.activeBuffs.shield = false;
  } else {
    const dmg = Math.max(10, Math.floor(attacker.atk * (0.8 + Math.random() * 0.4)));
    target.currentHp = Math.max(0, target.currentHp - dmg);
    if (target.currentHp === 0) target.isDead = true;
    logCombat(`Đối phương [${attacker.name}] phản kích, gây ${dmg} sát thương lên [${target.name}]!`);
  }

  // TỰ ĐỘNG ĐẨY LÍNH DỰ BỊ VÀO SÂN KHI CÓ QUÂN CHẾT
  autoDeployBenchReplacements();
  renderBattlefield();

  if (checkBattleEnd()) return;

  gameState.battle.isPlayerTurn = true;
  gameState.battle.activeBuffs.haste = false;
  renderBattlefield();
}

function checkBattleEnd() {
  const isEnemiesWiped = gameState.battle.enemyCombatTeam.every(c => c.isDead || c.currentHp <= 0) &&
                         gameState.battle.enemyCombatBench.every(c => c.isDead || c.currentHp <= 0);

  const isPlayersWiped = gameState.battle.playerCombatTeam.every(c => c.isDead || c.currentHp <= 0) &&
                         gameState.battle.playerCombatBench.every(c => c.isDead || c.currentHp <= 0);

  if (isEnemiesWiped) {
    finishBattle(true);
    return true;
  } else if (isPlayersWiped) {
    finishBattle(false);
    return true;
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

      if (cfg.rewards.superDust) gameState.player.superDust += cfg.rewards.superDust;
      if (cfg.rewards.awakenStone) gameState.player.awakenStones += cfg.rewards.awakenStone;
      if (cfg.rewards.mythicStone) gameState.player.mythicStones += cfg.rewards.mythicStone;

      alert(`CHIẾN THẮNG HOÀNH TRÁNG!\nNhận: 🪙 +${cfg.rewards.gold} | 🌟 +${cfg.rewards.dust} Bụi Sao | +${cfg.rewards.exp} EXP`);
    } else {
      const bCfg = gameState.battle.bossConfig;
      const dustReward = Math.floor(Math.random() * (bCfg.rewards.dustMax - bCfg.rewards.dustMin)) + bCfg.rewards.dustMin;
      gameState.player.gold += bCfg.rewards.gold;
      gameState.player.dust += dustReward;
      addPlayerExp(bCfg.rewards.exp);

      if (bCfg.rewards.superDustMax > 0) {
        const sDust = Math.floor(Math.random() * (bCfg.rewards.superDustMax - bCfg.rewards.superDustMin + 1)) + bCfg.rewards.superDustMin;
        gameState.player.superDust += sDust;
      }
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
      alert(`ĐÃ HẠ GỤC BOSS THẾ GIỚI!\nNhận: 🌟 +${dustReward} Bụi Sao và các Tinh Thể Siêu Cấp quý giá!`);
    }
  } else {
    alert('THẤT BẠI! Hãy cường hóa thẻ trong Lò Rèn và tối ưu lại đội hình để phục thù!');
  }

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

// ==================== 8. BUFF & COOLDOWN ====================
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
    alert('Bạn đã hết lượt dùng kỹ năng này, hãy mua thêm trong Cửa Hàng!');
    return;
  }

  gameState.buffsOwned[buffKey]--;
  gameState.buffCooldowns[buffKey] = BATTLE_BUFFS[buffKey].cooldownSec;

  if (buffKey === 'HEAL') {
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

// ==================== 9. GACHA SYSTEM ====================
function setPackSize(size) {
  gameState.selectedPackSize = size;
  document.querySelectorAll('.btn-size').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.getAttribute('data-size')) === size);
  });

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
    alert('Không đủ Vàng để mở gói này!');
    return;
  }

  gameState.player.gold -= totalCost;
  addPlayerExp(gameState.selectedPackSize * 10);
  renderTopHUD();

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

  drawnCards.forEach(item => {
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

// ==================== 10. MINIGAME CÀY TIỀN ====================
let minigameInterval = null;
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

function triggerGlobalAlert(message) {
  const alertBar = document.getElementById('globalServerAlert');
  const msgEl = document.getElementById('alertMessage');
  if (!alertBar || !msgEl) return;
  msgEl.innerText = message;
  alertBar.classList.remove('hidden');

  if (typeof broadcastServerAlert === 'function') {
    broadcastServerAlert(message);
  }

  setTimeout(() => alertBar.classList.add('hidden'), 6000);
}
