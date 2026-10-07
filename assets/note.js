/* ==========================================================================
   "Send me a note" form.
   Static-site friendly: posts to Web3Forms (no backend needed) and attaches
   the sender's public IP (via ipify) + browser/timezone metadata so the note
   arrives in the owner's inbox with context.
   Replace YOUR_WEB3FORMS_ACCESS_KEY in the form markup with your free key
   from https://web3forms.com (takes ~1 minute, tied to your email).
   ========================================================================== */
(function () {
  "use strict";
  var form = document.getElementById("noteForm");
  if (!form) return;
  var statusEl = document.getElementById("noteStatus");
  var btn = form.querySelector(".note-btn");

  function setStatus(msg, kind) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = "note-status" + (kind ? " is-" + kind : "");
  }

  // Grab the visitor's public IP. Non-blocking: if it fails, the note still sends.
  function getIP() {
    return fetch("https://api.ipify.org?format=json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return (j && j.ip) || ""; })
      .catch(function () { return ""; });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    // honeypot — bots tick this hidden checkbox; humans never see it
    if (form.botcheck && form.botcheck.checked) return;

    var email = (form.email.value || "").trim();
    var message = (form.message.value || "").trim();
    if (!email || !message) { setStatus("Please add your email and a note.", "err"); return; }

    btn.disabled = true;
    setStatus("Sending…", "");

    getIP().then(function (ip) {
      var tz = "";
      try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e2) {}
      var payload = {
        access_key: form.access_key.value,
        subject: form.subject.value,
        from_name: form.from_name.value,
        name: (form.name.value || "").trim() || "(not given)",
        email: email,
        message: message,
        ip_address: ip || "(unavailable)",
        user_agent: navigator.userAgent,
        language: navigator.language || "",
        timezone: tz,
        page: location.href,
        time: new Date().toString()
      };

      return fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      });
    }).then(function (res) {
      return res.json();
    }).then(function (data) {
      if (data && data.success) {
        setStatus("Thanks — your note has been sent. ✓", "ok");
        form.reset();
      } else {
        setStatus((data && data.message) ? data.message : "Something went wrong. Please try again.", "err");
      }
    }).catch(function () {
      setStatus("Network error — please try again later.", "err");
    }).then(function () {
      btn.disabled = false;
    });
  });
})();
