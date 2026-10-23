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
