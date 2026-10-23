TAB_VIEWS.sell = function (inR, r) {
  var h = "";
  var Sl = inR(db.sales);
  h =
    '<button class="btn" data-add="cust">🧾 إيصال بيع جديد</button><div class="card"><div class="g">' +
    K("المبيعات", sm(Sl, saleRev)) +
    K(
      "الربح",
      sm(Sl, function (s) {
        return saleRev(s) - s.cost * s.qty;
      }),
      "in",
    ) +
    "</div>" +
    tb(
      ["التاريخ", "الإيصال", "الزبون", "المنتج", "الكمية", "السعر", "الخصم", "الإجمالي", "الربح", ""],
      Sl.map(function (s) {
        return [
          s.date,
          s.inv ? "#" + s.inv : "—",
          esc(s.cn || cname(s.inv)),
          esc(s.pn),
          fmt(s.qty),
          fmt(s.price),
          fmt(s.disc),
          fmt(saleRev(s)),
          fmt(saleRev(s) - s.cost * s.qty),
          (s.inv ? '<button class="x e" data-rc="' + s.inv + '">إيصال</button> ' : "") +
            '<button class="x e" data-ret="' +
            s.id +
            '">مرتجع</button> ' +
            dbtn("sale", s.id),
        ];
      }),
    ) +
    "</div>";
  return h;
};
