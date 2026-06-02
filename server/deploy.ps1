# TerminMeister Server Deploy
# Kopiert server.js von hier (Quelle) auf den NAS (Ziel)

$src = "$PSScriptRoot\server.js"
$dst = "\\DS124-RockingK\Gurktaler\terminmeister\server.js"

if (-not (Test-Path $src)) {
  Write-Error "Quelle fehlt: $src"
  exit 1
}

if (-not (Test-Path "\\DS124-RockingK\Gurktaler\terminmeister")) {
  Write-Error "NAS-Pfad nicht erreichbar. Tailscale aktiv?"
  exit 1
}

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$bak = "\\DS124-RockingK\Gurktaler\terminmeister\server.js.bak.$ts"
Copy-Item $dst $bak -ErrorAction SilentlyContinue
Write-Output "Backup: $bak"

Copy-Item $src $dst -Force
Write-Output "Deployed: $dst"
Write-Output ""
Write-Output "Naechster Schritt: Node-Prozess auf DSM neustarten"
Write-Output "  ssh wolfg@DS124-RockingK"
Write-Output "  cd /volume1/Gurktaler/terminmeister; ./restart.sh"
