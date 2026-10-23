function shr(t, tx) {
  var m = modal(
    "<b>" +
      t +
      '</b><textarea id="ta" rows="10" readonly></textarea><div class="row"><button class="btn" id="sh">مشاركة</button><button class="btn s" id="wa">واتساب</button></div><div class="row"><button class="btn s" id="pr">طباعة</button><button class="btn s" id="si">🖼️ صورة</button><button class="btn s" id="no">إغلاق</button></div>',
  );
  m.querySelector("#ta").value = tx;
  m.querySelector("#no").onclick = function () {
    m.remove();
  };
  m.querySelector("#sh").onclick = function () {
    if (navigator.share) navigator.share({ text: tx }).catch(function () {});
    else {
      m.querySelector("#ta").select();
      document.execCommand("copy");
      toast("تم النسخ");
    }
  };
  m.querySelector("#si").onclick = function () {
    mkImg(t, tx, function (b, u) {
      var f = new File([b], "receipt.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [f] }))
        navigator.share({ files: [f] }).catch(function () {});
      else {
        m.querySelector("#ta").outerHTML = '<img src="' + u + '" style="width:100%;border-radius:10px">';
        toast("اضغط مطولًا على الصورة لحفظها أو تصويرها");
      }
    });
  };
  m.querySelector("#wa").onclick = function () {
    window.open("https://wa.me/?text=" + encodeURIComponent(tx));
  };
  m.querySelector("#pr").onclick = function () {
    var w = window.open("", "_blank");
    if (!w) return toast("الطباعة غير متاحة هنا، استخدم المشاركة");
    w.document.write('<pre style="font:16px Tahoma;white-space:pre-wrap">' + esc(tx) + "</pre>");
    w.print();
  };
}
function receiptTxt(id) {
  var c = db.cust.find(function (x) {
    return x.id == id;
  });
  if (!c) return;
  shr(
    "إيصال بيع",
    " إيصال بيع رقم " +
      c.id +
      "\nالتاريخ: " +
      c.date +
      "\nالزبون: " +
      c.name +
      "\nالبائع: " +
      c.seller +
      "\n" +
      c.items.split(" ، ").join("\n") +
      "\nالإجمالي: " +
      fmt(c.total) +
      "\nالمقبوض: " +
      fmt(c.total - c.debt) +
      "\nالآجل: " +
      fmt(c.debt) +
      (c.dd ? "\nموعد التسديد: " + c.dd : ""),
  );
}
async function shareBlob(b, name, mime) {
  try {
    var F = NP("Filesystem"),
      S = NP("Share"),
      nat = window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform();
    if (nat && F && S) {
      var data = await new Promise(function (res) {
        var r = new FileReader();
        r.onload = function () {
          res(r.result.split(",")[1]);
        };
        r.readAsDataURL(b);
      });
      var w = await F.writeFile({ path: name, data: data, directory: "CACHE" });
      await S.share({ title: name, files: [w.uri] });
      return;
    }
    var f = new File([b], name, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      await navigator.share({ files: [f] });
      return;
    }
    var u = URL.createObjectURL(b),
      a = document.createElement("a");
    a.href = u;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast("تم التنزيل");
  } catch (e) {
    toast("تعذرت المشاركة");
  }
}
function receipt(id) {
  var c = db.cust.find(function (x) {
    return x.id == id;
  });
  if (!c) return;
  var cv = rcCanvas(c),
    m = modal(
      "<b>إيصال بيع رقم " +
        c.id +
        '</b><img src="' +
        cv.toDataURL("image/png") +
        '" style="width:100%;border-radius:10px;margin:8px 0;border:1px solid var(--bd)"><div class="row"><button class="btn" id="ri">🖼️ صورة</button><button class="btn" id="rp">📄 PDF</button></div><div class="row"><button class="btn s" id="rt">نص</button><button class="btn s" id="rr">🖨️ طباعة</button><button class="btn s" id="re">✏️ تعديل</button><button class="btn s" id="no">إغلاق</button></div>',
    );
  m.querySelector("#no").onclick = function () {
    m.remove();
  };
  m.querySelector("#ri").onclick = function () {
    cv.toBlob(function (b) {
      shareBlob(b, "receipt-" + c.id + ".png", "image/png");
    });
  };
  m.querySelector("#rp").onclick = function () {
    shareBlob(pdfBlob(cv), "receipt-" + c.id + ".pdf", "application/pdf");
  };
  m.querySelector("#re").onclick = function () {
    m.remove();
    editRc(c.id);
  };
  m.querySelector("#rr").onclick = function () {
    var w = window.open("", "_blank");
    if (!w) return toast("الطباعة المباشرة غير متاحة هنا، اختر PDF ثم اطبعه من هاتفك");
    w.document.write('<img src="' + cv.toDataURL("image/png") + '" style="width:100%" onload="print()">');
    w.document.close();
  };
  m.querySelector("#rt").onclick = function () {
    m.remove();
    receiptTxt(c.id);
  };
}
