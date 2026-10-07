/* ==========================================================================
   Invisible visit logger (client-side geo + VPN).
   On the first page load of a session it resolves the visitor's IP, location
   and VPN/proxy status in the BROWSER via ipapi.is (HTTPS + CORS, reliable),
   then sends everything to a Google Apps Script web app that appends one row
   to a private Google Sheet. Doing geo in the browser avoids Apps Script's
   server-side fetch limits (auth / rate-limit / HTTP), which were leaving the
   location columns empty.
   Fire-and-forget image beacon (GET) — no CORS issues reaching Apps Script.
   ========================================================================== */
(function () {
  "use strict";
  var ENDPOINT = "https://script.google.com/macros/s/AKfycbzD6JQTeATvRoXawexCcv-dOYJ3rrnsij5v6-l3qIqxvdFJYWL_gI-fFpcGA6hwOSkFvg/exec";
  if (ENDPOINT.indexOf("http") !== 0) return;

  try { if (sessionStorage.getItem("__visit_logged")) return; sessionStorage.setItem("__visit_logged", "1"); } catch (e) {}

  function tz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { return ""; } }

  // primary: ipapi.is → ip + location + ISP + VPN/proxy/datacenter/tor flags
  function geo() {
    return fetch("https://api.ipapi.is/", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.ip) return null;
        var loc = d.location || {}, asn = d.asn || {}, co = d.company || {};
        var vpn = d.is_vpn ? "Yes — VPN" : d.is_proxy ? "Yes — Proxy" : d.is_tor ? "Yes — Tor"
                : d.is_datacenter ? "Yes — Datacenter" : "No";
        return { ip: d.ip, country: loc.country || "", city: loc.city || "", region: loc.state || "",
                 isp: asn.org || co.name || "", vpn: vpn };
      }).catch(function () { return null; });
  }
  // fallback: at least the IP (ipify)
  function ipOnly() {
    return fetch("https://api.ipify.org?format=json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return (j && j.ip) ? { ip: j.ip, country: "", city: "", region: "", isp: "", vpn: "" } : null; })
      .catch(function () { return null; });
  }

  function fire(g) {
    g = g || { ip: "(unavailable)", country: "", city: "", region: "", isp: "", vpn: "" };
    var q = {
      ip: g.ip || "(unavailable)", country: g.country || "", city: g.city || "", region: g.region || "",
      isp: g.isp || "", vpn: g.vpn || "",
      user_agent: navigator.userAgent, language: navigator.language || "", timezone: tz(),
      page: location.pathname + location.search, referrer: document.referrer || "(direct)",
      screen: (window.screen ? (screen.width + "x" + screen.height) : "")
    };
    var qs = [];
    for (var k in q) { if (q.hasOwnProperty(k)) qs.push(encodeURIComponent(k) + "=" + encodeURIComponent(q[k])); }
    try { var img = new Image(); img.referrerPolicy = "no-referrer"; img.src = ENDPOINT + "?" + qs.join("&") + "&_=" + Date.now(); } catch (e) {}
  }

  geo().then(function (g) { return g || ipOnly(); }).then(fire);
})();
