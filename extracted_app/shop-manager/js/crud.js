function pay(k, id) {
  var it = (k == "buy" ? db.buys : db.cust).find(function (x) {
    return x.id == id;
  });
  if (!it) return;
  fm(
    "تسديد دفعة (المتبقي " + fmt(it.debt) + ")",
    [
      { k: "a", l: "المبلغ المسدّد", t: "number", v: it.debt },
      { k: "dd", l: "موعد جديد للباقي (اختياري)", t: "date" },
    ],
    function (o) {
      if (o.a <= 0 || o.a > it.debt) return "المبلغ غير صحيح";
      it.debt -= o.a;
      if (o.dd) it.dd = o.dd;
      if (it.debt <= 0) it.dd = "";
      addLog("تسديد", (k == "buy" ? "مورد " : "زبون ") + (it.name || it.sup || it.pn) + " " + fmt(o.a));
    },
  );
}
function add(k) {
  if (k == "prod")
    fm(
      "منتج جديد",
      [
        { k: "name", l: "اسم المنتج" },
        { k: "cat", l: "النوع / التصنيف", dl: catOpts() },
        { k: "unit", l: "الوحدة", v: ty().u[0], dl: ty().u },
        { k: "price", l: "سعر البيع (مفرد)", t: "number" },
        { k: "wprice", l: "سعر الجملة", t: "number" },
        { k: "qty", l: "الكمية الموجودة حاليًا (بضاعة سابقة)", t: "number" },
        { k: "cost", l: "سعر شراء الوحدة / التكلفة", t: "number" },
        { k: "bc", l: "الباركود (اختياري)" },
        { k: "ex", l: exL() },
        { k: "min", l: "حد التنبيه (أقل كمية)", t: "number" },
        { k: "sup", l: "المورد" },
      ],
      function (o) {
        if (!o.name) return "اكتب اسم المنتج";
        if (o.qty > 0 && !(o.cost > 0)) return "أدخل سعر شراء الوحدة (التكلفة) للكمية الموجودة";
        var p = {
          id: ++db.seq,
          name: o.name,
          cat: o.cat,
          unit: o.unit,
          price: o.price,
          wprice: o.wprice,
          bc: o.bc,
          ex: o.ex,
          min: o.min,
          sup: o.sup,
          qty: o.qty,
          cost: o.cost,
        };
        db.prods.push(p);
        addLog(
          "إضافة منتج",
          p.name + (o.qty > 0 ? " — رصيد افتتاحي " + fmt(o.qty) + " × " + fmt(o.cost) : ""),
        );
      },
      function (m) {
        scanBtn(m, function (c) {
          m.querySelector("#f_bc").value = c;
        });
      },
    );
  if (k == "buy") {
    if (needProd()) return;
    fm(
      "بضاعة مستوردة",
      [
        { k: "date", l: "التاريخ", t: "date", v: today() },
        { k: "pid", l: "المنتج", o: popts() },
        { k: "qty", l: "الكمية", t: "number" },
        { k: "unit", l: "سعر شراء الوحدة", t: "number" },
        { k: "price", l: "سعر البيع (مفرد) — يُسجَّل للمنتج", t: "number" },
        { k: "wprice", l: "سعر البيع (جملة) — اختياري", t: "number" },
        { k: "ship", l: "مصاريف الشحن والجمارك (إجمالي)", t: "number" },
        { k: "sup", l: "المورد" },
        { k: "debt", l: "المبلغ الآجل للمورد (دين)", t: "number" },
        { k: "dd", l: "موعد التسديد", t: "date" },
      ],
      function (o) {
        var p = prod(o.pid);
        if (!p || o.qty <= 0 || o.unit <= 0) return "أدخل الكمية والسعر";
        var b = {
            id: ++db.seq,
            date: o.date,
            pid: p.id,
            pn: p.name,
            qty: o.qty,
            unit: o.unit,
            ship: o.ship,
            sup: o.sup || p.sup,
            debt: Math.min(o.debt, o.qty * o.unit + o.ship),
            dd: o.dd,
          },
          t = buyTot(b);
        p.cost = (p.qty * p.cost + t) / (p.qty + o.qty);
        p.qty += o.qty;
        if (o.sup && !p.sup) p.sup = o.sup;
        db.buys.push(b);
        if (o.price > 0) p.price = o.price;
        if (o.wprice > 0) p.wprice = o.wprice;
        addLog("شراء", p.name + " × " + fmt(o.qty) + " = " + fmt(t));
      },
      function (m) {
        var s = m.querySelector("#f_pid"),
          fill = function () {
            var p = prod(s.value);
            if (p) {
              m.querySelector("#f_price").value = p.price || "";
              m.querySelector("#f_wprice").value = p.wprice || "";
            }
          };
        s.addEventListener("change", fill);
        fill();
      },
    );
  }
  if (k == "sale") {
    if (needProd()) return;
    fm(
      "تسجيل بيع",
      [
        { k: "date", l: "التاريخ", t: "date", v: today() },
        { k: "pid", l: "المنتج", o: popts() },
        { k: "qty", l: "الكمية", t: "number" },
        { k: "price", l: "سعر بيع الوحدة", t: "number", v: db.prods[0].price },
        { k: "disc", l: "خصم على الفاتورة", t: "number" },
      ],
      function (o) {
        var p = prod(o.pid);
        if (!p || o.qty <= 0) return "أدخل الكمية";
        if (o.qty > p.qty) return "الكمية المتوفرة " + fmt(p.qty) + " فقط";
        var s = {
          id: ++db.seq,
          date: o.date,
          pid: p.id,
          pn: p.name,
          qty: o.qty,
          price: o.price,
          disc: o.disc,
          cost: p.cost,
        };
        p.qty -= o.qty;
        db.sales.push(s);
        addLog("بيع", p.name + " × " + fmt(o.qty) + " = " + fmt(saleRev(s)));
      },
      function (m) {
        var s = m.querySelector("#f_pid");
        s.onchange = function () {
          m.querySelector("#f_price").value = prod(s.value).price;
        };
        scanBtn(m, function (c) {
          var p = db.prods.find(function (x) {
            return x.bc == c;
          });
          if (!p) return toast("لا يوجد منتج بهذا الباركود");
          s.value = p.id;
          s.onchange();
        });
      },
    );
  }
  if (k == "cust") {
    rcForm();
    return;
  }
  if (k == "pt") {
    ptForm();
    return;
  }
  if (k == "us") {
    fm(
      "موظف جديد",
      [
        { k: "name", l: "اسم الموظف" },
        { k: "phone", l: "الهاتف" },
      ],
      function (o) {
        if (!o.name) return "اكتب الاسم";
        db.us.push({ id: ++db.seq, name: o.name, phone: o.phone });
        addLog("إضافة موظف", o.name);
      },
    );
    return;
  }
  if (k == "exp")
    fm(
      "مصروف",
      [
        { k: "date", l: "التاريخ", t: "date", v: today() },
        { k: "cat", l: "البند", o: expOpts() },
        { k: "amt", l: "المبلغ", t: "number" },
        { k: "note", l: "ملاحظة" },
      ],
      function (o) {
        if (o.amt <= 0) return "أدخل المبلغ";
        db.exps.push({ id: ++db.seq, date: o.date, cat: o.cat, amt: o.amt, note: o.note });
        addLog("مصروف", o.cat + " " + fmt(o.amt));
      },
    );
  if (k == "cap")
    fm(
      "حركة رأس مال",
      [
        { k: "date", l: "التاريخ", t: "date", v: today() },
        {
          k: "type",
          l: "النوع",
          o: [
            ["in", "إيداع / رأس مال"],
            ["out", "سحب"],
          ],
        },
        { k: "amt", l: "المبلغ", t: "number" },
        { k: "note", l: "ملاحظة" },
      ],
      function (o) {
        if (o.amt <= 0) return "أدخل المبلغ";
        db.cap.push({ id: ++db.seq, date: o.date, type: o.type, amt: o.amt, note: o.note });
        addLog("رأس مال", (o.type == "in" ? "إيداع " : "سحب ") + fmt(o.amt));
      },
    );
}
function edit(id) {
  var p = prod(id);
  fm(
    "تعديل المنتج",
    [
      { k: "name", l: "الاسم", v: p.name },
      { k: "cat", l: "النوع", v: p.cat, dl: catOpts() },
      { k: "unit", l: "الوحدة", v: p.unit, dl: ty().u },
      { k: "price", l: "سعر البيع (مفرد)", t: "number", v: p.price },
      { k: "wprice", l: "سعر الجملة", t: "number", v: p.wprice },
      { k: "bc", l: "الباركود", v: p.bc },
      { k: "ex", l: exL(), v: p.ex },
      { k: "qty", l: "الكمية الحالية (تعديل / جرد)", t: "number", v: p.qty },
      { k: "cost", l: "سعر شراء الوحدة / التكلفة", t: "number", v: p.cost },
      { k: "min", l: "حد التنبيه", t: "number", v: p.min },
      { k: "sup", l: "المورد", v: p.sup },
    ],
    function (o) {
      if (!o.name) return "اكتب الاسم";
      if (o.qty < 0) return "الكمية لا تكون سالبة";
      if (o.qty > 0 && !(o.cost > 0)) return "أدخل سعر شراء الوحدة (التكلفة)";
      if (o.qty != p.qty) addLog("تعديل كمية", p.name + ": " + fmt(p.qty) + " ← " + fmt(o.qty));
      addLog("تعديل منتج", p.name + " ← سعر " + fmt(o.price));
      Object.assign(p, o);
    },
    function (m) {
      scanBtn(m, function (c) {
        m.querySelector("#f_bc").value = c;
      });
    },
  );
}
async function del(kind, id) {
  id = +id;
  var L = { prod: "prods", buy: "buys", sale: "sales", exp: "exps", cap: "cap", cust: "cust", pt: "pt" }[
      kind
    ],
    it = db[L].find(function (x) {
      return x.id == id;
    });
  if (!it) return;
  if (kind == "sale" && it.inv) return toast("هذا البيع ضمن إيصال زبون، احذف الإيصال من تبويب الزبائن");
  if (
    kind == "prod" &&
    (db.buys.some(function (b) {
      return b.pid == id;
    }) ||
      db.sales.some(function (s) {
        return s.pid == id;
      }))
  )
    return toast("لا يمكن حذف منتج له عمليات شراء أو بيع مسجلة");
  if (
    kind == "pt" &&
    db.pl.some(function (x) {
      return x.pid == id;
    })
  )
    return toast("لا يمكن حذف شريك له حركات مسجلة");
  if (kind == "buy") {
    var p = prod(it.pid);
    if (p && p.qty < it.qty) return toast("لا يمكن حذف الشراء: بيع جزء من هذه الكمية");
  }
  if (!(await auth())) return;
  if (kind == "buy") {
    var p2 = prod(it.pid);
    if (p2) {
      var v = p2.qty * p2.cost - buyTot(it);
      p2.qty -= it.qty;
      p2.cost = p2.qty > 0 ? Math.max(0, v / p2.qty) : p2.cost;
    }
  }
  if (kind == "sale") {
    var p3 = prod(it.pid);
    if (p3) p3.qty += it.qty;
  }
  if (kind == "cust") {
    db.sales
      .filter(function (x) {
        return x.inv == id;
      })
      .forEach(function (x) {
        var q = prod(x.pid);
        if (q) q.qty += x.qty;
      });
    db.sales = db.sales.filter(function (x) {
      return x.inv != id;
    });
  }
  db[L] = db[L].filter(function (x) {
    return x.id != id;
  });
  addLog(
    "حذف",
    kind + " #" + id + " " + (it.pn || it.name || it.cat || "") + " " + fmt(it.amt || it.qty || 0),
  );
  save();
  render();
}
