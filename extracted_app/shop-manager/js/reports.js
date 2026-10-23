function chart() {
  var e = new Date((DT || today()) + "T12:00:00"),
    D = [],
    mx = 1;
  for (var i = 6; i >= 0; i--) {
    var d = new Date(e);
    d.setDate(d.getDate() - i);
    var k = ymd(d),
      S = db.sales.filter(function (x) {
        return x.date == k;
      }),
      v = sm(S, saleRev),
      pf =
        v -
        sm(S, function (x) {
          return x.cost * x.qty;
        });
    D.push([k.slice(5), v, pf]);
    mx = Math.max(mx, v);
  }
  return (
    '<div class="card"><b>مبيعات آخر 7 أيام</b><div style="display:flex;gap:6px;align-items:flex-end;height:130px;margin-top:8px">' +
    D.map(function (x) {
      return (
        '<div style="flex:1;text-align:center;font-size:10px"><div style="height:' +
        Math.max(2, (x[1] / mx) * 90) +
        'px;background:var(--ac);border-radius:6px 6px 0 0"></div>' +
        x[0] +
        '<br><span class="' +
        (x[2] >= 0 ? "in" : "out") +
        '">' +
        fmt(x[2]) +
        "</span></div>"
      );
    }).join("") +
    '</div><div class="mut">العمود: المبيعات · الرقم: الربح</div></div>'
  );
}
function stmt(n) {
  var L = db.cust
    .filter(function (c) {
      return c.name == n;
    })
    .sort(function (a, b) {
      return a.date.localeCompare(b.date);
    });
  shr(
    "كشف حساب: " + n,
    "كشف حساب الزبون: " +
      n +
      "\n" +
      L.map(function (c) {
        return c.date + " | إيصال " + c.id + " | " + fmt(c.total) + " | آجل " + fmt(c.debt);
      }).join("\n") +
      "\nإجمالي المشتريات: " +
      fmt(
        sm(L, function (c) {
          return c.total;
        }),
      ) +
      "\nإجمالي المتبقي عليه: " +
      fmt(
        sm(L, function (c) {
          return c.debt;
        }),
      ),
  );
}
function reorder() {
  var low = db.prods.filter(function (p) {
    return p.min > 0 && p.qty <= p.min;
  });
  shr(
    "الجرد وقائمة الشراء",
    "تقرير الجرد " +
      today() +
      "\n" +
      db.prods
        .map(function (p) {
          return p.name + ": " + fmt(p.qty) + " " + p.unit + " | قيمة " + fmt(p.qty * p.cost);
        })
        .join("\n") +
      "\nقيمة المخزون: " +
      fmt(
        sm(db.prods, function (p) {
          return p.qty * p.cost;
        }),
      ) +
      "\n\nقائمة الشراء المقترحة:\n" +
      (low
        .map(function (p) {
          return p.name + " — المتبقي " + fmt(p.qty) + " — اشترِ " + fmt(p.min * 2 - p.qty);
        })
        .join("\n") || "لا يوجد نقص"),
  );
}
function rpData(ym) {
  var a = ym + "-01",
    b = ym + "-31",
    f = function (x) {
      return x.date >= a && x.date <= b;
    },
    S = db.sales.filter(f),
    E = db.exps.filter(f),
    pr = {},
    ec = {},
    rev = sm(S, saleRev),
    cg = sm(S, function (x) {
      return x.cost * x.qty;
    }),
    ex = sm(E, function (x) {
      return x.amt;
    });
  S.forEach(function (x) {
    var o = pr[x.pn] || (pr[x.pn] = { n: x.pn, q: 0, r: 0, p: 0 });
    o.q += x.qty;
    o.r += saleRev(x);
    o.p += saleRev(x) - x.cost * x.qty;
  });
  E.forEach(function (x) {
    ec[x.cat] = (ec[x.cat] || 0) + x.amt;
  });
  return {
    ym: ym,
    rev: rev,
    cg: cg,
    gp: rev - cg,
    ex: ex,
    np: rev - cg - ex,
    bu: sm(db.buys.filter(f), buyTot),
    top: Object.keys(pr)
      .map(function (k) {
        return pr[k];
      })
      .sort(function (a, b) {
        return b.p - a.p;
      })
      .slice(0, 5),
    ec: Object.keys(ec)
      .map(function (k) {
        return [k, ec[k]];
      })
      .sort(function (a, b) {
        return b[1] - a[1];
      }),
  };
}
function rpH(d) {
  return 190 + 3 * 108 + 30 + (d.top.length + 2) * 46 + 60 + (d.ec.length + 2) * 46 + 110;
}
function rpDraw(cv, d) {
  var RK = rtheme(),
    W = 900,
    x = cv.getContext("2d"),
    F = "Tahoma,Arial,sans-serif",
    lt = rcMix(RK.c1, "#ffffff", 0.86),
    ink = "#0f172a",
    y = 190;
  function T(t, X, Y, sz, col, b, al, mw) {
    x.font = (b ? "bold " : "") + sz + "px " + F;
    x.fillStyle = col;
    x.textAlign = al || "right";
    x.fillText(String(t), X, Y, mw || 700);
  }
  x.direction = "rtl";
  x.fillStyle = "#fff";
  x.fillRect(0, 0, W, cv.height);
  var g = x.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, RK.c1);
  g.addColorStop(1, RK.c2);
  rcRR(x, 40, 30, 820, 130, 36, 36);
  x.fillStyle = g;
  x.fill();
  T(ty().i || "", 860 - 20, 100, 56, "#fff", 0);
  T(db.set.sn || "التقرير الشهري", W - 170, 82, 42, "#fff", 1, "right", 560);
  T("التقرير الشهري — " + ad(d.ym.replace("-", "/")), W - 170, 134, 26, "#e2e8f0", 0);
  [
    ["المبيعات", d.rev, ink],
    ["تكلفة البضاعة المباعة", d.cg, ink],
    ["مجمل الربح", d.gp, d.gp >= 0 ? "#15803d" : "#b91c1c"],
    ["المصاريف", d.ex, "#b91c1c"],
    ["صافي الربح", d.np, d.np >= 0 ? "#15803d" : "#b91c1c"],
    ["المشتريات", d.bu, ink],
  ].forEach(function (k, i) {
    var X = i % 2 ? 40 : 460,
      Y = y + Math.floor(i / 2) * 108;
    rcRR(x, X, Y, 400, 92, 18, 18);
    x.fillStyle = lt;
    x.fill();
    T(k[0], X + 380, Y + 34, 24, "#475569", 1);
    T(sg(k[1]), X + 380, Y + 74, 34, k[2], 1);
  });
  y += 3 * 108 + 30;
  function tbl(title, H, R, xs) {
    T(title, 860, y + 8, 30, RK.c1, 1);
    y += 24;
    x.fillStyle = RK.c1;
    x.fillRect(40, y, 820, 44);
    H.forEach(function (h, i) {
      T(h, xs[i][0], y + 31, 22, "#fff", 1, xs[i][1]);
    });
    y += 44;
    R.forEach(function (r, j) {
      x.fillStyle = j % 2 ? "#f8fafc" : "#fff";
      x.fillRect(40, y, 820, 46);
      r.forEach(function (c, i) {
        T(c, xs[i][0], y + 32, 22, ink, i == r.length - 1 ? 1 : 0, xs[i][1], xs[i][2]);
      });
      y += 46;
    });
    if (!R.length) {
      T("لا توجد بيانات", W / 2, y + 32, 22, "#94a3b8", 0, "center");
      y += 46;
    }
    y += 36;
  }
  tbl(
    "أعلى المنتجات ربحًا",
    ["المنتج", "الكمية", "المبيعات", "الربح"],
    d.top.map(function (o) {
      return [o.n, ad(fmt(o.q)), ad(fmt(o.r)), sg(o.p)];
    }),
    [
      [846, "right", 300],
      [470, "center"],
      [330, "center"],
      [110, "center"],
    ],
  );
  tbl(
    "المصاريف حسب البند",
    ["البند", "المبلغ"],
    d.ec.map(function (e) {
      return [e[0], ad(fmt(e[1]))];
    }),
    [
      [846, "right", 500],
      [110, "center"],
    ],
  );
  T("أُنشئ بتاريخ " + ad(today().replace(/-/g, "/")), W / 2, cv.height - 40, 20, "#64748b", 0, "center");
}
function monthPick() {
  var m = modal(
    '<b>تقرير شهري</b><label>الشهر</label><input id="mp" type="month" value="' +
      today().slice(0, 7) +
      '"><div class="row" style="margin-top:8px"><button class="btn" id="ok">إنشاء</button><button class="btn s" id="no">إلغاء</button></div>',
  );
  m.querySelector("#no").onclick = function () {
    m.remove();
  };
  m.querySelector("#ok").onclick = function () {
    var v = m.querySelector("#mp").value || today().slice(0, 7);
    m.remove();
    rpShow(v);
  };
}
function rpShow(ym) {
  var d = rpData(ym),
    cv = document.createElement("canvas");
  cv.width = 900;
  cv.height = rpH(d);
  rpDraw(cv, d);
  var m = modal(
    "<b>تقرير " +
      ym +
      '</b><img src="' +
      cv.toDataURL("image/png") +
      '" style="width:100%;border-radius:10px;margin:8px 0;border:1px solid var(--bd)"><div class="row"><button class="btn" id="ri">🖼️ صورة</button><button class="btn" id="rp">📄 PDF</button></div><button class="btn s" id="no">إغلاق</button>',
  );
  m.querySelector("#no").onclick = function () {
    m.remove();
  };
  m.querySelector("#ri").onclick = function () {
    cv.toBlob(function (b) {
      shareBlob(b, "report-" + ym + ".png", "image/png");
    });
  };
  m.querySelector("#rp").onclick = function () {
    shareBlob(pdfBlob(cv), "report-" + ym + ".pdf", "application/pdf");
  };
}
