var _ig = 0;
function hp(o) {
  try {
    history.pushState(o, "");
  } catch (e) {}
}
function secTitle() {
  return TAB == "stock" && db.set.st ? ty().si + " " + ty().sl : TABS[TAB] || "";
}
function openTab(t) {
  if (emp() && EA.indexOf(t) < 0) return toast("هذا القسم غير متاح في حساب الموظف");
  TAB = t;
  hp({ s: t });
  render();
  window.scrollTo(0, 0);
}
function goBack() {
  if (history.state && history.state.s) {
    _ig++;
    try {
      history.back();
    } catch (e) {
      _ig--;
    }
  }
  TAB = "home";
  render();
  window.scrollTo(0, 0);
}
window.addEventListener("popstate", function () {
  if (_ig > 0) {
    _ig--;
    return;
  }
  var ov = document.querySelectorAll(".ov");
  if (ov.length) {
    ov[ov.length - 1].remove();
    if (TAB != "home") hp({ s: TAB });
    return;
  }
  if (TAB != "home") {
    TAB = "home";
    render();
    window.scrollTo(0, 0);
  }
});
