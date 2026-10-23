/* ==========================================================================
   NETWORK SYNC & DATA PERSISTENCE - MOCKAPI & LOCAL STORAGE
   ========================================================================== */

// CẤU HÌNH ĐƯỜNG DẪN MOCKAPI (THAY BẰNG ENDPOINT MOCKAPI CỦA BẠN NẾU CÓ)
const MOCKAPI_BASE_URL = 'https://66fa7a4eafc569e13a9bf81a.mockapi.io/api/v1/players';
const LOCAL_STORAGE_KEY = 'CYBER_CARD_LEGENDS_SAVE_PVE';

// CƠ CHẾ AUTO-SAVE CỤC BỘ MỖI KHI DỮ LIỆU THAY ĐỔI
function saveLocalState() {
  try {
    const payload = {
      player: gameState.player,
      timestamp: Date.now()
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Lỗi khi lưu cục bộ vào LocalStorage:', err);
  }
}

// NẠP DỮ LIỆU CỤC BỘ KHI MỞ TRANG
function loadLocalState() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    if (parsed && parsed.player) {
      gameState.player = {
        ...gameState.player,
        ...parsed.player
      };

      // Đảm bảo không bị thiếu cấu trúc mảng nếu bản lưu cũ
      if (!Array.isArray(gameState.player.inventory)) gameState.player.inventory = [];
      if (!gameState.player.deck) gameState.player.deck = { main: [], sub: [] };
      if (!gameState.player.buffInventory) {
        gameState.player.buffInventory = { HEAL: 2, SHIELD: 1, OVERLOAD: 2, HASTE: 2 };
      }
      return true;
    }
  } catch (err) {
    console.error('Lỗi khi nạp LocalStorage:', err);
  }
  return false;
}

// ==================== ĐỒNG BỘ ĐÁM MÂY MOCKAPI ====================

