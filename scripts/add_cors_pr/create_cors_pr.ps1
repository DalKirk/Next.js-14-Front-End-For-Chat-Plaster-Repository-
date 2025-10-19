<#
create_cors_pr.ps1

Run this in the root of your backend GitHub repository clone (the FastAPI app):

  powershell -ExecutionPolicy Bypass -File .\create_cors_pr.ps1

What it does:
- Detects the app startup file by searching for the first Python file that contains `FastAPI(`
- Creates a branch `add-cors-middleware-YYYYMMDDHHMM`
- Backs up the detected startup file to `.bak`
- Inserts a CORSMiddleware block immediately after the `app = FastAPI(...)` line
- Adds `docs/CORS.md` with guidance
- Commits and pushes the branch
- Attempts to open a PR using `gh` if available; otherwise prints the `gh` command you can run

Notes:
- The script attempts a safe, idempotent insertion and will skip insertion if it detects `CORSMiddleware` already referenced.
- Review the changes carefully before pushing; the script creates a backup file at `<startup>.bak`.
#>

param()

$ErrorActionPreference = 'Stop'

Write-Host "Starting CORS PR helper script..."

# Ensure git repo
if (-not (Test-Path .git)) {
    Write-Host "This directory does not look like a git repo (no .git). Run this script from your backend repo root." -ForegroundColor Red
    exit 1
}

# Find a candidate startup file that mentions FastAPI(
Write-Host "Searching for Python file that contains 'FastAPI('..."
$foundMatches = Select-String -Path (Join-Path -Path (Get-Location) -ChildPath '**\*.py') -Pattern 'FastAPI\(' -List -ErrorAction SilentlyContinue

if (!$foundMatches -or $foundMatches.Count -eq 0) {
    Write-Host "No Python files with 'FastAPI(' were found. You must manually add the CORS middleware. Exiting." -ForegroundColor Yellow
    exit 1
}

$startup = $foundMatches[0].Path
Write-Host "Detected startup file: $startup"

# Determine base branch (try origin/main then origin/master)
$base = 'main'
try {
    git ls-remote --exit-code --heads origin main > $null 2>&1
} catch {
    $base = 'master'
}
Write-Host "Using base branch: $base"

# Create branch
$timestamp = Get-Date -Format yyyyMMddHHmm
$branch = "add-cors-middleware-$timestamp"
Write-Host "Creating branch: $branch"

git checkout -b $branch

# Backup startup file
Copy-Item -Path $startup -Destination "$startup.bak" -Force
Write-Host "Backed up $startup to $startup.bak"

# Read file content
$content = Get-Content -LiteralPath $startup -Raw -ErrorAction Stop

# If file already references CORSMiddleware, skip insertion
if ($content -match 'CORSMiddleware') {
    Write-Host "The startup file already references CORSMiddleware. Creating docs only."
} else {
    # Find position of 'app = FastAPI(' line
    $lines = $content -split "`n"
    $insertIndex = -1
    for ($i=0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match 'app\s*=\s*FastAPI\(') { $insertIndex = $i; break }
    }

    if ($insertIndex -eq -1) {
        Write-Host "Could not find 'app = FastAPI(...)' line to insert CORS middleware. Will append snippet at end of file."
        $insertIndex = $lines.Length - 1
    }

    $snippet = @"

# --- CORS middleware (added by automation)
import os
from fastapi.middleware.cors import CORSMiddleware

# Environment variable `ALLOWED_ORIGINS` expected as a comma-separated list OR '*' for all origins
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', '*')
if ALLOWED_ORIGINS and ALLOWED_ORIGINS.strip() != '':
    origins = [o.strip() for o in ALLOWED_ORIGINS.split(',') if o.strip()]
else:
    origins = ["*"]

# Only add middleware if not already configured
try:
    # `app` should already be created above this insertion point (app = FastAPI(...))
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
        allow_headers=["*"],
    )
except NameError:
    # If `app` isn't defined at the insertion point, log a clear message for manual placement
    import sys
    sys.stderr.write("[CORS-INSERT] app is not defined at the insertion point. Move the CORS snippet below the app = FastAPI(...) declaration.\n")

# --- end CORS middleware
"@

    # Insert snippet right after the line where app is defined
    if ($insertIndex -ge 0 -and $insertIndex -lt $lines.Length) {
        $before = $lines[0..$insertIndex]
        $after = @()
        if ($insertIndex + 1 -lt $lines.Length) { $after = $lines[($insertIndex + 1)..($lines.Length - 1)] }
        $newContent = ($before + $snippet + $after) -join "`n"
        Set-Content -LiteralPath $startup -Value $newContent -Force
        Write-Host "Inserted CORS snippet into $startup"
    } else {
        # Append
        $newContent = $content + "`n" + $snippet
        Set-Content -LiteralPath $startup -Value $newContent -Force
        Write-Host "Appended CORS snippet to $startup"
    }
}

# Add docs/CORS.md
$docsDir = Join-Path -Path (Get-Location) -ChildPath 'docs'
if (-not (Test-Path $docsDir)) { New-Item -Path $docsDir -ItemType Directory | Out-Null }
$docsPath = Join-Path -Path $docsDir -ChildPath 'CORS.md'
$docsContent = @"
# CORS configuration

This file explains the addition of CORSMiddleware to the FastAPI application.

Environment variable: `ALLOWED_ORIGINS`
- Comma-separated list of origins allowed, e.g. `https://example.com,https://app.example.com`
- Use `*` to allow all origins (not recommended for production).

Example (Railway) CLI to set allowed origins:

```bash
# allow the frontend deployment and localhost for testing
railway environment set ALLOWED_ORIGINS "https://natural-presence-production.up.railway.app,http://localhost:3000"
```

If you use a different host or domain, include it in the list.

"@

Set-Content -LiteralPath $docsPath -Value $docsContent -Force
Write-Host "Wrote docs file: $docsPath"

# Stage and commit
git add $startup
git add $docsPath
git commit -m "chore: add CORSMiddleware and docs for allowed origins"

# Push branch
git push -u origin $branch
Write-Host "Pushed branch $branch to origin"

# Try to open PR using gh if available
if (Get-Command gh -ErrorAction SilentlyContinue) {
    gh pr create --base $base --head $branch --title "Add CORSMiddleware and ALLOWED_ORIGINS env" --body "Add CORSMiddleware and docs to configure ALLOWED_ORIGINS. Please review and adjust origins for production." | Out-Host
} else {
    Write-Host "gh CLI not found. To open a PR, run the following command after installing GitHub CLI, or open a PR in GitHub web UI:" -ForegroundColor Yellow
    Write-Host "git push -u origin $branch"
    Write-Host "gh pr create --base $base --head $branch --title \"Add CORSMiddleware and ALLOWED_ORIGINS env\" --body \"Add CORSMiddleware and docs to configure ALLOWED_ORIGINS. Please review and adjust origins for production.\""
}

Write-Host "Done. Please review the changes and the backup file ($startup.bak) before merging." -ForegroundColor Green
