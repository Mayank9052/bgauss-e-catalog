# Builds the React frontend into BGAUSS.Api\wwwroot, then publishes the API.
# Run from the repo root:  powershell -ExecutionPolicy Bypass -File .\build-release.ps1
$ErrorActionPreference = 'Stop'
Push-Location "$PSScriptRoot\vite-project"
try { npm ci; if ($LASTEXITCODE) { throw 'npm ci failed' }
      npm run build; if ($LASTEXITCODE) { throw 'npm run build failed' } }
finally { Pop-Location }
if (-not (Test-Path "$PSScriptRoot\BGAUSS.Api\wwwroot\index.html")) { throw 'Frontend build missing: wwwroot\index.html not found' }
dotnet publish "$PSScriptRoot\BGAUSS.Api" -c Release -o "$PSScriptRoot\BGAUSS.Api\publish"
if ($LASTEXITCODE) { throw 'dotnet publish failed' }
Write-Host 'Done. Copy BGAUSS.Api\publish to the server and restart the app; then Ctrl+F5 in the browser.'
