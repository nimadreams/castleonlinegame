# Castle Online Game (Nima Game)

یک پروژه نمونه برای ساخت بازی دوبعدی قلعه‌ای تحت وب با کلاینت Phaser و سرور Colyseus. هدف این ریپو این است که یک پایه‌ی قابل‌فهم و قابل‌گسترش بسازد تا یک برنامه‌نویس تازه‌کار هم بتواند قدم‌به‌قدم آن را توسعه دهد.

> سند طراحی فنی و نقشه راه توسعه در `TECHNICAL_DESIGN_FA.md` قرار دارد.

## وضعیت فعلی (Prototype)
- منوی اصلی، انتخاب زبان (FA/EN) و حالت تک‌نفره
- میدان نبرد با یک لِین، قلعه‌ها، چند یونیت، سیستم طلا/الماس و ارتقاء
- منطق نبرد سمت کلاینت (حرکت، برخورد، حمله، مرگ)
- زیرساخت سرور Colyseus با یک Room ساده و همگام‌سازی State
- دارایی‌های گرافیکی SVG + یک اسکلت Spine نمونه

موارد زیر هنوز کامل نیستند (طبق سند فنی در آینده اضافه می‌شوند):
- چندنفره واقعی (Matchmaking و اتصال کلاینت به سرور در UI)
- پایگاه داده، احراز هویت، پروفایل، پیشرفت دائمی
- سیستم ضدتقلب، مقیاس‌پذیری، استقرار

## تکنولوژی‌ها
### کلاینت
- TypeScript
- Phaser 3
- Vite
- Howler.js (صدا)
- Spine (انیمیشن اسکلتی)

### سرور
- Node.js (ESM)
- Colyseus
- @colyseus/schema
- WebSocket Transport

### ابزارها
- npm
- tsx (اجرای TypeScript در توسعه)

## ساختار پروژه
```
C:\laragon\www
├─ client
│  ├─ public\assets\svg
│  ├─ public\assets\spine
│  └─ src
│     ├─ scenes        # Boot/Menu/Battle
│     ├─ entities      # کلاس‌های مربوط به یونیت
│     ├─ network       # اتصال Colyseus (ClientNetwork)
│     ├─ spine         # مدیریت Spine
│     ├─ state         # ذخیره‌سازی و Localization
│     └─ ui            # HUD و لایه‌های UI
└─ server
   └─ src
      ├─ rooms         # MatchRoom
      ├─ schemas       # MatchState
      ├─ systems       # منطق کامبت
      ├─ ai            # AI نمونه (Placeholder)
      └─ config        # پورت و Tick Rate
```

## پیش‌نیازها
- Node.js (نسخه LTS)
- npm

## اجرا در حالت توسعه
### 1) سرور
```bash
cd server
npm install
npm run dev
```
پیش‌فرض روی پورت `2567` اجرا می‌شود.

### 2) کلاینت
```bash
cd client
npm install
npm run dev
```
کلاینت روی `http://localhost:3000` بالا می‌آید.

## بیلد (Production)
```bash
# client
cd client
npm run build

# server
cd server
npm run build
```
برای اجرای سرور بعد از build:
```bash
cd server
npm run start
```

## تنظیمات محیطی (Server)
فایل نمونه: `server/.env.example`
```
PORT=2567
TICK_RATE=20
```

## معماری فعلی (خلاصه)
- کلاینت Phaser صحنه‌ها را مدیریت می‌کند (BootScene, MenuScene, BattleScene)
- منطق نبرد تک‌نفره فعلاً داخل `client/src/scenes/BattleScene.ts` است
- سرور Colyseus در `server/src/index.ts` بالا می‌آید و Room اصلی `match` را ثبت می‌کند
- State بازی در `server/src/schemas/MatchState.ts` تعریف شده است

## ارتباط کلاینت و سرور (فعلی)
در حال حاضر فقط کلاس `ClientNetwork` آماده است و UI هنوز به آن وصل نشده.
- اتصال: `ws://localhost:2567`
- Room: `match`
- پیام‌ها (Server):
  - `spawn_unit`
  - `move` (برای جابجایی TestUnit)

## مسیر توسعه برای تازه‌کارها
### افزودن یونیت جدید (نمونه ساده)
1) یک SVG جدید در `client/public/assets/svg` قرار بده.
2) در `client/src/scenes/BootScene.ts` آن را preload کن.
3) در `client/src/scenes/BattleScene.ts`:
   - `UNIT_REGISTRY` را با مشخصات یونیت جدید آپدیت کن.
   - `UNIT_SVG_KEYS` و رنگ‌ها را اضافه کن.
4) در `client/src/state/Localization.ts` نام یونیت را در `unit.<id>` اضافه کن.

### تغییر منطق نبرد
- فایل اصلی: `client/src/scenes/BattleScene.ts`
- برای منطق سرورمحور، باید رفتار جنگ را به `server/src/rooms/MatchRoom.ts` منتقل کنی و State را همگام کنی.

### اضافه کردن چندنفره واقعی
- در کلاینت، از `client/src/network/ClientNetwork.ts` برای اتصال و ارسال پیام استفاده کن.
- در سرور، پیام‌ها را اعتبارسنجی و تمام منطق را authoritative اجرا کن.

### ذخیره‌سازی پیشرفت بازیکن
- الان از `localStorage` استفاده می‌شود: `client/src/state/PlayerStats.ts`
- برای نسخه کامل، به دیتابیس مهاجرت کن (طبق سند فنی)

## آنچه تا الان انجام دادیم
- ساخت ساختار کلاینت و سرور (Phaser + Colyseus)
- اضافه شدن یونیت‌ها، UI و منطق نبرد تک‌نفره
- آماده‌سازی زیرساخت سرور و State
- ایجاد ریپو گیت، کامیت اولیه و انتشار روی GitHub

## سند طراحی فنی
جزئیات معماری، نقشه راه و پیشنهادهای مقیاس‌پذیری در:
- `TECHNICAL_DESIGN_FA.md`

---

اگر خواستی بخش خاصی را توسعه بدی (مثلاً چندنفره، دیتابیس، ضدتقلب یا سیستم ارتقاء)، بگو تا قدم‌به‌قدم با هم جلو برویم.
