$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Start-Process npm -ArgumentList 'run dev --prefix server' -WorkingDirectory $root
Start-Process npm -ArgumentList '--prefix src run dev' -WorkingDirectory $root

Write-Host 'Started backend and frontend.'
Write-Host 'Frontend: http://localhost:5173'
Write-Host 'Backend: http://localhost:4000'
