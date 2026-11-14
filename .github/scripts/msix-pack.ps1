# R15K Arcade – packs the Windows release build into an MSIX for the Microsoft Store, which signs it on
# submission, so the package stays unsigned. Layout folder: r15k-arcade.exe from the release target (the
# frontend is embedded and the WebView2 loader linked statically), the four store logos from
# src-tauri/icons, and AppxManifest.xml rendered from src-tauri/windows/AppxManifest.xml; then makeappx
# from the newest Windows 10/11 SDK on the runner. The identity is a placeholder until the Partner
# Center product exists; the environment variables MSIX_IDENTITY_NAME and MSIX_PUBLISHER override it.
# Usage: pwsh -NoProfile -File .github/scripts/msix-pack.ps1 [-OutDir <dir>]
# Writes <OutDir>/r15k-arcade_<version>_x64.msix (default OutDir: .tmp/windows-msix).
[CmdletBinding()]
param(
  [string] $OutDir = '.tmp/windows-msix'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repository = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$tauriDir = Join-Path $repository 'apps/arcade/src-tauri'
$version = (Get-Content -Raw (Join-Path $tauriDir 'tauri.conf.json') | ConvertFrom-Json).version
if ($version -notmatch '^\d+\.\d+\.\d+$') {
  throw "tauri.conf.json version '$version' is not x.y.z"
}

$identityName = if ($env:MSIX_IDENTITY_NAME) { $env:MSIX_IDENTITY_NAME } else { 'R15K.R15KArcade' }
$publisher = if ($env:MSIX_PUBLISHER) { $env:MSIX_PUBLISHER } else { 'CN=00000000-0000-0000-0000-000000000000' }
$values = [ordered]@{
  '{{IDENTITY_NAME}}'          = $identityName
  '{{PUBLISHER}}'              = $publisher
  '{{PUBLISHER_DISPLAY_NAME}}' = 'R15K'
  '{{VERSION}}'                = "$version.0"
}

$layout = Join-Path $repository '.tmp/msix-layout'
if (Test-Path $layout) {
  Remove-Item -Recurse -Force $layout
}
New-Item -ItemType Directory -Force -Path (Join-Path $layout 'Assets') | Out-Null
Copy-Item (Join-Path $tauriDir 'target/release/r15k-arcade.exe') $layout
foreach ($logo in 'Square44x44Logo', 'Square150x150Logo', 'StoreLogo', 'Wide310x150Logo') {
  Copy-Item (Join-Path $tauriDir "icons/$logo.png") (Join-Path $layout "Assets/$logo.png")
}

$manifest = Get-Content -Raw (Join-Path $tauriDir 'windows/AppxManifest.xml')
foreach ($placeholder in $values.Keys) {
  if (-not $manifest.Contains($placeholder)) {
    throw "AppxManifest.xml template has no $placeholder"
  }
  $manifest = $manifest.Replace($placeholder, [System.Security.SecurityElement]::Escape($values[$placeholder]))
}
if ($manifest -match '\{\{[A-Z_]+\}\}') {
  throw "AppxManifest.xml template has an unknown placeholder $($Matches[0])"
}
[System.IO.File]::WriteAllText((Join-Path $layout 'AppxManifest.xml'), $manifest, [System.Text.UTF8Encoding]::new($false))

$makeappx = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin\10.*\x64\makeappx.exe' |
  Sort-Object { [version] $_.Directory.Parent.Name } |
  Select-Object -Last 1
if ($null -eq $makeappx) {
  throw 'makeappx.exe not found in the Windows 10/11 SDK'
}

$out = New-Item -ItemType Directory -Force -Path (Join-Path $repository $OutDir)
$package = Join-Path $out.FullName "r15k-arcade_${version}_x64.msix"
& $makeappx.FullName pack /d $layout /p $package /o /h SHA256
if ($LASTEXITCODE -ne 0) {
  throw "makeappx failed with exit code $LASTEXITCODE"
}
Write-Output "MSIX: $package"
