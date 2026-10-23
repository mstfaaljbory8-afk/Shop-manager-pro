var KEY = "shop_pro_v1",
  P = "d",
  TAB = "home",
  CS = "n",
  db = {
    prods: [],
    buys: [],
    sales: [],
    exps: [],
    cap: [],
    cust: [],
    pt: [],
    pl: [],
    pp: [],
    us: [],
    log: [],
    pin: null,
    cred: null,
    seq: 0,
    set: { fs: 14, ic: 1.15, th: "", md: "auto", lg: "ar", n: { c: 1, s: 1, l: 1 } },
  };
var TABS = {
  dash: "📊 اللوحة",
  stock: "📦 المخزون",
  buy: "🚚 المشتريات",
  sell: "🧾 المبيعات",
  cust: "👥 الزبائن",
  exp: "💸 المصاريف",
  cap: "🏦 رأس المال",
  pt: "🤝 الشركاء",
  set: "⚙️ الإعدادات",
};
var PT = { d: "يومي", w: "أسبوعي", m: "شهري", y: "سنوي" },
  DT = null;
function load() {
  if (_boot) db = Object.assign(db, _boot);
}
function save() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(flushSave, 250);
  clearTimeout(window._sq);
  window._sq = setTimeout(schedN, 800);
  clearTimeout(window._gq);
  if (db.g && db.g.rt && db.set.ga)
    window._gq = setTimeout(function () {
      gUp().catch(function () {});
    }, 20000);
  if (window.__firebaseSyncPush) {
    window.__firebaseSyncPush();
  }
}
function addLog(a, d) {
  db.log.push({ t: new Date().toLocaleString("ar-IQ"), a: a, d: d, u: emp() ? curU().name : "المالك" });
}
function range() {
  var v = DT || today();
  if (P == "d") return [v, v];
  if (P == "m") return [v.slice(0, 7) + "-01", v.slice(0, 7) + "-31"];
  if (P == "y") return [v.slice(0, 4) + "-01-01", v.slice(0, 4) + "-12-31"];
  var d = new Date(v + "T12:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 1) % 7));
  var a = ymd(d);
  d.setDate(d.getDate() + 6);
  return [a, ymd(d)];
}
var TAB_VIEWS = {};
