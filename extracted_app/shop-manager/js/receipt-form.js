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
