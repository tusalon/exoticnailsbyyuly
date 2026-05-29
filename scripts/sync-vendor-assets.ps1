$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$vendor = Join-Path $root "vendor"
$lucideVendor = Join-Path $vendor "lucide"

if (Test-Path $vendor) {
    Remove-Item -LiteralPath $vendor -Recurse -Force
}

New-Item -ItemType Directory -Path $vendor | Out-Null
New-Item -ItemType Directory -Path $lucideVendor | Out-Null

Copy-Item -LiteralPath (Join-Path $root "node_modules\react\umd\react.production.min.js") -Destination (Join-Path $vendor "react.production.min.js") -Force
Copy-Item -LiteralPath (Join-Path $root "node_modules\react-dom\umd\react-dom.production.min.js") -Destination (Join-Path $vendor "react-dom.production.min.js") -Force
Copy-Item -LiteralPath (Join-Path $root "node_modules\@babel\standalone\babel.min.js") -Destination (Join-Path $vendor "babel.min.js") -Force
Copy-Item -LiteralPath (Join-Path $root "node_modules\@tailwindcss\browser\dist\index.global.js") -Destination (Join-Path $vendor "tailwind-browser.js") -Force
Copy-Item -LiteralPath (Join-Path $root "node_modules\bcryptjs\umd\index.js") -Destination (Join-Path $vendor "bcrypt.min.js") -Force

Copy-Item -LiteralPath (Join-Path $root "node_modules\lucide-static\font\lucide.css") -Destination (Join-Path $lucideVendor "lucide.css") -Force
Copy-Item -LiteralPath (Join-Path $root "node_modules\lucide-static\font\lucide.woff2") -Destination (Join-Path $lucideVendor "lucide.woff2") -Force
Copy-Item -LiteralPath (Join-Path $root "node_modules\lucide-static\font\lucide.woff") -Destination (Join-Path $lucideVendor "lucide.woff") -Force
Copy-Item -LiteralPath (Join-Path $root "node_modules\lucide-static\font\lucide.ttf") -Destination (Join-Path $lucideVendor "lucide.ttf") -Force

Write-Host "Vendor assets synced in $vendor"
