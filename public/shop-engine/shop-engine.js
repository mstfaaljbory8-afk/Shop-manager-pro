/* --- File: js/state.js --- */
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


/* --- File: js/storage.js --- */
// طبقة التخزين: IndexedDB (مع الرجوع إلى localStorage عند عدم توفرها) + نسخ محلية بتواريخ
var STORE_MODE = "none", // idb | ls | none
  STORE_READY = false, // لا يُكتب شيء قبل نجاح قراءة البيانات، حتى لا تُمحى البيانات القديمة
  STORE_INFO = "",
  IDB_NAME = "shop_pro_idb",
  SNAP_KEEP = { auto: 7, manual: 10, safety: 5 },
  SNAPS = [], // بيانات وصفية للنسخ المحلية (بدون المحتوى)
  ARCH = [], // المتاجر المحفوظة (بالمحتوى)
  _idb = null,
  _boot = null,
  _saveTimer = null,
  _saving = false,
  _again = false;

function bkCounts(o) {
  o = o || {};
  var n = function (a) {
    return (a || []).length;
  };
  return { p: n(o.prods), s: n(o.sales), c: n(o.cust), b: n(o.buys), e: n(o.exps) };
}
function dbEmpty(o) {
  var c = bkCounts(o);
  return !(c.p || c.s || c.c || c.b || c.e);
}

function idbOpen() {
  return new Promise(function (res, rej) {
    if (!window.indexedDB) return rej("no-idb");
    var q;
    try {
      q = indexedDB.open(IDB_NAME, 1);
    } catch (e) {
      return rej(e);
    }
    q.onupgradeneeded = function () {
      var d = q.result;
      if (!d.objectStoreNames.contains("kv")) d.createObjectStore("kv");
      if (!d.objectStoreNames.contains("snaps"))
        d.createObjectStore("snaps", { keyPath: "id", autoIncrement: true });
    };
    q.onsuccess = function () {
      res(q.result);
    };
    q.onerror = function () {
      rej(q.error);
    };
    q.onblocked = function () {
      rej("blocked");
    };
  });
}
function idbDo(store, mode, fn) {
  return new Promise(function (res, rej) {
    var tx, r;
    try {
      tx = _idb.transaction(store, mode);
      r = fn(tx.objectStore(store));
    } catch (e) {
      return rej(e);
    }
    tx.oncomplete = function () {
      res(r && "result" in r ? r.result : r);
    };
    tx.onerror = function () {
      rej(tx.error);
    };
    tx.onabort = function () {
      rej(tx.error || "abort");
    };
  });
}
function kvGet(k) {
  return idbDo("kv", "readonly", function (s) {
    return s.get(k);
  });
}
function kvSet(k, v) {
  return idbDo("kv", "readwrite", function (s) {
    return s.put(v, k);
  });
}
function kvDel(k) {
  return idbDo("kv", "readwrite", function (s) {
    return s.delete(k);
  });
}

// ---------- النسخ المحلية ----------
function snapRefresh() {
  return new Promise(function (res) {
    if (!_idb) return res();
    var A = [],
      R = [];
    try {
      var tx = _idb.transaction("snaps", "readonly"),
        q = tx.objectStore("snaps").openCursor();
      q.onsuccess = function () {
        var c = q.result;
        if (!c) return;
        var v = c.value;
        if (v.kind === "store") R.push(v);
        else {
          var m = Object.assign({}, v);
          delete m.d;
          A.push(m);
        }
        c.continue();
      };
      tx.oncomplete = function () {
        SNAPS = A.sort(function (a, b) {
          return b.ts - a.ts;
        });
        ARCH = R.sort(function (a, b) {
          return a.ts - b.ts;
        });
        res();
      };
      tx.onerror = tx.onabort = function () {
        res();
      };
    } catch (e) {
      res();
    }
  });
}
function snapAdd(rec) {
  return idbDo("snaps", "readwrite", function (s) {
    return s.add(rec);
  });
}
function snapGet(id) {
  return idbDo("snaps", "readonly", function (s) {
    return s.get(id);
  });
}
function snapDel(id) {
  return idbDo("snaps", "readwrite", function (s) {
    return s.delete(id);
  });
}
async function snapPrune() {
  var by = {};
  SNAPS.forEach(function (s) {
    (by[s.kind] = by[s.kind] || []).push(s);
  });
  for (var k in SNAP_KEEP) {
    var L = (by[k] || []).sort(function (a, b) {
      return b.ts - a.ts;
    });
    for (var i = SNAP_KEEP[k]; i < L.length; i++) await snapDel(L[i].id);
  }
}
// kind: auto | manual | safety
async function snapNow(kind, label) {
  if (!_idb) return false;
  try {
    var json = bkJson();
    await snapAdd({
      kind: kind,
      label: label || "",
      day: today(),
      t: new Date().toLocaleString("ar-IQ"),
      ts: Date.now(),
      cn: bkCounts(db),
      size: json.length,
      d: json,
    });
    await snapRefresh();
    await snapPrune();
    await snapRefresh();
    storageInfoUpdate();
    return true;
  } catch (e) {
    return false;
  }
}
// نسخة تلقائية واحدة في اليوم، تُؤخذ عند فتح التطبيق (أي حالة آخر يوم سابق)
async function snapAuto() {
  if (!_idb || !STORE_READY || dbEmpty(db)) return false;
  var t = today();
  if (
    SNAPS.some(function (s) {
      return s.kind === "auto" && s.day === t;
    })
  )
    return false;
  return snapNow("auto", "تلقائية");
}
function storageInfoUpdate() {
  try {
    navigator.storage.estimate().then(function (e) {
      var mb = function (x) {
        return (x / 1048576).toFixed(1);
      };
      STORE_INFO = "المساحة المستخدمة: " + mb(e.usage || 0) + " MB من " + mb(e.quota || 0) + " MB";
    });
  } catch (e) {}
}

// ---------- الأرشيف (المتاجر المحفوظة) ----------
function svAll() {
  if (_idb) return ARCH;
  try {
    return JSON.parse(localStorage.getItem("shop_archive_v1") || "[]");
  } catch (e) {
    return [];
  }
}
async function arcAdd(rec) {
  if (_idb) {
    rec.kind = "store";
    rec.ts = Date.now();
    await snapAdd(rec);
    await snapRefresh();
    return;
  }
  var A = svAll();
  A.push(rec);
  localStorage.setItem("shop_archive_v1", JSON.stringify(A));
}
async function arcDel(i) {
  if (_idb) {
    var a = ARCH[i];
    if (a) await snapDel(a.id);
    await snapRefresh();
    return;
  }
  var A = svAll();
  A.splice(i, 1);
  try {
    localStorage.setItem("shop_archive_v1", JSON.stringify(A));
  } catch (e) {}
}

// ---------- التهيئة والترحيل ----------
function lsRead() {
  var raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (e) {}
  return raw;
}
function migrateArchive() {
  var A = [];
  try {
    A = JSON.parse(localStorage.getItem("shop_archive_v1") || "[]");
  } catch (e) {}
  return A.reduce(function (p, a) {
    return p.then(function () {
      return snapAdd({ kind: "store", ts: Date.now(), t: a.t, ty: a.ty, n: a.n, d: a.d });
    });
  }, Promise.resolve());
}
// لا يرفض أبدًا. ينتج: STORE_MODE و STORE_READY و _boot
function storageInit() {
  try {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
  } catch (e) {}
  return idbOpen()
    .then(function (d) {
      _idb = d;
      return kvGet("db").then(function (v) {
        if (v) {
          _boot = v;
          return;
        }
        var raw = lsRead();
        if (!raw) return; // مستخدم جديد
        var o = JSON.parse(raw); // إن كانت تالفة نذهب إلى catch ولا نكتب شيئًا
        return kvSet("db", o)
          .then(function () {
            return kvGet("db");
          })
          .then(function (v2) {
            var a = bkCounts(o),
              b = bkCounts(v2);
            if (!v2 || JSON.stringify(a) !== JSON.stringify(b)) {
              return kvDel("db").then(function () {
                throw "verify";
              });
            }
            _boot = v2;
            return migrateArchive();
          })
          .then(function () {
            return kvSet("meta", { migratedAt: Date.now(), from: "localStorage" });
          });
      });
    })
    .then(function () {
      STORE_MODE = "idb";
      STORE_READY = true;
      return snapRefresh();
    })
    .catch(function () {
      // رجوع إلى الطريقة القديمة
      _idb = null;
      STORE_MODE = "ls";
      var raw = lsRead();
      if (raw) {
        try {
          _boot = JSON.parse(raw);
          STORE_READY = true;
        } catch (e) {
          STORE_READY = false; // بيانات تالفة: لا نكتب فوقها
        }
      } else STORE_READY = true;
    })
    .then(storageInfoUpdate);
}

function lsSave() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
    return true;
  } catch (e) {
    toast("تعذر الحفظ على هذا الجهاز!");
    return false;
  }
}
function flushSave() {
  clearTimeout(_saveTimer);
  if (!STORE_READY) return Promise.resolve(false);
  if (STORE_MODE !== "idb") return Promise.resolve(lsSave());
  if (_saving) {
    _again = true;
    return Promise.resolve(false);
  }
  _saving = true;
  return kvSet("db", db)
    .then(function () {
      _saving = false;
      if (_again) {
        _again = false;
        return flushSave();
      }
      return true;
    })
    .catch(function () {
      _saving = false;
      toast("تعذر الحفظ على هذا الجهاز!");
      lsSave();
      return false;
    });
}
document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "hidden") flushSave();
});
window.addEventListener("pagehide", function () {
  flushSave();
});


/* --- File: js/utils.js --- */
function $(i) {
  return document.getElementById(i);
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}
function fmt(n) {
  return Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
}
function ymd(d) {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}
function today() {
  return ymd(new Date());
}
function sm(a, f) {
  return a.reduce(function (s, x) {
    return s + f(x);
  }, 0);
}
function prod(id) {
  return db.prods.find(function (p) {
    return p.id == id;
  });
}
function saleRev(s) {
  return s.price * s.qty - (s.disc || 0);
}
function buyTot(b) {
  return b.qty * b.unit + (b.ship || 0);
}
function num(v) {
  return (
    parseFloat(
      String(v)
        .replace(/[٠-٩]/g, function (c) {
          return c.charCodeAt(0) - 1632;
        })
        .replace(/[۰-۹]/g, function (c) {
          return c.charCodeAt(0) - 1776;
        })
        .replace(/[,٬]/g, "")
        .replace(/٫/g, "."),
    ) || 0
  );
}
function NP(n) {
  try {
    return window.Capacitor && Capacitor.Plugins && Capacitor.Plugins[n];
  } catch (e) {}
}
function ad(t) {
  t = String(t);
  if (db.set.ad == "0") return t;
  return t
    .replace(/\d/g, function (d) {
      return "٠١٢٣٤٥٦٧٨٩"[d];
    })
    .replace(/,/g, "٬")
    .replace(/\./g, "٫");
}
function cname(inv) {
  var c = db.cust.find(function (x) {
    return x.id == inv;
  });
  return c ? c.name : "نقدي";
}
function hap() {
  if (db.set.vb == "0") return;
  try {
    var H = NP("Haptics");
    if (H && H.impact) H.impact({ style: "LIGHT" }).catch(function () {});
    else if (navigator.vibrate) navigator.vibrate(12);
  } catch (e) {}
}
function sg(n) {
  var t = ad(fmt(n));
  return n < 0 ? "\u202A" + t + "\u202C" : t;
}
function pz(n) {
  return String(n).padStart(2, "0");
}
function popts() {
  return db.prods.map(function (p) {
    return [p.id, p.name + " (متوفر " + fmt(p.qty) + ")"];
  });
}
function needProd() {
  if (!db.prods.length) {
    toast("أضف منتجًا أولًا من تبويب المخزون");
    return true;
  }
}


/* --- File: js/data/themes.js --- */
var TH = {
  "": ["أخضر مزرق", "#eef6f5", "#fff", "#d5e6e3", "#0f766e", "#0d1816", "#15231f", "#25403a", "#2dd4bf"],
  blue: ["أزرق", "#eef3fc", "#fff", "#d6e1f5", "#2563eb", "#0c1220", "#131c33", "#233357", "#60a5fa"],
  purple: ["بنفسجي", "#f4f0fc", "#fff", "#e2d8f5", "#7c3aed", "#140f22", "#1d1634", "#33285a", "#a78bfa"],
  orange: ["برتقالي", "#fdf3ec", "#fff", "#f5dfcf", "#ea580c", "#1d120a", "#2a1b10", "#4a3020", "#fb923c"],
  red: ["أحمر", "#fcefef", "#fff", "#f5d6d6", "#dc2626", "#1d0e0e", "#2a1515", "#4a2525", "#f87171"],
  green: ["أخضر", "#eef8f0", "#fff", "#d3ebd8", "#16a34a", "#0c1a10", "#12261a", "#214030", "#4ade80"],
  pink: ["وردي", "#fdeff5", "#fff", "#f6d6e5", "#db2777", "#1f0e16", "#2c1520", "#4d2538", "#f472b6"],
  gold: ["ذهبي", "#fbf6e8", "#fff", "#efe4bf", "#b8860b", "#1a1608", "#262010", "#463c1c", "#facc15"],
};
var RT = {
  teal: { n: "أخضر مزرق", c1: "#0f766e", c2: "#0f172a", ac: "#0f766e", bg: "#f7fffd" },
  green: { n: "أخضر", c1: "#15803d", c2: "#14532d", ac: "#15803d", bg: "#f6fff8" },
  rose: { n: "وردي", c1: "#db2777", c2: "#831843", ac: "#db2777", bg: "#fff7fb" },
  blue: { n: "أزرق", c1: "#2563eb", c2: "#1e3a8a", ac: "#2563eb", bg: "#f7faff" },
  orange: { n: "برتقالي", c1: "#ea580c", c2: "#7c2d12", ac: "#ea580c", bg: "#fffaf5" },
  purple: { n: "بنفسجي", c1: "#7c3aed", c2: "#4c1d95", ac: "#7c3aed", bg: "#faf7ff" },
  gold: { n: "ذهبي", c1: "#b8860b", c2: "#422006", ac: "#b8860b", bg: "#fffdf5" },
  navy: { n: "أزرق كلاسيكي", c1: "#1f5ca8", c2: "#1b2f7a", ln: "#1b2f7a", ac: "#1f5ca8", bg: "#ffffff" },
};


