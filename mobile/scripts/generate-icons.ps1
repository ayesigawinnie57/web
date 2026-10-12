Add-Type -AssemblyName System.Drawing

$assetDirectory = Join-Path $PSScriptRoot "..\assets"
$logoPath = Join-Path $assetDirectory "Majo Gadgets logo.png"
$white = [System.Drawing.Color]::White
$sourceLogo = [System.Drawing.Bitmap]::FromFile($logoPath)
$minX = $sourceLogo.Width
$minY = $sourceLogo.Height
$maxX = 0
$maxY = 0

try {
    for ($y = 0; $y -lt $sourceLogo.Height; $y++) {
        for ($x = 0; $x -lt $sourceLogo.Width; $x++) {
            $pixel = $sourceLogo.GetPixel($x, $y)
            if ($pixel.R -lt 248 -or $pixel.G -lt 248 -or $pixel.B -lt 248) {
                $minX = [Math]::Min($minX, $x)
                $minY = [Math]::Min($minY, $y)
                $maxX = [Math]::Max($maxX, $x)
                $maxY = [Math]::Max($maxY, $y)
            }
        }
    }

    $crop = New-Object System.Drawing.Rectangle(
        $minX,
        $minY,
        ($maxX - $minX + 1),
        ($maxY - $minY + 1)
    )
    $croppedLogo = $sourceLogo.Clone(
        $crop,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    $transparentLogo = New-Object System.Drawing.Bitmap(
        $croppedLogo.Width,
        $croppedLogo.Height,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    $monochromeLogo = New-Object System.Drawing.Bitmap(
        $croppedLogo.Width,
        $croppedLogo.Height,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )

    for ($y = 0; $y -lt $croppedLogo.Height; $y++) {
        for ($x = 0; $x -lt $croppedLogo.Width; $x++) {
            $pixel = $croppedLogo.GetPixel($x, $y)
            $alpha = 255 - [Math]::Min($pixel.R, [Math]::Min($pixel.G, $pixel.B))
            if ($alpha -lt 8) {
                $alpha = 0
            }
            $transparentLogo.SetPixel(
                $x,
                $y,
                [System.Drawing.Color]::FromArgb($alpha, $pixel.R, $pixel.G, $pixel.B)
            )
            $monochromeLogo.SetPixel(
                $x,
                $y,
                [System.Drawing.Color]::FromArgb($alpha, $white)
            )
        }
    }

    function Write-MajoIcon {
        param(
            [int]$Size,
            [string]$OutputPath,
            [bool]$Transparent,
            [bool]$Monochrome
        )

        $bitmap = New-Object System.Drawing.Bitmap(
            $Size,
            $Size,
            [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
        )
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $logo = if ($Monochrome) { $monochromeLogo } elseif ($Transparent) { $transparentLogo } else { $croppedLogo }
        $maxWidth = if ($Transparent) { $Size * 0.60 } else { $Size * 0.86 }
        $drawWidth = [int]$maxWidth
        $drawHeight = [int]($drawWidth * $logo.Height / $logo.Width)
        $destination = New-Object System.Drawing.Rectangle(
            [int](($Size - $drawWidth) / 2),
            [int](($Size - $drawHeight) / 2),
            $drawWidth,
            $drawHeight
        )

        try {
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.Clear($(if ($Transparent) { [System.Drawing.Color]::Transparent } else { $white }))
            $graphics.DrawImage($logo, $destination)
            $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        finally {
            $graphics.Dispose()
            $bitmap.Dispose()
        }
    }

    Write-MajoIcon 1024 (Join-Path $assetDirectory "icon.png") $false $false
    Write-MajoIcon 512 (Join-Path $assetDirectory "play-store-icon.png") $false $false
    Write-MajoIcon 1024 (Join-Path $assetDirectory "android-icon-foreground.png") $true $false
    Write-MajoIcon 1024 (Join-Path $assetDirectory "android-icon-monochrome.png") $true $true

    $croppedLogo.Dispose()
    $transparentLogo.Dispose()
    $monochromeLogo.Dispose()
}
finally {
    $sourceLogo.Dispose()
}