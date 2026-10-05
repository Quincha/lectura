# Smoke test del lado nativo (Tauri 2 + MSVC).
#
# Arranca `npm run tauri:dev`, comprueba que el servidor de desarrollo responde
# en el puerto propio (5178) con nuestro index.html, que aparece la ventana
# nativa y captura SOLO esa ventana (PrintWindow, no el escritorio completo).
# Al final mata el arbol de procesos para no dejar nada corriendo.
#
# ASCII a proposito: PowerShell 5.1 malinterpreta el UTF-8 sin BOM.

$ErrorActionPreference = 'Continue'
$raiz = 'C:\lectura'
$log = Join-Path $env:TEMP 'tauri-dev.log'
$err = Join-Path $env:TEMP 'tauri-dev.err'
$png = Join-Path $raiz 'tests\fotos\09-tauri-native.png'
Remove-Item $log, $err -ErrorAction SilentlyContinue

$marcador = 'Lectura R'
$puerto = 5178

Write-Host "Iniciando tauri dev (puerto $puerto)..."
$cmd = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm run tauri:dev' `
  -WorkingDirectory $raiz -RedirectStandardOutput $log -RedirectStandardError $err -PassThru

$ventana = $null
$okHttp = $false
$deadline = (Get-Date).AddSeconds(200)

while ((Get-Date) -lt $deadline) {
  $ventana = Get-Process -Name 'lectura-rapida' -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowTitle } | Select-Object -First 1

  try {
    $r = Invoke-WebRequest -Uri "http://localhost:$puerto/" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200 -and $r.Content -match $marcador) { $okHttp = $true }
  } catch { }

  if ($ventana -and $okHttp) { break }
  Start-Sleep -Seconds 3
}

Write-Host "ventana = $(if ($ventana) { $ventana.MainWindowTitle } else { 'NO' })"
Write-Host "devServer = $(if ($okHttp) { 'OK (index propio)' } else { 'NO' })"

if ($ventana -and $okHttp) {
  Add-Type -AssemblyName System.Drawing
  Add-Type @'
using System;
using System.Runtime.InteropServices;
public class Win32Cap {
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdc, uint flags);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
}
'@
  $hwnd = $ventana.MainWindowHandle
  $rect = New-Object Win32Cap+RECT
  [Win32Cap]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
  $w = $rect.Right - $rect.Left
  $h = $rect.Bottom - $rect.Top

  if ($w -gt 0 -and $h -gt 0) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $hdc = $g.GetHdc()
    $hecho = [Win32Cap]::PrintWindow($hwnd, $hdc, 2)  # 2 = PW_RENDERFULLCONTENT
    $g.ReleaseHdc($hdc)
    $g.Dispose()
    if ($hecho) {
      if (Test-Path $png) { Remove-Item $png -Force }
      $bmp.Save($png, [System.Drawing.Imaging.ImageFormat]::Png)
      Write-Host "captura = $png ($([math]::Round((Get-Item $png).Length/1KB,1)) KB)"
    } else {
      Write-Host 'captura = PrintWindow fallo'
    }
    $bmp.Dispose()
  }
}

Write-Host 'Limpiando procesos...'
& taskkill /PID $cmd.Id /T /F 2>&1 | Out-Null
Get-NetTCPConnection -LocalPort $puerto -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-Process -Name 'lectura-rapida' -ErrorAction SilentlyContinue |
  Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$resto = @()
$resto += (Get-Process -Name 'lectura-rapida' -ErrorAction SilentlyContinue)
$resto += (Get-NetTCPConnection -LocalPort $puerto -State Listen -ErrorAction SilentlyContinue)
Write-Host "procesos restantes = $(@($resto).Count)"

if ($ventana -and $okHttp) { Write-Host 'RESULTADO: OK' } else { Write-Host 'RESULTADO: FALLO'; Get-Content $log -Tail 40; Get-Content $err -Tail 40 }
