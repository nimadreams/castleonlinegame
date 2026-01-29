export type Language = "fa" | "en";

const STORAGE_KEY = "nima_language";

const STRINGS: Record<Language, Record<string, string>> = {
  fa: {
    "menu.title": "بازی نیما",
    "menu.single": "تک‌نفره",
    "menu.multi": "چندنفره",
    "menu.coming": "به‌زودی",
    "menu.language": "زبان",
    "menu.fa": "فارسی",
    "menu.en": "English",
    "ui.gold": "طلا {value} / {max}",
    "ui.total_gold": "طلا {value}",
    "ui.diamonds": "الماس {value}",
    "ui.active_units": "یونیت فعال: {value}",
    "ui.time": "زمان {value}",
    "ui.cost": "هزینه {value}",
    "ui.unlock_cost": "بازگشایی ۱۰۰♦",
    "ui.music_on": "موسیقی روشن",
    "ui.music_off": "موسیقی خاموش",
    "ui.upgrade": "ارتقا",
    "ui.max_level": "حداکثر",
    "ui.level": "سطح {value}",
    "ui.exchange": "تبدیل ۱۰۰♦ → +۴۰۰۰ طلا",
    "ui.back": "بازگشت",
    "ui.back_menu": "بازگشت به منو",
    "ui.upgrade_title": "ارتقای نیروها",
    "ui.locked": "قفل",
    "ui.unlock": "باز کردن",
    "result.victory": "پیروزی",
    "result.defeat": "شکست",
    "result.time_over": "اتمام زمان",
    "result.time": "زمان {value}",
    "result.rewards": "پاداش +{gold} طلا، +{diamonds} الماس",
    "result.no_rewards": "بدون پاداش",
    "unit.recruit": "سرباز",
    "unit.armored_knight": "شوالیه زره‌دار",
    "unit.longbowman": "کماندار",
    "unit.cavalry": "سواره‌نظام",
    "unit.musketeer": "تفنگدار"
  },
  en: {
    "menu.title": "Nima Game",
    "menu.single": "Single Player",
    "menu.multi": "Multiplayer",
    "menu.coming": "Coming Soon",
    "menu.language": "Language",
    "menu.fa": "فارسی",
    "menu.en": "English",
    "ui.gold": "Gold {value} / {max}",
    "ui.total_gold": "Gold {value}",
    "ui.diamonds": "Diamonds {value}",
    "ui.active_units": "Active Units: {value}",
    "ui.time": "Time {value}",
    "ui.cost": "Cost {value}",
    "ui.unlock_cost": "Unlock 100♦",
    "ui.music_on": "Music On",
    "ui.music_off": "Music Off",
    "ui.upgrade": "Upgrade",
    "ui.max_level": "MAX",
    "ui.level": "Lv {value}",
    "ui.exchange": "Exchange 100♦ → +4000 Gold",
    "ui.back": "Back",
    "ui.back_menu": "Back to Menu",
    "ui.upgrade_title": "Armory Upgrades",
    "ui.locked": "LOCKED",
    "ui.unlock": "Unlock",
    "result.victory": "Victory",
    "result.defeat": "Defeat",
    "result.time_over": "Time Over",
    "result.time": "Time {value}",
    "result.rewards": "Rewards +{gold} Gold, +{diamonds} Diamonds",
    "result.no_rewards": "No rewards",
    "unit.recruit": "Recruit",
    "unit.armored_knight": "Armored Knight",
    "unit.longbowman": "Longbowman",
    "unit.cavalry": "Cavalry",
    "unit.musketeer": "Musketeer"
  }
};

export const getLanguage = (): Language => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "fa") {
    return stored;
  }
  return "fa";
};

export const setLanguage = (lang: Language): void => {
  localStorage.setItem(STORAGE_KEY, lang);
};

export const t = (key: string, params?: Record<string, string | number>): string => {
  const lang = getLanguage();
  const dictionary = STRINGS[lang] ?? STRINGS.fa;
  const base = dictionary[key] ?? key;
  if (!params) {
    return base;
  }

  return Object.entries(params).reduce((acc, [paramKey, value]) => {
    return acc.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(value));
  }, base);
};
