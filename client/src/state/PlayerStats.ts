export type UnitKey = "recruit" | "armored_knight" | "longbowman" | "cavalry" | "musketeer";

export type PlayerStats = {
  totalGold: number;
  totalDiamonds: number;
  unitLevels: Record<UnitKey, number>;
  unlockedUnits: Record<UnitKey, boolean>;
};

const STORAGE_KEY = "nima_player_stats_v1";

const defaultStats: PlayerStats = {
  totalGold: 0,
  totalDiamonds: 0,
  unitLevels: {
    recruit: 1,
    armored_knight: 1,
    longbowman: 1,
    cavalry: 1,
    musketeer: 1
  },
  unlockedUnits: {
    recruit: true,
    armored_knight: true,
    longbowman: true,
    cavalry: false,
    musketeer: false
  }
};

const mergeStats = (raw: Partial<PlayerStats> | null): PlayerStats => {
  if (!raw) {
    return { ...defaultStats };
  }

  return {
    totalGold: typeof raw.totalGold === "number" ? raw.totalGold : defaultStats.totalGold,
    totalDiamonds: typeof raw.totalDiamonds === "number" ? raw.totalDiamonds : defaultStats.totalDiamonds,
    unitLevels: {
      ...defaultStats.unitLevels,
      ...(raw.unitLevels ?? {})
    },
    unlockedUnits: {
      ...defaultStats.unlockedUnits,
      ...(raw.unlockedUnits ?? {})
    }
  };
};

export const loadPlayerStats = (): PlayerStats => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...defaultStats };
    }

    const parsed = JSON.parse(raw) as Partial<PlayerStats>;
    return mergeStats(parsed);
  } catch {
    return { ...defaultStats };
  }
};

export const savePlayerStats = (stats: PlayerStats): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
};

export const awardRewards = (stats: PlayerStats, gold: number, diamonds: number): void => {
  stats.totalGold += gold;
  stats.totalDiamonds += diamonds;
  savePlayerStats(stats);
};

export const exchangeDiamondsToGold = (stats: PlayerStats, amount = 100): boolean => {
  if (amount < 100) {
    return false;
  }

  const exchanges = Math.floor(amount / 100);
  const cost = exchanges * 100;
  if (stats.totalDiamonds < cost) {
    return false;
  }

  stats.totalDiamonds -= cost;
  stats.totalGold += 4000 * exchanges;
  savePlayerStats(stats);
  return true;
};

export const unlockUnit = (stats: PlayerStats, unit: UnitKey, diamondCost = 100): boolean => {
  if (stats.unlockedUnits[unit]) {
    return true;
  }

  if (stats.totalDiamonds < diamondCost) {
    return false;
  }

  stats.totalDiamonds -= diamondCost;
  stats.unlockedUnits[unit] = true;
  savePlayerStats(stats);
  return true;
};

export const upgradeUnitLevel = (stats: PlayerStats, unit: UnitKey, cost: number): boolean => {
  if (stats.totalGold < cost) {
    return false;
  }

  stats.totalGold -= cost;
  stats.unitLevels[unit] = (stats.unitLevels[unit] ?? 1) + 1;
  savePlayerStats(stats);
  return true;
};

export const getUnitLevel = (stats: PlayerStats, unit: UnitKey): number => {
  return stats.unitLevels[unit] ?? 1;
};
