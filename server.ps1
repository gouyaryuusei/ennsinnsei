param (
    [int]$Port = 8080
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

# Search for available port
while ($Port -lt 65535) {
    try {
        $listener = New-Object System.Net.HttpListener
        $listener.Prefixes.Add("http://localhost:$Port/")
        $listener.Start()
        break
    } catch {
        $Port++
    }
}

if (-not $listener.IsListening) {
    Write-Error "Could not start server."
    exit 1
}

$url = "http://localhost:$Port/index.html"
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " EBT Tracker: Local Server Running (Offline)" -ForegroundColor Green
Write-Host " URL: $url" -ForegroundColor Yellow
Write-Host " Press Ctrl+C or close this window to stop." -ForegroundColor Gray
Write-Host "=================================================" -ForegroundColor Cyan

# Open default browser
Start-Process $url

# MIME types
$mimeTypes = @{
    ".html"     = "text/html; charset=utf-8"
    ".htm"      = "text/html; charset=utf-8"
    ".js"       = "application/javascript; charset=utf-8"
    ".mjs"      = "application/javascript; charset=utf-8"
    ".css"      = "text/css; charset=utf-8"
    ".json"     = "application/json; charset=utf-8"
    ".wasm"     = "application/wasm"
    ".tflite"   = "application/octet-stream"
    ".data"     = "application/octet-stream"
    ".binarypb" = "application/octet-stream"
    ".png"      = "image/png"
    ".jpg"      = "image/jpeg"
    ".jpeg"     = "image/jpeg"
    ".svg"      = "image/svg+xml"
    ".ico"      = "image/x-icon"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $response.AddHeader("Access-Control-Allow-Origin", "*")

        $localPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($localPath) -or $localPath -eq "/") {
            $localPath = "index.html"
        }

        $localPath = [System.Uri]::UnescapeDataString($localPath).Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $filePath = [System.IO.Path]::Combine($root, $localPath)

        if ([System.IO.File]::Exists($filePath)) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $response.ContentType = $contentType

            try {
                $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentLength64 = $fileBytes.Length
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
                }
            } catch {
                # Ignore client disconnects
            }
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $localPath")
            $response.ContentLength64 = $msg.Length
            if ($request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($msg, 0, $msg.Length)
            }
        }
        $response.OutputStream.Close()
    }
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    $listener.Close()
}
