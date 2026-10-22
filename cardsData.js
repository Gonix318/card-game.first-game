/* ==========================================================================
   CARDS DATA & BALANCE SYSTEM - 500 CARDS CYBER CARD LEGENDS (UPDATED)
   ========================================================================== */

// 1. HỆ NGUYÊN TỐ & QUY TẮC KHẮC CHẾ (TĂNG 30% SÁT THƯƠNG KHI KHẮC HỆ)
const ELEMENTS = {
  FIRE: { name: 'Hỏa', icon: '🔥', strongAgainst: 'ICE' },
  ICE: { name: 'Băng', icon: '❄️', strongAgainst: 'THUNDER' },
  THUNDER: { name: 'Lôi', icon: '⚡', strongAgainst: 'DARK' },
  DARK: { name: 'Ám', icon: '🌑', strongAgainst: 'FIRE' }
};

// 2. TỪ ĐIỂN TÊN VÀ NGHỆ DANH GAMING ĐỂ TẠO 500 THẺ ĐỘC NHẤT
const PREFIXES = [
  'Ma Thần', 'Long Tướng', 'Thần Kiếm', 'Hắc Báo', 'Chiến Binh',
  'Pháp Sư', 'Cổ Long', 'Thánh Kỵ Sĩ', 'Sát Thủ', 'Hư Không',
  'Viễn Cổ', 'Huyết Ảnh', 'Lôi Đế', 'Băng Vương', 'Hỏa Phượng',
  'Bóng Ma', 'Thủ Lĩnh', 'Tinh Linh', 'Thợ Săn', 'Quái Thú',
  'Vực Sâu', 'Bạch Kim', 'Bất Diệt', 'Hỗn Độn', 'Thiên Kiếp'
];

const ROOTS = [
  'Diệt Vong', 'Khởi Nguyên', 'Tối Thượng', 'Bão Tố', 'Cuồng Nộ',
  'Nguyệt Ảnh', 'Băng Hà', 'Hỏa Ngục', 'Chiến Tranh', 'Khải Huyền',
  'Vô Cực', 'Huyết Nguyệt', 'Thái Cổ', 'Băng Phách', 'Hỏa Long',
  'Lôi Đình', 'Ám Dạ', 'Trầm Mặc', 'Kích Nộ', 'Thần Bí'
];

// 3. THUẬT TOÁN TẠO KHO 500 THẺ THEO ĐÚNG TỶ LỆ
// SSS: 10 thẻ (2%) | S: 40 thẻ (8%) | A: 150 thẻ (30%) | B: 138 thẻ (27.5%) | C: 162 thẻ (32.5%)
function generate500Cards() {
  const cards = [];
  const elementKeys = ['FIRE', 'ICE', 'THUNDER', 'DARK'];

  const distribution = [
    { rank: 'SSS', count: 10,  baseAtk: 230, baseHp: 950, baseSpd: 135, targetType: 'AOE' },
    { rank: 'S',   count: 40,  baseAtk: 155, baseHp: 660, baseSpd: 110, targetType: 'CLEAVE' },
    { rank: 'A',   count: 150, baseAtk: 100, baseHp: 430, baseSpd: 95,  targetType: 'CLEAVE' },
    { rank: 'B',   count: 138, baseAtk: 65,  baseHp: 270, baseSpd: 80,  targetType: 'SINGLE' },
    { rank: 'C',   count: 162, baseAtk: 38,  baseHp: 165, baseSpd: 65,  targetType: 'SINGLE' }
  ];

  let idCounter = 1;

  distribution.forEach(tier => {
    for (let i = 0; i < tier.count; i++) {
      const pIdx = (idCounter * 7 + i) % PREFIXES.length;
      const rIdx = (idCounter * 11 + i) % ROOTS.length;
      const elemKey = elementKeys[(idCounter + i) % elementKeys.length];

      // Đan xen tầm đánh: Đơn thể (SINGLE), Đánh lan 2-3 con (CLEAVE), Toàn thể (AOE)
      let targetMode = tier.targetType;
      if (tier.rank === 'A' && i % 3 === 0) targetMode = 'SINGLE';
      if (tier.rank === 'SSS' && i % 4 === 0) targetMode = 'CLEAVE';

      // Phương sai chỉ số nhỏ để mỗi thẻ bài đều có nét riêng
      const atkVariance = ((i % 7) - 3) * 3;
      const hpVariance = ((i % 9) - 4) * 8;
      const spdVariance = ((i % 5) - 2) * 2;

      cards.push({
        id: `CARD_${String(idCounter).padStart(3, '0')}`,
        name: `${PREFIXES[pIdx]} ${ROOTS[rIdx]}`,
        rank: tier.rank,
        element: elemKey,
        elementInfo: ELEMENTS[elemKey],
        baseAtk: Math.max(20, tier.baseAtk + atkVariance),
        baseHp: Math.max(100, tier.baseHp + hpVariance),
        baseSpd: Math.max(50, tier.baseSpd + spdVariance),
        targetType: targetMode,
        stars: 0,
        unlockedSkill: tier.rank === 'SSS' ? 'Tuyệt Kỹ Thần Thoại' : (tier.rank === 'S' ? 'Khí Hồn Huyền Thoại' : 'Đòn Cơ Bản')
      });

      idCounter++;
    }
  });

  return cards;
}

