/* ==========================================================================
   Invisible visit logger (robust image-beacon version).
   On the first page load of a session it sends the visitor's public IP (via
   ipify) + user-agent + time + page/referrer to a Google Apps Script web app,
   which appends one row to a private Google Sheet only the owner can see.

   Uses a GET "tracking pixel" (new Image().src = url?params) as the primary
   channel: GET image requests are never blocked by CORS and follow Apps
   Script's redirect fine, so the row is written even though the image itself
   "fails to load". A sendBeacon POST is NOT also fired, to avoid double rows.

   Requires the Apps Script to handle GET params (see the doGet in the setup
   code). Replace the ENDPOINT below with your /exec web-app URL.
   ========================================================================== */
(function () {
  "use strict";
  var ENDPOINT = "https://script.google.com/macros/s/AKfycbzD6JQTeATvRoXawexCcv-dOYJ3rrnsij5v6-l3qIqxvdFJYWL_gI-fFpcGA6hwOSkFvg/exec";
  if (ENDPOINT.indexOf("http") !== 0) return;

  // log once per browser session (navigating pages won't spam rows)
  try {
    if (sessionStorage.getItem("__visit_logged")) return;
    sessionStorage.setItem("__visit_logged", "1");
  } catch (e) {}

  function tz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { return ""; } }

  function fire(ip) {
    var q = {
      time: new Date().toString(),
      iso: new Date().toISOString(),
      ip: ip || "(unavailable)",
      user_agent: navigator.userAgent,
      language: navigator.language || "",
      timezone: tz(),
      page: location.pathname + location.search,
      referrer: document.referrer || "(direct)",
      screen: (window.screen ? (screen.width + "x" + screen.height) : "")
    };
    var qs = [];
    for (var k in q) { if (q.hasOwnProperty(k)) qs.push(encodeURIComponent(k) + "=" + encodeURIComponent(q[k])); }
    try {
      var img = new Image();
      img.referrerPolicy = "no-referrer";
      img.src = ENDPOINT + "?" + qs.join("&") + "&_=" + Date.now();
    } catch (e) {}
  }

  fetch("https://api.ipify.org?format=json", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { fire(j && j.ip); })
    .catch(function () { fire(""); });
})();
