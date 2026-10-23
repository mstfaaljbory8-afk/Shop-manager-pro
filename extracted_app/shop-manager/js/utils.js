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