// 1. TẢI HOẶC TẠO MỚI HỒ SƠ NGƯỜI CHƠI TRÊN MOCKAPI
async function syncWithCloudStorage() {
  showServerAlert('Đang kết nối và đồng bộ dữ liệu đám mây...');

  try {
    const response = await fetch(MOCKAPI_BASE_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const remoteList = await response.json();

    // Tìm profile người chơi theo tên máy
    let myRecord = remoteList.find(p => p.playerName === gameState.player.name);

    if (myRecord) {
      // Hợp nhất dữ liệu: Ưu tiên tiến trình có cấp độ hoặc tài nguyên cao hơn
      if ((myRecord.level || 1) > gameState.player.level) {
        gameState.player.level = myRecord.level;
        gameState.player.exp = myRecord.exp;
        gameState.player.gold = myRecord.gold;
        gameState.player.gems = myRecord.gems;
        gameState.player.normalDust = myRecord.normalDust;
        gameState.player.superDust = myRecord.superDust;
        gameState.player.benchCapacity = myRecord.benchCapacity || 2;
        if (myRecord.inventory && myRecord.inventory.length > 0) {
          gameState.player.inventory = myRecord.inventory;
        }
        if (myRecord.deck) gameState.player.deck = myRecord.deck;
      } else {
        // Cập nhật ngược lên mây nếu bản nội địa đang cày xa hơn
        await pushStateToCloud(myRecord.id);
      }
      gameState.player.cloudRecordId = myRecord.id;
    } else {
      // Đăng ký mới hồ sơ người chơi lên MockAPI
      await createNewCloudProfile();
    }

    showServerAlert('Đồng bộ dữ liệu máy chủ thành công! ⚡', 3000);
  } catch (err) {
    console.warn('Không thể kết nối MockAPI (Đang chạy chế độ Offline):', err);
    showServerAlert('Chế độ Ngoại Tuyến (Offline Mode): Dữ liệu được lưu cục bộ an toàn.', 4000);
  } finally {
    saveLocalState();
    updateTopHUD();
    renderDeckAndCollection();
    renderForgePickerList();
  }
}

// 2. TẠO HỒ SƠ CLOUD MỚI
async function createNewCloudProfile() {
  const payload = {
    playerName: gameState.player.name,
    level: gameState.player.level,
    exp: gameState.player.exp,
    gold: gameState.player.gold,
    gems: gameState.player.gems,
    normalDust: gameState.player.normalDust,
    superDust: gameState.player.superDust,
    benchCapacity: gameState.player.benchCapacity,
    teamOVR: calculateTeamOVR(),
    cardsCount: gameState.player.inventory.length,
    deck: gameState.player.deck,
    inventory: gameState.player.inventory,
    lastActive: new Date().toISOString()
  };

  try {
    const res = await fetch(MOCKAPI_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      gameState.player.cloudRecordId = data.id;
    }
  } catch (err) {
    console.error('Không thể tạo hồ sơ mới trên MockAPI:', err);
  }
}

// 3. ĐẨY DỮ LIỆU ĐỊNH KỲ LÊN MÂY (HEARTBEAT PUSH)
async function pushStateToCloud(recordId) {
  const targetId = recordId || gameState.player.cloudRecordId;
  if (!targetId) return;

  const payload = {
    playerName: gameState.player.name,
    level: gameState.player.level,
    exp: gameState.player.exp,
    gold: gameState.player.gold,
    gems: gameState.player.gems,
    normalDust: gameState.player.normalDust,
    superDust: gameState.player.superDust,
    benchCapacity: gameState.player.benchCapacity,
    teamOVR: calculateTeamOVR(),
    cardsCount: gameState.player.inventory.length,
    deck: gameState.player.deck,
    inventory: gameState.player.inventory,
    lastActive: new Date().toISOString()
  };

  try {
    await fetch(`${MOCKAPI_BASE_URL}/${targetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn('Gặp lỗi khi gửi dữ liệu định kỳ lên Cloud:', err);
  }
}

// ==================== BẢNG QUẢN TRỊ ADMIN (MOCKAPI AUDIT) ====================

function openAdminModal() {
  document.getElementById('adminModal').classList.remove('hidden');
  fetchAdminData();
}

function closeAdminModal() {
  document.getElementById('adminModal').classList.add('hidden');
}

async function fetchAdminData() {
  const tbody = document.getElementById('adminTableBody');
  const countEl = document.getElementById('adminDataCount');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Đang kéo dữ liệu từ MockAPI...</td></tr>';

  try {
    const res = await fetch(MOCKAPI_BASE_URL);
    if (!res.ok) throw new Error('Không thể lấy danh sách người chơi');

    const list = await res.json();
    countEl.textContent = `Tổng người chơi trên hệ thống: ${list.length}`;
    tbody.innerHTML = '';

    list.forEach(p => {
      const tr = document.createElement('tr');
      const inv = p.inventory || [];
      const sssCount = inv.filter(c => c.rank === 'SSS').length;
      const eventCount = inv.filter(c => c.rank === 'EVENT').length;

      tr.innerHTML = `
        <td>#${p.id}</td>
        <td><b>${p.playerName || 'Vô Danh'}</b></td>
        <td>Lv.${p.level || 1}</td>
        <td>${(p.gold || 0).toLocaleString('vi-VN')} 🪙 / ${p.gems || 0} 💎</td>
        <td style="color: #7209b7; font-weight: 700;">${p.superDust || 0} 🌠</td>
        <td>
          <span style="color: #ff007f;">${sssCount} SSS</span> | 
          <span style="color: #ff6b00;">${eventCount} 🎃</span>
        </td>
        <td>${p.benchCapacity || 2} Ô</td>
        <td>
          <button class="btn-small" style="background: #3d1420; color: #ff0055;" onclick="adminDeletePlayer('${p.id}')">Xóa</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:#ff0055; text-align:center;">Lỗi: ${err.message}</td></tr>`;
  }
}

async function adminDeletePlayer(id) {
  if (!confirm(`Bạn có chắc muốn xóa bản ghi người chơi #${id} trên MockAPI?`)) return;
  try {
    await fetch(`${MOCKAPI_BASE_URL}/${id}`, { method: 'DELETE' });
    alert(`Đã xóa hồ sơ #${id}`);
    fetchAdminData();
  } catch (err) {
    alert('Lỗi khi xóa: ' + err.message);
  }
}

// HIỂN THỊ DẢI BANNER BÁO TRẠNG THÁI SERVER
function showServerAlert(msg, autoHideDuration = 0) {
  const banner = document.getElementById('globalServerAlert');
  const txt = document.getElementById('alertMessage');
  if (!banner || !txt) return;

  txt.textContent = msg;
  banner.classList.remove('hidden');

  if (autoHideDuration > 0) {
    setTimeout(() => {
      banner.classList.add('hidden');
    }, autoHideDuration);
  }
}

// BẬT VÒNG LẶP LƯU TRỮ VÀ ĐỒNG BỘ NỀN
function initAutoSyncLoop() {
  // 1. Tự động lưu LocalStorage mỗi 5 giây
  setInterval(() => {
    saveLocalState();
  }, 5000);

  // 2. Gửi dữ liệu lên MockAPI mỗi 30 giây (nếu có kết nối)
  setInterval(() => {
    if (gameState.player.cloudRecordId) {
      pushStateToCloud();
    }
  }, 30000);

  // 3. Lưu khẩn cấp khi người dùng đóng hoặc tải lại trang
  window.addEventListener('beforeunload', () => {
    saveLocalState();
  });
}

// GẮN MÓC KHỞI TẠO ĐỒNG BỘ SAU KHI GAME ENGINE NẠP XONG
(function bootstrapSync() {
  const hasLocal = loadLocalState();
  if (hasLocal) {
    console.log('Đã nạp thành công dữ liệu lưu cục bộ.');
  }
  syncWithCloudStorage();
  initAutoSyncLoop();
})();
