/* ==========================================================================
   CARDS DATA & BALANCE SYSTEM - 500 CARDS + HALLOWEEN EVENT UNITS
   ========================================================================== */

// 1. HỆ NGUYÊN TỐ & QUY TẮC KHẮC CHẾ (TĂNG 30% SÁT THƯƠNG KHI KHẮC HỆ)
const ELEMENTS = {
  FIRE: { name: 'Hỏa', icon: '🔥', strongAgainst: 'ICE' },
  ICE: { name: 'Băng', icon: '❄️', strongAgainst: 'THUNDER' },
  THUNDER: { name: 'Lôi', icon: '⚡', strongAgainst: 'DARK' },
  DARK: { name: 'Ám', icon: '🌑', strongAgainst: 'FIRE' }
};

// 2. TỪ ĐIỂN TẠO TÊN CHO 500 THẺ BÀI TIÊU CHUẨN
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

// 3. THUẬT TOÁN TẠO KHO 500 THẺ TIÊU CHUẨN
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

      let targetMode = tier.targetType;
      if (tier.rank === 'A' && i % 3 === 0) targetMode = 'SINGLE';
      if (tier.rank === 'SSS' && i % 4 === 0) targetMode = 'CLEAVE';

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

// 4. KHO THẺ ĐẶC BIỆT RANK EVENT HALLOWEEN (🎃)
const HALLOWEEN_EVENT_CARDS = [
  {
    id: 'CARD_EVENT_DARK_LORD',
    name: 'Dark Lord',
    rank: 'EVENT',
    element: 'DARK',
    elementInfo: ELEMENTS.DARK,
    baseAtk: 245,
    baseHp: 980,
    baseSpd: 125,
    targetType: 'AOE',
    stars: 0,
    unlockedSkill: 'Nụ Cười Ma Quái',
    eventSkillConfig: {
      id: 'CREEPY_SMILE',
      triggerChance: 0.10, // 10% tỷ lệ kích hoạt khi đánh thường
      damageBoost: 1.00,   // Tăng +100% sát thương (x2 damage)
      affectsAll: true,    // Tấn công cả 5 đối thủ cùng lúc với dame đều 100%
      skipEnemyTurn: true  // Khiến đối phương mất lượt tiếp theo
    }
  },
  {
    id: 'CARD_EVENT_XINGLENG',
    name: 'Xingleng',
    rank: 'EVENT',
    element: 'FIRE',
    elementInfo: ELEMENTS.FIRE,
    baseAtk: 238,
    baseHp: 920,
    baseSpd: 140,
    targetType: 'SINGLE',
    stars: 0,
    unlockedSkill: 'Tru Di Ngũ Tướng',
    eventSkillConfig: {
      id: 'PENTAKILL_DECAPITATION',
      triggerChance: 0.20, // 20% tỷ lệ kích hoạt
      critMultiplier: 1.70 // Gây sát thương chí mạng 170%
    }
  },
  {
    id: 'CARD_EVENT_ADX',
    name: 'Armored Dark Xingleng',
    rank: 'EVENT',
    element: 'DARK',
    elementInfo: ELEMENTS.DARK,
    baseAtk: 240,
    baseHp: 1050,
    baseSpd: 130,
    targetType: 'CHAIN_PULSE', // Loại truyền lực đặc biệt của côn nhị khúc
    stars: 0,
    unlockedSkill: 'Khúc Nhị Côn & Siêu Giáp',
    eventSkillConfig: {
      id: 'ADX_KIT',
      // Sơ đồ truyền lực đòn thường theo khoảng cách ô (0 đến 4 ô cách mục tiêu)
      chainPulseRates: [1.00, 0.25, 0.10, 0.05, 0.01],
      // Chiêu Siêu Giáp
      superArmorChance: 0.05, // 5% kích hoạt sau khi tấn công
      damageTakenRatio: 0.25, // Chỉ nhận 25% sát thương từ đối thủ
      reflectRatio: 1.20,     // Phản lại 120% sát thương cho kẻ tấn công
      // Chiêu Tất Sát
      ultimateChance: 0.10,   // ~10% kích hoạt khi xuất chiêu
      ultimateSpread: [1.00, 0.75, 0.50, 0.25] // Sơ đồ lan diện rộng ngoài rìa
    }
  }
];

