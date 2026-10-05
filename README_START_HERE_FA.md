# شروع پروژه Nano Beauty — React Native / iOS / Android

این بسته بر اساس `Template(6)`، Requirements v1.2 و developer handover v1.2.1 ساخته شده است. هدف آن پیاده‌سازی اپ واقعی React Native است که بتوان از همان codebase خروجی Android و iOS گرفت.

## خروجی‌های نهایی مورد انتظار

- Android: **APK** برای QA/نصب مستقیم و **AAB** برای Google Play.
- iOS: Development/TestFlight build و App Store build از طریق EAS.
- Customer app و Staff workspace داخل همان اپ، با permission server-side.
- Booking پیش‌فرض: hand-off کنترل‌شده به Fresha.
- In-app booking فقط در صورت انتخاب booking provider دارای API فعال می‌شود.

## نکته درباره فونت‌ها

فایل‌های باینری فونت عمداً داخل این starter کپی نشده‌اند. اگر پروژه مجوز Fraunces/Sora را دارد، فایل‌های مجاز را در مرحله NANO-01 به‌صورت محلی اضافه کنید. تا آن زمان implementation باید fallback مستند و قابل اجرا داشته باشد.

## ترتیب راه‌اندازی در Windows

1. `01-INSTALL-TOOLS.cmd`
2. `02-SETUP-PROJECT.cmd`
3. `03-CHECK-PACKAGE.cmd`
4. `04-COPY-NEXT-PROMPT.cmd`
5. `05-START-CLAUDE.cmd`
6. در زمان نیاز به env محلی: `06-CREATE-LOCAL-ENV.cmd`

قبل از NANO-00 داخل Claude Code این preflight را اجرا کنید:

```text
Read CLAUDE.md, IMPLEMENTATION_DECISIONS.md, Requirements.md, PROJECT_STATUS.md, prompts/QUICK_START.md, and the referenced Nano Beauty handover docs. Confirm that at least one Git commit exists. Do not implement yet. Report only hard blockers and must-fix-first defects for starting NANO-00.
```

## ترتیب ۱۲ پرامپت

`00 → 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11`

از `04-COPY-NEXT-PROMPT.cmd` بدون آرگومان استفاده کنید تا اولین مورد تیک‌نخورده کپی شود، یا دستی مثلاً:

```bat
04-COPY-NEXT-PROMPT.cmd 04
```

## نکته iOS روی Windows

خود Xcode روی Windows اجرا نمی‌شود. این پروژه باید بتواند iOS را با EAS cloud build بسازد؛ تست نهایی و submission iOS همچنان به Apple developer credentials و مراحل اپل نیاز دارد. NANO-11 release workflow را آماده می‌کند، اما credential واقعی داخل repo قرار نمی‌گیرد.