// KHỞI TẠO TOÀN BỘ 500 THẺ
const ALL_500_CARDS = generate500Cards();

// 4. MA TRẬN TỶ LỆ BÓC GÓI GACHA (4 PHẨM CẤP GÓI)
const GACHA_PACK_TIERS = {
  BRONZE: {
    name: 'Gói Tân Binh (Đồng)',
    costPerCard: 50,
    rates: { C: 0.85, B: 0.15, A: 0.00, S: 0.00, SSS: 0.00 }
  },
  SILVER: {
    name: 'Gói Tinh Anh (Bạc)',
    costPerCard: 90,
    rates: { C: 0.55, B: 0.35, A: 0.095, S: 0.005, SSS: 0.00 }
  },
  GOLD: {
    name: 'Gói Hoàng Kim (Vàng)',
    costPerCard: 120,
    rates: { C: 0.25, B: 0.45, A: 0.23, S: 0.06, SSS: 0.01 }
  },
  DIAMOND: {
    name: 'Gói Thần Thánh (Kim Cương)',
    costPerCard: 140,
    rates: { C: 0.05, B: 0.25, A: 0.40, S: 0.20, SSS: 0.10 }
  }
};

// 5. GIÁ TRỊ PHÂN TÁCH THẺ THÀNH BỤI SAO (CARD SCRAP SYSTEM)
const CARD_SCRAP_VALUES = {
  C:   { normalDust: 15,   superDust: 0 },
  B:   { normalDust: 40,   superDust: 0 },
  A:   { normalDust: 120,  superDust: 0 },
  S:   { normalDust: 400,  superDust: 1 },
  SSS: { normalDust: 1500, superDust: 5 }
};

// 6. CÔNG THỨC & ĐIỀU KIỆN NÂNG SAO (CHỈ DÙNG BỤI SAO & BỤI SIÊU CẤP, KHÔNG CẦN PHÔI THẺ)
// Mỗi sao tăng +15% ATK và +15% HP cơ bản
const STAR_UPGRADE_REQUIREMENTS = {
  1: { normalDust: 100,   superDust: 0,  stone: 0, requiresRanks: ['C', 'B', 'A', 'S', 'SSS'] },
  2: { normalDust: 250,   superDust: 0,  stone: 0, requiresRanks: ['C', 'B', 'A', 'S', 'SSS'] },
  3: { normalDust: 500,   superDust: 0,  stone: 0, requiresRanks: ['C', 'B', 'A', 'S', 'SSS'] },
  4: { normalDust: 900,   superDust: 0,  stone: 0, requiresRanks: ['C', 'B', 'A', 'S', 'SSS'] },
  5: { normalDust: 1500,  superDust: 0,  stone: 0, requiresRanks: ['C', 'B', 'A', 'S', 'SSS'] }, // Cực hạn của C, B, A
  6: { normalDust: 5000,  superDust: 10, stone: 0, requiresRanks: ['S', 'SSS'] },                 // Cần Bụi Siêu Cấp
  7: { normalDust: 12000, superDust: 25, stone: 0, requiresRanks: ['S', 'SSS'] }                  // Cực hạn Thần Thoại
};

