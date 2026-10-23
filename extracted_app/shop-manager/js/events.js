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
