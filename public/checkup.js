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
