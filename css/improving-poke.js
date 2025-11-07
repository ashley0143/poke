function sendStats(videoId) {
  if (!videoId) return

   try {
    if (localStorage.getItem("poke_stats_optout") === "1") return
  } catch (e) {
    return
  }

  let userId
  try {
    userId = localStorage.getItem("poke_uid")
    if (!userId) {
      userId = "u_" + Math.random().toString(36).slice(2) + Date.now()
      localStorage.setItem("poke_uid", userId)
    }
  } catch (e) {
    return
  }

  const payload = JSON.stringify({ videoId, userId })

   if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" })
    navigator.sendBeacon("/api/stats", blob)
  } else {
     fetch("/api/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true
    }).catch(() => {})
  }
}

sendStats(new URLSearchParams(location.search).get("v"))
