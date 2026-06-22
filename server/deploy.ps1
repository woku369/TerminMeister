# TerminMeister Server Deploy
# Kopiert server.js und public/index.html auf den NAS

$nasBase = "\\DS124-RockingK\Gurktaler\terminmeister"

if (-not (Test-Path $nasBase)) {
  Write-Error "NAS-Pfad nicht erreichbar. Tailscale aktiv?"
  exit 1
}

$ts = Get-Date -Format "yyyyMMdd-HHmmss"

# server.js deployen
$srcJs = "$PSScriptRoot\server.js"
$dstJs = "$nasBase\server.js"
if (-not (Test-Path $srcJs)) { Write-Error "Quelle fehlt: $srcJs"; exit 1 }
Copy-Item $dstJs "$nasBase\server.js.bak.$ts" -ErrorAction SilentlyContinue
Copy-Item $srcJs $dstJs -Force
Write-Output "Deployed: $dstJs"

# public/index.html deployen
$srcHtml = "$PSScriptRoot\public\index.html"
$dstHtml = "$nasBase\public\index.html"
if (Test-Path $srcHtml) {
  if (-not (Test-Path "$nasBase\public")) { New-Item -ItemType Directory "$nasBase\public" | Out-Null }
  Copy-Item $srcHtml $dstHtml -Force
  Write-Output "Deployed: $dstHtml"
} else {
  Write-Warning "public\index.html nicht gefunden – uebersprungen"
}

Write-Output ""
Write-Output "Naechster Schritt: Node-Prozess auf DSM neustarten"
Write-Output "  ssh wolfg@DS124-RockingK"
Write-Output "  sudo sh /volume1/Gurktaler/terminmeister/restart.sh"