// TOÀN BỘ KHO THẺ TRONG GAME (GỒM 500 THẺ TIÊU CHUẨN + 3 TƯỚNG EVENT)
const ALL_500_CARDS = [...generate500Cards(), ...HALLOWEEN_EVENT_CARDS];

// 5. CẤU HÌNH TỶ LỆ GACHA BẰNG VÀNG (🪙)
const GACHA_PACK_TIERS = {
  BRONZE: {
    name: 'Gói Đồng (Tân Binh)',
    costPerCard: 40,
    rates: { C: 0.85, B: 0.15, A: 0.00, S: 0.00, SSS: 0.00, EVENT: 0.00 }
  },
  SILVER: {
    name: 'Gói Bạc (Tinh Anh)',
    costPerCard: 100,
    rates: { C: 0.55, B: 0.35, A: 0.095, S: 0.005, SSS: 0.00, EVENT: 0.00 }
  },
  GOLD: {
    name: 'Gói Hoàng Kim (Vàng)',
    costPerCard: 250,
    rates: { C: 0.25, B: 0.45, A: 0.23, S: 0.06, SSS: 0.01, EVENT: 0.00 }
  },
  DIAMOND: {
    name: 'Gói Kim Cương (Halloween Event)',
    costPerCard: 600,
    rates: { C: 0.04, B: 0.23, A: 0.35, S: 0.19, SSS: 0.06, EVENT: 0.10 },
    // Phân bổ riêng 10% của nhóm EVENT
    eventSubRates: {
      CARD_EVENT_DARK_LORD: 0.30, // 3% tổng thể
      CARD_EVENT_XINGLENG: 0.40,  // 4% tổng thể
      CARD_EVENT_ADX: 0.30       // 3% tổng thể
    }
  }
};

// 6. CẤU HÌNH GACHA CAO CẤP MỞ BẰNG GEMS (💎)
const GEMS_GACHA_TIERS = {
  MYSTIC: {
    name: 'Gói Thần Bí (Mystic Pack)',
    costPerCard: 5,
    pack10DiscountCost: 45,
    rates: { C: 0.00, B: 0.40, A: 0.45, S: 0.13, SSS: 0.02, EVENT: 0.00 }
  },
  MYTHIC_GOD: {
    name: 'Gói Thần Thoại Vô Cực',
    costPerCard: 15,
    pack10DiscountCost: 135,
    rates: { C: 0.00, B: 0.00, A: 0.45, S: 0.30, SSS: 0.15, EVENT: 0.10 },
    eventSubRates: {
      CARD_EVENT_DARK_LORD: 0.30,
      CARD_EVENT_XINGLENG: 0.40,
      CARD_EVENT_ADX: 0.30
    }
  }
};

// 7. BẢNG GIÁ TRỊ PHÂN TÁCH THẺ THÀNH BỤI SAO (SCRAP SYSTEM)
const CARD_SCRAP_VALUES = {
  C:     { normalDust: 15,   superDust: 0 },
  B:     { normalDust: 40,   superDust: 0 },
  A:     { normalDust: 120,  superDust: 0 },
  S:     { normalDust: 400,  superDust: 1 },
  SSS:   { normalDust: 1500, superDust: 5 },
  EVENT: { normalDust: 1500, superDust: 5 }
};

// 8. CÔNG THỨC YÊU CẦU NÂNG SAO (0⭐ -> 7⭐)
// Mỗi sao tăng +15% ATK và +15% HP cơ bản
const STAR_UPGRADE_REQUIREMENTS = {
  1: { normalDust: 100,   superDust: 0,  requiresRanks: ['C', 'B', 'A', 'S', 'SSS', 'EVENT'] },
  2: { normalDust: 250,   superDust: 0,  requiresRanks: ['C', 'B', 'A', 'S', 'SSS', 'EVENT'] },
  3: { normalDust: 500,   superDust: 0,  requiresRanks: ['C', 'B', 'A', 'S', 'SSS', 'EVENT'] },
  4: { normalDust: 900,   superDust: 0,  requiresRanks: ['C', 'B', 'A', 'S', 'SSS', 'EVENT'] },
  5: { normalDust: 1500,  superDust: 0,  requiresRanks: ['C', 'B', 'A', 'S', 'SSS', 'EVENT'] }, // Cực hạn của C, B, A
  6: { normalDust: 5000,  superDust: 10, requiresRanks: ['S', 'SSS', 'EVENT'] },                 // Bắt đầu cần Bụi Siêu Cấp
  7: { normalDust: 12000, superDust: 25, requiresRanks: ['S', 'SSS', 'EVENT'] }                  // Cực hạn Thần Thoại / Event
};

