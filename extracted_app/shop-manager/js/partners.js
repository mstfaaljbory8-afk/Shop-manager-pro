function ptBal(p) {
  return (
    p.cap +
    sm(
      db.pl.filter(function (x) {
        return x.pid == p.id;
      }),
      function (x) {
        return x.type == "w" ? -x.amt : x.amt;
      },
    )
  );
}
function ptPct(p) {
  var P = db.pt,
    tc =
      sm(P, function (x) {
        return x.cap;
      }) || 1,
    M = db.set.pm || "cap";
  if (M == "fix")
    return (
      (p.pct /
        (sm(P, function (x) {
          return x.pct;
        }) || 1)) *
      100
    );
  if (M == "mix")
    return (
      (p.w || 0) +
      ((100 -
        sm(P, function (x) {
          return x.w || 0;
        })) *
        p.cap) /
        tc
    );
  return (p.cap / tc) * 100;
}
function ptCalc(a, b) {
  var S = db.sales.filter(function (x) {
      return x.date >= a && x.date <= b;
    }),
    rev = sm(S, saleRev),
    cg = sm(S, function (x) {
      return x.cost * x.qty;
    }),
    ex = sm(
      db.exps.filter(function (x) {
        return x.date >= a && x.date <= b;
      }),
      function (x) {
        return x.amt;
      },
    ),
    pr = rev - cg - ex,
    res = pr > 0 ? (pr * (+db.set.pr || 0)) / 100 : 0,
    ds = pr - res,
    P = db.pt,
    tc =
      sm(P, function (x) {
        return x.cap;
      }) || 1,
    M = db.set.pm || "cap",
    rows;
  if (pr <= 0 || M == "cap")
    rows = P.map(function (p) {
      return { p: p, sh: (ds * p.cap) / tc };
    });
  else if (M == "fix") {
    var tp =
      sm(P, function (x) {
        return x.pct;
      }) || 1;
    rows = P.map(function (p) {
      return { p: p, sh: (ds * p.pct) / tp };
    });
  } else {
    var wk = sm(P, function (x) {
        return x.w || 0;
      }),
      rem = ds * (1 - wk / 100);
    rows = P.map(function (p) {
      return { p: p, sh: (ds * (p.w || 0)) / 100 + (rem * p.cap) / tc };
    });
  }
  rows.forEach(function (r) {
    r.pct = ds ? (r.sh / ds) * 100 : 0;
  });
  return { pr: pr, res: res, ds: ds, rows: rows };
}
function ptForm(p) {
  fm(
    p ? "تعديل شريك" : "شريك جديد",
    [
      { k: "name", l: "اسم الشريك", v: p && p.name },
      { k: "phone", l: "الهاتف", v: p && p.phone },
      { k: "cap", l: "رأس المال المدفوع", t: "number", v: p && p.cap },
      { k: "pct", l: "النسبة المتفق عليها % (لطريقة النسب المتفق عليها)", t: "number", v: p && p.pct },
      { k: "w", l: "نسبة الشريك العامل % من الربح (للطريقة المختلطة)", t: "number", v: p && p.w },
    ],
    function (o) {
      if (!o.name) return "اكتب اسم الشريك";
      if (o.cap < 0) return "رأس المال لا يكون سالبًا";
      if (p) {
        if (o.cap != p.cap) addLog("تعديل رأس مال شريك", p.name + ": " + fmt(p.cap) + " ← " + fmt(o.cap));
        Object.assign(p, o);
      } else {
        db.pt.push({
          id: ++db.seq,
          name: o.name,
          phone: o.phone,
          cap: o.cap,
          pct: o.pct,
          w: o.w,
          join: today(),
        });
        addLog("إضافة شريك", o.name + " — " + fmt(o.cap));
      }
    },
  );
}
async function editPt(id) {
  var p = db.pt.find(function (x) {
    return x.id == id;
  });
  if (!p || !(await auth())) return;
  ptForm(p);
}
async function ptWd(id) {
  if (!(await auth())) return;
  fm(
    "سحب شريك",
    [
      {
        k: "pid",
        l: "الشريك",
        o: db.pt.map(function (p) {
          return [p.id, p.name];
        }),
        v: id,
      },
      { k: "amt", l: "المبلغ", t: "number" },
      { k: "date", l: "التاريخ", t: "date", v: today() },
      { k: "note", l: "ملاحظة" },
    ],
    function (o) {
      if (!(o.amt > 0)) return "أدخل المبلغ";
      var p = db.pt.find(function (x) {
        return x.id == o.pid;
      });
      db.pl.push({ id: ++db.seq, pid: +o.pid, date: o.date, type: "w", amt: o.amt, note: o.note });
      addLog("سحب شريك", (p ? p.name : "") + " " + fmt(o.amt));
    },
  );
}
function ptStmt(id) {
  var p = db.pt.find(function (x) {
    return x.id == id;
  });
  if (!p) return;
  var L = db.pl
    .filter(function (x) {
      return x.pid == id;
    })
    .sort(function (a, b) {
      return a.date.localeCompare(b.date) || a.id - b.id;
    });
  shr(
    "كشف حساب شريك",
    ["كشف حساب الشريك: " + p.name, db.set.sn || "", "رأس المال: " + fmt(p.cap), ""]
      .concat(
        L.map(function (x) {
          return (
            x.date +
            " | " +
            (x.type == "d" ? "توزيع أرباح" : "سحب") +
            " | " +
            fmt(x.amt) +
            (x.note ? " | " + x.note : "")
          );
        }),
        ["", "الرصيد الحالي: " + fmt(ptBal(p))],
      )
      .join("\n"),
  );
}
function ptSettle() {
  if (!db.pt.length) return toast("أضف شركاء أولًا");
  var n = new Date(),
    f = new Date(n.getFullYear(), n.getMonth() - 1, 1),
    l = new Date(n.getFullYear(), n.getMonth(), 0);
  var m = modal(
      '<b>حساب وتوزيع أرباح فترة</b><label>من</label><input id="ps_a" type="date" value="' +
        ymd(f) +
        '"><label>إلى</label><input id="ps_b" type="date" value="' +
        ymd(l) +
        '"><button type="button" class="btn s" id="ps_c">احسب</button><div id="ps_r"></div><div class="mut" id="er" style="color:var(--out);margin:6px 0"></div><div class="row"><button class="btn" id="ok" disabled>اعتماد التوزيع</button><button class="btn s" id="no">إغلاق</button></div>',
    ),
    R = null,
    A = function () {
      return m.querySelector("#ps_a").value;
    },
    B = function () {
      return m.querySelector("#ps_b").value;
    };
  m.querySelector("#no").onclick = function () {
    m.remove();
  };
  m.querySelector("#ps_c").onclick = function () {
    R = ptCalc(A(), B());
    m.querySelector("#ps_r").innerHTML =
      '<div class="g" style="margin:8px 0">' +
      K("الربح الصافي", R.pr, R.pr >= 0 ? "in" : "out") +
      K("الاحتياطي", R.res) +
      "</div>" +
      tb(
        ["الشريك", "النسبة", "الحصة"],
        R.rows.map(function (r) {
          return [
            esc(r.p.name),
            fmt(r.pct) + "%",
            '<b class="' + (r.sh >= 0 ? "in" : "out") + '">' + fmt(r.sh) + "</b>",
          ];
        }),
      );
    m.querySelector("#ok").disabled = false;
  };
  m.querySelector("#ok").onclick = async function () {
    if (!R) return;
    var a = A(),
      b = B();
    if (
      db.pp.some(function (q) {
        return !(b < q.from || a > q.to);
      })
    )
      return (m.querySelector("#er").textContent = "هذه الفترة تتداخل مع فترة وُزّعت أرباحها سابقًا");
    if (!(await auth())) return;
    R.rows.forEach(function (r) {
      db.pl.push({
        id: ++db.seq,
        pid: r.p.id,
        date: today(),
        type: "d",
        amt: Math.round(r.sh * 100) / 100,
        note: "أرباح " + a + " → " + b,
      });
    });
    db.pp.push({ id: ++db.seq, from: a, to: b, profit: R.pr, model: db.set.pm || "cap" });
    addLog("توزيع أرباح", a + " → " + b + " = " + fmt(R.pr));
    m.remove();
    save();
    render();
  };
}
