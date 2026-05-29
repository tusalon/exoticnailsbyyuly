$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root "icons\icon-512x512.png"
$resRoot = Join-Path $root "android\app\src\main\res"

if (-not (Test-Path $source)) {
    throw "No se encontro $source"
}

if (-not (Test-Path $resRoot)) {
    throw "No se encontro la carpeta Android. Ejecuta primero: npm run android:add"
}

$sizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

function Save-ResizedPng($sourcePath, $targetPath, $size) {
    $image = [System.Drawing.Image]::FromFile($sourcePath)
    try {
        $bitmap = New-Object System.Drawing.Bitmap $size, $size
        try {
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            try {
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
                $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $graphics.Clear([System.Drawing.Color]::Transparent)
                $graphics.DrawImage($image, 0, 0, $size, $size)
            } finally {
                $graphics.Dispose()
            }

            $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
        } finally {
            $bitmap.Dispose()
        }
    } finally {
        $image.Dispose()
    }
}

foreach ($density in $sizes.Keys) {
    $dir = Join-Path $resRoot $density
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }

    foreach ($name in @("ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png")) {
        Save-ResizedPng $source (Join-Path $dir $name) $sizes[$density]
    }
}

Write-Host "Android icons updated from $source"
