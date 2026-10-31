# SETUP TODO — قبل الإطلاق / Before launch

كل ما يلي ناقص أو تجريبي عمدًا. الموقع يعمل بالكامل الآن، لكن البيانات غير المعتمدة
متبقية على "تجريبي" أو فارغة حتى تأكيد المالك.

Everything below is either missing on purpose or explicitly marked as sample data.
The site runs end-to-end today; unconfirmed data stays empty or flagged.

---

## 1. الشعار الحقيقي / Real logo

- [ ] ضع ملف الشعار في `public/brand/logo.png` (PNG شفاف، عرض ~640px، يفضَّل بخلفية شفافة)
- [ ] غيّر `brand.logoMode` من `"wordmark"` إلى `"image"` في `src/lib/config.ts`

> الرسم الحالي في `src/components/brand/Logo.tsx` علامة مؤقتة مرسومة كـ SVG،
> وليست شعار العلامة التجارية.

## 2. الأسعار والمخزون / Prices & stock

الأسعار الحالية (235 / 330 / 420 ج.م) والمخزون (24 / 18 / 12) **أرقام تجريبية**.

- [ ] عدّل `products` في `src/lib/products.ts` بالأسعار والمخزون الحقيقية
- [ ] بعد التأكيد: `NEXT_PUBLIC_SAMPLE_CATALOG=false` في `.env.local`
      (يختفي تنبيه «أسعار تجريبية» ويُفعَّل Product JSON-LD)

## 3. الشحن / Shipping

رسوم الشحن وجدول المحافظات في `src/lib/config.ts → shipping` مبدئية.

- [ ] أكّد رسوم كل محافظة والمدد المعلنة (`fee`, `days`)
- [ ] أكّد قواعد الشحن المجاني الحالية في `src/lib/config.ts → shipping`:
      المنصورة مجانًا (`freeCityNames`)، وطلبات الجملة ١٢ زجاجة فأكثر
      (`wholesaleMinQty`) مجانًا لباقي المحافظات — الرقم مبدئي ويحتاج تأكيدك

## 4. بيانات التواصل / Contact

لا يوجد أي رقم أو بريد أو عنوان حقيقي مُدخل — ولهذا لا تظهر أيقونات التواصل
ولا زر واتساب إطلاقًا.

- [ ] `NEXT_PUBLIC_WHATSAPP_NUMBER` — بصيغة دولية بدون `+` (مثال `201000000000`)
      ← يفعّل زر واتساب العائم ورسالة الطلب الجاهزة برقم المرجع
- [ ] `NEXT_PUBLIC_PHONE_DISPLAY`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_ADDRESS_AR`
- [ ] روابط السوشيال (تظهر فقط عند تعبئتها):
      `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_FACEBOOK_URL`, `NEXT_PUBLIC_TIKTOK_URL`
- [ ] حدِّث صفحة `src/app/[locale]/contact/page.tsx` بنفس القيم

## 5. الإدارة / Admin

- [ ] **إلزامي:** غيّر `ADMIN_EMAIL` و `ADMIN_PASSWORD`
- [ ] **إلزامي:** ضع `ADMIN_SESSION_SECRET` (‏`openssl rand -hex 32`)
- [ ] لا تُنشر لوحة الإدارة على النطاق العام دون حماية إضافية (HTTP Basic على
      الـreverse proxy أو IP allowlist). المسار حاليًا: `/admin`
- [ ] قاعدة البيانات `data/store.db` — احفظها وخذ لها نسخًا احتياطيًا، وأضف
      `/data` لمكان دائم إذا نُشر الموقع على استضافة مؤقتة

## 6. الدفع / Payments

- [ ] الدفع عند الاستلام مفعّل فقط (`payments.cod`)
- [ ] إنستاباي جاهز كوديًا: `NEXT_PUBLIC_INSTAPAY_ENABLED=true` +
      `NEXT_PUBLIC_INSTAPAY_HANDLE`
- [ ] بوابة دفع إلكتروني غير مبنية (`payments.gateway.enabled = false`)

## 7. النشر / Deploy

- [ ] `NEXT_PUBLIC_SITE_URL` — النطاق النهائي (يُستخدم في sitemap/robots/metadata)
- [ ] ثبّت الاعتمادات: `npm ci && npm run build && npm start`
- [ ] خدمة مستمرة لـ SQLite (Fly.io volume / Railway / VPS). الاستضافة المشتركة
      لا تصلح لأن البيانات في ملف محلي
- [ ] اختبر: إضافة للسلة → شراء → ظهور الطلب في `/admin/orders`

## 8. المحتوى / Copy review

- [ ] راجع صفحة القصة `src/app/[locale]/story/page.tsx` — أي معلومة غير مؤكدة
      (سنوات، أجيال، مناطق زراعة) يجب حذفها أو تعديلها
- [ ] جدول الشحن و«مدة التحضير ١–٢ يوم عمل» في `config.shipping.notesAr`
- [ ] الأسئلة/المحتوى التربوي في صفحة «عن زيت الزيتون» `/olive`

## 9. متفرقات / Nice-to-have

- [ ] صور حقيقية للأحجام الثلاثة (الصور الحالية مشتقة من صورة زجاجة واحدة)
- [ ] ربط نشرة البريدية بخدمة فعلية (`NEWSLETTER_WEBHOOK_URL`)
- [ ] لوحة إدارة منتجات (تعديل الأسعار من الواجهة بدل ملف الكود)
- [ ] رسائل بريد إلكتروني/SMS تأكيد الطلب — غير موجودة عمدًا
