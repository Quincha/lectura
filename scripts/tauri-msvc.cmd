@echo off
rem Wrapper que inyecta el entorno MSVC (cl.exe, link.exe, LIB, INCLUDE)
rem antes de invocar el CLI de Tauri, para no depender de un
rem "x64 Native Tools Command Prompt" abierto a mano.
rem
rem Uso:  scripts\tauri-msvc.cmd dev
rem        scripts\tauri-msvc.cmd build
rem   o via npm:  npm run tauri:dev / npm run tauri:build

setlocal

set "RAIZ=%~dp0.."
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
set "VCVARS="

if exist "%VSWHERE%" (
  for /f "usebackq delims=" %%i in (`"%VSWHERE%" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do set "VCVARS=%%i\VC\Auxiliary\Build\vcvars64.bat"
)

if not defined VCVARS set "VCVARS=%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"

if exist "%VCVARS%" (
  call "%VCVARS%" >nul 2>&1
) else (
  echo [aviso] No se encontro vcvars64.bat; cargo podria fallar al enlazar. 1>&2
)

cd /d "%RAIZ%"
call npx tauri %*
