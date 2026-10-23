function setUI() {
  var s = db.set;
  return (
    '<div class="card"><b>المظهر</b>' +
    sel(
      "lg",
      "اللغة",
      [
        ["ar", "العربية"],
        ["en", "English"],
      ],
      s.lg,
    ) +
    sel(
      "md",
      "الوضع",
      [
        ["auto", "تلقائي"],
        ["light", "نهاري"],
        ["dark", "ليلي"],
      ],
      s.md,
    ) +
    sel(
      "th",
      "السمة",
      [["auto", "حسب نوع المتجر (تلقائي)"]].concat(
        Object.keys(TH).map(function (k) {
          return [k, TH[k][0]];
        }),
      ),
      s.th,
    ) +
    sel(
      "bg",
      "الخلفية",
      [
        ["t", "زخرفة وتدرجات حسب نوع المتجر"],
        ["c", "صورتي الخاصة"],
        ["none", "بدون"],
      ],
      s.bg || "t",
    ) +
    '<label>رفع صورة خلفية من هاتفك (مثلًا صورة من Gemini)</label><input type="file" id="bgup" accept="image/*">' +
    sel(
      "rt",
      "ثيم الإيصال",
      [
        ["auto", "حسب نوع المتجر"],
        ["app", "لون التطبيق"],
      ].concat(
        Object.keys(RT).map(function (k) {
          return [k, RT[k].n];
        }),
      ),
      s.rt || "auto",
    ) +
    sel(
      "rc",
      "لون مربع الإيصال",
      [
        ["o", "برتقالي"],
        ["g", "أخضر"],
        ["r", "أحمر"],
        ["p", "بنفسجي"],
        ["b", "أزرق"],
        ["t", "لون الثيم"],
      ],
      s.rc || "o",
    ) +
    sel(
      "fs",
      "حجم الخط",
      [
        [12, "صغير"],
        [14, "متوسط"],
        [16, "كبير"],
        [19, "كبير جدًا"],
      ],
      s.fs,
    ) +
    sel(
      "ic",
      "حجم الأيقونات",
      [
        [0.9, "صغير"],
        [1.15, "متوسط"],
        [1.5, "كبير"],
        [1.9, "كبير جدًا"],
      ],
      s.ic,
    ) +
    '<label>سعر الصرف (كم دينار للوحدة الثانية)</label><input data-s="rate" type="number" value="' +
    s.rate +
    '"><label>رمز العملة الثانية</label><input data-s="c2" value="' +
    s.c2 +
    '">' +
    '</div><div class="card"><b>الإشعارات</b>' +
    chk("nc", "مواعيد ديون الزبائن لك") +
    chk("ns", "مواعيد ديونك للموردين") +
    chk("nl", "نقص المخزون") +
    '<button class="btn s" id="np">السماح بإشعارات الجهاز</button></div>' +
    storeUI() +
    accUI() +
    snapUI() +
    arcUI() +
    gUI()
  );
}
function accUI() {
  return (
    '<div class="card"><b>👥 إدارة الحسابات والشركاء والموظفين</b><div class="mut" style="margin:4px 0 8px">يمكنك هنا توليد <b>رموز QR تفعيل لمرة واحدة</b> تتيح للموظفين والشركاء تسجيل الدخول مباشرة من أجهزتهم. الرمز دائم على جهاز الموظف/الشريك ويُقفل تلقائياً بعد أول استخدام لمنع مشاركته.</div>' +
    tb(
      ["الاسم", "الدور", "الحالة", "الإجراءات"],
      [["المالك", "مالك", "على هذا الجهاز", '<span class="mut">حساب رئيسي</span>']].concat(
        db.pt.map(function (p) {
          return [
            esc(p.name),
            "شريك",
            "صلاحية كاملة",
            '<button class="x e" data-qrpt="' + p.id + '">🔑 رمز QR لمرة واحدة</button>'
          ];
        }),
        db.us.map(function (u) {
          return [
            esc(u.name),
            "موظف",
            db.set.cu == u.id ? '<b class="in">وضع نشط</b>' : "جاهز",
            '<button class="x e" data-qremp="' +
              u.id +
              '">🔑 رمز QR لمرة واحدة</button> <button class="x e" data-uact="' +
              u.id +
              '">تفعيل</button> <button class="x" data-udel="' +
              u.id +
              '">حذف</button>',
          ];
        }),
      ),
    ) +
    '<button class="btn s" data-add="us">+ موظف جديد</button></div>'
  );
}

// النسخ المحلية على هذا الجهاز (IndexedDB)
function snapUI() {
  var kn = { auto: "تلقائية", manual: "يدوية", safety: "قبل استعادة" },
    h =
      '<div class="card"><b>🗂️ النسخ المحلية</b><div class="mut" style="margin:4px 0 8px">تُحفظ نسخة تلقائية كل يوم على هذا الجهاز (آخر ' +
      SNAP_KEEP.auto +
      " أيام)، ونسخة أمان قبل أي استعادة." +
      (STORE_INFO ? "<br>" + esc(STORE_INFO) : "") +
      "</div>";
  if (STORE_MODE !== "idb")
    return h + '<div class="wa">التخزين المتقدم غير متاح في هذا المتصفح، فلا تُحفظ نسخ محلية.</div></div>';
  h += '<button class="btn" id="snow">حفظ نسخة الآن</button>';
  h += SNAPS.length
    ? tb(
        ["التاريخ", "النوع", "المحتوى", ""],
        SNAPS.map(function (s) {
          var c = s.cn || {};
          return [
            esc(s.t),
            kn[s.kind] || esc(s.kind),
            (c.s || 0) + " بيع · " + (c.p || 0) + " منتج · " + Math.round((s.size || 0) / 1024) + " KB",
            '<button class="x e" data-snr="' + s.id + '">استعادة</button>',
          ];
        }),
      )
    : '<div class="mut" style="margin:6px 0">لا توجد نسخ بعد</div>';
  return h + "</div>";
}
