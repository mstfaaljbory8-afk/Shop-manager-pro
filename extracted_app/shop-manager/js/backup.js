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
