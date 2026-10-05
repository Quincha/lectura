# Requisito del toolchain para Tauri (Windows)
#
# Este script no instala nada por su cuenta si no se ejecuta con privilegios de
# administrador. Descarga el instalador oficial de Visual Studio Build Tools y
# lanza la carga de trabajo «C++ de escritorio», que aporta:
#   - MSVC v143 (cl.exe y link.exe)
#   - Windows 10/11 SDK (kernel32.lib y compañía)
#
# Uso (PowerShell como administrador):
#   powershell -ExecutionPolicy Bypass -File .\scripts\preparar-toolchain.ps1

$ErrorActionPreference = 'Stop'

$destino = Join-Path $env:TEMP 'vs_BuildTools.exe'
$url = 'https://aka.ms/vs/17/release/vs_BuildTools.exe'

Write-Host 'Descargando Visual Studio Build Tools 2022…'
Invoke-WebRequest -Uri $url -OutFile $destino

Write-Host 'Lanzando la instalación (puede tardar varios minutos)…'
$argumentos = @(
  '--quiet',
  '--wait',
  '--norestart',
  '--nocache',
  '--add', 'Microsoft.VisualStudio.Workload.VCTools',
  '--includeRecommended'
)

$proceso = Start-Process -FilePath $destino -ArgumentList $argumentos -Wait -PassThru

if ($proceso.ExitCode -ne 0 -and $proceso.ExitCode -ne 3010) {
  Write-Error "El instalador devolvió el código $($proceso.ExitCode)."
  exit $proceso.ExitCode
}

Write-Host ''
Write-Host 'Instalación completada. Reinicia la terminal y comprueba con:'
Write-Host '  rustup show'
Write-Host '  cargo check --manifest-path src-tauri\Cargo.toml'
