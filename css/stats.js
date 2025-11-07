(function addStats() {
  const KEY = "poke_stats_script_status"; 
 
  try {
    const status = localStorage.getItem(KEY);
    if (status === "blocked") {
      console.log("[Poke] Stats script permanently disabled (network blocked)");
      return;
    }
    if (status === "ok") {
      return loadScript();
    }
  } catch (e) {
    console.warn("[Poke] localStorage blocked, disabling improving-poke.js");
    return;
  }

   const testPayload = JSON.stringify({ test: true });

  const test = fetch("/api/stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: testPayload,
    keepalive: true,
  })
    .then(() => {
      try {
        localStorage.setItem(KEY, "ok");
      } catch {}
      loadScript();
    })
    .catch(() => {
      console.warn("[Poke] Stats endpoint blocked — never loading improving script again");
      try {
        localStorage.setItem(KEY, "blocked");
      } catch {}
    });

  function loadScript() {
    const url = "/static/improving-poke.js";
    if (document.querySelector(`script[src="${url}"]`)) return;

    const s = document.createElement("script");
    s.src = url;
    s.type = "text/javascript";
    s.async = true;
    s.defer = true;

    s.onload = () => console.log("[Poke] improving-poke.js loaded");
    s.onerror = () => {
      console.warn("[Poke] script failed — marking as blocked");
      try {
        localStorage.setItem(KEY, "blocked");
      } catch {}
    };

    document.head.appendChild(s);
  }
})();
