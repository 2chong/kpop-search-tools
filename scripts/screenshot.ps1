# 앱을 실행해 창을 캡처한다 (수동 검증용). 사용: .\scripts\screenshot.ps1 [-Exe path] [-Out path] [-Wait 5] [-Keys "사랑"]
param(
  [string]$Exe = (Join-Path (Split-Path -Parent $PSScriptRoot) 'src-tauri\target\release\KpopSearchTools.exe'),
  [string]$Out = (Join-Path (Split-Path -Parent $PSScriptRoot) 'out\screenshot.png'),
  [int]$Wait = 5,
  [string]$Keys = '',
  [switch]$KeepOpen
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System; using System.Runtime.InteropServices;
public static class W {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int a, out RECT r, int s);
}
"@
$p = Start-Process -FilePath $Exe -PassThru
Start-Sleep -Seconds $Wait
$p.Refresh()
$h = $p.MainWindowHandle
if ($h -eq [IntPtr]::Zero) { throw 'window not found' }
[W]::SetForegroundWindow($h) | Out-Null
if ($Keys) { Start-Sleep -Milliseconds 500; [System.Windows.Forms.SendKeys]::SendWait($Keys); Start-Sleep -Milliseconds 800 }
$r = New-Object W+RECT
if ([W]::DwmGetWindowAttribute($h, 9, [ref]$r, 16) -ne 0) { [W]::GetWindowRect($h, [ref]$r) | Out-Null }
$w = $r.R - $r.L; $hh = $r.B - $r.T
$bmp = New-Object System.Drawing.Bitmap $w, $hh
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($r.L, $r.T, 0, 0, $bmp.Size)
New-Item -ItemType Directory -Force (Split-Path -Parent $Out) | Out-Null
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
if (-not $KeepOpen) { Stop-Process -Id $p.Id -Force }
Write-Output "saved $Out ($w x $hh)"