/* --- File: js/data/store-types.js --- */
var EXB = ["إيجار", "رواتب", "كهرباء وماء", "نقل", "صيانة"];
var TY = {
  gen: {
    n: "متجر عام",
    c: ["مواد غذائية", "منظفات", "أدوات منزلية", "أخرى"],
    u: ["قطعة", "كرتون", "كغم", "علبة"],
    x: "ملاحظات",
    e: [],
    s: [],
  },
  groc: {
    n: "بقالة / سوبرماركت",
    c: ["معلبات", "مشروبات", "ألبان وأجبان", "منظفات", "حبوب وبقوليات", "وجبات خفيفة"],
    u: ["قطعة", "كرتون", "كغم", "علبة"],
    x: "تاريخ الانتهاء",
    e: ["تبريد وثلاجات"],
    s: ["رز", "سكر", "زيت طبخ", "شاي", "معجون طماطم", "مياه معدنية"],
  },
  cloth: {
    n: "ملابس وأحذية",
    c: ["رجالي", "نسائي", "أطفال", "أحذية", "إكسسوارات", "ملابس داخلية"],
    u: ["قطعة", "دزينة", "زوج"],
    x: "المقاس / اللون",
    e: ["عرض وديكور"],
    s: ["قميص رجالي", "بنطلون", "فستان", "حذاء رياضي", "جاكيت", "جوارب"],
  },
  elec: {
    n: "موبايلات وإلكترونيات",
    c: ["هواتف", "ملحقات", "شواحن وكوابل", "سماعات", "أجهزة منزلية", "قطع غيار"],
    u: ["قطعة", "علبة"],
    x: "الضمان / IMEI",
    e: ["ضمان وصيانة"],
    s: ["هاتف ذكي", "شاحن سريع", "كفر حماية", "سماعة بلوتوث", "كابل USB", "باور بانك"],
  },
  pharm: {
    n: "صيدلية / مستلزمات طبية",
    c: ["أدوية", "مستلزمات طبية", "عناية شخصية", "فيتامينات", "مستحضرات تجميل"],
    u: ["علبة", "شريط", "قطعة", "عبوة"],
    x: "تاريخ الانتهاء",
    e: ["تراخيص"],
    s: ["مسكن ألم", "فيتامين سي", "كمامات", "ميزان حرارة", "معقم يدين", "ضماد"],
  },
  build: {
    n: "مواد بناء وأدوات",
    c: ["سباكة", "كهرباء", "دهانات", "أدوات يدوية", "حديد وإسمنت", "سيراميك"],
    u: ["قطعة", "كيس", "متر", "طن"],
    x: "المواصفة",
    e: ["تحميل ونقل"],
    s: ["إسمنت", "طلاء أبيض", "أنبوب سباكة", "مفتاح كهرباء", "مسامير", "مطرقة"],
  },
  cafe: {
    n: "مطعم / كافيه",
    c: ["مشروبات ساخنة", "مشروبات باردة", "وجبات", "حلويات", "مواد خام"],
    u: ["كوب", "وجبة", "كغم", "قطعة"],
    x: "ملاحظات",
    e: ["غاز ووقود", "مواد تغليف"],
    s: ["شاي", "قهوة", "عصير طازج", "برغر", "كيك", "حليب"],
  },
  stat: {
    n: "قرطاسية ومكتبة",
    c: ["دفاتر", "أقلام", "حقائب", "أدوات هندسية", "ورق وطباعة"],
    u: ["قطعة", "دزينة", "رزمة"],
    x: "ملاحظات",
    e: ["طباعة وتصوير"],
    s: ["دفتر", "قلم حبر", "حقيبة مدرسية", "مسطرة", "ملف", "ألوان"],
  },
};
var TX = {
  gen: { i: "🏪", p: ["🏪", "🧾", "📦", "🛍️"], rt: "navy", th: "", sl: "المخزون", si: "📦" },
  groc: { i: "🛒", p: ["🛒", "🥫", "🍞", "🧃"], rt: "green", th: "green", sl: "المواد والمخزون", si: "🥫" },
  cloth: { i: "👗", p: ["👗", "👟", "👔", "🧥"], rt: "rose", th: "pink", sl: "الموديلات", si: "👔" },
  elec: { i: "📱", p: ["📱", "🎧", "🔌", "💻"], rt: "blue", th: "blue", sl: "الأجهزة", si: "📱" },
  pharm: { i: "💊", p: ["💊", "🩺", "🧴", "➕"], rt: "teal", th: "", sl: "الأدوية والمستلزمات", si: "💊" },
  build: {
    i: "🧱",
    p: ["🧱", "🔧", "🪛", "🎨"],
    rt: "orange",
    th: "orange",
    sl: "المواد والأدوات",
    si: "🧱",
  },
  cafe: { i: "☕", p: ["☕", "🍔", "🧁", "🥤"], rt: "gold", th: "gold", sl: "المنيو والمواد", si: "☕" },
  stat: { i: "✏️", p: ["✏️", "📚", "📎", "🎒"], rt: "purple", th: "purple", sl: "القرطاسية", si: "📚" },
};
Object.keys(TX).forEach(function (k) {
  Object.assign(TY[k], TX[k]);
});


/* --- File: js/i18n.js --- */
var EN = {
  اللوحة: "Dashboard",
  المخزون: "Stock",
  المشتريات: "Purchases",
  المبيعات: "Sales",
  الزبائن: "Customers",
  المصاريف: "Expenses",
  "رأس المال": "Capital",
  الإعدادات: "Settings",
  حذف: "Delete",
  تعديل: "Edit",
  تسديد: "Pay",
  حفظ: "Save",
  إلغاء: "Cancel",
  يومي: "Daily",
  أسبوعي: "Weekly",
  شهري: "Monthly",
  سنوي: "Yearly",
  الفترة: "Period",
  التاريخ: "Date",
  المنتج: "Product",
  الكمية: "Qty",
  الزبون: "Customer",
  البائع: "Seller",
  البضاعة: "Goods",
  الإجمالي: "Total",
  المقبوض: "Paid",
  الآجل: "Credit",
  الاستحقاق: "Due",
  "ترتيب أبجدي": "A-Z",
  "حسب التاريخ": "By date",
  الربح: "Profit",
  "صافي الربح": "Net profit",
  "مجمل الربح": "Gross profit",
  "قيمة المخزون": "Stock value",
  "أداء الفترة": "Period performance",
  "الوضع المالي الكلي": "Financial position",
  التنبيهات: "Alerts",
  المورد: "Supplier",
  المظهر: "Appearance",
  الإشعارات: "Notifications",
  اللغة: "Language",
  الوضع: "Mode",
  السمة: "Theme",
  "حجم الخط": "Font size",
  "حجم الأيقونات": "Icon size",
  المبلغ: "Amount",
  النوع: "Type",
  الوحدة: "Unit",
  "سعر البيع": "Sell price",
  "سعر الجملة": "Wholesale",
  مفرد: "Retail",
  جملة: "Wholesale",
  "إيصال بيع لزبون": "Customer receipt",
  "منتج جديد": "New product",
  "تسجيل بيع": "Record sale",
  "تسجيل مصروف": "Record expense",
  "سجل التدقيق": "Audit log",
  "دين زبون": "Customer debt",
  "دين للمورد": "Supplier debt",
  "نقص مخزون": "Low stock",
  متأخر: "overdue",
  المصاريف: "Expenses",
  الدين: "Debt",
};
Object.assign(EN, {
  إيصال: "Receipt",
  "إيصال بيع لزبون": "Customer Sales Receipt",
  "إيصال بيع": "Sales Receipt",
  "كشف حساب": "Statement",
  كشف: "Statement",
  مرتجع: "Return",
  مشاركة: "Share",
  طباعة: "Print",
  واتساب: "WhatsApp",
  إغلاق: "Close",
  "اسم الزبون": "Customer Name",
  "اسم البائع": "Seller Name",
  "اسم المورد": "Supplier Name",
  "اسم الشريك": "Partner Name",
  العدد: "Count",
  "نوع البيع": "Sale Type",
  خصم: "Discount",
  "موعد التسديد": "Due Date",
  "المبلغ الآجل": "Credit Amount",
  "اسم المنتج": "Product Name",
  "اسم المادة": "Item Name",
  الباركود: "Barcode",
  "مسح باركود": "Scan Barcode",
  "قائمة الشراء المقترحة وتقرير الجرد": "Reorder List & Inventory Report",
  "مبيعات آخر 7 أيام": "Last 7 Days Sales",
  "تغيير الرمز السري": "Change PIN",
  "تفعيل البصمة": "Enable Biometric",
  "نسخ احتياطي": "Backup",
  استعادة: "Restore",
  "تأكيد الهوية": "Verify Identity",
  تأكيد: "Confirm",
  "الرمز السري": "PIN",
  المتبقي: "Remaining",
  "المبلغ المسدّد": "Amount Paid",
  "بضاعة مستوردة": "Imported Goods",
  "حركة رأس مال": "Capital Entry",
  إيداع: "Deposit",
  سحب: "Withdraw",
  ملاحظة: "Note",
  الملاحظات: "Notes",
  البند: "Item",
  "متوسط التكلفة": "Avg Cost",
  "الحد الأدنى": "Min Stock",
  "هامش الربح": "Profit Margin",
  "سعر الصرف": "Exchange Rate",
  "رمز العملة الثانية": "Second Currency",
  "صافي الأصول": "Net Assets",
  "النقد المتوفر": "Available Cash",
  "ديون الزبائن": "Customer Debts",
  المصاريف: "Expenses",
  الرئيسية: "Home",
  "إدارة المتجر": "Shop Manager",
  المبيعات: "Sales",
  المخزون: "Inventory",
  الزبائن: "Customers",
  المشتريات: "Purchases",
  "رأس المال": "Capital",
  الشركاء: "Partners",
  الإعدادات: "Settings",
  اللوحة: "Dashboard",
  "بحث سريع...": "Quick search...",
  "بحث عن منتج...": "Search products...",
  "بحث بالاسم أو الباركود": "Search by name or barcode",
  "بحث في الزبائن...": "Search customers...",
  السعر: "Price",
  الكمية: "Quantity",
  المجموع: "Total",
  الواصل: "Paid",
  الربح: "Profit",
  الكلفة: "Cost",
  حفظ: "Save",
  إلغاء: "Cancel",
  رجوع: "Back",
  حذف: "Delete",
  تعديل: "Edit",
  تصدير: "Export",
  استيراد: "Import",
  تسديد: "Pay",
  يومي: "Daily",
  أسبوعي: "Weekly",
  شهري: "Monthly",
  سنوي: "Yearly",
  الفترة: "Period",
  "لا توجد بيانات": "No data available",
  "اضغط مرة ثانية للخروج من التطبيق": "Press back again to exit",
  "تسجيل الدخول": "Sign In",
  "تسجيل الخروج": "Sign Out",
  "النسخ الاحتياطي": "Backup",
  "الأجهزة المتصلة": "Connected Devices",
  "وضع الموظف": "Staff Mode",
  "وضع الشريك": "Partner Mode",
  "وضع المالك": "Owner Mode",
  "إضافة مادة": "Add Item",
  "إضافة زبون": "Add Customer",
  "إضافة مورد": "Add Supplier",
  "إضافة شريك": "Add Partner",
  "قائمة الديون": "Debts List",
  "قائمة الزبائن": "Customers List",
  "قائمة المبيعات": "Sales List",
  "قائمة المشتريات": "Purchases List",
  "قائمة المصاريف": "Expenses List",
  "حركة الأموال": "Cash Flow",
  "الأرباح الصافية": "Net Profits",
  "إجمالي المبيعات": "Total Sales",
  "إجمالي المشتريات": "Total Purchases",
  "إجمالي المصاريف": "Total Expenses",
  "متجر عام": "General Store",
  "بقالة / سوبرماركت": "Grocery / Supermarket",
  "ملابس وأحذية": "Clothing & Shoes",
  "موبايلات وإلكترونيات": "Mobiles & Electronics",
  "صيدلية / مستلزمات طبية": "Pharmacy & Medical",
  "مواد بناء وأدوات": "Building & Hardware",
  "مطعم / كافيه": "Restaurant & Cafe",
  "قرطاسية ومكتبة": "Stationery & Library",
  "مواد غذائية": "Food Items",
  منظفات: "Detergents",
  "أدوات منزلية": "Housewares",
  معلبات: "Canned Food",
  مشروبات: "Beverages",
  "ألبان وأجبان": "Dairy & Cheese",
  "حبوب وبقوليات": "Grains & Pulses",
  "وجبات خفيفة": "Snacks",
  رجالي: "Men",
  نسائي: "Women",
  أطفال: "Kids",
  أحذية: "Shoes",
  إكسسوارات: "Accessories",
  هواتف: "Phones",
  ملحقات: "Accessories",
  "شواحن وكوابل": "Chargers & Cables",
  سماعات: "Headphones",
  "أجهزة منزلية": "Home Appliances",
  "قطع غيار": "Spare Parts",
  أدوية: "Medicines",
  "مستلزمات طبية": "Medical Supplies",
  "عناية شخصية": "Personal Care",
  فيتامينات: "Vitamins",
  "مستحضرات تجميل": "Cosmetics",
  سباكة: "Plumbing",
  كهرباء: "Electrical",
  دهانات: "Paints",
  "أدوات يدوية": "Hand Tools",
  "حديد وإسمنت": "Steel & Cement",
  سيراميك: "Ceramics",
  "مشروبات ساخنة": "Hot Drinks",
  "مشروبات باردة": "Cold Drinks",
  وجبات: "Meals",
  حلويات: "Sweets",
  "مواد خام": "Raw Materials",
  دفاتر: "Notebooks",
  أقلام: "Pens",
  حقائب: "Bags",
  "ورق وطباعة": "Paper & Printing",
  قطعة: "Pcs",
  كرتون: "Carton",
  كغم: "Kg",
  علبة: "Box",
  دزينة: "Dozen",
  زوج: "Pair",
  كيس: "Bag",
  متر: "Meter",
  طن: "Ton",
  كوب: "Cup",
  وجبة: "Meal",
  شريط: "Strip",
  عبوة: "Pack",
  رزمة: "Bundle",
  "الوقت": "Time",
  "المستخدم": "User",
  "العملية": "Operation",
  "التفاصيل": "Details",
  "الأمان والنسخ الاحتياطي": "Security & Backup",
  "سجل التدقيق": "Audit Log",
  "كل إضافة وحذف وتعديل مسجّل ولا يمكن حذفه.": "All entries are permanently recorded.",
  "المظهر": "Appearance",
  "اللغة": "Language",
  "العربية": "Arabic",
  "الوضع": "Theme Mode",
  "تلقائي": "Auto",
  "نهاري": "Light",
  "ليلي": "Dark",
  "السمة": "Color Theme",
  "الخلفية": "Background",
  "زخرفة وتدرجات حسب نوع المتجر": "Pattern & Gradients",
  "صورتي الخاصة": "Custom Photo",
  "بدون": "None",
  "رفع صورة خلفية من هاتفك (مثلًا صورة من Gemini)": "Upload background photo from device",
  "ثيم الإيصال": "Receipt Theme",
  "حسب نوع المتجر": "Store Type Theme",
  "لون التطبيق": "App Color",
  "لون مربع الإيصال": "Receipt Box Color",
  "حجم الخط": "Font Size",
  "صغير": "Small",
  "متوسط": "Medium",
  "كبير": "Large",
  "كبير جدًا": "Extra Large",
  "أخضر مزرق": "Teal Green",
  "أزرق": "Blue",
  "بنفسجي": "Purple",
  "برتقالي": "Orange",
  "أحمر": "Red",
  "أخضر": "Green",
  "وردي": "Pink / Rose",
  "ذهبي": "Gold",
  "أزرق كلاسيكي": "Classic Blue",
  "مبيعات اليوم:": "Today's Sales:",
  "الربح:": "Profit:",
  "ديون الزبائن:": "Customer Debts:",
  "أضف منتجًا أولًا من تبويب المخزون": "Add a product first from Inventory tab",
  "شكرًا لتعاملكم معنا": "Thank you for your business",
  "البضاعة المباعة لا ترد ولا تستبدل بعد 3 أيام": "Purchased items may be exchanged within 3 days",
  "رقم الوصل": "Receipt #",
  "المجموع الكلي": "Grand Total",
  "الواصل الآن": "Paid Now",
  "المتبقي بذمة الزبون": "Customer Balance Due",
  "صافي الإيصال": "Receipt Net",
  "نقدًا": "Cash",
  "تحويل": "Transfer",
  "آجل": "Credit"
});

function applyTr() {
  if (!window.db || !db.set || db.set.lg != "en") return;
  var ks = Object.keys(EN).sort(function (a, b) {
    return b.length - a.length;
  });

  // 1. Text nodes
  var w = document.createTreeWalker(document.body, 4), n;
  while ((n = w.nextNode())) {
    if (n.parentNode && (n.parentNode.tagName == "SCRIPT" || n.parentNode.tagName == "STYLE")) continue;
    var v = n.nodeValue, o = v;
    for (var i = 0; i < ks.length; i++) {
      var k = ks[i];
      if (v.indexOf(k) >= 0) v = v.split(k).join(EN[k]);
    }
    if (v !== o) n.nodeValue = v;
  }

  // 2. Select option texts
  document.querySelectorAll("select option").forEach(function (opt) {
    var v = opt.textContent, o = v;
    for (var i = 0; i < ks.length; i++) {
      var k = ks[i];
      if (v.indexOf(k) >= 0) v = v.split(k).join(EN[k]);
    }
    if (v !== o) opt.textContent = v;
  });

  // 3. Inputs & textareas placeholders
  document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach(function (el) {
    var p = el.getAttribute("placeholder");
    if (p) {
      for (var i = 0; i < ks.length; i++) {
        var k = ks[i];
        if (p.indexOf(k) >= 0) p = p.split(k).join(EN[k]);
      }
      el.setAttribute("placeholder", p);
    }
  });

  // 4. Element titles
  document.querySelectorAll("[title]").forEach(function (el) {
    var t = el.getAttribute("title");
    if (t) {
      for (var i = 0; i < ks.length; i++) {
        var k = ks[i];
        if (t.indexOf(k) >= 0) t = t.split(k).join(EN[k]);
      }
      el.setAttribute("title", t);
    }
  });
}



