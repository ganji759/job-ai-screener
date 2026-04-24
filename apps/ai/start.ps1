#!/usr/bin/env pwsh
# Starts the Umurava AI service on Windows.
# Usage:   cd backend\apps\ai ; .\start.ps1
# Creates .venv on first run, installs requirements, and launches uvicorn.
# Works on Windows PowerShell 5.1 and PowerShell 7+.

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$venvPython = Join-Path $scriptDir ".venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "[ai-service] creating .venv ..." -ForegroundColor Cyan
    python -m venv .venv
    if (-not (Test-Path $venvPython)) {
        Write-Error "Failed to create venv at $venvPython - is python installed and on PATH?"
        exit 1
    }
}

Write-Host "[ai-service] installing dependencies (via venv python -m pip)" -ForegroundColor Cyan
& $venvPython -m pip install --upgrade pip --quiet
& $venvPython -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Error "pip install failed (exit code $LASTEXITCODE)"
    exit $LASTEXITCODE
}

# Load the repo-root backend\.env so GEMINI_API_KEY, GEMINI_MODEL, etc. are picked up.
$envFile = Resolve-Path (Join-Path $scriptDir "..\..\.env") -ErrorAction SilentlyContinue
if ($envFile) {
    Write-Host "[ai-service] loading env from $envFile" -ForegroundColor Cyan
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*#') { return }
        if ($_ -match '^\s*$') { return }
        if ($_ -match '^\s*([^=]+)=(.*)$') {
            $key = $Matches[1].Trim()
            $val = $Matches[2].Trim()
            if ($val.StartsWith('"') -and $val.EndsWith('"')) { $val = $val.Substring(1, $val.Length - 2) }
            [Environment]::SetEnvironmentVariable($key, $val, "Process")
        }
    }
} else {
    Write-Warning "backend\.env not found - GEMINI_API_KEY must be set in your shell."
}

$port = if ($env:AI_SERVICE_PORT) { $env:AI_SERVICE_PORT } else { "8000" }
Write-Host "[ai-service] starting uvicorn on port $port (python -m uvicorn)" -ForegroundColor Green
& $venvPython -m uvicorn main:app --host 0.0.0.0 --port $port --reload
