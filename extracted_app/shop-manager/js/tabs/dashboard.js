TAB_VIEWS.dash = function (inR, r) {
  var h = "";
  var S = inR(db.sales),
    rev = sm(S, saleRev),
    cg = sm(S, function (s) {
      return s.cost * s.qty;
    }),
    ex = sm(inR(db.exps), function (e) {
      return e.amt;
    }),
    bu = sm(inR(db.buys), buyTot),
    gp = rev - cg;
  var capN = sm(db.cap, function (c) {
      return c.type == "in" ? c.amt : -c.amt;
    }),
    rA = sm(db.sales, saleRev),
    cA = sm(db.sales, function (s) {
      return s.cost * s.qty;
    }),
    eA = sm(db.exps, function (e) {
      return e.amt;
    }),
    bA = sm(db.buys, buyTot);
  var sv = sm(db.prods, function (p) {
      return p.qty * p.cost;
    }),
    recv = sm(db.cust, function (c) {
      return c.debt;
    }),
    pay = sm(db.buys, function (b) {
      return b.debt || 0;
    }),
    cash =
      capN +
      rA -
      recv -
      (bA - pay) -
      eA -
      sm(db.pl, function (x) {
        return x.type == "w" ? x.amt : 0;
      }),
    np = rA - cA - eA;
  h =
    '<button class="btn s" id="mrp">📄 تقرير شهري (صورة / PDF)</button>' +
    chart() +
    '<div class="card"><b>أداء الفترة</b><div class="g" style="margin-top:8px">' +
    K("المبيعات", rev) +
    K("تكلفة البضاعة المباعة", cg) +
    K("مجمل الربح", gp, gp >= 0 ? "in" : "out") +
    K("المصاريف", ex, "out") +
    K("صافي الربح", gp - ex, gp - ex >= 0 ? "in" : "out") +
    K("المشتريات", bu) +
    '</div><div class="mut" style="margin-top:6px">عدد عمليات البيع: ' +
    S.length +
    (rev ? " · هامش الربح: " + fmt((gp / rev) * 100) + "%" : "") +
    "</div></div>";
  var top = {};
  S.forEach(function (s) {
    top[s.pn] = (top[s.pn] || 0) + saleRev(s) - s.cost * s.qty;
  });
  var tl = Object.keys(top)
    .map(function (k) {
      return [k, top[k]];
    })
    .sort(function (a, b) {
      return b[1] - a[1];
    })
    .slice(0, 5);
  h +=
    '<div class="card"><b>الوضع المالي الكلي</b><div class="g" style="margin-top:8px">' +
    K("رأس المال", capN) +
    K("النقد المتوفر (تقديري)", cash, cash >= 0 ? "" : "out") +
    K("قيمة المخزون", sv) +
    K("صافي الأصول", cash + sv + recv - pay) +
    K("صافي الربح التراكمي", np, np >= 0 ? "in" : "out") +
    K("العائد على رأس المال %", capN ? (np / capN) * 100 : 0) +
    K("ديون الزبائن لك", recv, "wa") +
    K("ديونك للموردين", pay, "wa") +
    K("صافي الأصول (" + db.set.c2 + ")", (cash + sv + recv - pay) / (db.set.rate || 1)) +
    "</div></div>";
  var low = db.prods.filter(function (p) {
    return p.qty <= p.min;
  });
  h +=
    '<div class="card"><b>الأكثر ربحًا في الفترة</b>' +
    tb(
      ["المنتج", "الربح"],
      tl.map(function (x) {
        return [esc(x[0]), fmt(x[1])];
      }),
    ) +
    '</div><div class="card"><b class="wa">تنبيه نقص المخزون</b>' +
    tb(
      ["المنتج", "المتبقي", "الحد الأدنى"],
      low.map(function (p) {
        return [esc(p.name), fmt(p.qty), fmt(p.min)];
      }),
    ) +
    "</div>";
  return h;
};
