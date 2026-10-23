async function ret(id) {
  var s = db.sales.find(function (x) {
    return x.id == id;
  });
  if (!s || !(await auth())) return;
  fm(
    "مرتجع: " + s.pn + " (المباع " + fmt(s.qty) + ")",
    [{ k: "q", l: "الكمية المرتجعة", t: "number" }],
    function (o) {
      if (o.q <= 0 || o.q > s.qty) return "كمية غير صحيحة";
      var p = prod(s.pid),
        v = o.q * s.price;
      if (p) p.qty += o.q;
      s.qty -= o.q;
      if (s.inv) {
        var c = db.cust.find(function (x) {
          return x.id == s.inv;
        });
        if (c) {
          c.total = Math.max(0, c.total - v);
          c.debt = Math.max(0, c.debt - v);
          c.items += " | مرتجع " + s.pn + " ×" + fmt(o.q);
        }
      }
      if (s.qty <= 0)
        db.sales = db.sales.filter(function (x) {
          return x.id != s.id;
        });
      addLog("مرتجع", s.pn + " ×" + fmt(o.q) + " = " + fmt(v));
    },
  );
}
function invCount() {
  if (!db.prods.length) return toast("لا توجد منتجات");
  var m = modal(
    '<b>📋 جرد دوري</b><div class="mut" style="margin:4px 0 8px">اكتب الكمية الفعلية الموجودة لكل منتج. اترك الخانة فارغة لما لا تريد جرده.</div>' +
      db.prods
        .map(function (p) {
          return (
            '<div class="row" style="align-items:center;margin-bottom:6px"><div style="flex:2">' +
            esc(p.name) +
            '<br><span class="mut">في النظام: ' +
            fmt(p.qty) +
            ' <span class="idf" data-p="' +
            p.id +
            '"></span></span></div><input class="ia" data-p="' +
            p.id +
            '" inputmode="decimal" placeholder="الفعلي"></div>'
          );
        })
        .join("") +
      '<div class="mut" id="er" style="color:var(--out);margin:6px 0"></div><div class="row"><button class="btn" id="ok">اعتماد الجرد</button><button class="btn s" id="no">إلغاء</button></div>',
  );
  m.querySelectorAll(".ia").forEach(function (i) {
    i.oninput = function () {
      var p = prod(i.dataset.p),
        f = m.querySelector('.idf[data-p="' + i.dataset.p + '"]');
      if (i.value.trim() === "") {
        f.textContent = "";
        return;
      }
      var df = num(i.value) - p.qty;
      f.innerHTML =
        df == 0
          ? "✔️"
          : '<b class="' + (df < 0 ? "out" : "in") + '">الفرق ' + (df > 0 ? "+" : "") + fmt(df) + "</b>";
    };
  });
  m.querySelector("#no").onclick = function () {
    m.remove();
  };
  m.querySelector("#ok").onclick = async function () {
    var rows = [];
    m.querySelectorAll(".ia").forEach(function (i) {
      if (i.value.trim() === "") return;
      var p = prod(i.dataset.p),
        a = num(i.value);
      if (p && a >= 0 && a != p.qty) rows.push({ i: p.id, n: p.name, s: p.qty, a: a, c: p.cost });
    });
    if (!rows.length) return (m.querySelector("#er").textContent = "لا توجد فروق لتسجيلها");
    if (!(await auth())) return;
    var v = 0;
    rows.forEach(function (r) {
      var p = prod(r.i);
      p.qty = r.a;
      v += (r.a - r.s) * r.c;
    });
    db.iv = db.iv || [];
    db.iv.push({ id: ++db.seq, date: today(), rows: rows, val: v });
    addLog("جرد", rows.length + " صنف — فرق القيمة " + fmt(v));
    m.remove();
    save();
    render();
    shr(
      "نتيجة الجرد",
      ["نتيجة الجرد " + today(), db.set.sn || "", ""]
        .concat(
          rows.map(function (r) {
            return (
              r.n +
              ": النظام " +
              fmt(r.s) +
              " ← الفعلي " +
              fmt(r.a) +
              " (الفرق " +
              (r.a - r.s > 0 ? "+" : "") +
              fmt(r.a - r.s) +
              ")"
            );
          }),
          ["", "فرق قيمة المخزون: " + fmt(v)],
        )
        .join("\n"),
    );
  };
}
