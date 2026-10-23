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
