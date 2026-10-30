DRAW ARENA - لعبة رسم وتخمين بين لاعبين اتنين

=== 1) تشغيل اللعبة على جهازك (ويندوز) ===
1. ثبّت Node.js من nodejs.org (النسخة LTS) مرة واحدة.
2. دوس دبل كليك على الملف start.bat (في الفولدر الرئيسي).
   هيثبّت اللي محتاجه ويفتح المتصفح على http://localhost:3000
3. افتح نفس الرابط في تبويب تاني: واحد ينشئ غرفة والتاني يدخل بالكود.

=== 2) رفع الملفات على GitHub ===
1. اعمل حساب على github.com واضغط New repository (اسمه مثلا draw-arena).
2. اضغط "uploading an existing file" واسحب كل محتويات الفولدر (مش الفولدر نفسه)، ثم Commit.
   ملحوظة: فولدر .github لازم يترفع (لو مخفي في ويندوز فعّل Show hidden files).

=== 3) نشر اللعبة أونلاين ===
اللعبة محتاجة سيرفر، وGitHub Pages بيستضيف الواجهة فقط. فالطريقة:
أ) السيرفر: على render.com اختار New > Blueprint واربطه بمستودع GitHub. هتاخد رابط مثل https://draw-arena.onrender.com
ب) الواجهة: افتح الملف apps/web/config.js وغيّر السطر إلى:
   window.SERVER_URL = 'https://draw-arena.onrender.com';
   (أو تجاهل الخطوة دي واستخدم رابط Render مباشرة، لأنه بيقدّم الواجهة والسيرفر مع بعض).
ج) لتفعيل GitHub Pages: Settings > Pages > Source = GitHub Actions. بعدها كل رفع بيحدّث الموقع.

=== الملفات ===
apps/web/index.html + style.css + app.js + config.js  = الموقع (الواجهة)
apps/server/src                                        = سيرفر اللعبة
Dockerfile, render.yaml                                = نشر السيرفر
.github/workflows/pages.yml                            = نشر الواجهة على GitHub Pages
