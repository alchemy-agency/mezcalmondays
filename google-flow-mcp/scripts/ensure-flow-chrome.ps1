# Idempotent: ensures the dedicated Chromium browser for Google Flow is listening on CDP 9222.
# Already up -> READY. Otherwise launches it DETACHED (survives the caller exiting)
# and verifies. Single-line output for easy parsing. Portable via env vars.
# Patched: also accepts Brave (Chromium) when Google Chrome is not installed, and reads
# chromePath / chromeUserDataDir from config/flow.config.json when present.
$CdpPort = 9222
$UserDataDir = Join-Path $env:LOCALAPPDATA "FlowAutomationChrome"
$FlowUrl = "https://labs.google/fx/tools/flow"

$ConfigPath = Join-Path (Split-Path $PSScriptRoot -Parent) "config\flow.config.json"
$ConfiguredChrome = $null
if (Test-Path $ConfigPath) {
    try {
        $cfg = Get-Content $ConfigPath -Raw | ConvertFrom-Json
        if ($cfg.chromePath) { $ConfiguredChrome = $cfg.chromePath }
        if ($cfg.chromeUserDataDir) { $UserDataDir = $cfg.chromeUserDataDir }
        if ($cfg.cdpPort) { $CdpPort = [int]$cfg.cdpPort }
        if ($cfg.flowUrl) { $FlowUrl = $cfg.flowUrl }
    } catch { }
}

$ChromeCandidates = @(
    $ConfiguredChrome,
    (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
    (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe"),
    (Join-Path $env:ProgramFiles "BraveSoftware\Brave-Browser\Application\brave.exe"),
    (Join-Path $env:LOCALAPPDATA "BraveSoftware\Brave-Browser\Application\brave.exe")
)
$ChromePath = $ChromeCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

function Test-Cdp {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$CdpPort/json/version" -UseBasicParsing -TimeoutSec 4
        return $r.StatusCode -eq 200
    } catch { return $false }
}

if (Test-Cdp) { Write-Output "READY: Browser already up on CDP $CdpPort"; exit 0 }

if (-not $ChromePath) { Write-Output "FAILED: no Chromium browser found (checked Chrome and Brave locations)"; exit 1 }
if (-not (Test-Path $UserDataDir)) { New-Item -ItemType Directory -Path $UserDataDir -Force | Out-Null }

Start-Process -FilePath $ChromePath -ArgumentList `
    "--remote-debugging-port=$CdpPort", `
    "--user-data-dir=`"$UserDataDir`"", `
    "--no-first-run", "--no-default-browser-check", `
    "--disable-blink-features=AutomationControlled", `
    "--window-size=1920,1080", $FlowUrl

for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Cdp) { Write-Output "LAUNCHED: $ChromePath up on CDP $CdpPort. If labs.google shows the landing page, click 'Sign in to Flow' once."; exit 0 }
}
Write-Output "FAILED: browser launched but CDP $CdpPort not responding within 15s"
exit 1
