TAB_VIEWS.buy = function (inR, r) {
  var h = "";
  var B = inR(db.buys);
  h =
    '<button class="btn" data-add="buy">+ تسجيل بضاعة مستوردة</button><div class="card"><b>إجمالي المشتريات: ' +
    fmt(sm(B, buyTot)) +
    "</b>" +
    tb(
      [
        "التاريخ",
        "المنتج",
        "الكمية",
        "سعر الوحدة",
        "مصاريف شحن/جمارك",
        "الإجمالي",
        "الدين",
        "موعده",
        "المورد",
        "",
      ],
      B.map(function (b) {
        return [
          b.date,
          esc(b.pn),
          fmt(b.qty),
          fmt(b.unit),
          fmt(b.ship),
          fmt(buyTot(b)),
          fmt(b.debt),
          b.dd || "",
          esc(b.sup),
          (b.debt > 0 ? '<button class="x e" data-pay="buy:' + b.id + '">تسديد</button> ' : "") +
            dbtn("buy", b.id),
        ];
      }),
    ) +
    "</div>";
  return h;
};
