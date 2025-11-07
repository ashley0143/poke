(function addStats() {
  const url = "/static/improving-poke.js"

  if (document.querySelector(`script[src="${url}"]`)) return

  const s = document.createElement("script")
  s.src = url
  s.type = "text/javascript"
  s.async = true
  s.defer = true

  s.onload = () => console.log("[Poke] improving-poke.js loaded successfully")
  s.onerror = () => console.warn("[Poke] failed to load improving-poke.js")

  document.head.appendChild(s)
})()
