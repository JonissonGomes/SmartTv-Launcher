# Build e lanca no webOS TV 26 Simulator 1.5.0
# Workaround: abre o .exe antes do ares-launch — evita EPIPE/machineIdSync
# quando o CLI tenta subir o Electron via execSync.
$ErrorActionPreference = 'Stop'

$SimulatorPath = if ($env:SIMULATOR_PATH) {
  $env:SIMULATOR_PATH
} else {
  Join-Path $env:USERPROFILE 'Documents\webOS_TV_26_Simulator_1.5.0'
}

$SimulatorExe = Join-Path $SimulatorPath 'webOS_TV_26_Simulator_1.5.0.exe'

if (-not (Test-Path $SimulatorPath)) {
  Write-Error "Simulator nao encontrado em: $SimulatorPath"
}
if (-not (Test-Path $SimulatorExe)) {
  Write-Error "Executavel do Simulator nao encontrado: $SimulatorExe"
}

Write-Host "==> Build"
npm run build

$aresLaunch = Join-Path $PSScriptRoot '..\node_modules\.bin\ares-launch.cmd'
if (-not (Test-Path $aresLaunch)) {
  Write-Error "ares-launch nao encontrado. Rode npm install."
}

$simProc = Get-Process -Name 'webOS_TV_26_Simulator_1.5.0' -ErrorAction SilentlyContinue
if (-not $simProc) {
  Write-Host "==> Abrindo Simulator (manual start)"
  Start-Process -FilePath $SimulatorExe -WorkingDirectory $SimulatorPath
  # Espera a janela Electron estabilizar antes do ares-launch
  Start-Sleep -Seconds 8
} else {
  Write-Host "==> Simulator ja em execucao (pid $($simProc[0].Id))"
}

Write-Host "==> Launch app no Simulator ($SimulatorPath)"
& $aresLaunch -s 26 -sp $SimulatorPath dist
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Se o Simulator mostrou EPIPE/machineIdSync:" -ForegroundColor Yellow
  Write-Host "  1) Feche o dialog de erro"
  Write-Host "  2) Abra o Simulator pelo atalho/exe"
  Write-Host "  3) Rode: npx ares-launch -s 26 -sp `"$SimulatorPath`" dist"
  Write-Host "Ou teste no browser: npm run preview"
  exit $LASTEXITCODE
}