/* --- File: js/ui.js --- */
function tb(h, rows) {
  if (emp()) {
    var kp = h.map(function (x) {
      return HC.indexOf(x) < 0;
    });
    h = h.filter(function (_, i) {
      return kp[i];
    });
    rows = rows.map(function (r) {
      return r.filter(function (_, i) {
        return kp[i];
      });
    });
  }
  return (
    '<div class="tbl"><table><tr>' +
    h
      .map(function (x) {
        return "<th>" + x + "</th>";
      })
      .join("") +
    "</tr>" +
    (rows.length
      ? rows
          .map(function (r) {
            return (
              "<tr>" +
              r
                .map(function (c) {
                  return "<td>" + c + "</td>";
                })
                .join("") +
              "</tr>"
            );
          })
          .join("")
      : '<tr><td colspan="' + h.length + '" class="mut">لا توجد بيانات</td></tr>') +
    "</table></div>"
  );
}
function dbtn(k, id) {
  return '<button class="x" data-del="' + k + ":" + id + '">حذف</button>';
}
function K(l, v, c) {
  if (emp() && /ربح|تكلفة|الأصول|رأس المال|ديون/.test(l)) return "";
  return '<div class="k"><span>' + l + '</span><b class="' + (c || "") + '">' + fmt(v) + "</b></div>";
}
function sel(k, l, o, v) {
  return (
    "<label>" +
    l +
    '</label><select data-s="' +
    k +
    '">' +
    o
      .map(function (x) {
        return '<option value="' + x[0] + '"' + (x[0] == v ? " selected" : "") + ">" + x[1] + "</option>";
      })
      .join("") +
    "</select>"
  );
}
function chk(k, l) {
  return (
    '<label style="display:flex;gap:8px;align-items:center;font-size:1em;color:var(--tx);margin:6px 0"><input type="checkbox" data-s="' +
    k +
    '" style="width:auto;margin:0"' +
    (db.set.n[k[1]] ? " checked" : "") +
    ">" +
    l +
    "</label>"
  );
}
function toast(m) {
  var t = document.createElement("div");
  t.textContent = m;
  t.style.cssText =
    "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:12px 18px;border-radius:12px;z-index:99;max-width:90%;text-align:center";
  document.body.appendChild(t);
  setTimeout(function () {
    t.remove();
  }, 3500);
}
function enh(root) {
  (root || document).querySelectorAll("select:not([data-e])").forEach(function (s) {
    s.dataset.e = 1;
    s.style.display = "none";
    var b = document.createElement("button");
    b.type = "button";
    b.className = "dd";
    var up = function () {
      var o = s.options[s.selectedIndex];
      b.textContent = o && o.value !== "" ? o.text : "اختر...";
    };
    up();
    b.onclick = function () {
      openDD(s, up);
    };
    s.after(b);
    s.addEventListener("change", up);
  });
}
function openDD(s, up) {
  var op = [].slice.call(s.options),
    sh = document.createElement("div");
  sh.className = "ov";
  sh.style.zIndex = 30;
  sh.style.alignItems = "flex-end";
  sh.innerHTML =
    '<div class="card" style="max-width:440px;border-radius:22px 22px 0 0"><b>' +
    esc((s.previousElementSibling && s.previousElementSibling.textContent) || "اختر") +
    "</b>" +
    (op.length > 7 ? '<input class="ddq" placeholder="ابحث...">' : "") +
    '<div class="ddl">' +
    op
      .map(function (o, i) {
        return (
          '<button type="button" class="ddo' +
          (i == s.selectedIndex ? " on" : "") +
          '" data-i="' +
          i +
          '">' +
          esc(o.value === "" ? "— بدون —" : o.text) +
          "</button>"
        );
      })
      .join("") +
    "</div></div>";
  document.body.appendChild(sh);
  sh.onclick = function (e) {
    if (e.target == sh) sh.remove();
  };
  sh.querySelector(".ddl").onclick = function (e) {
    var i = e.target.dataset.i;
    if (i == null) return;
    s.selectedIndex = +i;
    s.dispatchEvent(new Event("change", { bubbles: true }));
    up();
    sh.remove();
  };
  var q = sh.querySelector(".ddq");
  if (q)
    q.oninput = function () {
      var v = q.value.trim();
      sh.querySelectorAll(".ddo").forEach(function (b) {
        b.style.display = b.textContent.indexOf(v) >= 0 ? "" : "none";
      });
    };
}
document.addEventListener(
  "pointerdown",
  function (e) {
    if (e.target.closest && e.target.closest("button")) hap();
  },
  true,
);
function modal(html) {
  var d = document.createElement("div");
  d.className = "ov";
  d.innerHTML = '<div class="card">' + html + "</div>";
  $("ovl").appendChild(d);
  return d;
}
function fm(t, fs, cb, init) {
  var h =
    "<b>" +
    t +
    "</b>" +
    fs
      .map(function (f) {
        var c = f.o
          ? '<select id="f_' +
            f.k +
            '">' +
            f.o
              .map(function (o) {
                return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + "</option>";
              })
              .join("") +
            "</select>"
          : '<input id="f_' +
            f.k +
            '" type="' +
            (f.t == "number" ? "text" : f.t || "text") +
            '"' +
            (f.t == "number" ? ' inputmode="decimal"' : "") +
            ' value="' +
            esc(f.v == null ? "" : f.v) +
            '"' +
            (f.dl
              ? ' list="dl_' +
                f.k +
                '"><datalist id="dl_' +
                f.k +
                '">' +
                f.dl
                  .map(function (x) {
                    return '<option value="' + esc(x) + '">';
                  })
                  .join("") +
                "</datalist>"
              : ">");
        return "<label>" + f.l + "</label>" + c;
      })
      .join("") +
    '<div class="mut" id="er" style="margin:4px 0;color:var(--out)"></div><div class="row"><button class="btn" id="ok">حفظ</button><button class="btn s" id="no">إلغاء</button></div>';
  var m = modal(h);
  fs.forEach(function (f) {
    if (f.o && f.v != null) m.querySelector("#f_" + f.k).value = f.v;
  });
  enh(m);
  if (init) init(m);
  m.querySelector("#no").onclick = function () {
    m.remove();
  };
  m.querySelector("#ok").onclick = function () {
    var o = {};
    fs.forEach(function (f) {
      var v = m.querySelector("#f_" + f.k).value;
      o[f.k] = f.t == "number" ? num(v) : v.trim();
    });
    var e = cb(o);
    if (e) m.querySelector("#er").textContent = e;
    else {
      m.remove();
      save();
      render();
    }
  };
}


/* --- File: js/nav.js --- */
var _ig = 0;
var _navStack = [];

var EN_TABS = {
  dash: "📊 Dashboard",
  stock: "📦 Inventory",
  buy: "🚚 Purchases",
  sell: "🧾 Sales",
  cust: "👥 Customers & Debts",
  exp: "💸 Expenses",
  cap: "🏦 Capital & Cash",
  pt: "🤝 Partners",
  set: "⚙️ Settings",
};

function hp(o) {
  try {
    history.pushState(o, "");
  } catch (e) {}
}

function secTitle() {
  if (db.set && db.set.lg == "en") {
    return EN_TABS[TAB] || TABS[TAB] || "";
  }
  return TAB == "stock" && db.set.st ? ty().si + " " + ty().sl : TABS[TAB] || "";
}

function openTab(t) {
  if (emp() && EA.indexOf(t) < 0) {
    var msg = (db.set && db.set.lg == "en") ? "This section is not accessible in staff mode" : "هذا القسم غير متاح في حساب الموظف";
    return toast(msg);
  }
  if (t !== TAB) {
    _navStack.push(TAB);
  }
  TAB = t;
  hp({ s: t });
  render();
  window.scrollTo(0, 0);
  window.dispatchEvent(new CustomEvent("shop:tabchange", { detail: { tab: t } }));
}

function goBack() {
  var ov = document.querySelectorAll(".ov");
  if (ov.length) {
    ov[ov.length - 1].remove();
    return;
  }
  if (TAB !== "home") {
    var prev = _navStack.pop();
    TAB = prev || "home";
    render();
    window.scrollTo(0, 0);
    window.dispatchEvent(new CustomEvent("shop:tabchange", { detail: { tab: TAB } }));
    return;
  }
  // At root menu: trigger double-tap back exit
  if (window.__onEngineDoubleBack) {
    window.__onEngineDoubleBack();
  }
}

window.addEventListener("popstate", function () {
  if (_ig > 0) {
    _ig--;
    return;
  }
  var ov = document.querySelectorAll(".ov");
  if (ov.length) {
    ov[ov.length - 1].remove();
    if (TAB != "home") hp({ s: TAB });
    return;
  }
  if (TAB != "home") {
    var prev = _navStack.pop();
    TAB = prev || "home";
    render();
    window.scrollTo(0, 0);
    window.dispatchEvent(new CustomEvent("shop:tabchange", { detail: { tab: TAB } }));
  } else {
    hp({ s: "home" });
    if (window.__onEngineDoubleBack) {
      window.__onEngineDoubleBack();
    }
  }
});

window.openTab = openTab;
window.goTab = openTab;
window.goBack = goBack;



/* --- File: js/auth.js --- */
var EA = ["stock", "sell", "cust"],
  HC = ["متوسط التكلفة", "قيمة المخزون", "الربح", "المورد", "الدين", "موعده"];
function emp() {
  return !!db.set.cu;
}
function curU() {
  return (
    db.us.find(function (u) {
      return u.id == db.set.cu;
    }) || { name: "موظف" }
  );
}
async function hash(s) {
  try {
    var b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("sh|" + s));
    return Array.from(new Uint8Array(b))
      .map(function (x) {
        return x.toString(16).padStart(2, "0");
      })
      .join("");
  } catch (e) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
    return "f" + (h >>> 0);
  }
}
function b64(b) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(b)));
}
function unb64(s) {
  return Uint8Array.from(atob(s), function (c) {
    return c.charCodeAt(0);
  });
}
function askPin(t) {
  return new Promise(function (res) {
    var m = modal(
      "<b>" +
        t +
        '</b><input id="p1" type="password" inputmode="numeric" placeholder="الرمز (4 أرقام فأكثر)"><input id="p2" type="password" inputmode="numeric" placeholder="أعد كتابة الرمز"><div class="mut" id="er" style="color:var(--out)"></div><div class="row"><button class="btn" id="ok">حفظ</button><button class="btn s" id="no">إلغاء</button></div>',
    );
    m.querySelector("#no").onclick = function () {
      m.remove();
      res(false);
    };
    m.querySelector("#ok").onclick = async function () {
      var a = m.querySelector("#p1").value;
      if (a.length < 4) return (m.querySelector("#er").textContent = "الرمز قصير");
      if (a !== m.querySelector("#p2").value)
        return (m.querySelector("#er").textContent = "الرمزان غير متطابقين");
      db.pin = await hash(a);
      save();
      m.remove();
      res(true);
    };
  });
}
function auth() {
  return new Promise(function (res) {
    var has = !!db.cred,
      m = modal(
        '<b>تأكيد الهوية</b><div class="mut">أدخل الرمز السري للمتابعة</div><input id="pp" type="password" inputmode="numeric" placeholder="الرمز السري"><div class="mut" id="er" style="color:var(--out)"></div><div class="row"><button class="btn" id="ok">تأكيد</button>' +
          (has ? '<button class="btn s" id="bio">البصمة</button>' : "") +
          '<button class="btn s" id="no">إلغاء</button></div>',
      );
    m.querySelector("#no").onclick = function () {
      m.remove();
      res(false);
    };
    m.querySelector("#ok").onclick = async function () {
      if ((await hash(m.querySelector("#pp").value)) === db.pin) {
        m.remove();
        res(true);
      } else m.querySelector("#er").textContent = "الرمز غير صحيح";
    };
    if (has)
      m.querySelector("#bio").onclick = async function () {
        if (db.cred == "native") {
          try {
            await NP("NativeBiometric").verifyIdentity({ reason: "تأكيد الهوية", title: "تأكيد الهوية" });
            m.remove();
            res(true);
          } catch (e) {
            m.querySelector("#er").textContent = "تعذر التحقق بالبصمة، استخدم الرمز";
          }
          return;
        }
        try {
          await navigator.credentials.get({
            publicKey: {
              challenge: crypto.getRandomValues(new Uint8Array(32)),
              allowCredentials: [{ type: "public-key", id: unb64(db.cred) }],
              userVerification: "required",
              timeout: 60000,
            },
          });
          m.remove();
          res(true);
        } catch (e) {
          m.querySelector("#er").textContent = "تعذر التحقق بالبصمة، استخدم الرمز";
        }
      };
  });
}


/* --- File: js/notify.js --- */
function alerts() {
  var n = db.set.n,
    t = today(),
    so = ymd(new Date(Date.now() + 2592e5)),
    a = [];
  if (n.c && !emp())
    db.cust.forEach(function (c) {
      if (c.debt > 0 && c.dd && c.dd <= so)
        a.push([c.dd < t, "دين زبون: " + c.name + " — " + fmt(c.debt) + " — الاستحقاق " + c.dd]);
    });
  if (n.s && !emp())
    db.buys.forEach(function (b) {
      if (b.debt > 0 && b.dd && b.dd <= so)
        a.push([b.dd < t, "دين للمورد: " + (b.sup || b.pn) + " — " + fmt(b.debt) + " — الاستحقاق " + b.dd]);
    });
  if (n.l)
    db.prods.forEach(function (p) {
      if (p.min > 0 && p.qty <= p.min) a.push([0, "نقص مخزون: " + p.name + " (" + fmt(p.qty) + ")"]);
    });
  if (!emp())
    (db.re || []).forEach(function (q) {
      var d = recNext(q);
      if (d && d <= so) a.push([d < t, "مصروف متكرر: " + q.name + " — " + fmt(q.amt) + " — " + d]);
    });
  return a;
}
function alertsHtml() {
  var a = alerts();
  return a.length
    ? '<div class="card"><b>🔔 التنبيهات (' +
        a.length +
        ")</b>" +
        a
          .map(function (x) {
            return (
              '<div class="' +
              (x[0] ? "out" : "wa") +
              '" style="padding:4px 0">' +
              esc(x[1]) +
              (x[0] ? " (متأخر)" : "") +
              "</div>"
            );
          })
          .join("") +
        "</div>"
    : "";
}
function notify() {
  try {
    var a = alerts();
    if (a.length && window.Notification && Notification.permission == "granted" && db.set.last != today()) {
      db.set.last = today();
      save();
      new Notification("إدارة المتجر", {
        body: a
          .slice(0, 4)
          .map(function (x) {
            return x[1];
          })
          .join("\n"),
      });
    }
  } catch (e) {}
}
async function schedN() {
  var LN = NP("LocalNotifications");
  if (!LN || !(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform())) return;
  try {
    var pm = await LN.checkPermissions();
    if (pm.display != "granted") return;
    var pd = await LN.getPending();
    if (pd.notifications && pd.notifications.length) await LN.cancel({ notifications: pd.notifications });
    var L = [],
      n = db.set.n,
      now = Date.now(),
      id = 1;
    function add(t, d, b) {
      if (!d) return;
      [1, 0].forEach(function (k) {
        var w = new Date(d + "T09:00:00");
        w.setDate(w.getDate() - k);
        if (w.getTime() > now)
          L.push({ id: id++, title: t, body: b + (k ? " (غدًا)" : " (اليوم)"), schedule: { at: w } });
      });
    }
    if (n.c)
      db.cust.forEach(function (c) {
        if (c.debt > 0) add("دين زبون", c.dd, c.name + " — " + fmt(c.debt));
      });
    if (n.s)
      db.buys.forEach(function (b) {
        if (b.debt > 0) add("دين للمورد", b.dd, (b.sup || b.pn) + " — " + fmt(b.debt));
      });
    if (L.length) await LN.schedule({ notifications: L });
  } catch (e) {}
}


/* --- File: js/backup.js --- */
async function bkFile() {
  var F = NP("Filesystem"),
    S = NP("Share");
  try {
    var w = await F.writeFile({
      path: "shop-backup-" + today() + ".json",
      data: bkJson(),
      directory: "CACHE",
      encoding: "utf8",
    });
    await S.share({ title: "نسخة احتياطية", files: [w.uri] });
  } catch (e) {
    toast("الحفظ كملف يعمل داخل التطبيق فقط، استخدم النسخ أو المشاركة");
  }
}
function bkJson() {
  var c = Object.assign({}, db);
  delete c.g;
  c.set = Object.assign({}, db.set);
  delete c.set.bgi;
  return JSON.stringify(c);
}
var GF = "application/x-www-form-urlencoded";
function gTok() {
  var g = db.g;
  if (!g || !g.rt) return Promise.reject("no");
  if (g.at && g.exp > Date.now() + 60000) return Promise.resolve(g.at);
  return fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": GF },
    body:
      "client_id=" +
      encodeURIComponent(g.id) +
      "&client_secret=" +
      encodeURIComponent(g.sec) +
      "&refresh_token=" +
      encodeURIComponent(g.rt) +
      "&grant_type=refresh_token",
  })
    .then(function (r) {
      return r.json();
    })
    .then(function (j) {
      if (!j.access_token) throw j;
      g.at = j.access_token;
      g.exp = Date.now() + j.expires_in * 1000;
      return g.at;
    });
}