// 9. CẤU HÌNH BOT ĐẤU TRƯỜNG PVE (HỖ TRỢ OVR & AI KHÓ CHỊU)
const BOT_LEVELS_CONFIG = {
  1: {
    level: 1,
    name: 'Bù Nhìn Tập Sự',
    avatar: '🤖',
    cardRanks: ['C'],
    starRange: [0, 0],
    subSlots: 2,
    ovrRatio: [0.80, 0.85], // 80% - 85% OVR người chơi
    aiStrategy: 'RANDOM',
    rewards: { gold: 80, exp: 35, gems: 0, dust: 15 }
  },
  2: {
    level: 2,
    name: 'Gác Cổng Hầm Ngục',
    avatar: '👾',
    cardRanks: ['C', 'B'],
    starRange: [1, 2],
    subSlots: 3,
    ovrRatio: [0.95, 1.00], // 95% - 100% OVR
    aiStrategy: 'FINISHER',
    rewards: { gold: 200, exp: 80, gems: 2, dust: 35 }
  },
  3: {
    level: 3,
    name: 'Ninja Hắc Ám',
    avatar: '🥷',
    cardRanks: ['B', 'A'],
    starRange: [3, 4],
    subSlots: 5,
    ovrRatio: [1.05, 1.05], // 105% OVR
    aiStrategy: 'FOCUS_FIRE', // Tập trung diệt con yếu máu nhất
    rewards: { gold: 450, exp: 200, gems: 5, dust: 80 }
  },
  4: {
    level: 4,
    name: 'Long Tướng Trảm Hồn',
    avatar: '🐉',
    cardRanks: ['A', 'S'],
    starRange: [4, 5],
    subSlots: 7,
    ovrRatio: [1.15, 1.15], // 115% OVR
    aiStrategy: 'ELEMENT_COUNTER', // Soi nguyên tố tung đòn khắc chế
    rewards: { gold: 1000, exp: 500, gems: 15, dust: 200 }
  },
  5: {
    level: 5,
    name: 'Ma Thần Hư Không (Boss Sàn)',
    avatar: '👑',
    cardRanks: ['S', 'SSS'],
    starRange: [5, 6],
    subSlots: 10,
    ovrRatio: [1.25, 1.30], // 125% - 130% OVR
    aiStrategy: 'TACTICAL_ASSASSIN', // Khắc hệ + Focus Fire + Trảm AOE
    rewards: { gold: 3000, exp: 1500, gems: 50, dust: 500, superDust: 2 }
  }
};

// 10. CẤU HÌNH BOSS THẾ GIỚI CO GIÃN SỨC MẠNH (DYNAMIC SCALING THEO OVR)
const BOSS_RAIDS_CONFIG = {
  DUST_BOSS: {
    id: 'DUST_BOSS',
    name: 'Ma Thú Rừng Thiêng',
    avatar: '🐺',
    minPlayerLevel: 8,
    element: 'ICE',
    baseHpMultiplier: 4.5,
    baseAtkMultiplier: 0.18,
    rewards: { dustMin: 200, dustMax: 500, superDustMin: 0, superDustMax: 0, exp: 600, gold: 800 }
  },
  AWAKEN_BOSS: {
    id: 'AWAKEN_BOSS',
    name: 'Bóng Ma Hư Vô',
    avatar: '🔮',
    minPlayerLevel: 12,
    element: 'DARK',
    baseHpMultiplier: 7.5,
    baseAtkMultiplier: 0.24,
    rewards: { superDustMin: 1, superDustMax: 3, dustMin: 500, exp: 1400, gold: 2000 }
  },
  MYTHIC_BOSS: {
    id: 'MYTHIC_BOSS',
    name: 'Hắc Long Khởi Nguyên',
    avatar: '🐉',
    minPlayerLevel: 15,
    element: 'FIRE',
    baseHpMultiplier: 12.0,
    baseAtkMultiplier: 0.32,
    rewards: { superDustMin: 3, superDustMax: 6, dustMin: 1200, exp: 3500, gold: 5000 }
  }
};

// 11. KỸ NĂNG BUFF TRONG TRẬN ĐẤU & THỜI GIAN HỒI CHIÊU (GIÂY)
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
