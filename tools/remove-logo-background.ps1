Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path $PSScriptRoot '..\public\logo-pagofacil.jpg'
$targetPath = Join-Path $PSScriptRoot '..\public\logo-pagofacil.png'
$source = [System.Drawing.Bitmap]::new((Resolve-Path $sourcePath).Path)

# A logo original is centered; discard the large decorative margins first.
$left = [int]($source.Width * 0.24)
$top = [int]($source.Height * 0.17)
$width = [int]($source.Width * 0.52)
$height = [int]($source.Height * 0.66)
$crop = $source.Clone([System.Drawing.Rectangle]::new($left, $top, $width, $height), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($x = 0; $x -lt $crop.Width; $x++) {
  for ($y = 0; $y -lt $crop.Height; $y++) {
    $pixel = $crop.GetPixel($x, $y)
    $max = [Math]::Max($pixel.R, [Math]::Max($pixel.G, $pixel.B))
    $min = [Math]::Min($pixel.R, [Math]::Min($pixel.G, $pixel.B))
    if ($min -gt 175 -and ($max - $min) -lt 55) {
      $crop.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
    }
  }
}

$crop.Save((Resolve-Path (Split-Path $targetPath)).Path + '\logo-pagofacil.png', [System.Drawing.Imaging.ImageFormat]::Png)
$crop.Dispose()
$source.Dispose()
