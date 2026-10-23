function boot() {
  load();
  recRun();
  applySet();
  render();
  notify();
  schedN();
  new MutationObserver(applyTr).observe($("ovl"), { childList: true });
  if (!STORE_READY)
    toast(
      "تعذر قراءة بيانات المتجر المخزّنة. لن يُحفظ أي تعديل حتى لا تضيع بياناتك. أغلق التطبيق وافتحه من جديد.",
    );
  snapAuto().then(function (ok) {
    if (ok && TAB == "set") render();
  });
  if (!db.pin)
    askPin("مرحبًا! أنشئ رمزًا سريًا لحماية الحذف").then(function () {
      typeModal();
    });
  else if (!db.set.st) setTimeout(typeModal, 600);
}
storageInit().then(boot);
