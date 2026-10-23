TAB_VIEWS.pt = function (inR, r) {
  var h = "";
  var PP = db.pt,
    PM = db.set.pm || "cap",
    tpc = sm(PP, function (p) {
      return p.pct;
    }),
    tww = sm(PP, function (p) {
      return p.w || 0;
    }),
    LG = db.pl
      .slice()
      .sort(function (a, b) {
        return b.date.localeCompare(a.date) || b.id - a.id;
      })
      .slice(0, 25);
  h =
    '<button class="btn" data-add="pt">+ شريك جديد</button><div class="card"><b>طريقة توزيع الأرباح</b>' +
    sel(
      "pm",
      "الأساس",
      [
        ["cap", "بنسبة رأس المال"],
        ["fix", "نسب متفق عليها"],
        ["mix", "مختلط: نسبة للشريك العامل + الباقي برأس المال"],
      ],
      PM,
    ) +
    '<label>احتياطي يُقتطع من الربح قبل التوزيع (%)</label><input data-s="pr" inputmode="decimal" value="' +
    esc(db.set.pr || "") +
    '">' +
    (PM == "fix" && PP.length && Math.abs(tpc - 100) > 0.01
      ? '<div class="mut out">⚠️ مجموع النسب ' + fmt(tpc) + "% وليس 100%، ستُعدَّل تناسبيًا.</div>"
      : "") +
    (PM == "mix" && tww > 100 ? '<div class="mut out">⚠️ مجموع نسب العمل أكبر من 100%.</div>' : "") +
    '<div class="mut" style="margin-top:6px">الخسارة تُوزَّع دائمًا بنسبة رأس المال. ورأس مال الشريك هنا لحساب النسب فقط، فسجّل الإيداع الفعلي في قسم رأس المال.</div></div><div class="card"><b>الشركاء</b>' +
    tb(
      ["الشريك", "رأس المال", "النسبة", "الرصيد", ""],
      PP.map(function (p) {
        return [
          esc(p.name),
          fmt(p.cap),
          fmt(ptPct(p)) + "%",
          fmt(ptBal(p)),
          '<button class="x e" data-pst="' +
            p.id +
            '">كشف</button> <button class="x e" data-pwd="' +
            p.id +
            '">سحب</button> <button class="x e" data-ped="' +
            p.id +
            '">تعديل</button> ' +
            dbtn("pt", p.id),
        ];
      }),
    ) +
    '</div><button class="btn" id="psl">🧮 حساب وتوزيع أرباح فترة</button><div class="card"><b>آخر الحركات</b>' +
    tb(
      ["التاريخ", "الشريك", "النوع", "المبلغ", "ملاحظة"],
      LG.map(function (x) {
        var p = PP.find(function (q) {
          return q.id == x.pid;
        });
        return [
          x.date,
          esc(p ? p.name : "—"),
          x.type == "d" ? "توزيع أرباح" : "سحب",
          fmt(x.amt),
          esc(x.note),
        ];
      }),
    ) +
    "</div>";
  return h;
};
