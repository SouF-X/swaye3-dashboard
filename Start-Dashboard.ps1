param([switch]$Rebuild)
$ErrorActionPreference='Stop'
Push-Location -LiteralPath $PSScriptRoot
try {
 if(-not (Get-Command node -ErrorAction SilentlyContinue)){throw 'Install Node.js 24 or newer.'}
 if(-not (Test-Path -LiteralPath 'node_modules')){& npm.cmd ci;if($LASTEXITCODE -ne 0){throw 'Dependency installation failed.'}}
 if($Rebuild -or -not (Test-Path -LiteralPath 'dist/index.html')){& npm.cmd run build;if($LASTEXITCODE -ne 0){throw 'Dashboard build failed.'}}
 try {$dashboardHealth=Invoke-RestMethod 'http://127.0.0.1:4174/api/health' -TimeoutSec 2}catch{$dashboardHealth=$null}
 if($dashboardHealth.status -eq 'ok'){Write-Output 'Local dashboard server is available at http://127.0.0.1:4174/swaye3/overview';return}
 $env:PORT='4174'
 & node server.mjs
} finally {Pop-Location}
