#!/usr/bin/env pwsh
# Generates jarvis-icon.ico matching the dashboard favicon
# Navy background (#0a0e27) with blue gradient "J" and blue dot

Add-Type -AssemblyName System.Drawing

$size = 256
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

# Background - dark navy with rounded corners
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 10, 14, 39))
$radius = 50
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddArc(0, 0, $radius, $radius, 180, 90)
$path.AddArc($size - $radius, 0, $radius, $radius, 270, 90)
$path.AddArc($size - $radius, $size - $radius, $radius, $radius, 0, 90)
$path.AddArc(0, $size - $radius, $radius, $radius, 90, 90)
$path.CloseFigure()
$g.FillPath($bgBrush, $path)

# "J" letter with blue gradient
$gradBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point($size, $size)),
    [System.Drawing.Color]::FromArgb(255, 79, 195, 247),
    [System.Drawing.Color]::FromArgb(255, 2, 136, 209)
)
$font = New-Object System.Drawing.Font("Arial", 140, [System.Drawing.FontStyle]::Bold)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$textRect = New-Object System.Drawing.RectangleF(0, 10, $size, $size)
$g.DrawString("J", $font, $gradBrush, $textRect, $sf)

# Blue dot (upper-right)
$dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(204, 79, 195, 247))
$dotX = [int]($size * 0.72) - 10
$dotY = [int]($size * 0.28) - 10
$g.FillEllipse($dotBrush, $dotX, $dotY, 20, 20)

$g.Dispose()

# Save as ICO
$icoPath = Join-Path $PSScriptRoot "..\jarvis-desktop\public\icons\jarvis-icon.ico"
$icoDir = Split-Path $icoPath -Parent
if (-not (Test-Path $icoDir)) { New-Item -ItemType Directory -Path $icoDir -Force | Out-Null }

# Create ICO file from bitmap
$ms = New-Object System.IO.MemoryStream
$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = $ms.ToArray()
$ms.Dispose()

# ICO file format: header + entry + PNG data
$icoHeader = [byte[]]@(0,0,1,0,1,0)  # Reserved, Type=1 (ICO), Count=1
$entry = New-Object byte[] 16
$entry[0] = 0    # Width (0 = 256)
$entry[1] = 0    # Height (0 = 256)
$entry[2] = 0    # Color palette
$entry[3] = 0    # Reserved
$entry[4] = 1; $entry[5] = 0   # Color planes
$entry[6] = 32; $entry[7] = 0  # Bits per pixel
# PNG data size (4 bytes LE)
$sizeBytes = [BitConverter]::GetBytes([int]$pngBytes.Length)
$entry[8] = $sizeBytes[0]; $entry[9] = $sizeBytes[1]; $entry[10] = $sizeBytes[2]; $entry[11] = $sizeBytes[3]
# Data offset (6 header + 16 entry = 22)
$offset = 22
$offsetBytes = [BitConverter]::GetBytes([int]$offset)
$entry[12] = $offsetBytes[0]; $entry[13] = $offsetBytes[1]; $entry[14] = $offsetBytes[2]; $entry[15] = $offsetBytes[3]

$fs = [System.IO.File]::Create($icoPath)
$fs.Write($icoHeader, 0, $icoHeader.Length)
$fs.Write($entry, 0, $entry.Length)
$fs.Write($pngBytes, 0, $pngBytes.Length)
$fs.Close()

$bmp.Dispose()

# Also copy to project root for easy access
$rootCopy = Join-Path $PSScriptRoot "..\jarvis-icon.ico"
Copy-Item $icoPath $rootCopy -Force

Write-Host "Jarvis icon generated:" -ForegroundColor Green
Write-Host "  $icoPath" -ForegroundColor Cyan
Write-Host "  $rootCopy" -ForegroundColor Cyan
