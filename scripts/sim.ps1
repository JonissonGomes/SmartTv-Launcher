# Build e lanca no webOS TV 26 Simulator 1.5.0
$ErrorActionPreference = 'Stop'

$SimulatorPath = if ($env:SIMULATOR_PATH) {
  $env:SIMULATOR_PATH
} else {
  Join-Path $env:USERPROFILE 'Documents\webOS_TV_26_Simulator_1.5.0'
}

if (-not (Test-Path $SimulatorPath)) {
  Write-Error "Simulator nao encontrado em: $SimulatorPath"
}

Write-Host "==> Build"
npm run build

$aresLaunch = Join-Path $PSScriptRoot '..\node_modules\.bin\ares-launch.cmd'
if (-not (Test-Path $aresLaunch)) {
  Write-Error "ares-launch nao encontrado. Rode npm install."
}

Write-Host "==> Launch Simulator ($SimulatorPath)"
& $aresLaunch -s 26 -sp $SimulatorPath dist
