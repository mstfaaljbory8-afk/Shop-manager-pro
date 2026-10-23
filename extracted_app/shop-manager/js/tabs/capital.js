TAB_VIEWS.cap = function (inR, r) {
  var h = "";
  var C = inR(db.cap);
  h =
    '<button class="btn" data-add="cap">+ حركة رأس مال</button><div class="card"><b>رأس المال الحالي: ' +
    fmt(
      sm(db.cap, function (c) {
        return c.type == "in" ? c.amt : -c.amt;
      }),
    ) +
    "</b>" +
    tb(
      ["التاريخ", "النوع", "المبلغ", "ملاحظة", ""],
      C.map(function (c) {
        return [c.date, c.type == "in" ? "إيداع" : "سحب", fmt(c.amt), esc(c.note), dbtn("cap", c.id)];
      }),
    ) +
    "</div>";
  return h;
};
