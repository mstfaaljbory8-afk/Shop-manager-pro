function ty() {
  return TY[db.set.st] || TY.gen;
}
function catOpts() {
  return ty().c;
}
function exL() {
  return ty().x;
}
function expOpts() {
  return EXB.concat(ty().e, ["أخرى"]).map(function (x) {
    return [x, x];
  });
}
function switchType(k, sam) {
  if (!db.set.st) {
    useType(k, sam);
    return;
  }
  if (db.set.st == k) {
    render();
    return;
  }
  var m = modal(
    "<b>تغيير نوع المتجر إلى «" +
      TY[k].n +
      '»</b><div class="mut" style="margin:8px 0;line-height:1.8">سيُحفظ متجرك الحالي («' +
      esc(db.set.sn || TY[db.set.st].n) +
      '») كنسخة احتياطية على الهاتف، ثم يبدأ المتجر الجديد <b>فارغًا</b>. تُحذف من البرنامج البضائع والمبيعات والزبائن والمصاريف الحالية، وتبقى في النسخة المحفوظة ويمكنك استعادتها من الإعدادات.</div><label>نوع البيع الافتراضي للمتجر الجديد</label><select id="sw_m"><option value="r">مفرد</option><option value="w">جملة</option></select><label style="display:flex;gap:8px;align-items:center;font-size:1em;color:var(--tx)"><input type="checkbox" id="sw_s" checked style="width:auto;margin:0">إضافة منتجات نموذجية للنوع الجديد</label><div class="row" style="margin-top:10px"><button class="btn" id="ok">متابعة</button><button class="btn s" id="no">إلغاء</button></div>',
  );
  m.querySelector("#sw_m").value = db.set.sm || "r";
  enh(m);
  m.querySelector("#no").onclick = function () {
    m.remove();
    render();
  };
  m.querySelector("#ok").onclick = async function () {
    var sp = m.querySelector("#sw_s").checked,
      sm2 = m.querySelector("#sw_m").value;
    m.remove();
    if (!(await auth())) {
      render();
      return;
    }
    var loc = await archiveStore();
    db.prods = [];
    db.buys = [];
    db.sales = [];
    db.exps = [];
    db.cap = [];
    db.cust = [];
    db.pt = [];
    db.pl = [];
    db.pp = [];
    db.set.sn = "";
    db.set.sm = sm2;
    useType(k, sp);
    toast(
      loc
        ? "حُفظت نسخة المتجر السابق في " + loc
        : "حُفظت نسخة المتجر السابق داخل التطبيق (الإعدادات ← المتاجر المحفوظة)",
    );
  };
}
function useType(k, sam) {
  db.set.st = k;
  if (!db.set.th) db.set.th = "auto";
  if (sam) {
    var T = TY[k];
    T.s.forEach(function (n, i) {
      if (
        !db.prods.some(function (p) {
          return p.name == n;
        })
      )
        db.prods.push({
          id: ++db.seq,
          name: n,
          cat: T.c[i % T.c.length],
          unit: T.u[0],
          price: 0,
          wprice: 0,
          bc: "",
          ex: "",
          min: 0,
          sup: "",
          qty: 0,
          cost: 0,
        });
    });
  }
  addLog("نوع المتجر", TY[k].n);
  applySet();
  save();
  render();
}
function typeModal() {
  var m = modal(
    '<b>ما نوع متجرك؟</b><div class="mut" style="margin:4px 0 8px">نجهّز لك الأقسام والمنتجات المناسبة.</div><label>اسم المتجر</label><input id="tn" value="' +
      esc(db.set.sn || "") +
      '"><div class="g">' +
      Object.keys(TY)
        .map(function (k) {
          return '<button class="btn s" data-ty="' + k + '">' + TY[k].n + "</button>";
        })
        .join("") +
      '</div><label>نوع البيع الافتراضي</label><select id="tm"><option value="r">مفرد</option><option value="w">جملة</option></select><label style="display:flex;gap:8px;align-items:center;font-size:1em;color:var(--tx);margin:8px 0"><input type="checkbox" id="ts" checked style="width:auto;margin:0">إضافة منتجات نموذجية (بدون أسعار لتعدلها)</label><button class="btn s" id="no">لاحقًا</button>',
  );
  enh(m);
  m.addEventListener("click", function (e) {
    var k = e.target.dataset.ty;
    if (k) {
      db.set.sm = m.querySelector("#tm").value;
      db.set.sn = m.querySelector("#tn").value.trim();
      switchType(k, m.querySelector("#ts").checked);
      m.remove();
    }
  });
  m.querySelector("#no").onclick = function () {
    if (!db.set.st) db.set.st = "gen";
    save();
    m.remove();
  };
}
function storeUI() {
  var s = db.set;
  return (
    '<div class="card"><b>المتجر</b><label>اسم المتجر</label><input data-s="sn" value="' +
    esc(s.sn || "") +
    '"><label>رقم الهاتف (يظهر في الإيصال)</label><input data-s="sp" value="' +
    esc(s.sp || "") +
    '"><label>العنوان (يظهر في الإيصال)</label><input data-s="sa" value="' +
    esc(s.sa || "") +
    '">' +
    sel(
      "sm",
      "نوع البيع الافتراضي",
      [
        ["r", "مفرد"],
        ["w", "جملة"],
      ],
      s.sm || "r",
    ) +
    sel(
      "ad",
      "أرقام الإيصال",
      [
        ["1", "عربية ١٢٣"],
        ["0", "إنجليزية 123"],
      ],
      s.ad || "1",
    ) +
    sel(
      "vb",
      "اهتزاز خفيف عند الضغط",
      [
        ["1", "تشغيل"],
        ["0", "إيقاف"],
      ],
      s.vb || "1",
    ) +
    sel(
      "st",
      "نوع المتجر",
      Object.keys(TY).map(function (k) {
        return [k, TY[k].n];
      }),
      s.st || "gen",
    ) +
    '<button class="btn s" id="sam">إضافة منتجات نموذجية لهذا النوع</button></div>'
  );
}
