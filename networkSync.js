/* ==========================================================================
   NETWORK SYNC & REALTIME SERVER POLLING - CYBER CARD LEGENDS
   MockAPI Integration & Global Alert Engine
   ========================================================================== */

// 1. CẤU HÌNH ENDPOINT MOCKAPI CỦA BẠN
const MOCKAPI_BASE_URL = 'https://6ad6540af71f154ac486c711.mockapi.io/players';

// Biến quản lý phiên mạng
let currentServerPlayerId = localStorage.getItem('CYBER_CARD_SERVER_ID') || null;
let lastSeenAlertMessage = '';
let isSyncing = false;

// ==================== 2. KHỞI CHẠY ĐỒNG BỘ KHI MỞ GAME ====================
window.addEventListener('DOMContentLoaded', () => {
  initPlayerNetworkSession();
  startGlobalAlertPolling();
});

// Khởi tạo hoặc tìm kiếm hồ sơ trên MockAPI
async function initPlayerNetworkSession() {
  try {
    if (!currentServerPlayerId) {
      // Người chơi mới: Tạo bản ghi đầu tiên trên MockAPI
      const newPlayerPayload = {
        name: gameState.player.name,
        level: gameState.player.level,
        gold: gameState.player.gold,
        gems: gameState.player.gems,
        unlockedSSS: Number(gameState.player.unlockedSSS) || 0,
        hasGodCard: Boolean(gameState.player.hasGodCard),
        bossDefeated: Boolean(gameState.player.bossDefeated),
        latestAlert: `Tân thủ [${gameState.player.name}] vừa gia nhập thế giới Cyber Card!`,
        updatedAt: new Date().toISOString()
      };

      const res = await fetch(MOCKAPI_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlayerPayload)
      });

      if (res.ok) {
        const createdData = await res.json();
        currentServerPlayerId = createdData.id;
        localStorage.setItem('CYBER_CARD_SERVER_ID', currentServerPlayerId);
        console.log('✅ Đã tạo hồ sơ máy chủ MockAPI thành công! ID:', currentServerPlayerId);
      }
    } else {
      // Đã có ID: Tải bản ghi từ server để đồng bộ
      const res = await fetch(`${MOCKAPI_BASE_URL}/${currentServerPlayerId}`);
      if (res.ok) {
        const serverData = await res.json();
        console.log('✅ Đã kết nối hồ sơ đám mây:', serverData);
      } else if (res.status === 404) {
        // Nếu ID cũ bị xóa trên MockAPI, reset để tạo lại
        currentServerPlayerId = null;
        localStorage.removeItem('CYBER_CARD_SERVER_ID');
        initPlayerNetworkSession();
      }
    }
  } catch (error) {
    console.warn('⚠️ Không thể kết nối tới MockAPI (Chế độ Offline):', error);
  }
}

// ==================== 3. ĐỒNG BỘ DỮ LIỆU LÊN SERVER (PUT) ====================
async function syncPlayerDataToMockAPI() {
  if (!currentServerPlayerId || isSyncing) return;

  isSyncing = true;
  try {
    const updatePayload = {
      name: gameState.player.name,
      level: Number(gameState.player.level),
      gold: Number(gameState.player.gold),
      gems: Number(gameState.player.gems),
      unlockedSSS: Number(gameState.player.unlockedSSS) || 0,
      hasGodCard: Boolean(gameState.player.hasGodCard),
      bossDefeated: Boolean(gameState.player.bossDefeated),
      updatedAt: new Date().toISOString()
    };

    await fetch(`${MOCKAPI_BASE_URL}/${currentServerPlayerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    });

    console.log('🔄 Đã lưu tiến trình lên MockAPI.');
  } catch (err) {
    console.warn('⚠️ Lỗi đồng bộ đám mây:', err);
  } finally {
    isSyncing = false;
  }
}

// ==================== 4. PHÁT THÔNG BÁO VÀ TIẾN TRÌNH QUÉT NGẦM (POLLING) ====================
// Phát thông báo bùng nổ (nổ SSS, 7 sao, hạ Boss) lên MockAPI
async function broadcastServerAlert(alertText) {
  if (!currentServerPlayerId) return;

  try {
    await fetch(`${MOCKAPI_BASE_URL}/${currentServerPlayerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latestAlert: alertText,
        unlockedSSS: Number(gameState.player.unlockedSSS) || 0,
        hasGodCard: Boolean(gameState.player.hasGodCard),
        bossDefeated: Boolean(gameState.player.bossDefeated),
        updatedAt: new Date().toISOString()
      })
    });
  } catch (e) {
    console.warn('Lỗi gửi thông báo server:', e);
  }
}

// Polling định kỳ mỗi 4 giây để quét thông báo từ tất cả người chơi khác
function startGlobalAlertPolling() {
  setInterval(async () => {
    try {
      const res = await fetch(`${MOCKAPI_BASE_URL}?sortBy=updatedAt&order=desc&limit=5`);
      if (!res.ok) return;

      const playersList = await res.json();
      if (!Array.isArray(playersList) || playersList.length === 0) return;

      // Tìm bản ghi có thông báo mới nhất khác thông báo vừa hiển thị
      for (const p of playersList) {
        if (p.latestAlert && p.latestAlert !== lastSeenAlertMessage) {
          lastSeenAlertMessage = p.latestAlert;
          displayGlobalAlertBanner(p.latestAlert);
          break;
        }
      }
    } catch (e) {
      // Giữ im lặng nếu mất mạng tạm thời
    }
  }, 4000);
}

function displayGlobalAlertBanner(msg) {
  const alertEl = document.getElementById('globalServerAlert');
  const txtEl = document.getElementById('alertMessage');
  if (!alertEl || !txtEl) return;

  txtEl.innerText = msg;
  alertEl.classList.remove('hidden');

  setTimeout(() => {
    alertEl.classList.add('hidden');
  }, 5000);
}

// ==================== 5. BẢNG QUẢN TRỊ ADMIN MOCKAPI ====================
function openAdminModal() {
  const modal = document.getElementById('adminModal');
  if (modal) {
    modal.classList.remove('hidden');
    fetchAdminData();
  }
}

function closeAdminModal() {
  const modal = document.getElementById('adminModal');
  if (modal) modal.classList.add('hidden');
}

async function fetchAdminData() {
  const tbody = document.getElementById('adminTableBody');
  const countEl = document.getElementById('adminDataCount');
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#00f2fe;">Đang nạp dữ liệu từ máy chủ MockAPI...</td></tr>`;

  try {
    const res = await fetch(MOCKAPI_BASE_URL);
    if (!res.ok) throw new Error('Không thể lấy dữ liệu');

    const data = await res.json();
    countEl.innerText = `Tổng người chơi: ${data.length}`;
    tbody.innerHTML = '';

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">Chưa có dữ liệu người chơi nào.</td></tr>`;
      return;
    }

    data.forEach(item => {
      const tr = document.createElement('tr');
      const isCurrentPlayer = (item.id === currentServerPlayerId);

      tr.innerHTML = `
        <td style="font-weight:700; color:${isCurrentPlayer ? '#00f2fe' : '#fff'};">
          #${item.id} ${isCurrentPlayer ? '(Bạn)' : ''}
        </td>
        <td>${item.name || 'Vô Danh'}</td>
        <td style="font-weight:700; color:#ffbe0b;">Lv.${item.level || 1}</td>
        <td>🪙 ${Number(item.gold || 0).toLocaleString()} / 💎 ${item.gems || 0}</td>
        <td style="color:${Number(item.unlockedSSS) > 0 ? '#ff007f' : '#8d99ae'}; font-weight:700;">
          ${item.unlockedSSS || 0} thẻ
        </td>
        <td>${item.hasGodCard ? '⭐ 7 Sao' : 'Chưa'}</td>
        <td>${item.bossDefeated ? '✅ Đã Diệt' : '❌ Chưa'}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#ff0055; padding:20px;">Lỗi tải dữ liệu: ${err.message}</td></tr>`;
  }
}
