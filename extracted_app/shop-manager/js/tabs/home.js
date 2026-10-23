TAB_VIEWS.home = function (inR, r) {
  var h = "";
  var t0 = today(),
    S0 = db.sales.filter(function (x) {
      return x.date == t0;
    }),
    v0 = sm(S0, saleRev),
    lw = db.prods.filter(function (p) {
      return p.min > 0 && p.qty <= p.min;
    }).length;
  h =
    (emp()
      ? '<div class="card">👤 وضع الموظف: <b>' +
        esc(curU().name) +
        '</b><button class="btn s" id="xemp" style="margin-top:8px">خروج (يتطلب رمز المالك)</button></div>'
      : "") +
    '<div class="g">' +
    K("مبيعات اليوم", v0) +
    K(
      "ربح اليوم",
      v0 -
        sm(S0, function (x) {
          return x.cost * x.qty;
        }),
      "in",
    ) +
    K(
      "ديون الزبائن",
      sm(db.cust, function (c) {
        return c.debt;
      }),
      "wa",
    ) +
    K("نواقص المخزون", lw, lw ? "out" : "") +
    "</div>";
  return h;
};
