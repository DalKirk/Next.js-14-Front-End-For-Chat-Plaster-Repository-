# Runs the local FastAPI backend for dev
$ErrorActionPreference = "Stop"

$venvPath = Join-Path $PSScriptRoot "..\.venv\Scripts\Activate.ps1"
if (Test-Path $venvPath) {
    . $venvPath
}

python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload