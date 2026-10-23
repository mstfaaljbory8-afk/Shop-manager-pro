TAB_VIEWS.set = function (inR, r) {
  var h = "";
  h =
    setUI() +
    '<div class="card"><b>الأمان والنسخ الاحتياطي</b><div style="margin-top:8px"><button class="btn s" id="chpin">تغيير الرمز السري</button><button class="btn s" id="fp">تفعيل البصمة</button><button class="btn s" id="bk">نسخ احتياطي (عرض ونسخ)</button><button class="btn s" id="rs">استعادة نسخة احتياطية</button></div></div><div class="card"><b>سجل التدقيق</b><div class="mut">كل إضافة وحذف وتعديل مسجّل ولا يمكن حذفه.</div>' +
    tb(
      ["الوقت", "المستخدم", "العملية", "التفاصيل"],
      db.log
        .slice(-60)
        .reverse()
        .map(function (l) {
          return [esc(l.t), esc(l.u || "المالك"), esc(l.a), esc(l.d)];
        }),
    ) +
    "</div>";
  return h;
};
