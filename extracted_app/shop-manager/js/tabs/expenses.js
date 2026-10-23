TAB_VIEWS.exp = function (inR, r) {
  var h = "";
  var E = inR(db.exps);
  h =
    '<button class="btn" data-add="exp">+ تسجيل مصروف</button><button class="btn s" id="rex">🔁 مصاريف متكررة</button><div class="card"><b>إجمالي المصاريف: ' +
    fmt(
      sm(E, function (e) {
        return e.amt;
      }),
    ) +
    "</b>" +
    tb(
      ["التاريخ", "البند", "المبلغ", "ملاحظة", ""],
      E.map(function (e) {
        return [e.date, esc(e.cat), fmt(e.amt), esc(e.note), dbtn("exp", e.id)];
      }),
    ) +
    "</div>";
  return h;
};
