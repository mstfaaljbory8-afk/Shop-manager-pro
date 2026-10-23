TAB_VIEWS.stock = function (inR, r) {
  var h = "";
  h =
    '<button class="btn" data-add="prod">+ منتج جديد</button><button class="btn s" id="rl">📋 قائمة الشراء المقترحة وتقرير الجرد</button><button class="btn s" id="inv" data-inv="1">📋 جرد دوري (مطابقة الكميات)</button><div class="card">' +
    tb(
      [
        "المنتج",
        "النوع",
        "الوحدة",
        "الكمية",
        "متوسط التكلفة",
        "سعر البيع",
        "سعر الجملة",
        "قيمة المخزون",
        "المورد",
        "",
      ],
      db.prods.map(function (p) {
        return [
          esc(p.name),
          esc(p.cat) + (p.ex ? '<br><span class="mut">' + esc(p.ex) + "</span>" : ""),
          esc(p.unit),
          '<b class="' + (p.qty <= p.min ? "out" : "") + '">' + fmt(p.qty) + "</b>",
          fmt(p.cost),
          fmt(p.price),
          fmt(p.wprice || p.price),
          fmt(p.qty * p.cost),
          esc(p.sup),
          '<button class="x e" data-ed="' + p.id + '">تعديل</button> ' + dbtn("prod", p.id),
        ];
      }),
    ) +
    '<div class="mut" style="margin-top:6px">تُضاف الكميات من تبويب «المشتريات». ' +
    (emp()
      ? ""
      : "إجمالي قيمة المخزون: " +
        fmt(
          sm(db.prods, function (p) {
            return p.qty * p.cost;
          }),
        )) +
    "</div></div>";
  return h;
};
