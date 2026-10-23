var EA = ["stock", "sell", "cust"],
  HC = ["متوسط التكلفة", "قيمة المخزون", "الربح", "المورد", "الدين", "موعده"];
function emp() {
  return !!db.set.cu;
}
function curU() {
  return (
    db.us.find(function (u) {
      return u.id == db.set.cu;
    }) || { name: "موظف" }
  );
}
async function hash(s) {
  try {
    var b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("sh|" + s));
    return Array.from(new Uint8Array(b))
      .map(function (x) {
        return x.toString(16).padStart(2, "0");
      })
      .join("");
  } catch (e) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
    return "f" + (h >>> 0);
  }
}
function b64(b) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(b)));
}
function unb64(s) {
  return Uint8Array.from(atob(s), function (c) {
    return c.charCodeAt(0);
  });
}
function askPin(t) {
  return new Promise(function (res) {
    var m = modal(
      "<b>" +
        t +
        '</b><input id="p1" type="password" inputmode="numeric" placeholder="الرمز (4 أرقام فأكثر)"><input id="p2" type="password" inputmode="numeric" placeholder="أعد كتابة الرمز"><div class="mut" id="er" style="color:var(--out)"></div><div class="row"><button class="btn" id="ok">حفظ</button><button class="btn s" id="no">إلغاء</button></div>',
    );
    m.querySelector("#no").onclick = function () {
      m.remove();
      res(false);
    };
    m.querySelector("#ok").onclick = async function () {
      var a = m.querySelector("#p1").value;
      if (a.length < 4) return (m.querySelector("#er").textContent = "الرمز قصير");
      if (a !== m.querySelector("#p2").value)
        return (m.querySelector("#er").textContent = "الرمزان غير متطابقين");
      db.pin = await hash(a);
      save();
      m.remove();
      res(true);
    };
  });
}
function auth() {
  return new Promise(function (res) {
    var has = !!db.cred,
      m = modal(
        '<b>تأكيد الهوية</b><div class="mut">أدخل الرمز السري للمتابعة</div><input id="pp" type="password" inputmode="numeric" placeholder="الرمز السري"><div class="mut" id="er" style="color:var(--out)"></div><div class="row"><button class="btn" id="ok">تأكيد</button>' +
          (has ? '<button class="btn s" id="bio">البصمة</button>' : "") +
          '<button class="btn s" id="no">إلغاء</button></div>',
      );
    m.querySelector("#no").onclick = function () {
      m.remove();
      res(false);
    };
    m.querySelector("#ok").onclick = async function () {
      if ((await hash(m.querySelector("#pp").value)) === db.pin) {
        m.remove();
        res(true);
      } else m.querySelector("#er").textContent = "الرمز غير صحيح";
    };
    if (has)
      m.querySelector("#bio").onclick = async function () {
        if (db.cred == "native") {
          try {
            await NP("NativeBiometric").verifyIdentity({ reason: "تأكيد الهوية", title: "تأكيد الهوية" });
            m.remove();
            res(true);
          } catch (e) {
            m.querySelector("#er").textContent = "تعذر التحقق بالبصمة، استخدم الرمز";
          }
          return;
        }
        try {
          await navigator.credentials.get({
            publicKey: {
              challenge: crypto.getRandomValues(new Uint8Array(32)),
              allowCredentials: [{ type: "public-key", id: unb64(db.cred) }],
              userVerification: "required",
              timeout: 60000,
            },
          });
          m.remove();
          res(true);
        } catch (e) {
          m.querySelector("#er").textContent = "تعذر التحقق بالبصمة، استخدم الرمز";
        }
      };
  });
}
