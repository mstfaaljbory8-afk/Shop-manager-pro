function render() {
  var NK = emp() ? ["RC"].concat(EA) : Object.keys(TABS);
  if (!emp()) NK.splice(4, 0, "RC");
  document.body.classList.toggle("emp", emp());
  $("hd").innerHTML =
    '<span style="font-size:1.5em">' +
    (db.set.st ? ty().i : "🏪") +
    "</span> " +
    esc(db.set.sn || "إدارة المتجر") +
    '<small style="display:block;font-weight:400;opacity:.9;font-size:.68em;margin-top:5px">' +
    hdSub() +
    "</small>";
  $("nav").innerHTML = NK.map(function (k) {
    if (k == "RC") return '<button class="rc" data-add="cust"><i>🧾</i>إيصال بيع</button>';
    var tx = k == "stock" && db.set.st ? ty().si + " " + ty().sl : TABS[k];
    return (
      '<button data-t="' +
      k +
      '" class="' +
      (k == TAB ? "on" : "") +
      '"><i>' +
      tx.split(" ")[0] +
      "</i>" +
      tx.split(" ").slice(1).join(" ") +
      "</button>"
    );
  }).join("");
  var hm = TAB == "home";
  $("hd").style.display = hm ? "" : "none";
  $("nav").style.display = hm ? "" : "none";
  $("tb").innerHTML = hm
    ? ""
    : '<div class="tbar"><button id="tbk">' +
      (db.set.lg == "en" ? "←" : "→") +
      "</button><b>" +
      esc(secTitle()) +
      "</b></div>";
  var usesP = ["dash", "buy", "sell", "exp", "cap", "cust"].indexOf(TAB) >= 0,
    r = range();
  $("pb").innerHTML = usesP
    ? '<div class="pt">' +
      Object.keys(PT)
        .map(function (k) {
          return '<button data-p="' + k + '" class="' + (k == P ? "on" : "") + '">' + PT[k] + "</button>";
        })
        .join("") +
      '</div><div class="card" style="padding:8px"><input type="date" id="dt" value="' +
      (DT || today()) +
      '" style="margin:0"><div class="mut" style="margin-top:4px">الفترة: ' +
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
