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
