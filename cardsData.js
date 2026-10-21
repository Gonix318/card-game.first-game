/* ==========================================================================
   CARDS DATA & BALANCE SYSTEM - 500 CARDS CYBER CARD LEGENDS
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
        targetType: targetMode, // SINGLE, CLEAVE (2-3), AOE (5)
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
// Đơn giá tính theo 1 lá bài cho từng phẩm cấp:
// Đồng: 50 vàng/lá | Bạc: 90 vàng/lá | Vàng: 120 vàng/lá | Kim Cương: 140 vàng/lá
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
    rates: { C: 0.05, B: 0.25, A: 0.40, S: 0.20, SSS: 0.10 } // SSS tối đa đúng 10%
  }
};

// 5. CẤU HÌNH 5 CẤP ĐỘ BOT ĐẤU TRƯỜNG PVE (5 CHÍNH + 2 DỰ BỊ = 7 THẺ)
const BOT_LEVELS_CONFIG = {
  1: {
    level: 1,
    name: 'Bù Nhìn Gỗ Tập Sự',
    avatar: '🤖',
    cardRanks: ['C'],
    starRange: [0, 0],
    rewards: { gold: 80, exp: 35, gems: 0, dust: 10 },
    hasSSSChance: false
  },
  2: {
    level: 2,
    name: 'Gác Cổng Hầm Ngục',
    avatar: '👾',
    cardRanks: ['C', 'B'],
    starRange: [1, 2],
    rewards: { gold: 200, exp: 80, gems: 2, dust: 25 },
    hasSSSChance: false
  },
  3: {
    level: 3,
    name: 'Ninja Hắc Ám',
    avatar: '🥷',
    cardRanks: ['B', 'A'],
    starRange: [3, 4],
    rewards: { gold: 450, exp: 200, gems: 5, dust: 60 },
    hasSSSChance: false
  },
  4: {
    level: 4,
    name: 'Long Tướng Trảm Hồn',
    avatar: '🐉',
    cardRanks: ['A', 'S'],
    starRange: [4, 5],
    rewards: { gold: 1000, exp: 500, gems: 15, dust: 150 },
    hasSSSChance: false
  },
  5: {
    level: 5,
    name: 'Ma Thần Hư Không (Boss Sàn Đấu)',
    avatar: '👑',
    cardRanks: ['S'],
    starRange: [5, 6],
    rewards: { gold: 3000, exp: 1500, gems: 50, dust: 400, awakenStone: 2, mythicStone: 1 },
    hasSSSChance: true, // 15% xác suất có 1 thẻ SSS 7 sao trong đội hình
    sssChanceRate: 0.15
  }
};

// 6. CẤU HÌNH 3 PHỤ BẢN BOSS CÀY NGUYÊN LIỆU TIẾN HÓA
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
    rewards: { dustMin: 200, dustMax: 500, exp: 600, gold: 800 }
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
    rewards: { awakenStoneMin: 2, awakenStoneMax: 5, dustMin: 500, exp: 1400, gold: 2000 }
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
    rewards: { mythicStoneMin: 1, mythicStoneMax: 2, awakenStoneMin: 5, dustMin: 1200, exp: 3500, gold: 5000 }
  }
};

// 7. CÔNG THỨC VÀ ĐIỀU KIỆN LÒ RÈN NÂNG SAO (0⭐ -> 7⭐)
// Mỗi sao tăng +15% ATK và +15% HP cơ bản
const STAR_UPGRADE_REQUIREMENTS = {
  1: { fodderSameRankCount: 1, dust: 50,   awakenStone: 0,  mythicStone: 0 },
  2: { fodderSameRankCount: 2, dust: 150,  awakenStone: 0,  mythicStone: 0 },
  3: { fodderSameRankCount: 3, dust: 300,  awakenStone: 0,  mythicStone: 0 },
  4: { fodderSameRankCount: 4, dust: 600,  awakenStone: 0,  mythicStone: 0 },
  5: { fodderSameRankCount: 5, dust: 1200, awakenStone: 0,  mythicStone: 0 }, // Giới hạn của Rank C, B, A
  6: { fodderSameRankCount: 3, dust: 2500, awakenStone: 10, mythicStone: 0, requiresRanks: ['S', 'SSS'] },
  7: { fodderSameRankCount: 5, dust: 5000, awakenStone: 20, mythicStone: 5, requiresRanks: ['S', 'SSS'] }
};

// 8. KỸ NĂNG BUFF TRONG TRẬN ĐẤU & COOLDOWN (GIÂY)
const BATTLE_BUFFS = {
  HEAL: {
    id: 'HEAL',
    name: 'Huyết Dược Khẩn Cấp',
    cooldownSec: 25,
    effectType: 'HEAL_PERCENT',
    value: 0.35 // Hồi 35% Max HP
  },
  SHIELD: {
    id: 'SHIELD',
    name: 'Khiên Hộ Thể Bất Diệt',
    cooldownSec: 35,
    effectType: 'IMMUNE_NEXT_HIT',
    value: 1 // Chặn hoàn toàn 1 đòn đánh kế tiếp
  },
  OVERLOAD: {
    id: 'OVERLOAD',
    name: 'Lôi Thần Kích (Bạo Kích)',
    cooldownSec: 20,
    effectType: 'ATK_BOOST_PERCENT',
    value: 0.60 // Tăng 60% ATK ở đòn đánh hiện tại
  },
  HASTE: {
    id: 'HASTE',
    name: 'Thần Tốc Vũ Bão',
    cooldownSec: 30,
    effectType: 'SPEED_BOOST_PERCENT',
    value: 1.00 // Tăng 100% SPD giúp xả tối đa 8 cú chém Multi-hit
  }
};
