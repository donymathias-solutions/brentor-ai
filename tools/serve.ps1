# ============================================================
# Brentor.ai — servidor estatico leve (PowerShell, sem dependencias)
# Usa TcpListener (nao requer admin/urlacl como o HttpListener).
# ============================================================
param([int]$Port = 4173)

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$mime = @{
  '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8';
  '.js'='application/javascript; charset=utf-8'; '.json'='application/json; charset=utf-8';
  '.svg'='image/svg+xml'; '.ico'='image/x-icon'; '.png'='image/png';
  '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.gif'='image/gif';
  '.woff'='font/woff'; '.woff2'='font/woff2'; '.map'='application/json'
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
Write-Host "Brentor.ai dev server: http://localhost:$Port"
Write-Host "Servindo: $Root"

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII)
    $requestLine = $reader.ReadLine()
    if ([string]::IsNullOrEmpty($requestLine)) { $client.Close(); continue }
    while ($true) { $h = $reader.ReadLine(); if ($null -eq $h -or $h -eq '') { break } }

    $parts = $requestLine.Split(' ')
    $rawPath = if ($parts.Length -ge 2) { $parts[1] } else { '/' }
    $rawPath = ($rawPath -split '\?')[0]
    if ($rawPath -eq '/' -or $rawPath -eq '') { $rawPath = '/index.html' }
    $rawPath = [System.Uri]::UnescapeDataString($rawPath)

    $rel = $rawPath.TrimStart('/').Replace('/', '\')
    $local = [System.IO.Path]::GetFullPath((Join-Path $Root $rel))

    if (-not $local.StartsWith($Root)) {
      $body = [System.Text.Encoding]::UTF8.GetBytes('403 Forbidden')
      $head = "HTTP/1.1 403 Forbidden`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
    }
    elseif (Test-Path -LiteralPath $local -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($local)
      $ext = [System.IO.Path]::GetExtension($local).ToLower()
      $ct = $mime[$ext]; if (-not $ct) { $ct = 'application/octet-stream' }
      $head = "HTTP/1.1 200 OK`r`nContent-Type: $ct`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
      $body = $bytes
    }
    else {
      $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rawPath")
      $head = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
    }

    $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
    $stream.Write($hb, 0, $hb.Length)
    $stream.Write($body, 0, $body.Length)
    $stream.Flush()
  } catch {}
  finally { try { $client.Close() } catch {} }
}
