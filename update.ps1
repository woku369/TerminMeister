# TerminMeister Update + Deploy + NAS-Neustart
# Doppelklick genuegt.

$branch  = 'claude/prompt-context-txt-3qJk5'
$nasUser = 'Wolfgang'
$nasHost = '100.121.103.107'
$nasSrv  = '/volume1/Gurktaler/terminmeister/server.js'
$nasLog  = '/volume1/Gurktaler/terminmeister/server.log'

function Step($n, $text) { Write-Host ''; Write-Host "$n  $text" -ForegroundColor Cyan }
function Ok($text)        { Write-Host "    OK: $text" -ForegroundColor Green }
function Fail($text)      { Write-Host "    FEHLER: $text" -ForegroundColor Red; Read-Host 'Enter druecken'; exit 1 }

Write-Host '=== TerminMeister Update ===' -ForegroundColor Yellow
Write-Host "Branch: $branch"

Step '1/5' 'git fetch ...'
git fetch origin $branch
if ($LASTEXITCODE -ne 0) { Fail 'git fetch fehlgeschlagen' }
Ok 'fetch'

Step '2/5' 'git merge ...'
git merge "origin/$branch"
if ($LASTEXITCODE -ne 0) { Fail 'git merge fehlgeschlagen (Konflikt?)' }
Ok 'merge'

Step '3/5' 'npm run build  (Vite-Build, dauert ~30s) ...'
npm run build
if ($LASTEXITCODE -ne 0) { Fail 'Build fehlgeschlagen' }
Ok 'build'

Step '4/5' 'Deploy server.js auf NAS ...'
& "$PSScriptRoot\server\deploy.ps1"
if ($LASTEXITCODE -ne 0) { Fail 'Deploy fehlgeschlagen' }
Ok 'deploy'

Step '5/5' 'NAS-Server neustarten (SSH) ...'
$restartCmd = "fuser -k 3005/tcp 2>/dev/null; sleep 1; nohup node $nasSrv >> $nasLog 2>&1 &"
ssh "${nasUser}@${nasHost}" $restartCmd
Start-Sleep 3

$checkCmd = "ps aux | grep '$nasSrv' | grep -v grep | wc -l"
$running  = ssh "${nasUser}@${nasHost}" $checkCmd
if ([int]$running -ge 1) {
    Ok 'Server laeuft'
} else {
    Write-Host '    WARNUNG: Prozess nicht gefunden - bitte manuell pruefen' -ForegroundColor Yellow
}

Write-Host ''
Write-Host '=== Fertig! ===' -ForegroundColor Yellow
Write-Host ''
Write-Host '  Naechster Schritt: TerminMeister-App neu starten!' -ForegroundColor White
Write-Host '  (Das neue Frontend ist in dist/ - beim Neustart automatisch aktiv)' -ForegroundColor Gray
Write-Host ''
Write-Host "  NAS-API: http://${nasHost}:3005/" -ForegroundColor White
Write-Host ''
Read-Host 'Enter druecken zum Schliessen'
