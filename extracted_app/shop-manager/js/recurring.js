function recNext(r) {
  var n = new Date(),
    y = n.getFullYear(),
    m = n.getMonth(),
    k = y + "-" + pz(m + 1),
    due = function (yy, mm) {
      return yy + "-" + pz(mm + 1) + "-" + pz(Math.min(r.day, new Date(yy, mm + 1, 0).getDate()));
    },
    d = due(y, m);
  return r.last == k || d < today() ? due(m == 11 ? y + 1 : y, (m + 1) % 12) : d;
}
function recRun() {
  var n = new Date(),
    t = ymd(n),
    cur = n.getFullYear() * 12 + n.getMonth(),
    ch = false;
  (db.re || []).forEach(function (r) {
    var lp = r.last.split("-"),
      m = +lp[0] * 12 + +lp[1] - 1;
    if (cur - m > 12) m = cur - 12;
    for (m = m + 1; m <= cur; m++) {
      var y = Math.floor(m / 12),
        mo = m % 12,
        d = y + "-" + pz(mo + 1) + "-" + pz(Math.min(r.day, new Date(y, mo + 1, 0).getDate()));
      if (d > t) break;
      db.exps.push({ id: ++db.seq, date: d, cat: r.cat, amt: r.amt, note: r.name + " (متكرر)" });
      r.last = y + "-" + pz(mo + 1);
      ch = true;
      addLog("مصروف متكرر", r.name + " " + fmt(r.amt));
    }
  });
  if (ch) save();
}
function recModal() {
  var m = modal(
      '<b>🔁 المصاريف المتكررة</b><div class="mut" style="margin:4px 0 8px">تُسجَّل تلقائيًا كل شهر في يوم الاستحقاق، وتصلك تنبيهات قبلها بثلاثة أيام.</div><div id="rxl"></div><button class="btn" id="rxa">+ إضافة مصروف متكرر</button><button class="btn s" id="no">إغلاق</button>',
    ),
    draw = function () {
      m.querySelector("#rxl").innerHTML = tb(
        ["البند", "التصنيف", "المبلغ", "اليوم", ""],
        (db.re || []).map(function (r) {
          return [
            esc(r.name),
            esc(r.cat),
            fmt(r.amt),
            r.day,
            '<button class="x" data-rxd="' + r.id + '">حذف</button>',
          ];
        }),
      );
    };
  draw();
  m.querySelector("#no").onclick = function () {
    m.remove();
  };
  m.querySelector("#rxa").onclick = function () {
    fm(
      "مصروف متكرر",
      [
        { k: "name", l: "اسم المصروف (مثل إيجار المحل)" },
        { k: "cat", l: "التصنيف", o: expOpts() },
        { k: "amt", l: "المبلغ الشهري", t: "number" },
        { k: "day", l: "يوم الاستحقاق من الشهر (1-28)", t: "number", v: 1 },
      ],
      function (o) {
        if (!o.name) return "اكتب الاسم";
        if (!(o.amt > 0)) return "أدخل المبلغ";
        var d = Math.min(28, Math.max(1, Math.round(o.day) || 1)),
          n = new Date(),
          pk = new Date(n.getFullYear(), n.getMonth() - 1, 1);
        db.re = db.re || [];
        db.re.push({
          id: ++db.seq,
          name: o.name,
          cat: o.cat,
          amt: o.amt,
          day: d,
          last:
            n.getDate() >= d
              ? n.getFullYear() + "-" + pz(n.getMonth() + 1)
              : pk.getFullYear() + "-" + pz(pk.getMonth() + 1),
        });
        addLog("مصروف متكرر جديد", o.name + " " + fmt(o.amt));
        draw();
      },
    );
  };
}
