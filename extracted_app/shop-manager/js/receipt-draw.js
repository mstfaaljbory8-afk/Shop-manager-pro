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
