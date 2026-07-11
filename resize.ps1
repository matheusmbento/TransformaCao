Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("logo.png")
$bmp = New-Object System.Drawing.Bitmap(512, 512)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::Transparent)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, 512, 512)
$g.Dispose()
$bmp.Save("icon-512.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$img.Dispose()
