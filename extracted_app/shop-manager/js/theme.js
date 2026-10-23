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
