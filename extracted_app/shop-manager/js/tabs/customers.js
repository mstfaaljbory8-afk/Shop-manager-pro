TAB_VIEWS.cust = function (inR, r) {
  var h = "";
  var CU = db.cust.slice().sort(
    CS == "n"
      ? function (a, b) {
          return a.name.localeCompare(b.name, "ar") || b.id - a.id;
        }
      : function (a, b) {
          return b.date.localeCompare(a.date) || b.id - a.id;
        },
  );
  h =
    '<button class="btn" data-add="cust">+ إيصال بيع لزبون</button><div class="pt"><button data-cs="n" class="' +
    (CS == "n" ? "on" : "") +
    '">ترتيب أبجدي</button><button data-cs="d" class="' +
    (CS == "d" ? "on" : "") +
    '">حسب التاريخ</button></div><div class="card"><div class="g">' +
    K(
      "إجمالي المبيعات للزبائن",
      sm(CU, function (c) {
        return c.total;
      }),
    ) +
    K(
      "ديون الزبائن",
      sm(CU, function (c) {
        return c.debt;
      }),
      "wa",
    ) +
    "</div></div>" +
    custCard(CU) +
    '<div class="card"><b>الإيصالات</b>' +
    tb(
      ["", "الزبون", "التاريخ", "البائع", "البضاعة", "الإجمالي", "المقبوض", "الآجل", "الاستحقاق", ""],
      CU.map(function (c) {
        return [
          c.photo
            ? '<img src="' + c.photo + '" width="44" height="44" style="border-radius:50%;object-fit:cover">'
            : "👤",
          esc(c.name),
          c.date,
          esc(c.seller),
          esc(c.items),
          fmt(c.total),
          fmt(c.total - c.debt),
          '<b class="' + (c.debt > 0 ? "wa" : "") + '">' + fmt(c.debt) + "</b>",
          c.dd || "",
          '<button class="x e" data-rc="' +
            c.id +
            '">إيصال</button> <button class="x e" data-erc="' +
            c.id +
            '">تعديل</button> <button class="x e" data-st="' +
            encodeURIComponent(c.name) +
            '">كشف</button> ' +
            (c.debt > 0 ? '<button class="x e" data-pay="cust:' + c.id + '">تسديد</button> ' : "") +
            dbtn("cust", c.id),
        ];
      }),
    ) +
    "</div>";
  return h;
};
