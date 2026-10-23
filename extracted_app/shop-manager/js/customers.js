function custCard(CU) {
  var by = {};
  CU.forEach(function (c) {
    var b = by[c.name] || (by[c.name] = { n: c.name, ph: "", k: 0, t: 0, d: 0, l: "" });
    b.k++;
    b.t += c.total;
    b.d += c.debt;
    if (c.photo && !b.ph) b.ph = c.photo;
    if (c.date > b.l) b.l = c.date;
  });
  var A = Object.keys(by)
    .map(function (k) {
      return by[k];
    })
    .sort(
      CS == "n"
        ? function (a, b) {
            return a.n.localeCompare(b.n, "ar");
          }
        : function (a, b) {
            return b.l.localeCompare(a.l);
          },
    );
  return (
    '<div class="card"><b>الزبائن (' +
    A.length +
    ")</b>" +
    tb(
      ["", "الزبون", "الإيصالات", "إجمالي المشتريات", "المتبقي عليه", "آخر شراء", ""],
      A.map(function (b) {
        return [
          b.ph
            ? '<img src="' + b.ph + '" width="44" height="44" style="border-radius:50%;object-fit:cover">'
            : "👤",
          esc(b.n),
          b.k,
          fmt(b.t),
          '<b class="' + (b.d > 0 ? "wa" : "") + '">' + fmt(b.d) + "</b>",
          b.l,
          '<button class="x e" data-st="' + encodeURIComponent(b.n) + '">كشف حساب</button>',
        ];
      }),
    ) +
    "</div>"
  );
}
