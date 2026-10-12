Add-Type -AssemblyName System.Drawing

$logoPath = Join-Path $PSScriptRoot "..\..\mobile\assets\Majo Gadgets logo.png"
$outputDirectory = Join-Path $PSScriptRoot "..\public"
$source = [System.Drawing.Bitmap]::FromFile((Resolve-Path $logoPath))
$markRegion = New-Object System.Drawing.Rectangle(285, 285, 365, 330)
$markBounds = $null
$markSource = $null
$mark = $null

try {
    $markSource = $source.Clone($markRegion, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $minX = $markSource.Width
    $minY = $markSource.Height
    $maxX = 0
    $maxY = 0

    for ($y = 0; $y -lt $markSource.Height; $y++) {
        for ($x = 0; $x -lt $markSource.Width; $x++) {
            $pixel = $markSource.GetPixel($x, $y)
            if ($pixel.R -lt 248 -or $pixel.G -lt 248 -or $pixel.B -lt 248) {
                $minX = [Math]::Min($minX, $x)
                $minY = [Math]::Min($minY, $y)
                $maxX = [Math]::Max($maxX, $x)
                $maxY = [Math]::Max($maxY, $y)
            }
        }
    }

    $markBounds = New-Object System.Drawing.Rectangle(
        $minX,
        $minY,
        ($maxX - $minX + 1),
        ($maxY - $minY + 1)
    )
    $trimmedMark = $markSource.Clone(
        $markBounds,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    $mark = New-Object System.Drawing.Bitmap(
        $trimmedMark.Width,
        $trimmedMark.Height,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )

    for ($y = 0; $y -lt $trimmedMark.Height; $y++) {
        for ($x = 0; $x -lt $trimmedMark.Width; $x++) {
            $pixel = $trimmedMark.GetPixel($x, $y)
            $alpha = 255 - [Math]::Min($pixel.R, [Math]::Min($pixel.G, $pixel.B))
            if ($alpha -lt 8) { $alpha = 0 }
            $mark.SetPixel(
                $x,
                $y,
                [System.Drawing.Color]::FromArgb($alpha, $pixel.R, $pixel.G, $pixel.B)
            )
        }
    }

    $trimmedMark.Dispose()

    foreach ($size in @(512, 192)) {
        $canvas = New-Object System.Drawing.Bitmap(
            $size,
            $size,
            [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
        )
        $graphics = [System.Drawing.Graphics]::FromImage($canvas)
        $badge = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $margin = [int]($size * 0.08)
        $badgeSize = $size - ($margin * 2)
        $badgeBounds = New-Object System.Drawing.Rectangle($margin, $margin, $badgeSize, $badgeSize)
        $markWidth = [int]($size * 0.60)
        $markHeight = [int]($markWidth * $mark.Height / $mark.Width)
        $markDestination = New-Object System.Drawing.Rectangle(
            [int](($size - $markWidth) / 2),
            [int](($size - $markHeight) / 2),
            $markWidth,
            $markHeight
        )

        try {
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#071A2B"))
            $graphics.FillEllipse($badge, $badgeBounds)
            $graphics.DrawImage($mark, $markDestination)
            $canvas.Save(
                (Join-Path $outputDirectory "pwa-$size.png"),
                [System.Drawing.Imaging.ImageFormat]::Png
            )
        }
        finally {
            $badge.Dispose()
            $graphics.Dispose()
            $canvas.Dispose()
        }
    }
}
finally {
    if ($mark) { $mark.Dispose() }
    if ($markSource) { $markSource.Dispose() }
    $source.Dispose()
}