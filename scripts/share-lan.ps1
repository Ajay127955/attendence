# Opens the Windows Firewall for the AMS dev server so you can test on your phone.
# Run the companion `share-lan.cmd` (right-click -> Run as administrator), or run
# this script from an elevated PowerShell:
#     powershell -ExecutionPolicy Bypass -File scripts\share-lan.ps1

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '  Opening the firewall for the AMS dev server...' -ForegroundColor Cyan
Write-Host ''

# Allow inbound TCP on the API/SPA port (5000) and the Vite dev port (5173).
foreach ($port in 5000, 5173) {
  $name = "AMS dev (TCP $port)"
  Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue |
    Remove-NetFirewallRule -ErrorAction SilentlyContinue
  New-NetFirewallRule -DisplayName $name -Direction Inbound -Action Allow `
    -Protocol TCP -LocalPort $port -Profile Any | Out-Null
  Write-Host "  [ok] allowed inbound TCP $port" -ForegroundColor Green
}

# Pick the primary LAN IPv4 address (skip loopback, APIPA and virtual adapters).
$ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object {
    $_.IPAddress -notlike '127.*' -and
    $_.IPAddress -notlike '169.254.*' -and
    $_.PrefixOrigin -ne 'WellKnown'
  } |
  Sort-Object InterfaceMetric |
  Select-Object -First 1 -ExpandProperty IPAddress

Write-Host ''
Write-Host '  Open these on your phone (phone must be on the SAME Wi-Fi):' -ForegroundColor Cyan
Write-Host ''
if ($ip) {
  Write-Host "    App (SPA + API):   http://${ip}:5000/attendence/" -ForegroundColor Yellow
  Write-Host "    Live dev (HMR):    http://${ip}:5173/attendence/" -ForegroundColor Yellow
  Write-Host "    Health check:      http://${ip}:5000/health" -ForegroundColor DarkGray
} else {
  Write-Host '  Could not detect a LAN IP. Run `ipconfig` and use the IPv4 Address.' -ForegroundColor Red
}
Write-Host ''
Write-Host '  Tip: the server on port 5000 must be running (npm run db + npm run dev in /server).' -ForegroundColor DarkGray
Write-Host ''