function gAH(t) {
  return { Authorization: "Bearer " + t };
}
function gList(t) {
  return fetch(
    "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&pageSize=100&orderBy=" +
      encodeURIComponent("createdTime desc") +
      "&fields=" +
      encodeURIComponent("files(id,name,createdTime,modifiedTime,size)") +
      "&q=" +
      encodeURIComponent("name contains 'shop-backup'"),
    { headers: gAH(t) },
  )
    .then(function (r) {
      if (!r.ok) throw 0;
      return r.json();
    })
    .then(function (j) {
      return j.files || [];
    });
}
// يحتفظ بآخر 7 نسخ يومية على Drive (الملف القديم shop-backup.json لا يُحذف)
function gPrune(t, L, nm) {
  var re = /^shop-backup-\d{4}-\d{2}-\d{2}\.json$/,
    names = L.map(function (f) {
      return f.name;
    }).filter(function (n) {
      return re.test(n);
    });
  if (names.indexOf(nm) < 0) names.push(nm);
  var keep = names.sort().reverse().slice(0, 7);
  return L.filter(function (f) {
    return re.test(f.name) && keep.indexOf(f.name) < 0;
  }).reduce(function (p, f) {
    return p.then(function () {
      return fetch("https://www.googleapis.com/drive/v3/files/" + f.id, {
        method: "DELETE",
        headers: gAH(t),
      }).catch(function () {});
    });
  }, Promise.resolve());
}
function gUp() {
  if (dbEmpty(db)) return Promise.reject("empty");
  var b = bkJson(),
    nm = "shop-backup-" + today() + ".json";
  return gTok().then(function (t) {
    return gList(t).then(function (L) {
      var ex = L.filter(function (f) {
          return f.name === nm;
        })[0],
        p;
      if (ex)
        p = fetch("https://www.googleapis.com/upload/drive/v3/files/" + ex.id + "?uploadType=media", {
          method: "PATCH",
          headers: { Authorization: "Bearer " + t, "Content-Type": "application/json" },
          body: b,
        });
      else {
        var bd = "x1y2z3";
        p = fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
          method: "POST",
          headers: { Authorization: "Bearer " + t, "Content-Type": "multipart/related; boundary=" + bd },
          body:
            "--" +
            bd +
            "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" +
            JSON.stringify({ name: nm, parents: ["appDataFolder"] }) +
            "\r\n--" +
            bd +
            "\r\nContent-Type: application/json\r\n\r\n" +
            b +
            "\r\n--" +
            bd +
            "--",
        });
      }
      return p
        .then(function (r) {
          if (!r.ok) throw 0;
          return gPrune(t, L, nm);
        })
        .then(function () {
          db.g.last = new Date().toLocaleString("ar-IQ");
          return flushSave();
        });
    });
  });
}
function gDn(id) {
  return gTok().then(function (t) {
    return fetch("https://www.googleapis.com/drive/v3/files/" + id + "?alt=media", { headers: gAH(t) }).then(
      function (r) {
        if (!r.ok) throw 0;
        return r.text();
      },
    );
  });
}
function gPick() {
  return gTok()
    .then(gList)
    .then(function (L) {
      if (!L.length) throw "none";
      var m = modal(
        '<b>اختر نسخة من Drive</b><div class="mut" style="margin:4px 0 8px">الأحدث أولًا</div>' +
          L.map(function (f) {
            return (
              '<button class="btn s" data-gid="' +
              esc(f.id) +
              '">' +
              esc(f.name.replace(/^shop-backup-?/, "").replace(/\.json$/, "") || "قديمة") +
              " · " +
              esc(new Date(f.modifiedTime || f.createdTime).toLocaleString("ar-IQ")) +
              " · " +
              Math.round((f.size || 0) / 1024) +
              " KB</button>"
            );
          }).join("") +
          '<button class="btn s" id="no">إغلاق</button>',
      );
      m.querySelector("#no").onclick = function () {
        m.remove();
      };
      m.addEventListener("click", function (e) {
        var b = e.target.closest("button"),
          id = b && b.dataset.gid;
        if (!id) return;
        e.stopPropagation();
        m.remove();
        gDn(id)
          .then(bkPreview)
          .catch(function () {
            toast("تعذر التنزيل");
          });
      });
      return L;
    });
}
// معاينة نسخة قبل الاستعادة (من Drive أو من النسخ المحلية)
function bkPreview(tx) {
  var n;
  try {
    n = JSON.parse(tx);
    if (!n.prods || !n.sales) throw 0;
  } catch (x) {
    return toast("النسخة غير صالحة");
  }
  var c = bkCounts(n),
    cur = bkCounts(db),
    row = function (l, a, b) {
      return "<tr><td>" + l + "</td><td>" + a + "</td><td>" + b + "</td></tr>";
    };
  var m = modal(
    '<b>معاينة الاستعادة</b><div class="mut" style="margin:4px 0 8px">ستحل هذه النسخة محل بيانات المتجر الحالية، وتُحفظ نسخة أمان من الحالية أولًا.</div><div class="tbl"><table><tr><th></th><th>في النسخة</th><th>الحالية</th></tr>' +
      row("المنتجات", c.p, cur.p) +
      row("المبيعات", c.s, cur.s) +
      row("الزبائن (إيصالات)", c.c, cur.c) +
      row("المشتريات", c.b, cur.b) +
      row("المصاريف", c.e, cur.e) +
      "</table></div>" +
      (dbEmpty(n) ? '<div class="out">تنبيه: هذه النسخة فارغة!</div>' : "") +
      '<div class="row"><button class="btn" id="ok">استعادة</button><button class="btn s" id="no">إلغاء</button></div>',
  );
  m.querySelector("#no").onclick = function () {
    m.remove();
  };
  m.querySelector("#ok").onclick = function () {
    m.remove();
    applyBk(tx);
  };
}

async function applyBk(tx) {
  try {
    var n = JSON.parse(tx);
    if (!n.prods || !n.sales) throw 0;
    await snapNow("safety", "قبل الاستعادة");
    var keepPin = db.pin,
      keepCred = db.cred;
    if (n.set && db.set.bgi) n.set.bgi = db.set.bgi;
    db = Object.assign(
      {
        prods: [],
        buys: [],
        sales: [],
        exps: [],
        cap: [],
        log: [],
        cust: [],
        pt: [],
        pl: [],
        pp: [],
        us: db.us,
        set: db.set,
        g: db.g,
        pin: db.pin,
        cred: db.cred,
        seq: 0,
      },
      n,
    );
    if (keepPin) db.pin = keepPin; // الرمز والبصمة خاصان بهذا الجهاز ولا يتغيران بالاستعادة
    if (keepCred) db.cred = keepCred;
    addLog("استعادة نسخة احتياطية", "");
    save();
    render();
    toast("تمت الاستعادة ✅");
  } catch (x) {
    toast("النسخة غير صالحة");
  }
}
function gCon() {
  var g = db.g || {};
  if (!g.id || !g.sec) return toast("أدخل Client ID و Client Secret أولًا");
  fetch("https://oauth2.googleapis.com/device/code", {
    method: "POST",
    headers: { "Content-Type": GF },
    body:
      "client_id=" +
      encodeURIComponent(g.id) +
      "&scope=" +
      encodeURIComponent("https://www.googleapis.com/auth/drive.appdata"),
  })
    .then(function (r) {
      return r.json();
    })
    .then(function (d) {
      if (!d.user_code) throw d;
      var m = modal(
          '<b>ربط حساب Google</b><div class="mut" style="margin:6px 0">1) افتح الرابط في المتصفح<br>2) أدخل الرمز التالي واختر حسابك ووافق</div><div style="font-size:24px;font-weight:bold;text-align:center;margin:8px 0;letter-spacing:2px" dir="ltr">' +
            esc(d.user_code) +
            '</div><div dir="ltr" class="mut" style="text-align:center">' +
            esc(d.verification_url) +
            '</div><div class="mut" id="er" style="margin:8px 0">بانتظار الموافقة...</div><div class="row"><button class="btn" id="op">فتح الرابط</button><button class="btn s" id="no">إلغاء</button></div>',
        ),
        on = 1,
        iv = (d.interval || 5) * 1000;
      m.querySelector("#no").onclick = function () {
        on = 0;
        m.remove();
      };
      m.querySelector("#op").onclick = function () {
        var B = NP("Browser");
        if (B && B.open)
          B.open({ url: d.verification_url }).catch(function () {
            window.open(d.verification_url, "_blank");
          });
        else window.open(d.verification_url, "_blank");
      };
      (function poll() {
        setTimeout(function () {
          if (!on) return;
          fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": GF },
            body:
              "client_id=" +
              encodeURIComponent(g.id) +
              "&client_secret=" +
              encodeURIComponent(g.sec) +
              "&device_code=" +
              encodeURIComponent(d.device_code) +
              "&grant_type=" +
              encodeURIComponent("urn:ietf:params:oauth:grant-type:device_code"),
          })
            .then(function (r) {
              return r.json();
            })
            .then(function (j) {
              if (!on) return;
              if (j.refresh_token) {
                on = 0;
                g.rt = j.refresh_token;
                g.at = j.access_token;
                g.exp = Date.now() + j.expires_in * 1000;
                db.g = g;
                save();
                m.remove();
                toast("تم ربط الحساب ✅");
                render();
              } else if (j.error == "authorization_pending" || j.error == "slow_down") {
                if (j.error == "slow_down") iv += 5000;
                poll();
              } else {
                on = 0;
                m.querySelector("#er").textContent = "توقف الربط: " + (j.error || "");
              }
            })
            .catch(function () {
              poll();
            });
        }, iv);
      })();
    })
    .catch(function () {
      toast("تعذر بدء الربط. تأكد من Client ID وأنك داخل التطبيق");
    });
}
function gUI() {
  var sync = (window.__firebaseGetState && window.__firebaseGetState()) || { status: 'offline', user: null, sessionRole: 'guest' };
  var u = sync.user;
  var isMember = sync.sessionRole === 'employee' || sync.sessionRole === 'partner';
  var h = '<div class="card" style="border:1.5px solid var(--bd);"><b>☁️ المزامنة الفورية السحابية وحسابات الدخول</b>';
  
  if (u) {
    h += '<div style="display:flex;align-items:center;gap:12px;margin:12px 0;padding:12px;background:color-mix(in srgb, var(--card) 90%, var(--ac));border-radius:12px">';
    if (u.photoURL) {
      h += '<img src="' + esc(u.photoURL) + '" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--ac)">';
    } else {
      h += '<div style="width:44px;height:44px;border-radius:50%;background:var(--ac);color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold">' + esc((u.displayName || u.email || 'G')[0].toUpperCase()) + '</div>';
    }
    h += '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:1.05em">' + esc(u.displayName || 'صاحب المتجر') + ' <span class="in" style="font-size:0.75em">(المالك)</span></div><div class="mut" style="font-size:0.85em;overflow:hidden;text-overflow:ellipsis">' + esc(u.email || '') + '</div></div>';
    h += '<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:20px;background:#15803d;color:#fff;font-size:0.75em;font-weight:700">🟢 متصل ومزامن</span>';
    h += '</div>';

    h += '<div style="font-size:0.9em;color:var(--tx);margin-bottom:10px;line-height:1.7">';
    h += '<div>📱 جهازك الحالي: <b>' + esc(sync.deviceName || 'هذا الجهاز') + '</b></div>';
    if (sync.lastSyncedAt) {
      h += '<div>⏱️ آخر مزامنة: <b>' + esc(new Date(sync.lastSyncedAt).toLocaleTimeString('ar-IQ')) + '</b></div>';
    }
    h += '<div>👥 الأجهزة المتصلة بحسابك: <b>' + (sync.connectedDevices ? sync.connectedDevices.length : 1) + ' أجهزة</b></div>';
    h += '</div>';

    h += '<div class="row" style="margin-top:10px">';
    h += '<button class="btn" id="fbsyncnow">⚡ مزامنة فورية الآن</button>';
    h += '<button class="btn s" id="fbdevices">📱 الأجهزة المتزامنة (' + (sync.connectedDevices ? sync.connectedDevices.length : 1) + ')</button>';
    h += '</div>';

    h += '<div class="row" style="margin-top:8px">';
    h += '<button class="btn s" id="fbcreatebackup">☁️ حفظ نسخة سحابية</button>';
    h += '<button class="btn s" id="fbbackups">📥 استعادة من السحابة</button>';
    h += '</div>';

    h += '<div style="margin-top:12px;border-top:1px solid var(--bd);padding-top:10px">';
    h += '<button class="btn s" id="fbsignout" style="color:var(--out);border-color:var(--out)">تسجيل الخروج من Google</button>';
    h += '</div>';
  } else if (isMember && sync.memberSession) {
    h += '<div style="padding:12px;background:color-mix(in srgb, var(--card) 90%, #2563eb);border-radius:12px;margin:10px 0">';
    h += '<div style="font-weight:700;font-size:1.05em;color:var(--tx)">🔑 ' + esc(sync.memberSession.name) + ' (' + (sync.memberSession.role === 'partner' ? 'شريك متجر' : 'موظف مبيعات') + ')</div>';
    h += '<div class="mut" style="font-size:0.85em;margin-top:4px">أنت مسجل الدخول بواسطة رمز QR تفعيل لمرة واحدة وجهازك مربوط بالمتجر دائماً ومزامَن لحظياً.</div>';
    h += '<div class="row" style="margin-top:10px">';
    h += '<button class="btn" id="fbsyncnow">⚡ مزامنة فورية الآن</button>';
    h += '<button class="btn s" id="fbsignout" style="color:var(--out);border-color:var(--out)">تسجيل الخروج وإلغاء ربط الجهاز</button>';
    h += '</div></div>';
  } else {
    h += '<div class="mut" style="margin:8px 0;line-height:1.6">';
    h += 'سجّل الدخول بحساب Google كمالك، أو استخدم <b>رمز QR لمرة واحدة</b> إذا كنت موظفاً أو شريكاً لربط جهازك بالمتجر بشكل دائم وتفعيل المزامنة اللحظية.';
    h += '</div>';
    h += '<div class="row" style="margin-top:8px">';
    h += '<button class="btn" id="fbsignin" style="display:flex;align-items:center;justify-content:center;gap:8px">';
    h += '<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>';
    h += '<span>دخول المالك بـ Google</span></button>';
    h += '<button class="btn s" id="fbqrscan">📷 مسح رمز QR تفعيل</button>';
    h += '</div>';
  }
  return h + '</div>';
}

async function archiveStore() {
  var T = TY[db.set.st || "gen"],
    snap = bkJson(),
    fn = "shop-" + (db.set.st || "gen") + "-" + today() + "-" + (Date.now() % 100000) + ".json",
    loc = "";
  try {
    await arcAdd({
      t: new Date().toLocaleString("ar-IQ"),
      ty: db.set.st || "gen",
      n: db.set.sn || T.n,
      d: snap,
    });
  } catch (e) {}
  var F = NP("Filesystem");
  if (F && window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
    for (var k of ["DOCUMENTS", "EXTERNAL"]) {
      try {
        await F.writeFile({
          path: "ShopBackups/" + fn,
          data: snap,
          directory: k,
          encoding: "utf8",
          recursive: true,
        });
        loc = k == "DOCUMENTS" ? "مجلد Documents/ShopBackups" : "مجلد التطبيق ShopBackups";
        break;
      } catch (e) {}
    }
  }
  return loc;
}
function arcUI() {
  var A = svAll();
  if (!A.length) return "";
  return (
    '<div class="card"><b>🗄️ المتاجر المحفوظة</b>' +
    A.map(function (a, i) {
      return (
        '<div style="padding:8px 0;border-bottom:1px solid var(--bd)"><div>' +
        esc(a.n) +
        ' <span class="mut">(' +
        esc(TY[a.ty] ? TY[a.ty].n : "") +
        ") · " +
        esc(a.t) +
        '</span></div><div class="row"><button class="x e" data-arr="' +
        i +
        '">استعادة</button><button class="x" data-ard="' +
        i +
        '">حذف</button></div></div>'
      );
    })
      .reverse()
      .join("") +
    "</div>"
  );
}


