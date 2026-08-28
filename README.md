# منصة الواجبات المدرسية

تطبيق واجبات لمدرسة المتفوقين الثانوية: واجهة عربية RTL، مع تزامن لحظي عبر Firebase ودعم التصفح دون اتصال.

هذا التطبيق يحتاج خادم Node.js (ليس ملفاً HTML ثابتاً). التشغيل المحلي يستخدم محاكيات Firebase. النشر العلني يتم عبر **GitHub + Firebase App Hosting**.

## التشغيل محلياً

يلزم Node 20+ و Java (لمحاكي Firestore).

```bash
npm install
npm run dev
```

افتح [http://127.0.0.1:43123](http://127.0.0.1:43123).

### دخول الطلاب

لا كلمة مرور. من الصفحة الرئيسية اختر **واجهة الطلاب** ثم:

- الصف: الأول / الثاني / الثالث متوسط، أو الرابع / الخامس / السادس علمي
- الشعبة: أ إلى و

لتجربة واجبات جاهزة اختر **الثاني متوسط** و **شعبة أ**.

### دخول الكادر الإداري والتدريسي (المحاكي المحلي فقط)

من الصفحة الرئيسية اختر **واجهة الكادر الإداري والتدريسي** ثم حدد الصفة:

**مدير المدرسة** — اسم المستخدم `noura` وكلمة المرور `LiveSync2026`. من لوحة المدير يمكن إضافة مدرس جديد (الاسم، المراحل، الشعب، المواد، واسم المستخدم وكلمة المرور).

**مدرس** — اختر الاسم من القائمة الأبجدية (أ - ي) ثم أدخل اسم المستخدم وكلمة المرور:

| اسم المستخدم | كلمة المرور | الاسم |
| --- | --- | --- |
| `ahmed` | `LiveSync2026` | أ. أحمد العراقي (رياضيات / فيزياء) |
| `layla` | `LiveSync2026` | ليلى الخزرجي (اللغة العربية) |
| `omar` | `LiveSync2026` | عمر الجبوري (الرياضيات) |

هذه الحسابات التجريبية تُنشأ داخل المحاكي المحلي فقط. حسابات الإنتاج تُنشأ من لوحة المدير أو عبر `npm run seed:production` (مدير واحد، بدون مسح المدرسين أو الواجبات).

كل مدرس له معرّف ثابت `teacher_id` (لا يتغير عند تعديل اسم المستخدم). كلمة المرور محفوظة في Firebase Auth وليس في وثيقة المدرس. تعديل أو حذف الواجب متاح لصاحب `created_by` فقط. الواجبات تُحذف تلقائياً بعد 14 يوماً من النشر.

المرفقات (صور وPDF) تُحفظ في **Firebase Storage**. وثيقة الواجب في Firestore تحتوي فقط على الاسم والنوع والحجم ومسار الملف. العرض والتحميل يمرّان عبر `/api/attachments` بعد التحقق من الجلسة والصف.

## ماذا يفعل التطبيق

- صفحة ترحيب ببطاقتي الطلاب والكادر الإداري والتدريسي، وشارة **متصل (Online)**
- الطلاب: استعراض الواجبات والمرفقات حسب الصف والشعبة (قراءة فقط)
- مدير المدرسة: إضافة المدرسين وتحديد مراحلهم وشعبهم وموادهم واسم المستخدم وكلمة المرور
- المدرس: اختيار الاسم من قائمة أبجدية ثم الدخول للوحة الزرقاء لاستعراض المراحل المسندة ونشر واجب مع مرفقات
- بث مباشر من Firestore عبر Server-Sent Events، مع تخزين محلي للوحة عند انقطاع الشبكة

## النشر على الإنترنت (GitHub + Firebase)

روابط `trycloudflare` للمعاينة مؤقتة وليست نشراً رسمياً. المسار الرسمي لهذا التطبيق:

1. مستودع **GitHub** (فرع `main`)
2. مشروع **Firebase** على [console.firebase.google.com](https://console.firebase.google.com/)
3. **App Hosting** يربط المستودع وينشر Next.js على Cloud Run بعد كل `git push`

App Hosting يتطلب خطة **Blaze** (الدفع حسب الاستخدام؛ ضمن الحصص المجانية غالباً ما يبقى المبلغ صفراً لمدرسة بهذا الحجم).

لا تضع مفاتيح حساب الخدمة أو `SESSION_SECRET` داخل Git. لا تشغّل `npm run seed` على مشروع Firebase الحي؛ هذا الأمر يمسح البيانات وهو للمحاكي فقط.

### 1) مستودع GitHub

1. أنشئ مستودعاً جديداً فارغاً على GitHub (بدون README إن طُلب منك).
2. من جهازك أو من Cursor ادفع الفرع `main`:

```bash
git remote add github https://github.com/USER/REPO.git
git push -u github main
```

استبدل `USER/REPO` بمستودعك. Firebase App Hosting يتصل بـ GitHub فقط.

### 2) مشروع Firebase

1. أنشئ مشروعاً جديداً في [Firebase Console](https://console.firebase.google.com/).
2. فعّل **Authentication** → Sign-in method → **Email/Password**.
3. أنشئ **Cloud Firestore** (وضع الإنتاج، اختر موقعاً قريباً مثل `eur3` أو `me-central1`).
4. فعّل **Storage**.
5. من Project settings انسخ **Project ID** و **Web API Key** واسم سلة Storage.

انشر القواعد والفهارس من جهازك بعد `npx firebase login`:

```bash
npx firebase use --add
npm run deploy:rules
```

### 3) App Hosting (الربط والنشر)

1. في Firebase Console افتح **App Hosting** (تحت Hosting & Serverless) → **Get started**.
2. إن طُلب، رقِّ الخطة إلى **Blaze**.
3. المنطقة: أقرب للمدرسة، مثلاً `europe-west1` أو `me-central1`.
4. **Connect to GitHub** → صرّح لتطبيق Firebase على GitHub → اختر المستودع وفرع `main`.
5. جذر التطبيق: `/` (جذر المستودع).
6. فعّل Automatic rollouts.
7. أنشئ **Firebase web app** واربطه بالـ backend حتى يُحقَن `FIREBASE_WEBAPP_CONFIG` تلقائياً.
8. قبل أو بعد أول نشر، أضف متغيرات البيئة للـ backend:

| المتغير | متى | ملاحظات |
| --- | --- | --- |
| `SESSION_SECRET` | Runtime، سرّ | `openssl rand -base64 48` — إلزامي |
| `FIREBASE_PROJECT_ID` | Build + Runtime | إن لم يُحقَن الإعداد تلقائياً |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Build + Runtime | نفس المعرّف |
| `FIREBASE_WEB_API_KEY` | Runtime | Web API Key |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Build + Runtime | نفس المفتاح |
| `FIREBASE_STORAGE_BUCKET` | Runtime | غالباً `PROJECT_ID.appspot.com` |

لا تضف `FIRESTORE_EMULATOR_HOST` ولا بقية متغيرات المحاكي.

9. **Finish and deploy**. العنوان يكون بالشكل:

`https://BACKEND_ID--PROJECT_ID.REGION.hosted.app`

كل دفع لاحق إلى `main` على GitHub يعيد النشر تلقائياً.

10. افتح `/api/health` — يجب أن ترى `"ok": true` و `"emulator": false`.

### 4) بذرة الإنتاج (مرة واحدة، آمنة)

من جهازك، بعد تنزيل ملف حساب الخدمة من Project settings → Service accounts:

```bash
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json npm run seed:production
```

تنشئ الصفوف والمواد الناقصة وحساب مدير واحد إن لم يوجد مدير. **لا تمسح** المدرسين ولا الواجبات ولا تعيد كلمات المرور.

إذا لم تضبط `PRINCIPAL_PASSWORD` تُولَّد كلمة مرور وتُطبع مرة واحدة. احفظها. اسم المستخدم الافتراضي للمدير: `noura`.

بعد الدخول كمدير أضف المدرسين من لوحة المدرسة. لا تعتمد على حسابات المحاكي (`ahmed` / `layla` / `omar`) في الموقع العلني.

### 5) بعد النشر

- افتح الموقع على الهاتف: دخول الطلاب (بدون كلمة مرور) ثم دخول المدير.
- غيّر كلمة مرور المدير إن كانت مولَّدة.
- يمكنك لاحقاً ربط نطاق المدرسة من App Hosting → Custom domain.
- لا تشغّل `npm run dev` بمفاتيح الإنتاج؛ أمر التطوير للمحاكي المحلي فقط.

بديل: يمكن نشر نفس المستودع على Vercel إذا فضّلت ذلك لاحقاً (`vercel.json` موجود). المسار المعتمد هنا هو Firebase.
