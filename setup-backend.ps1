# setup-backend.ps1
# ScanIt Backend — Windows setup & run script
# Run from the project root: .\setup-backend.ps1

$ErrorActionPreference = "Stop"
$BackendDir = Join-Path $PSScriptRoot "backend"
$EnvFile = Join-Path $BackendDir ".env.local"

function Check-Command($name) {
    return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

Write-Host "`n=== ScanIt Backend Setup (Windows) ===" -ForegroundColor Cyan

# ── 1. Java 17 check ──────────────────────────────────────────────────────────
Write-Host "`n[1/4] Checking Java 17..." -ForegroundColor Yellow
if (-not (Check-Command "java")) {
    Write-Host "  Java not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Install Java 17 via winget (run in an admin terminal):" -ForegroundColor White
    Write-Host "    winget install EclipseAdoptium.Temurin.17.JDK" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Or download from: https://adoptium.net/temurin/releases/?version=17" -ForegroundColor White
    Write-Host "  After installing, restart this terminal and re-run this script." -ForegroundColor White
    exit 1
}

$javaVer = java -version 2>&1 | Select-String "version" | ForEach-Object { $_.ToString().Trim() }
Write-Host "  Found: $javaVer" -ForegroundColor Green

if ($javaVer -notmatch '"17\.') {
    Write-Host ""
    Write-Host "  WARNING: This backend requires Java 17. Your current Java version may cause issues." -ForegroundColor Yellow
    Write-Host "  Set JAVA_HOME to a JDK 17 installation, or install it with:" -ForegroundColor Yellow
    Write-Host "    winget install EclipseAdoptium.Temurin.17.JDK" -ForegroundColor Cyan
    Write-Host ""
    $continue = Read-Host "  Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") { exit 1 }
}

# ── 2. Maven check ────────────────────────────────────────────────────────────
Write-Host "`n[2/4] Checking Maven..." -ForegroundColor Yellow
$mvnCmd = $null

if (Check-Command "mvn") {
    $mvnVer = mvn --version 2>&1 | Select-String "Apache Maven" | ForEach-Object { $_.ToString().Trim() }
    Write-Host "  Found: $mvnVer" -ForegroundColor Green
    $mvnCmd = "mvn"
} elseif (Test-Path (Join-Path $BackendDir "mvnw.cmd")) {
    Write-Host "  'mvn' not in PATH — using bundled Maven wrapper (mvnw.cmd)." -ForegroundColor Yellow
    $mvnCmd = Join-Path $BackendDir "mvnw.cmd"
} else {
    Write-Host "  Maven not found and no mvnw.cmd wrapper present." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Install Maven via winget:" -ForegroundColor White
    Write-Host "    winget install Apache.Maven" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Or add the Maven wrapper from the backend directory:" -ForegroundColor White
    Write-Host "    cd backend" -ForegroundColor Gray
    Write-Host "    mvn wrapper:wrapper" -ForegroundColor Gray
    exit 1
}

# ── 3. JWT_SECRET check / env setup ──────────────────────────────────────────
Write-Host "`n[3/4] Checking backend environment variables..." -ForegroundColor Yellow

# Check if JWT_SECRET is already set in the current session
if (-not $env:JWT_SECRET) {
    Write-Host "  JWT_SECRET not set in environment." -ForegroundColor Yellow

    if (Test-Path $EnvFile) {
        # Load from .env.local if it exists
        Write-Host "  Loading from $EnvFile..." -ForegroundColor Gray
        Get-Content $EnvFile | ForEach-Object {
            if ($_ -match '^\s*([^#=]+)=(.*)$') {
                [System.Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim(), 'Process')
            }
        }
        Write-Host "  Environment loaded from .env.local" -ForegroundColor Green
    } else {
        # Create .env.local with a generated dev secret
        $devSecret = "scanit-dev-" + [System.Guid]::NewGuid().ToString("N")
        $envContent = @"
# ScanIt Backend — local dev environment variables
# DO NOT commit this file to git

JWT_SECRET=$devSecret

# Optional: AI Vision (free key from https://aistudio.google.com/app/apikey)
# GEMINI_API_KEY=your_key_here

# Optional: SMS OTP via Twilio Verify (free trial)
# TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# TWILIO_AUTH_TOKEN=your_auth_token
# TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Email OTP via Resend (free tier: 3000 emails/month)
# RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
"@
        Set-Content -Path $EnvFile -Value $envContent -Encoding UTF8
        Write-Host "  Created $EnvFile with a generated JWT_SECRET." -ForegroundColor Green
        Write-Host "  Edit this file to add Twilio/Gemini/Resend keys when needed." -ForegroundColor Gray

        # Load into current session
        [System.Environment]::SetEnvironmentVariable("JWT_SECRET", $devSecret, 'Process')
    }
} else {
    Write-Host "  JWT_SECRET is set." -ForegroundColor Green
}

# ── 4. Build & run ────────────────────────────────────────────────────────────
Write-Host "`n[4/4] Starting backend (spring profile: dev)..." -ForegroundColor Yellow
Write-Host "  First run downloads Maven dependencies (~100 MB). This takes 2-3 min." -ForegroundColor Gray
Write-Host "  Backend will be available at: http://localhost:8080/api/v1" -ForegroundColor White
Write-Host "  H2 console (in-memory DB):    http://localhost:8080/api/v1/h2-console" -ForegroundColor White
Write-Host "  Health check:                 http://localhost:8080/actuator/health" -ForegroundColor White
Write-Host ""
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor Gray
Write-Host ""

Set-Location $BackendDir

if ($mvnCmd -eq "mvn") {
    mvn spring-boot:run "-Dspring-boot.run.profiles=dev"
} else {
    & $mvnCmd spring-boot:run "-Dspring-boot.run.profiles=dev"
}