/* --- File: js/scanner.js --- */
function scanBtn(m, cb) {
  var b = document.createElement("button");
  b.className = "btn s";
  b.textContent = "📷 مسح باركود";
  b.onclick = function () {
    scan(cb);
  };
  m.querySelector("#er").before(b);
}
function scan(cb) {
  var B = NP("BarcodeScanner");
  if (B && B.scan) {
    B.scan()
      .then(function (r) {
        var b = r.barcodes && r.barcodes[0];
        if (b) cb(b.rawValue);
      })
      .catch(function () {
        scanWeb(cb);
      });
    return;
  }
  scanWeb(cb);
}
function scanWeb(cb) {
  if (!window.BarcodeDetector) return toast("مسح الباركود غير مدعوم في هذا المتصفح");
  var m = modal(
      '<b>وجّه الكاميرا إلى الباركود</b><video id="vd" playsinline autoplay style="width:100%;border-radius:12px;margin:8px 0"></video><button class="btn s" id="no">إغلاق</button>',
    ),
    st,
    on = 1,
    dt = new BarcodeDetector();
  var end = function () {
    on = 0;
    if (st)
      st.getTracks().forEach(function (t) {
        t.stop();
      });
    m.remove();
  };
  m.querySelector("#no").onclick = end;
  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "environment" } })
    .then(function (z) {
      st = z;
      var v = m.querySelector("#vd");
      v.srcObject = z;
      (function lp() {
        if (!on) return;
        dt.detect(v)
          .then(function (q) {
            if (q.length) {
              var c = q[0].rawValue;
              end();
              cb(c);
            } else setTimeout(lp, 300);
          })
          .catch(function () {
            setTimeout(lp, 500);
          });
      })();
    })
    .catch(function () {
      end();
      toast("تعذر فتح الكاميرا");
    });
}


/* --- File: js/store-type.js --- */
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


/* --- File: js/theme.js --- */
function applySet() {
  var s = db.set,
    r = document.documentElement,
    dk =
      s.md == "dark" ||
      (s.md == "auto" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches),
    a = TH[s.th == "auto" ? ty().th : s.th] || TH[""],
    o = dk ? 5 : 1,
    V = {
      "--bg": a[o],
      "--card": a[o + 1],
      "--bd": a[o + 2],
      "--ac": a[o + 3],
      "--tx": dk ? "#eceff3" : "#1b1f24",
      "--mut": dk ? "#9aa3ad" : "#6b7280",
      "--in": dk ? "#4ade80" : "#15803d",
      "--out": dk ? "#f87171" : "#b91c1c",
      "--wa": dk ? "#fbbf24" : "#b45309",
    };
  for (var k in V) r.style.setProperty(k, V[k]);
  var RC = {
      o: ["#f59e0b", "#ea580c"],
      g: ["#22c55e", "#15803d"],
      r: ["#f43f5e", "#be123c"],
      p: ["#a78bfa", "#6d28d9"],
      b: ["#38bdf8", "#1d4ed8"],
    },
    rcc = RC[s.rc || "o"];
  r.style.setProperty("--rc1", rcc ? rcc[0] : V["--ac"]);
  r.style.setProperty("--rc2", rcc ? rcc[1] : "color-mix(in srgb," + V["--ac"] + " 50%,#000)");
  var B = document.body.style,
    ac = V["--ac"];
  B.backgroundAttachment = "scroll";
  if (s.bg == "none") {
    B.backgroundImage = "none";
  } else if (s.bg == "c" && s.bgi) {
    B.backgroundImage = 'url("' + s.bgi + '")';
    B.backgroundSize = "cover";
    B.backgroundRepeat = "no-repeat";
    B.backgroundPosition = "center top";
  } else {
    var em = ty().p || ["🏪", "🧾", "📦", "🛍️"],
      pat =
        'url("data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="170" height="170"><text x="12" y="52" font-size="34" opacity=".11">' +
            em[0] +
            '</text><text x="96" y="70" font-size="30" opacity=".11">' +
            em[1] +
            '</text><text x="30" y="146" font-size="30" opacity=".11">' +
            em[2] +
            '</text><text x="110" y="150" font-size="34" opacity=".11">' +
            em[3] +
            "</text></svg>",
        ) +
        '")',
      gr = function (a, p, c) {
        return (
          "radial-gradient(520px circle at " +
          p +
          ",color-mix(in srgb," +
          c +
          " " +
          a +
          "%,transparent) 0,transparent 70%)"
        );
      };
    B.backgroundImage = [
      gr(24, "14% 22%", ac),
      gr(20, "90% 52%", "#f59e0b"),
      gr(18, "22% 84%", ac),
      pat,
    ].join(",");
    B.backgroundSize = "100% 1500px,100% 1500px,100% 1500px,170px";
    B.backgroundRepeat = "repeat-y,repeat-y,repeat-y,repeat";
    B.backgroundPosition = "0 0";
  }
  s.c2 = s.c2 || "USD";
  s.rate = s.rate || 1480;
  r.style.setProperty("--fs", s.fs + "px");
  r.style.setProperty("--ic", s.ic);
  r.dataset.th = s.th;
  if (s.md == "auto") r.removeAttribute("data-theme");
  else r.dataset.theme = s.md;
  r.lang = s.lg;
  r.dir = s.lg == "ar" ? "rtl" : "ltr";
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("shop:langchange", { detail: { lang: s.lg } }));
  }
}
function rtheme() {
  var k = db.set.rt;
  if (!k || k == "auto") k = ty().rt || "navy";
  if (k == "app") {
    var a = (getComputedStyle(document.documentElement).getPropertyValue("--ac") || "#0f766e").trim();
    return { ac: a, c1: a, c2: "#0f172a", bg: "#ffffff" };
  }
  return RT[k] || RT.navy;
}
function hdSub() {
  var t = today(),
    S = db.sales.filter(function (x) {
      return x.date == t;
    }),
    v = sm(S, saleRev);
  if (emp()) return "مبيعات اليوم: " + fmt(v);
  return (
    "مبيعات اليوم: " +
    fmt(v) +
    " · الربح: " +
    fmt(
      v -
        sm(S, function (x) {
          return x.cost * x.qty;
        }),
    ) +
    " · ديون الزبائن: " +
    fmt(
      sm(db.cust, function (c) {
        return c.debt;
      }),
    )
  );
}


/* --- File: js/receipt-draw.js --- */
function mkImg(t, tx, cb) {
  var L = tx.split("\n"),
    H = 100 + L.length * 36 + 30,
    c = document.createElement("canvas"),
    x = c.getContext("2d"),
    ac = getComputedStyle(document.documentElement).getPropertyValue("--ac") || "#0f766e",
    rtl = db.set.lg == "ar";
  c.width = 640;
  c.height = H;
  x.fillStyle = "#fff";
  x.fillRect(0, 0, 640, H);
  x.fillStyle = ac;
  x.fillRect(0, 0, 640, 70);
  x.direction = rtl ? "rtl" : "ltr";
  x.textAlign = rtl ? "right" : "left";
  var X = rtl ? 610 : 30;
  x.fillStyle = "#fff";
  x.font = "bold 26px Tahoma,Arial";
  x.fillText("🏪 " + t, X, 45, 580);
  x.fillStyle = "#111";
  x.font = "21px Tahoma,Arial";
  L.forEach(function (l, i) {
    x.fillText(l, X, 115 + i * 36, 580);
  });
  c.toBlob(function (b) {
    cb(b, c.toDataURL("image/png"));
  });
}
function rcMix(a, b, t) {
  var A = parseInt(a.slice(1), 16),
    B = parseInt(b.slice(1), 16),
    m = function (s) {
      return Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t);
    };
  return "rgb(" + m(16) + "," + m(8) + "," + m(0) + ")";
}
function rcRR(x, a, b, w, h, t, u) {
  x.beginPath();
  x.moveTo(a + t, b);
  x.lineTo(a + w - t, b);
  x.arcTo(a + w, b, a + w, b + t, t);
  x.lineTo(a + w, b + h - u);
  x.arcTo(a + w, b + h, a + w - u, b + h, u);
  x.lineTo(a + u, b + h);
  x.arcTo(a, b + h, a, b + h - u, u);
  x.lineTo(a, b + t);
  x.arcTo(a, b, a + t, b, t);
  x.closePath();
}
function rcH(c) {
  return 330 + 52 + Math.max(8, (c.lines || []).length) * 50 + (c.blank ? 3 : 5) * 52 + 70 + 190 + 50;
}
function rcCanvas(c) {
  var cv = document.createElement("canvas");
  cv.width = 900;
  cv.height = rcH(c);
  rcDraw(cv, c);
  return cv;
}
function rcDraw(cv, c) {
  var RK = rtheme(),
    L = c.lines || [],
    n = Math.max(8, L.length),
    W = 900,
    H = rcH(c),
    F = "Tahoma,Arial,sans-serif",
    x = cv.getContext("2d"),
    dk = RK.c1,
    lt = rcMix(RK.c1, "#ffffff", 0.84),
    ln = RK.ln || RK.c2,
    X0 = 40,
    TW = 820,
    i,
    ink = "#0f172a";
  function T(t, X, Y, sz, col, b, al, mw) {
    x.font = (b ? "bold " : "") + sz + "px " + F;
    x.fillStyle = col;
    x.textAlign = al || "right";
    x.fillText(String(t), X, Y, mw || 600);
  }
  x.direction = "rtl";
  x.fillStyle = "#fff";
  x.fillRect(0, 0, W, H);
  if (!c.blank) {
    x.globalAlpha = 0.06;
    x.font = "70px " + F;
    x.textAlign = "center";
    var em = ty().p || ["🧾"],
      nn = 0;
    for (var yy = 420, kk = 0; yy < H - 300; yy += 170, kk++)
      for (var xx = 110 + (kk % 2) * 100; xx < W; xx += 220) x.fillText(em[nn++ % em.length], xx, yy);
    x.globalAlpha = 1;
  }
  rcRR(x, X0, 30, TW, 84, 40, 0);
  x.fillStyle = dk;
  x.fill();
  rcRR(x, X0, 114, TW, 92, 0, 40);
  x.fillStyle = lt;
  x.fill();
  T(db.set.sn || "اسم المتجر", W / 2, 92, 54, "#fff", 1, "center", 760);
  var ph = db.set.sp ? ad(db.set.sp) : "",
    aa = db.set.sa || "";
  if (ph && aa) {
    T(ph, W / 2, 152, 32, "#1e293b", 0, "center");
    T(aa, W / 2, 192, 30, "#1e293b", 0, "center", 760);
  } else T(ph || aa, W / 2, 170, 32, "#1e293b", 0, "center", 760);
  T("اسم الزبون:", X0 + TW, 262, 38, ink, 1);
  T("البائع:", X0 + TW, 310, 30, "#475569", 1);
  T("التاريخ:", X0 + 280, 262, 28, "#475569", 1);
  T("رقم:", X0 + 280, 310, 28, "#475569", 1);
  if (!c.blank) {
    T(c.name, X0 + TW - 255, 262, 38, ink, 1, "right", 270);
    T(c.seller || "—", X0 + TW - 115, 310, 30, ink, 0, "right", 330);
    T(ad(c.date.replace(/-/g, "/")), X0 + 165, 262, 26, ink, 0, "right");
    T(ad(c.id), X0 + 165, 310, 26, ink, 0, "right");
  }
  var cols = [78, 282, 110, 170, 180],
    ty0 = 330,
    hh = 52,
    rh = 50,
    xs = [X0 + TW],
    th = hh + n * rh;
  cols.forEach(function (w) {
    xs.push(xs[xs.length - 1] - w);
  });
  var mid = function (k) {
    return (xs[k] + xs[k + 1]) / 2;
  };
  rcRR(x, X0, ty0, TW, hh, 24, 0);
  x.fillStyle = lt;
  x.fill();
  x.strokeStyle = ln;
  x.lineWidth = 3;
  rcRR(x, X0, ty0, TW, th, 24, 0);
  x.stroke();
  x.lineWidth = 2;
  for (i = 1; i < 5; i++) {
    x.beginPath();
    x.moveTo(xs[i], ty0);
    x.lineTo(xs[i], ty0 + th);
    x.stroke();
  }
  for (i = 0; i < n; i++) {
    x.beginPath();
    x.moveTo(X0, ty0 + hh + i * rh);
    x.lineTo(X0 + TW, ty0 + hh + i * rh);
    x.stroke();
  }
  ["الرقم", "اسم البضاعة/الخدمة", "الكمية", "سعر الوحدة", "المجموع"].forEach(function (h, k) {
    T(h, mid(k), ty0 + 36, 26, ink, 1, "center");
  });
  for (i = 0; i < n; i++) {
    var ry = ty0 + hh + i * rh,
      l = L[i];
    T(ad(i + 1), mid(0), ry + 36, 30, ink, 1, "center");
    if (l) {
      T(l.n + (l.m == "w" ? " (جملة)" : ""), xs[1] - 14, ry + 35, 26, ink, 0, "right", 280);
      T(ad(fmt(l.q)), mid(2), ry + 35, 26, ink, 0, "center");
      T(ad(fmt(l.p)), mid(3), ry + 35, 26, ink, 0, "center");
      T(ad(fmt(l.q * l.p)), mid(4), ry + 35, 26, ink, 1, "center");
    } else if (i == 0 && !L.length && c.items) {
      T(c.items, xs[1] - 14, ry + 35, 22, ink, 0, "right", 280);
    }
  }
  var sy = ty0 + th,
    sub = c.blank ? 0 : c.total + (c.disc || 0),
    S = c.blank
      ? [
          ["المجموع الفرعي", ""],
          ["الخصم:", ""],
          ["الإجمالي الكلي", "", 1],
        ]
      : [
          ["المجموع الفرعي", ad(fmt(sub))],
          ["الخصم:", ad(fmt(c.disc || 0))],
          ["الإجمالي الكلي", ad(fmt(c.total)), 1],
          ["المقبوض", ad(fmt(c.total - c.debt))],
          [
            "الآجل (الدين)" + (c.dd && c.debt > 0 ? "  —  " + ad(c.dd.replace(/-/g, "/")) : ""),
            ad(fmt(c.debt)),
          ],
        ];
  S.forEach(function (q, k) {
    var y = sy + k * 52;
    if (q[2]) {
      x.fillStyle = rcMix(RK.c1, "#ffffff", 0.88);
      x.fillRect(xs[4], y, xs[0] - xs[4], 52);
      x.fillStyle = lt;
      x.fillRect(X0, y, xs[4] - X0, 52);
    }
    T(
      q[0],
      xs[0] - 16,
      y + 37,
      30,
      q[0] == "الآجل (الدين)" || k > 2 ? (k == 4 && c.debt > 0 ? "#b91c1c" : "#15803d") : ink,
      1,
    );
    T(q[1], (X0 + xs[4]) / 2, y + 36, 28, ink, 1, "center");
  });
  x.strokeStyle = ln;
  x.lineWidth = 3;
  rcRR(x, X0, sy, TW, S.length * 52, 0, 24);
  x.stroke();
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(xs[4], sy);
  x.lineTo(xs[4], sy + S.length * 52);
  x.stroke();
  for (i = 1; i < S.length; i++) {
    x.beginPath();
    x.moveTo(X0, sy + i * 52);
    x.lineTo(X0 + TW, sy + i * 52);
    x.stroke();
  }
  var by = sy + S.length * 52 + 30;
  T("شكرًا لزيارتكم", W / 2, by + 40, 44, ink, 1, "center");
  by += 70;
  x.strokeStyle = dk;
  x.lineWidth = 3;
  [
    [X0 + TW - 360, "ختم المتجر والتوقيع", c.blank ? "" : c.seller || ""],
    [X0, "توقيع المشتري", c.blank ? "" : c.name],
  ].forEach(function (q) {
    x.strokeRect(q[0], by, 360, 190);
    T(q[1], q[0] + 180, by + 56, 34, dk, 1, "center", 330);
    if (q[2]) T(q[2], q[0] + 180, by + 170, 24, "#64748b", 0, "center", 320);
  });
}
function pdfBlob(cv) {
  var d = atob(cv.toDataURL("image/jpeg", 0.92).split(",")[1]),
    im = new Uint8Array(d.length);
  for (var i = 0; i < d.length; i++) im[i] = d.charCodeAt(i);
  var w = 595,
    h = Math.round((w * cv.height) / cv.width),
    parts = [],
    off = [],
    pos = 0;
  function A(s) {
    var b = typeof s == "string" ? new TextEncoder().encode(s) : s;
    parts.push(b);
    pos += b.length;
  }
  function O(n, s) {
    off[n] = pos;
    A(n + " 0 obj\n" + s + "\nendobj\n");
  }
  A("%PDF-1.4\n");
  O(1, "<</Type/Catalog/Pages 2 0 R>>");
  O(2, "<</Type/Pages/Kids[3 0 R]/Count 1>>");
  O(
    3,
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 " +
      w +
      " " +
      h +
      "]/Contents 4 0 R/Resources<</XObject<</Im0 5 0 R>>>>>>",
  );
  var cs = "q " + w + " 0 0 " + h + " 0 0 cm /Im0 Do Q";
  O(4, "<</Length " + cs.length + ">>\nstream\n" + cs + "\nendstream");
  off[5] = pos;
  A(
    "5 0 obj\n<</Type/XObject/Subtype/Image/Width " +
      cv.width +
      "/Height " +
      cv.height +
      "/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length " +
      im.length +
      ">>\nstream\n",
  );
  A(im);
  A("\nendstream\nendobj\n");
  var xr = pos;
  A(
    "xref\n0 6\n0000000000 65535 f \n" +
      [1, 2, 3, 4, 5]
        .map(function (n) {
          return String(off[n]).padStart(10, "0") + " 00000 n \n";
        })
        .join("") +
      "trailer\n<</Size 6/Root 1 0 R>>\nstartxref\n" +
      xr +
      "\n%%EOF",
  );
  return new Blob(parts, { type: "application/pdf" });
}


