/* Health checkup page: poster zoom + show/hide all test names */
(function () {
  "use strict";
  var zoom = document.querySelector(".cu-zoom");
  var btn = document.querySelector("[data-zoom]");
  if (zoom && btn) {
    btn.addEventListener("click", function () { zoom.showModal(); zoom.scrollTop = 0; });
    zoom.addEventListener("click", function (e) {
      // Close on the ✕ or on the dark area; tapping the poster itself keeps it open for zooming.
      if (e.target === zoom || e.target.closest("[data-close]")) zoom.close();
    });
  }
  var toggle = document.querySelector("[data-toggleall]");
  if (toggle) {
    var groups = Array.prototype.slice.call(document.querySelectorAll("details.cu-group"));
    var sync = function () {
      var allOpen = groups.every(function (d) { return d.open; });
      toggle.textContent = allOpen ? "Hide test names" : "Show all test names";
    };
    toggle.addEventListener("click", function () {
      var open = !groups.every(function (d) { return d.open; });
      groups.forEach(function (d) { d.open = open; });
      sync();
    });
    groups.forEach(function (d) { d.addEventListener("toggle", sync); });
    sync();
  }
})();

/* "Call me back with today's rate" (shown when the price is hidden) */
(function () {
  "use strict";
  var box = document.querySelector("[data-rate]");
  if (!box) return;
  var form = box.querySelector("form"), msg = box.querySelector(".cu-rate__msg");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var phone = form.phone.value.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
    if (!/^[6-9]\d{9}$/.test(phone)) { msg.className = "cu-rate__msg bad"; msg.textContent = "Please enter a valid 10-digit mobile number."; form.phone.focus(); return; }
    var btn = form.querySelector("button"); btn.disabled = true;
    var fd = new FormData();
    fd.append("type", "rate"); fd.append("phone", phone); fd.append("items", box.getAttribute("data-rate"));
    fetch("/api/leads", { method: "POST", body: fd })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || "Could not send"); return d; }); })
      .then(function (d) { form.hidden = true; msg.className = "cu-rate__msg ok"; msg.textContent = "✓ Thank you! We'll call you shortly with today's rate. (Ref " + d.ref + ")"; })
      .catch(function (err) { msg.className = "cu-rate__msg bad"; msg.textContent = err.message + " Please use WhatsApp or call us."; btn.disabled = false; });
  });
})();
