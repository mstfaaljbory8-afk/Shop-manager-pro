function scanBtn(m, cb) {
  var b = document.createElement("button");
  b.className = "btn s";
  b.textContent = "📷 مسح باركود";
  b.onclick = function () {
    scan(cb);
  };
  m.querySelector("#er").before(b);
}
function scan(cb) {
  var B = NP("BarcodeScanner");
  if (B && B.scan) {
    B.scan()
      .then(function (r) {
        var b = r.barcodes && r.barcodes[0];
        if (b) cb(b.rawValue);
      })
      .catch(function () {
        scanWeb(cb);
      });
    return;
  }
  scanWeb(cb);
}
function scanWeb(cb) {
  if (!window.BarcodeDetector) return toast("مسح الباركود غير مدعوم في هذا المتصفح");
  var m = modal(
      '<b>وجّه الكاميرا إلى الباركود</b><video id="vd" playsinline autoplay style="width:100%;border-radius:12px;margin:8px 0"></video><button class="btn s" id="no">إغلاق</button>',
    ),
    st,
    on = 1,
    dt = new BarcodeDetector();
  var end = function () {
    on = 0;
    if (st)
      st.getTracks().forEach(function (t) {
        t.stop();
      });
    m.remove();
  };
  m.querySelector("#no").onclick = end;
  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "environment" } })
    .then(function (z) {
      st = z;
      var v = m.querySelector("#vd");
      v.srcObject = z;
      (function lp() {
        if (!on) return;
        dt.detect(v)
          .then(function (q) {
            if (q.length) {
              var c = q[0].rawValue;
              end();
              cb(c);
            } else setTimeout(lp, 300);
          })
          .catch(function () {
            setTimeout(lp, 500);
          });
      })();
    })
    .catch(function () {
      end();
      toast("تعذر فتح الكاميرا");
    });
}