/* --- File: js/receipts.js --- */
function shr(t, tx) {
  var m = modal(
    "<b>" +
      t +
      '</b><textarea id="ta" rows="10" readonly></textarea><div class="row"><button class="btn" id="sh">مشاركة</button><button class="btn s" id="wa">واتساب</button></div><div class="row"><button class="btn s" id="pr">طباعة</button><button class="btn s" id="si">🖼️ صورة</button><button class="btn s" id="no">إغلاق</button></div>',
  );
  m.querySelector("#ta").value = tx;
  m.querySelector("#no").onclick = function () {
    m.remove();
  };
  m.querySelector("#sh").onclick = function () {
    if (navigator.share) navigator.share({ text: tx }).catch(function () {});
    else {
      m.querySelector("#ta").select();
      document.execCommand("copy");
      toast("تم النسخ");
    }
  };
  m.querySelector("#si").onclick = function () {
    mkImg(t, tx, function (b, u) {
      var f = new File([b], "receipt.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [f] }))
        navigator.share({ files: [f] }).catch(function () {});
      else {
        m.querySelector("#ta").outerHTML = '<img src="' + u + '" style="width:100%;border-radius:10px">';
        toast("اضغط مطولًا على الصورة لحفظها أو تصويرها");
      }
    });
  };
  m.querySelector("#wa").onclick = function () {
    window.open("https://wa.me/?text=" + encodeURIComponent(tx));
  };
  m.querySelector("#pr").onclick = function () {
    var w = window.open("", "_blank");
    if (!w) return toast("الطباعة غير متاحة هنا، استخدم المشاركة");
    w.document.write('<pre style="font:16px Tahoma;white-space:pre-wrap">' + esc(tx) + "</pre>");
    w.print();
  };
}
function receiptTxt(id) {
  var c = db.cust.find(function (x) {
    return x.id == id;
  });
  if (!c) return;
  shr(
    "إيصال بيع",
    " إيصال بيع رقم " +
      c.id +
      "\nالتاريخ: " +
      c.date +
      "\nالزبون: " +
      c.name +
      "\nالبائع: " +
      c.seller +
      "\n" +
      c.items.split(" ، ").join("\n") +
      "\nالإجمالي: " +
      fmt(c.total) +
      "\nالمقبوض: " +
      fmt(c.total - c.debt) +
      "\nالآجل: " +
      fmt(c.debt) +
      (c.dd ? "\nموعد التسديد: " + c.dd : ""),
  );
}
async function shareBlob(b, name, mime) {
  try {
    var F = NP("Filesystem"),
      S = NP("Share"),
      nat = window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform();
    if (nat && F && S) {
      var data = await new Promise(function (res) {
        var r = new FileReader();
        r.onload = function () {
          res(r.result.split(",")[1]);
        };
        r.readAsDataURL(b);
      });
      var w = await F.writeFile({ path: name, data: data, directory: "CACHE" });
      await S.share({ title: name, files: [w.uri] });
      return;
    }
    var f = new File([b], name, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      await navigator.share({ files: [f] });
      return;
    }
    var u = URL.createObjectURL(b),
      a = document.createElement("a");
    a.href = u;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast("تم التنزيل");
  } catch (e) {
    toast("تعذرت المشاركة");
  }
}
function receipt(id) {
  var c = db.cust.find(function (x) {
    return x.id == id;
  });
  if (!c) return;
  var cv = rcCanvas(c),
    m = modal(
      "<b>إيصال بيع رقم " +
        c.id +
        '</b><img src="' +
        cv.toDataURL("image/png") +
        '" style="width:100%;border-radius:10px;margin:8px 0;border:1px solid var(--bd)"><div class="row"><button class="btn" id="ri">🖼️ صورة</button><button class="btn" id="rp">📄 PDF</button></div><div class="row"><button class="btn s" id="rt">نص</button><button class="btn s" id="rr">🖨️ طباعة</button><button class="btn s" id="re">✏️ تعديل</button><button class="btn s" id="no">إغلاق</button></div>',
    );
  m.querySelector("#no").onclick = function () {
    m.remove();
  };
  m.querySelector("#ri").onclick = function () {
    cv.toBlob(function (b) {
      shareBlob(b, "receipt-" + c.id + ".png", "image/png");
    });
  };
  m.querySelector("#rp").onclick = function () {
    shareBlob(pdfBlob(cv), "receipt-" + c.id + ".pdf", "application/pdf");
  };
  m.querySelector("#re").onclick = function () {
    m.remove();
    editRc(c.id);
  };
  m.querySelector("#rr").onclick = function () {
    var w = window.open("", "_blank");
    if (!w) return toast("الطباعة المباشرة غير متاحة هنا، اختر PDF ثم اطبعه من هاتفك");
    w.document.write('<img src="' + cv.toDataURL("image/png") + '" style="width:100%" onload="print()">');
    w.document.close();
  };
  m.querySelector("#rt").onclick = function () {
    m.remove();
    receiptTxt(c.id);
  };
}


/* --- File: js/receipt-form.js --- */
async function editRc(id) {
  var c = db.cust.find(function (x) {
    return x.id == id;
  });
  if (!c || !(await auth())) return;
  rcForm(c);
}
function rcForm(c) {
  if (needProd()) return;
  var po = [["", "—"]].concat(popts()),
    old = {},
    PH = c ? c.photo : "";
  if (c)
    db.sales
      .filter(function (s) {
        return s.inv == c.id;
      })
      .forEach(function (s) {
        old[s.pid] = (old[s.pid] || 0) + s.qty;
      });
  var m = modal(
    "<b>" +
      (c ? "تعديل الإيصال #" + c.id : "إيصال بيع جديد") +
      '</b><label>التاريخ</label><input id="rc_d" type="date" value="' +
      (c ? c.date : today()) +
      '"><label>اسم الزبون (فارغ = بيع نقدي)</label><input id="rc_n" value="' +
      esc(c && c.name != "زبون نقدي" ? c.name : "") +
      '"><label>اسم البائع</label><input id="rc_s" value="' +
      esc(c ? c.seller : emp() ? curU().name : "") +
      '"><label>صورة الزبون (اختياري)</label><input id="rc_ph" type="file" accept="image/*"><div id="rc_l"></div><button type="button" class="btn s" id="rc_a">+ إضافة بضاعة</button><button type="button" class="btn s" id="rc_b">📷 مسح باركود</button><label>خصم</label><input id="rc_dis" inputmode="decimal" value="' +
      ((c && c.disc) || "") +
      '"><label>المبلغ الآجل (الدين)</label><input id="rc_db" inputmode="decimal" value="' +
      ((c && c.debt) || "") +
      '"><label>موعد التسديد</label><input id="rc_dd" type="date" value="' +
      ((c && c.dd) || "") +
      '"><div class="mut" id="er" style="color:var(--out);margin:6px 0"></div><div class="row"><button class="btn" id="ok">حفظ</button><button class="btn s" id="no">إلغاء</button></div>',
  );
  function row(l) {
    var d = document.createElement("div");
    d.className = "ln card";
    d.style.padding = "10px";
    d.innerHTML =
      '<select class="lp">' +
      po
        .map(function (o) {
          return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + "</option>";
        })
        .join("") +
      '</select><div class="row"><input class="lq" inputmode="decimal" placeholder="العدد"><select class="lm"><option value="r">مفرد</option><option value="w">جملة</option></select><input class="lu" inputmode="decimal" placeholder="السعر"></div><div class="mut lh"></div><button type="button" class="x" style="width:100%">🗑️ حذف هذه البضاعة</button>';
    var P = d.querySelector(".lp"),
      Q = d.querySelector(".lq"),
      M = d.querySelector(".lm"),
      U = d.querySelector(".lu"),
      H = d.querySelector(".lh"),
      auto = function () {
        var p = prod(P.value);
        if (!p) return;
        var v = M.value == "w" ? p.wprice || p.price : p.price || p.wprice;
        if (!U.dataset.ed) U.value = v > 0 ? v : "";
        H.textContent =
          (v > 0 ? "" : "⚠️ لم يُسجَّل سعر بيع لهذا المنتج، أدخله وسيُحفظ تلقائيًا. ") +
          (p.cost > 0 ? "تكلفة الوحدة: " + fmt(p.cost) : "");
      };
    if (l) {
      P.value = l.i;
      Q.value = l.q;
      M.value = l.m;
      U.value = l.p;
      U.dataset.ed = 1;
    } else M.value = db.set.sm || "r";
    m.querySelector("#rc_l").appendChild(d);
    enh(d);
    P.onchange = auto;
    M.onchange = auto;
    U.oninput = function () {
      U.dataset.ed = 1;
    };
    d.querySelector(".x").onclick = function () {
      d.remove();
    };
    auto();
    return d;
  }
  if (c)
    db.sales
      .filter(function (s) {
        return s.inv == c.id;
      })
      .forEach(function (s) {
        var ol = (c.lines || []).find(function (x) {
          return x.n == s.pn;
        });
        row({ i: s.pid, q: s.qty, p: s.price, m: s.m || (ol && ol.m) || "r" });
      });
  else row();
  m.querySelector("#rc_a").onclick = function () {
    row().scrollIntoView({ block: "center" });
  };
  m.querySelector("#rc_b").onclick = function () {
    scan(function (code) {
      var p = db.prods.find(function (x) {
        return x.bc == code;
      });
      if (!p) return toast("لا يوجد منتج بهذا الباركود");
      var t = null;
      m.querySelectorAll(".ln").forEach(function (d) {
        if (!t && !d.querySelector(".lp").value) t = d;
      });
      if (!t) t = row();
      var P = t.querySelector(".lp");
      P.value = p.id;
      P.dispatchEvent(new Event("change", { bubbles: true }));
      var Q = t.querySelector(".lq");
      if (!Q.value) Q.value = "1";
    });
  };
  m.querySelector("#rc_ph").onchange = function () {
    var f = this.files[0];
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      var im = new Image();
      im.onload = function () {
        var cv = document.createElement("canvas"),
          z = Math.min(1, 160 / Math.max(im.width, im.height));
        cv.width = im.width * z;
        cv.height = im.height * z;
        cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
        PH = cv.toDataURL("image/jpeg", 0.7);
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(f);
  };
  m.querySelector("#no").onclick = function () {
    m.remove();
  };
  m.querySelector("#ok").onclick = function () {
    var er = m.querySelector("#er"),
      L = [],
      need = {};
    m.querySelectorAll(".ln").forEach(function (d) {
      var p = prod(d.querySelector(".lp").value);
      if (!p) return;
      L.push({
        p: p,
        q: num(d.querySelector(".lq").value),
        u: num(d.querySelector(".lu").value),
        m: d.querySelector(".lm").value,
      });
    });
    if (!L.length) return (er.textContent = "أضف بضاعة واحدة على الأقل");
    for (var i = 0; i < L.length; i++) {
      var l = L[i];
      if (l.q <= 0) return (er.textContent = "أدخل العدد للبضاعة: " + l.p.name);
      if (!(l.u > 0)) return (er.textContent = "حدد سعر «" + l.p.name + "»");
      need[l.p.id] = (need[l.p.id] || 0) + l.q;
      if (need[l.p.id] > l.p.qty + (old[l.p.id] || 0))
        return (er.textContent = "المتوفر من " + l.p.name + " " + fmt(l.p.qty + (old[l.p.id] || 0)) + " فقط");
    }
    var dt = m.querySelector("#rc_d").value || today(),
      nm = m.querySelector("#rc_n").value.trim() || "زبون نقدي",
      sl = m.querySelector("#rc_s").value.trim(),
      ds = num(m.querySelector("#rc_dis").value),
      tot = Math.max(
        0,
        sm(L, function (l) {
          return l.q * l.u;
        }) - ds,
      ),
      dbt = Math.min(Math.max(num(m.querySelector("#rc_db").value), 0), tot),
      dd = m.querySelector("#rc_dd").value,
      id = c ? c.id : ++db.seq,
      oc = {};
    if (c) {
      db.sales
        .filter(function (s) {
          return s.inv == id;
        })
        .forEach(function (s) {
          var q = prod(s.pid);
          if (q) q.qty += s.qty;
          oc[s.pid] = s.cost;
        });
      db.sales = db.sales.filter(function (s) {
        return s.inv != id;
      });
    }
    var txt = [];
    L.forEach(function (l, ix) {
      var p = l.p;
      p.qty -= l.q;
      if (l.m == "w") {
        if (!(p.wprice > 0)) p.wprice = l.u;
      } else if (!(p.price > 0)) p.price = l.u;
      db.sales.push({
        id: ++db.seq,
        date: dt,
        pid: p.id,
        pn: p.name,
        qty: l.q,
        price: l.u,
        disc: ix ? 0 : ds,
        cost: oc[p.id] != null ? oc[p.id] : p.cost,
        inv: id,
        cn: nm,
        m: l.m,
      });
      txt.push(p.name + " ×" + fmt(l.q) + (l.m == "w" ? " (جملة)" : " (مفرد)") + " @" + fmt(l.u));
    });
    var rec = {
      id: id,
      date: dt,
      name: nm,
      seller: sl,
      items: txt.join(" ، "),
      disc: ds,
      lines: L.map(function (l) {
        return { i: l.p.id, n: l.p.name, q: l.q, p: l.u, m: l.m };
      }),
      total: tot,
      debt: dbt,
      dd: dd,
      photo: PH,
    };
    if (c) {
      Object.assign(c, rec);
      addLog("تعديل إيصال", "#" + id + " " + nm + " = " + fmt(tot));
    } else {
      db.cust.push(rec);
      addLog("إيصال زبون", nm + " = " + fmt(tot) + (dbt ? " (آجل " + fmt(dbt) + ")" : ""));
    }
    m.remove();
    save();
    render();
    if (!c)
      setTimeout(function () {
        receipt(id);
      }, 200);
  };
}
function addLine(m, fs, i, po, mo, bt) {
  var o = function (a) {
      return a
        .map(function (x) {
          return '<option value="' + esc(x[0]) + '">' + esc(x[1]) + "</option>";
        })
        .join("");
    },
    d = document.createElement("div");
  d.innerHTML =
    "<label>بضاعة " +
    i +
    '</label><select id="f_p' +
    i +
    '">' +
    o(po) +
    '</select><label>العدد</label><input id="f_q' +
    i +
    '" type="text" inputmode="decimal"><label>نوع البيع</label><select id="f_m' +
    i +
    '">' +
    o(mo) +
    "</select>";
  while (d.firstChild) bt.parentNode.insertBefore(d.firstChild, bt);
  fs.push({ k: "p" + i, o: po }, { k: "q" + i, t: "number" }, { k: "m" + i, o: mo });
  enh(m);
}


/* --- File: js/reports.js --- */
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


/* --- File: js/partners.js --- */
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


/* --- File: js/inventory.js --- */
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


/* --- File: js/recurring.js --- */
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


/* --- File: js/crud.js --- */
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


/* --- File: js/customers.js --- */
function custCard(CU) {
  var by = {};
  CU.forEach(function (c) {
    var b = by[c.name] || (by[c.name] = { n: c.name, ph: "", k: 0, t: 0, d: 0, l: "" });
    b.k++;
    b.t += c.total;
    b.d += c.debt;
    if (c.photo && !b.ph) b.ph = c.photo;
    if (c.date > b.l) b.l = c.date;
  });
  var A = Object.keys(by)
    .map(function (k) {
      return by[k];
    })
    .sort(
      CS == "n"
        ? function (a, b) {
            return a.n.localeCompare(b.n, "ar");
          }
        : function (a, b) {
            return b.l.localeCompare(a.l);
          },
    );
  return (
    '<div class="card"><b>الزبائن (' +
    A.length +
    ")</b>" +
    tb(
      ["", "الزبون", "الإيصالات", "إجمالي المشتريات", "المتبقي عليه", "آخر شراء", ""],
      A.map(function (b) {
        return [
          b.ph
            ? '<img src="' + b.ph + '" width="44" height="44" style="border-radius:50%;object-fit:cover">'
            : "👤",
          esc(b.n),
          b.k,
          fmt(b.t),
          '<b class="' + (b.d > 0 ? "wa" : "") + '">' + fmt(b.d) + "</b>",
          b.l,
          '<button class="x e" data-st="' + encodeURIComponent(b.n) + '">كشف حساب</button>',
        ];
      }),
    ) +
    "</div>"
  );
}


/* --- File: js/settings.js --- */
function setUI() {
  var s = db.set;
  return (
    '<div class="card"><b>المظهر</b>' +
    sel(
      "lg",
      "اللغة",
      [
        ["ar", "العربية"],
        ["en", "English"],
      ],
      s.lg,
    ) +
    sel(
      "md",
      "الوضع",
      [
        ["auto", "تلقائي"],
        ["light", "نهاري"],
        ["dark", "ليلي"],
      ],
      s.md,
    ) +
    sel(
      "th",
      "السمة",
      [["auto", "حسب نوع المتجر (تلقائي)"]].concat(
        Object.keys(TH).map(function (k) {
          return [k, TH[k][0]];
        }),
      ),
      s.th,
    ) +
    sel(
      "bg",
      "الخلفية",
      [
        ["t", "زخرفة وتدرجات حسب نوع المتجر"],
        ["c", "صورتي الخاصة"],
        ["none", "بدون"],
      ],
      s.bg || "t",
    ) +
    '<label>رفع صورة خلفية من هاتفك (مثلًا صورة من Gemini)</label><input type="file" id="bgup" accept="image/*">' +
    sel(
      "rt",
      "ثيم الإيصال",
      [
        ["auto", "حسب نوع المتجر"],
        ["app", "لون التطبيق"],
      ].concat(
        Object.keys(RT).map(function (k) {
          return [k, RT[k].n];
        }),
      ),
      s.rt || "auto",
    ) +
    sel(
      "rc",
      "لون مربع الإيصال",
      [
        ["o", "برتقالي"],
        ["g", "أخضر"],
        ["r", "أحمر"],
        ["p", "بنفسجي"],
        ["b", "أزرق"],
        ["t", "لون الثيم"],
      ],
      s.rc || "o",
    ) +
    sel(
      "fs",
      "حجم الخط",
      [
        [12, "صغير"],
        [14, "متوسط"],
        [16, "كبير"],
        [19, "كبير جدًا"],
      ],
      s.fs,
    ) +
    sel(
      "ic",
      "حجم الأيقونات",
      [
        [0.9, "صغير"],
        [1.15, "متوسط"],
        [1.5, "كبير"],
        [1.9, "كبير جدًا"],
      ],
      s.ic,
    ) +
    '<label>سعر الصرف (كم دينار للوحدة الثانية)</label><input data-s="rate" type="number" value="' +
    s.rate +
    '"><label>رمز العملة الثانية</label><input data-s="c2" value="' +
    s.c2 +
    '">' +
    '</div><div class="card"><b>الإشعارات</b>' +
    chk("nc", "مواعيد ديون الزبائن لك") +
    chk("ns", "مواعيد ديونك للموردين") +
    chk("nl", "نقص المخزون") +
    '<button class="btn s" id="np">السماح بإشعارات الجهاز</button></div>' +
    storeUI() +
    accUI() +
    snapUI() +
    arcUI() +
    gUI()
  );
}
function accUI() {
  return (
    '<div class="card"><b>👥 إدارة الحسابات والشركاء والموظفين</b><div class="mut" style="margin:4px 0 8px">يمكنك هنا توليد <b>رموز QR تفعيل لمرة واحدة</b> تتيح للموظفين والشركاء تسجيل الدخول مباشرة من أجهزتهم. الرمز دائم على جهاز الموظف/الشريك ويُقفل تلقائياً بعد أول استخدام لمنع مشاركته.</div>' +
    tb(
      ["الاسم", "الدور", "الحالة", "الإجراءات"],
      [["المالك", "مالك", "على هذا الجهاز", '<span class="mut">حساب رئيسي</span>']].concat(
        db.pt.map(function (p) {
          return [
            esc(p.name),
            "شريك",
            "صلاحية كاملة",
            '<button class="x e" data-qrpt="' + p.id + '">🔑 رمز QR لمرة واحدة</button>'
          ];
        }),
        db.us.map(function (u) {
          return [
            esc(u.name),
            "موظف",
            db.set.cu == u.id ? '<b class="in">وضع نشط</b>' : "جاهز",
            '<button class="x e" data-qremp="' +
              u.id +
              '">🔑 رمز QR لمرة واحدة</button> <button class="x e" data-uact="' +
              u.id +
              '">تفعيل</button> <button class="x" data-udel="' +
              u.id +
              '">حذف</button>',
          ];
        }),
      ),
    ) +
    '<button class="btn s" data-add="us">+ موظف جديد</button></div>'
  );
}

// النسخ المحلية على هذا الجهاز (IndexedDB)
function snapUI() {
  var kn = { auto: "تلقائية", manual: "يدوية", safety: "قبل استعادة" },
    h =
      '<div class="card"><b>🗂️ النسخ المحلية</b><div class="mut" style="margin:4px 0 8px">تُحفظ نسخة تلقائية كل يوم على هذا الجهاز (آخر ' +
      SNAP_KEEP.auto +
      " أيام)، ونسخة أمان قبل أي استعادة." +
      (STORE_INFO ? "<br>" + esc(STORE_INFO) : "") +
      "</div>";
  if (STORE_MODE !== "idb")
    return h + '<div class="wa">التخزين المتقدم غير متاح في هذا المتصفح، فلا تُحفظ نسخ محلية.</div></div>';
  h += '<button class="btn" id="snow">حفظ نسخة الآن</button>';
  h += SNAPS.length
    ? tb(
        ["التاريخ", "النوع", "المحتوى", ""],
        SNAPS.map(function (s) {
          var c = s.cn || {};
          return [
            esc(s.t),
            kn[s.kind] || esc(s.kind),
            (c.s || 0) + " بيع · " + (c.p || 0) + " منتج · " + Math.round((s.size || 0) / 1024) + " KB",
            '<button class="x e" data-snr="' + s.id + '">استعادة</button>',
          ];
        }),
      )
    : '<div class="mut" style="margin:6px 0">لا توجد نسخ بعد</div>';
  return h + "</div>";
}


/* --- File: js/tabs/home.js --- */
TAB_VIEWS.home = function (inR, r) {
  var h = "";
  var t0 = today(),
    S0 = db.sales.filter(function (x) {
      return x.date == t0;
    }),
    v0 = sm(S0, saleRev),
    lw = db.prods.filter(function (p) {
      return p.min > 0 && p.qty <= p.min;
    }).length;
  h =
    (emp()
      ? '<div class="card">👤 وضع الموظف: <b>' +
        esc(curU().name) +
        '</b><button class="btn s" id="xemp" style="margin-top:8px">خروج (يتطلب رمز المالك)</button></div>'
      : "") +
    '<div class="g">' +
    K("مبيعات اليوم", v0) +
    K(
      "ربح اليوم",
      v0 -
        sm(S0, function (x) {
          return x.cost * x.qty;
        }),
      "in",
    ) +
    K(
      "ديون الزبائن",
      sm(db.cust, function (c) {
        return c.debt;
      }),
      "wa",
    ) +
    K("نواقص المخزون", lw, lw ? "out" : "") +
    "</div>";
  return h;
};


/* --- File: js/tabs/dashboard.js --- */
TAB_VIEWS.dash = function (inR, r) {
  var h = "";
  var S = inR(db.sales),
    rev = sm(S, saleRev),
    cg = sm(S, function (s) {
      return s.cost * s.qty;
    }),
    ex = sm(inR(db.exps), function (e) {
      return e.amt;
    }),
    bu = sm(inR(db.buys), buyTot),
    gp = rev - cg;
  var capN = sm(db.cap, function (c) {
      return c.type == "in" ? c.amt : -c.amt;
    }),
    rA = sm(db.sales, saleRev),
    cA = sm(db.sales, function (s) {
      return s.cost * s.qty;
    }),
    eA = sm(db.exps, function (e) {
      return e.amt;
    }),
    bA = sm(db.buys, buyTot);
  var sv = sm(db.prods, function (p) {
      return p.qty * p.cost;
    }),
    recv = sm(db.cust, function (c) {
      return c.debt;
    }),
    pay = sm(db.buys, function (b) {
      return b.debt || 0;
    }),
    cash =
      capN +
      rA -
      recv -
      (bA - pay) -
      eA -
      sm(db.pl, function (x) {
        return x.type == "w" ? x.amt : 0;
      }),
    np = rA - cA - eA;
  h =
    '<button class="btn s" id="mrp">📄 تقرير شهري (صورة / PDF)</button>' +
    chart() +
    '<div class="card"><b>أداء الفترة</b><div class="g" style="margin-top:8px">' +
    K("المبيعات", rev) +
    K("تكلفة البضاعة المباعة", cg) +
    K("مجمل الربح", gp, gp >= 0 ? "in" : "out") +
    K("المصاريف", ex, "out") +
    K("صافي الربح", gp - ex, gp - ex >= 0 ? "in" : "out") +
    K("المشتريات", bu) +
    '</div><div class="mut" style="margin-top:6px">عدد عمليات البيع: ' +
    S.length +
    (rev ? " · هامش الربح: " + fmt((gp / rev) * 100) + "%" : "") +
    "</div></div>";
  var top = {};
  S.forEach(function (s) {
    top[s.pn] = (top[s.pn] || 0) + saleRev(s) - s.cost * s.qty;
  });
  var tl = Object.keys(top)
    .map(function (k) {
      return [k, top[k]];
    })
    .sort(function (a, b) {
      return b[1] - a[1];
    })
    .slice(0, 5);
  h +=
    '<div class="card"><b>الوضع المالي الكلي</b><div class="g" style="margin-top:8px">' +
    K("رأس المال", capN) +
    K("النقد المتوفر (تقديري)", cash, cash >= 0 ? "" : "out") +
    K("قيمة المخزون", sv) +
    K("صافي الأصول", cash + sv + recv - pay) +
    K("صافي الربح التراكمي", np, np >= 0 ? "in" : "out") +
    K("العائد على رأس المال %", capN ? (np / capN) * 100 : 0) +
    K("ديون الزبائن لك", recv, "wa") +
    K("ديونك للموردين", pay, "wa") +
    K("صافي الأصول (" + db.set.c2 + ")", (cash + sv + recv - pay) / (db.set.rate || 1)) +
    "</div></div>";
  var low = db.prods.filter(function (p) {
    return p.qty <= p.min;
  });
  h +=
    '<div class="card"><b>الأكثر ربحًا في الفترة</b>' +
    tb(
      ["المنتج", "الربح"],
      tl.map(function (x) {
        return [esc(x[0]), fmt(x[1])];
      }),
    ) +
    '</div><div class="card"><b class="wa">تنبيه نقص المخزون</b>' +
    tb(
      ["المنتج", "المتبقي", "الحد الأدنى"],
      low.map(function (p) {
        return [esc(p.name), fmt(p.qty), fmt(p.min)];
      }),
    ) +
    "</div>";
  return h;
};


/* --- File: js/tabs/stock.js --- */
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


/* --- File: js/tabs/purchases.js --- */
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


/* --- File: js/tabs/sales.js --- */
TAB_VIEWS.sell = function (inR, r) {
  var h = "";
  var Sl = inR(db.sales);
  h =
    '<button class="btn" data-add="cust">🧾 إيصال بيع جديد</button><div class="card"><div class="g">' +
    K("المبيعات", sm(Sl, saleRev)) +
    K(
      "الربح",
      sm(Sl, function (s) {
        return saleRev(s) - s.cost * s.qty;
      }),
      "in",
    ) +
    "</div>" +
    tb(
      ["التاريخ", "الإيصال", "الزبون", "المنتج", "الكمية", "السعر", "الخصم", "الإجمالي", "الربح", ""],
      Sl.map(function (s) {
        return [
          s.date,
          s.inv ? "#" + s.inv : "—",
          esc(s.cn || cname(s.inv)),
          esc(s.pn),
          fmt(s.qty),
          fmt(s.price),
          fmt(s.disc),
          fmt(saleRev(s)),
          fmt(saleRev(s) - s.cost * s.qty),
          (s.inv ? '<button class="x e" data-rc="' + s.inv + '">إيصال</button> ' : "") +
            '<button class="x e" data-ret="' +
            s.id +
            '">مرتجع</button> ' +
            dbtn("sale", s.id),
        ];
      }),
    ) +
    "</div>";
  return h;
};


/* --- File: js/tabs/expenses.js --- */
TAB_VIEWS.exp = function (inR, r) {
  var h = "";
  var E = inR(db.exps);
  h =
    '<button class="btn" data-add="exp">+ تسجيل مصروف</button><button class="btn s" id="rex">🔁 مصاريف متكررة</button><div class="card"><b>إجمالي المصاريف: ' +
    fmt(
      sm(E, function (e) {
        return e.amt;
      }),
    ) +
    "</b>" +
    tb(
      ["التاريخ", "البند", "المبلغ", "ملاحظة", ""],
      E.map(function (e) {
        return [e.date, esc(e.cat), fmt(e.amt), esc(e.note), dbtn("exp", e.id)];
      }),
    ) +
    "</div>";
  return h;
};


/* --- File: js/tabs/capital.js --- */
TAB_VIEWS.cap = function (inR, r) {
  var h = "";
  var C = inR(db.cap);
  h =
    '<button class="btn" data-add="cap">+ حركة رأس مال</button><div class="card"><b>رأس المال الحالي: ' +
    fmt(
      sm(db.cap, function (c) {
        return c.type == "in" ? c.amt : -c.amt;
      }),
    ) +
    "</b>" +
    tb(
      ["التاريخ", "النوع", "المبلغ", "ملاحظة", ""],
      C.map(function (c) {
        return [c.date, c.type == "in" ? "إيداع" : "سحب", fmt(c.amt), esc(c.note), dbtn("cap", c.id)];
      }),
    ) +
    "</div>";
  return h;
};


/* --- File: js/tabs/customers.js --- */
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


/* --- File: js/tabs/partners.js --- */
TAB_VIEWS.pt = function (inR, r) {
  var h = "";
  var PP = db.pt,
    PM = db.set.pm || "cap",
    tpc = sm(PP, function (p) {
      return p.pct;
    }),
    tww = sm(PP, function (p) {
      return p.w || 0;
    }),
    LG = db.pl
      .slice()
      .sort(function (a, b) {
        return b.date.localeCompare(a.date) || b.id - a.id;
      })
      .slice(0, 25);
  h =
    '<button class="btn" data-add="pt">+ شريك جديد</button><div class="card"><b>طريقة توزيع الأرباح</b>' +
    sel(
      "pm",
      "الأساس",
      [
        ["cap", "بنسبة رأس المال"],
        ["fix", "نسب متفق عليها"],
        ["mix", "مختلط: نسبة للشريك العامل + الباقي برأس المال"],
      ],
      PM,
    ) +
    '<label>احتياطي يُقتطع من الربح قبل التوزيع (%)</label><input data-s="pr" inputmode="decimal" value="' +
    esc(db.set.pr || "") +
    '">' +
    (PM == "fix" && PP.length && Math.abs(tpc - 100) > 0.01
      ? '<div class="mut out">⚠️ مجموع النسب ' + fmt(tpc) + "% وليس 100%، ستُعدَّل تناسبيًا.</div>"
      : "") +
    (PM == "mix" && tww > 100 ? '<div class="mut out">⚠️ مجموع نسب العمل أكبر من 100%.</div>' : "") +
    '<div class="mut" style="margin-top:6px">الخسارة تُوزَّع دائمًا بنسبة رأس المال. ورأس مال الشريك هنا لحساب النسب فقط، فسجّل الإيداع الفعلي في قسم رأس المال.</div></div><div class="card"><b>الشركاء</b>' +
    tb(
      ["الشريك", "رأس المال", "النسبة", "الرصيد", ""],
      PP.map(function (p) {
        return [
          esc(p.name),
          fmt(p.cap),
          fmt(ptPct(p)) + "%",
          fmt(ptBal(p)),
          '<button class="x e" data-pst="' +
            p.id +
            '">كشف</button> <button class="x e" data-pwd="' +
            p.id +
            '">سحب</button> <button class="x e" data-ped="' +
            p.id +
            '">تعديل</button> ' +
            dbtn("pt", p.id),
        ];
      }),
    ) +
    '</div><button class="btn" id="psl">🧮 حساب وتوزيع أرباح فترة</button><div class="card"><b>آخر الحركات</b>' +
    tb(
      ["التاريخ", "الشريك", "النوع", "المبلغ", "ملاحظة"],
      LG.map(function (x) {
        var p = PP.find(function (q) {
          return q.id == x.pid;
        });
        return [
          x.date,
          esc(p ? p.name : "—"),
          x.type == "d" ? "توزيع أرباح" : "سحب",
          fmt(x.amt),
          esc(x.note),
        ];
      }),
    ) +
    "</div>";
  return h;
};


/* --- File: js/tabs/settings.js --- */
TAB_VIEWS.set = function (inR, r) {
  var h = "";
  h =
    setUI() +
    '<div class="card"><b>الأمان والنسخ الاحتياطي</b><div style="margin-top:8px"><button class="btn s" id="chpin">تغيير الرمز السري</button><button class="btn s" id="fp">تفعيل البصمة</button><button class="btn s" id="bk">نسخ احتياطي (عرض ونسخ)</button><button class="btn s" id="rs">استعادة نسخة احتياطية</button></div></div><div class="card"><b>سجل التدقيق</b><div class="mut">كل إضافة وحذف وتعديل مسجّل ولا يمكن حذفه.</div>' +
    tb(
      ["الوقت", "المستخدم", "العملية", "التفاصيل"],
      db.log
        .slice(-60)
        .reverse()
        .map(function (l) {
          return [esc(l.t), esc(l.u || "المالك"), esc(l.a), esc(l.d)];
        }),
    ) +
    "</div>";
  return h;
};


/* --- File: js/render.js --- */
function render() {
  var isEn = db.set && db.set.lg == "en";
  var PT_EN = { d: "Daily", w: "Weekly", m: "Monthly", y: "Yearly" };
  var NK = emp() ? ["RC"].concat(EA) : Object.keys(TABS);
  if (!emp()) NK.splice(4, 0, "RC");
  document.body.classList.toggle("emp", emp());
  $("hd").innerHTML =
    '<span style="font-size:1.5em">' +
    (db.set.st ? ty().i : "🏪") +
    "</span> " +
    esc(db.set.sn || (isEn ? "Shop Manager" : "إدارة المتجر")) +
    '<small style="display:block;font-weight:400;opacity:.9;font-size:.68em;margin-top:5px">' +
    hdSub() +
    "</small>";
  $("nav").innerHTML = NK.map(function (k) {
    if (k == "RC") return '<button class="rc" data-add="cust"><i>🧾</i>' + (isEn ? "Sales Receipt" : "إيصال بيع") + '</button>';
    var tx = isEn && EN_TABS[k] ? EN_TABS[k] : (k == "stock" && db.set.st ? ty().si + " " + ty().sl : TABS[k]);
    return (
      '<button data-t="' +
      k +
      '" class="' +
      (k == TAB ? "on" : "") +
      '"><i>' +
      tx.split(" ")[0] +
      "</i><span>" +
      tx.split(" ").slice(1).join(" ") +
      "</span></button>"
    );
  }).join("");
  var hm = TAB == "home";
  $("hd").style.display = hm ? "" : "none";
  $("nav").style.display = hm ? "" : "none";
  $("tb").innerHTML = hm
    ? ""
    : '<div class="tbar"><button id="tbk" class="tbar-back-btn" title="' +
      (isEn ? "Back to previous view" : "الرجوع للقائمة السابقة") +
      '">' +
      (isEn ? "← Back" : "→ رجوع") +
      '</button><div class="tbar-title-wrap"><span class="tbar-crumb">' +
      (isEn ? "Home › " : "الرئيسية › ") +
      '</span><b class="tbar-title-text">' +
      esc(secTitle()) +
      "</b></div></div>";
  var usesP = ["dash", "buy", "sell", "exp", "cap", "cust"].indexOf(TAB) >= 0,
    r = range();
  $("pb").innerHTML = usesP
    ? '<div class="pt">' +
      Object.keys(PT)
        .map(function (k) {
          var label = isEn ? PT_EN[k] : PT[k];
          return '<button data-p="' + k + '" class="' + (k == P ? "on" : "") + '">' + label + "</button>";
        })
        .join("") +
      '</div><div class="card" style="padding:8px"><input type="date" id="dt" value="' +
      (DT || today()) +
      '" style="margin:0"><div class="mut" style="margin-top:4px">' +
      (isEn ? "Period: " : "الفترة: ") +
      r[0] +
      " ← " +
      r[1] +
      "</div></div>"
    : "";
  var inR = function (a) {
      return a
        .filter(function (x) {
          return x.date >= r[0] && x.date <= r[1];
        })
        .sort(function (a, b) {
          return b.date.localeCompare(a.date) || b.id - a.id;
        });
    },
    h = "";
  if (TAB_VIEWS[TAB]) h = TAB_VIEWS[TAB](inR, r);
  $("main").innerHTML = (TAB == "dash" || TAB == "cust" || TAB == "home" ? alertsHtml() : "") + h;
  enh($("main"));
  applyTr();
}


/* --- File: js/events.js --- */
document.addEventListener("click", async function (e) {
  var t = e.target.closest("button") || e.target,
    d = t.dataset;
  if (d.t) {
    openTab(d.t);
  } else if (t.id == "tbk") {
    goBack();
  } else if (d.p) {
    P = d.p;
    render();
  } else if (d.add) add(d.add);
  else if (d.ed) edit(+d.ed);
  else if (d.del) {
    var a = d.del.split(":");
    del(a[0], a[1]);
  } else if (d.pay) {
    var q = d.pay.split(":");
    pay(q[0], +q[1]);
  } else if (d.cs) {
    CS = d.cs;
    render();
  } else if (d.rc) receipt(+d.rc);
  else if (d.erc) editRc(+d.erc);
  else if (d.pst) ptStmt(+d.pst);
  else if (d.pwd) ptWd(+d.pwd);
  else if (d.ped) editPt(+d.ped);
  else if (t.id == "psl") ptSettle();
  else if (t.id == "inv") invCount();
  else if (t.id == "rex") recModal();
  else if (t.id == "mrp") monthPick();
  else if (d.rxd) {
    if (await auth()) {
      db.re = (db.re || []).filter(function (x) {
        return x.id != +d.rxd;
      });
      save();
      document.querySelectorAll(".ov").forEach(function (o) {
        o.remove();
      });
      recModal();
    }
  } else if (d.qrpt != null) {
    var ptItem = db.pt.find(function (x) { return x.id == +d.qrpt; });
    if (ptItem && window.__firebaseOpenQrModal) {
      window.__firebaseOpenQrModal('partner', String(ptItem.id), ptItem.name);
    }
  } else if (d.qremp != null) {
    var empItem = db.us.find(function (x) { return x.id == +d.qremp; });
    if (empItem && window.__firebaseOpenQrModal) {
      window.__firebaseOpenQrModal('employee', String(empItem.id), empItem.name);
    }
  } else if (d.uact) {
    db.set.cu = +d.uact;
    save();
    TAB = "home";
    render();
    toast("تم تفعيل وضع الموظف");
  } else if (d.udel) {
    if (await auth()) {
      db.us = db.us.filter(function (u) {
        return u.id != +d.udel;
      });
      if (db.set.cu == +d.udel) db.set.cu = "";
      save();
      render();
    }
  } else if (t.id == "xemp") {
    if (await auth()) {
      db.set.cu = "";
      save();
      TAB = "home";
      render();
      toast("عاد وضع المالك");
    }
  } else if (d.st) stmt(decodeURIComponent(d.st));
  else if (d.ret) ret(+d.ret);
  else if (t.id == "rl") reorder();
  else if (d.arr != null) {
    var ix = +d.arr,
      A = svAll(),
      a = A[ix];
    if (!a || !(await auth())) return;
    await archiveStore();
    await applyBk(a.d);
    toast("تمت استعادة «" + a.n + "»");
  } else if (d.ard != null) {
    if (!(await auth())) return;
    await arcDel(+d.ard);
    render();
  } else if (t.id == "snow") {
    snapNow("manual", "يدوية").then(function (ok) {
      toast(ok ? "تم حفظ نسخة محلية ✅" : "تعذر حفظ النسخة");
      render();
    });
  } else if (d.snr != null) {
    if (!(await auth())) return;
    snapGet(+d.snr).then(function (r) {
      if (!r || !r.d) return toast("النسخة غير موجودة");
      bkPreview(r.d);
    });
  } else if (t.id == "sam") {
    useType(db.set.st || "gen", 1);
    toast("أُضيفت المنتجات النموذجية");
  } else if (t.id == "fbsignin" || t.id == "gcon") {
    if (window.__firebaseOpenLoginGateway) {
      window.__firebaseOpenLoginGateway();
    } else if (window.__firebaseSignIn) {
      window.__firebaseSignIn().then(function() {
        toast("تم تسجيل الدخول بنجاح ✅");
        render();
      });
    }
  } else if (t.id == "fbqrscan") {
    if (window.__firebaseOpenLoginGateway) {
      window.__firebaseOpenLoginGateway('qr');
    }
  } else if (t.id == "fbsignout" || t.id == "gout") {
    if (window.__firebaseSignOut) {
      window.__firebaseSignOut().then(function() {
        toast("تم تسجيل الخروج");
        render();
      });
    }
  } else if (t.id == "fbsyncnow" || t.id == "gup") {
    toast("جارٍ المزامنة السحابية اللحظية...");
    if (window.__firebaseSyncNow) {
      window.__firebaseSyncNow().then(function() {
        toast("تمت المزامنة بنجاح ☁️✅");
        render();
      }).catch(function(err) {
        toast("تعذر المزامنة: " + (err.message || "تحقق من الاتصال"));
      });
    }
  } else if (t.id == "fbdevices") {
    if (window.__firebaseShowDevicesModal) {
      window.__firebaseShowDevicesModal();
    }
  } else if (t.id == "fbcreatebackup") {
    var bName = prompt("اسم النسخة السحابية:", "نسخة " + today());
    if (bName && window.__firebaseCreateBackup) {
      toast("جارٍ حفظ النسخة السحابية...");
      window.__firebaseCreateBackup(bName).then(function() {
        toast("تم حفظ النسخة السحابية بنجاح ☁️");
      }).catch(function(err) {
        toast("تعذر حفظ النسخة: " + err.message);
      });
    }
  } else if (t.id == "fbbackups" || t.id == "gdn") {
    if (window.__firebasePickCloudBackup) {
      window.__firebasePickCloudBackup();
    }
  } else if (t.id == "gout") {
    if (await auth()) {
      db.g = { id: db.g.id, sec: db.g.sec };
      save();
      render();
    }
  } else if (t.id == "np") {
    var LN = NP("LocalNotifications");
    if (LN)
      LN.requestPermissions()
        .then(schedN)
        .catch(function () {
          toast("غير مدعوم هنا");
        });
    else
      try {
        Notification.requestPermission().then(notify);
      } catch (x) {
        toast("غير مدعوم هنا");
      }
  } else if (t.id == "chpin") {
    if ((await auth()) && (await askPin("رمز سري جديد"))) addLog("تغيير الرمز", "");
  } else if (t.id == "fp") {
    if (!(await auth())) return;
    var NB = NP("NativeBiometric");
    if (window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform() && NB) {
      try {
        var av = await NB.isAvailable();
        if (!av.isAvailable) return toast("لا توجد بصمة مفعّلة في إعدادات هاتفك");
        await NB.verifyIdentity({ reason: "تفعيل البصمة", title: "تفعيل البصمة" });
        db.cred = "native";
        save();
        return toast("تم تفعيل البصمة");
      } catch (x) {
        return toast("تعذر تفعيل البصمة، اعتمد على الرمز السري");
      }
    }
    try {
      var c = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: "إدارة المتجر" },
          user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "owner", displayName: "المالك" },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
          timeout: 60000,
        },
      });
      db.cred = b64(c.rawId);
      save();
      toast("تم تفعيل البصمة");
    } catch (x) {
      toast("البصمة غير متاحة هنا، اعتمد على الرمز السري");
    }
  } else if (t.id == "bk") {
    var m = modal(
      '<b>نسخة احتياطية</b><div class="mut">انسخ النص كاملًا واحفظه في ملاحظات أو أرسله لنفسك.</div><textarea id="ta" rows="8" readonly></textarea><div class="row"><button class="btn" id="cp">نسخ</button><button class="btn s" id="sb">مشاركة</button><button class="btn s" id="bf">حفظ كملف</button><button class="btn s" id="no">إغلاق</button></div>',
    );
    m.querySelector("#ta").value = bkJson();
    m.querySelector("#no").onclick = function () {
      m.remove();
    };
    m.querySelector("#sb").onclick = function () {
      if (navigator.share) navigator.share({ title: "نسخة احتياطية", text: bkJson() }).catch(function () {});
      else toast("المشاركة غير مدعومة هنا");
    };
    m.querySelector("#bf").onclick = bkFile;
    m.querySelector("#cp").onclick = function () {
      m.querySelector("#ta").select();
      try {
        document.execCommand("copy");
        toast("تم النسخ");
      } catch (x) {}
    };
  } else if (t.id == "rs") {
    if (!(await auth())) return;
    var m2 = modal(
      '<b>استعادة</b><div class="mut" style="color:var(--out)">سيستبدل هذا كل البيانات الحالية.</div><input type="file" id="rf" accept=".json,application/json,text/plain"><textarea id="ta" rows="8"></textarea><div class="row"><button class="btn" id="go">استعادة</button><button class="btn s" id="no">إلغاء</button></div>',
    );
    m2.querySelector("#no").onclick = function () {
      m2.remove();
    };
    m2.querySelector("#rf").onchange = function () {
      var f = this.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        m2.querySelector("#ta").value = rd.result;
      };
      rd.readAsText(f);
    };
    m2.querySelector("#go").onclick = function () {
      try {
        var n = JSON.parse(m2.querySelector("#ta").value);
        if (!n.prods || !n.sales) throw 0;
        n.log = n.log || [];
        db = Object.assign(
          {
            prods: [],
            buys: [],
            sales: [],
            exps: [],
            cap: [],
            log: [],
            cust: [],
            pt: [],
            pl: [],
            pp: [],
            us: db.us,
            set: db.set,
            g: db.g,
            pin: db.pin,
            cred: db.cred,
            seq: 0,
          },
          n,
        );
        db.pin = n.pin || db.pin;
        addLog("استعادة نسخة", "");
        save();
        m2.remove();
        render();
      } catch (x) {
        toast("النص غير صالح");
      }
    };
  }
});
document.addEventListener("change", function (e) {
  if (e.target.id == "dt") {
    DT = e.target.value;
    render();
  }
  if (e.target.id == "bgup") {
    var f = e.target.files[0];
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      var im = new Image();
      im.onload = function () {
        var cv = document.createElement("canvas"),
          z = Math.min(1, 900 / Math.max(im.width, im.height));
        cv.width = im.width * z;
        cv.height = im.height * z;
        cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
        db.set.bgi = cv.toDataURL("image/jpeg", 0.72);
        db.set.bg = "c";
        save();
        applySet();
        render();
        toast("تم تطبيق الخلفية");
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(f);
    return;
  }
  if (e.target.dataset.g) {
    db.g = db.g || {};
    db.g[e.target.dataset.g] = e.target.value.trim();
    save();
    return;
  }
  var k = e.target.dataset.s;
  if (k == "st") {
    switchType(e.target.value, 0);
    return;
  }
  if (k) {
    var v = e.target.type == "checkbox" ? (e.target.checked ? 1 : 0) : e.target.value;
    if (k[0] == "n") db.set.n[k[1]] = v;
    else db.set[k] = k == "fs" || k == "ic" || k == "rate" ? +v : v;
    save();
    applySet();
    render();
  }
});


/* --- File: js/app.js --- */
function boot() {
  load();
  recRun();
  applySet();
  render();
  notify();
  schedN();
  new MutationObserver(applyTr).observe($("ovl"), { childList: true });
  if (!STORE_READY)
    toast(
      "تعذر قراءة بيانات المتجر المخزّنة. لن يُحفظ أي تعديل حتى لا تضيع بياناتك. أغلق التطبيق وافتحه من جديد.",
    );
  snapAuto().then(function (ok) {
    if (ok && TAB == "set") render();
  });
  if (!db.pin)
    askPin("مرحبًا! أنشئ رمزًا سريًا لحماية الحذف").then(function () {
      typeModal();
    });
  else if (!db.set.st) setTimeout(typeModal, 600);
}
storageInit().then(boot);
