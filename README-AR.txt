DRAW ARENA - لعبة رسم وتخمين بين لاعبين اتنين (Cloudflare Workers)

=== النشر على Cloudflare (مجاني بدون فيزا) ===
1) ارفع كل الملفات على GitHub (استبدل القديم). فولدر worker وملف wrangler.jsonc ضروريين.
2) في Cloudflare: Workers & Pages > drawing-area > Settings > Build:
   Build command = (فاضي)   Deploy command = npx wrangler deploy   Root directory = /
3) اضغط Retry build. بعد دقيقة هتلاقي الرابط: https://drawing-area.اسمك.workers.dev

=== تجربة على جهازك ===
دبل كليك على start.bat (محتاج Node.js) وافتح http://localhost:3000 في تبويبين.

=== الملفات ===
apps/web = الواجهة | worker/index.ts = سيرفر اللعبة | wrangler.jsonc = إعداد Cloudflare