// 7. CẤU HÌNH 5 CẤP ĐỘ BOT ĐẤU TRƯỜNG PVE
const BOT_LEVELS_CONFIG = {
  1: {
    level: 1,
    name: 'Bù Nhìn Gỗ Tập Sự',
    avatar: '🤖',
    cardRanks: ['C'],
    starRange: [0, 0],
    subSlots: 2,
    rewards: { gold: 80, exp: 35, gems: 0, dust: 15 },
    hasSSSChance: false
  },
  2: {
    level: 2,
    name: 'Gác Cổng Hầm Ngục',
    avatar: '👾',
    cardRanks: ['C', 'B'],
    starRange: [1, 2],
    subSlots: 3,
    rewards: { gold: 200, exp: 80, gems: 2, dust: 35 },
    hasSSSChance: false
  },
  3: {
    level: 3,
    name: 'Ninja Hắc Ám',
    avatar: '🥷',
    cardRanks: ['B', 'A'],
    starRange: [3, 4],
    subSlots: 5,
    rewards: { gold: 450, exp: 200, gems: 5, dust: 80 },
    hasSSSChance: false
  },
  4: {
    level: 4,
    name: 'Long Tướng Trảm Hồn',
    avatar: '🐉',
    cardRanks: ['A', 'S'],
    starRange: [4, 5],
    subSlots: 7,
    rewards: { gold: 1000, exp: 500, gems: 15, dust: 200 },
    hasSSSChance: false
  },
  5: {
    level: 5,
    name: 'Ma Thần Hư Không (Boss Sàn Đấu)',
    avatar: '👑',
    cardRanks: ['S'],
    starRange: [5, 6],
    subSlots: 10,
    rewards: { gold: 3000, exp: 1500, gems: 50, dust: 500, superDust: 2, awakenStone: 2, mythicStone: 1 },
    hasSSSChance: true,
    sssChanceRate: 0.15
  }
};

// 8. CẤU HÌNH 3 PHỤ BẢN BOSS CÀY NGUYÊN LIỆU & BỤI SIÊU CẤP
const BOSS_RAIDS_CONFIG = {
  DUST_BOSS: {
    id: 'DUST_BOSS',
    name: 'Ma Thú Rừng Thiêng',
    avatar: '🐺',
    minPlayerLevel: 8,
    totalHp: 4500,
    atk: 140,
    spd: 85,
    element: 'ICE',
    rewards: { dustMin: 200, dustMax: 500, superDustMin: 0, superDustMax: 0, exp: 600, gold: 800 }
  },
  AWAKEN_BOSS: {
    id: 'AWAKEN_BOSS',
    name: 'Bóng Ma Hư Vô',
    avatar: '🔮',
    minPlayerLevel: 12,
    totalHp: 12000,
    atk: 280,
    spd: 110,
    element: 'DARK',
    rewards: { awakenStoneMin: 2, awakenStoneMax: 5, superDustMin: 1, superDustMax: 3, dustMin: 500, exp: 1400, gold: 2000 }
  },
  MYTHIC_BOSS: {
    id: 'MYTHIC_BOSS',
    name: 'Hắc Long Khởi Nguyên',
    avatar: '🐉',
    minPlayerLevel: 15,
    totalHp: 30000,
    atk: 480,
    spd: 140,
    element: 'FIRE',
    rewards: { mythicStoneMin: 1, mythicStoneMax: 2, superDustMin: 3, superDustMax: 6, awakenStoneMin: 5, dustMin: 1200, exp: 3500, gold: 5000 }
  }
};

// 9. KỸ NĂNG BUFF TRONG TRẬN ĐẤU & COOLDOWN (GIÂY)
const BATTLE_BUFFS = {
  HEAL: {
    id: 'HEAL',
    name: 'Huyết Dược Khẩn Cấp',
    cooldownSec: 25,
    effectType: 'HEAL_PERCENT',
    value: 0.35
  },
  SHIELD: {
    id: 'SHIELD',
    name: 'Khiên Hộ Thể Bất Diệt',
    cooldownSec: 35,
    effectType: 'IMMUNE_NEXT_HIT',
    value: 1
  },
  OVERLOAD: {
    id: 'OVERLOAD',
    name: 'Lôi Thần Kích (Bạo Kích)',
    cooldownSec: 20,
    effectType: 'ATK_BOOST_PERCENT',
    value: 0.60
  },
  HASTE: {
    id: 'HASTE',
    name: 'Thần Tốc Vũ Bão',
    cooldownSec: 30,
    effectType: 'SPEED_BOOST_PERCENT',
    value: 1.00
  }
};
