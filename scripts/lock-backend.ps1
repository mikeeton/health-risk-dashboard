param([string]$Python = 'python')

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot 'backend'
if (Test-Path -LiteralPath $Python) {
  $Python = (Resolve-Path -LiteralPath $Python).Path
}

& $Python -c "import sys; assert sys.version_info[:2] == (3, 12), 'Use Python 3.12 to regenerate the backend locks'"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $Python -c "from importlib.metadata import version; assert version('pip-tools') == '7.6.2', 'Install pip-tools==7.6.2 before regenerating'"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Push-Location $backendDir
try {
  & $Python -m piptools compile --generate-hashes --resolver=backtracking --output-file=requirements.lock requirements.txt
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  & $Python -m piptools compile --generate-hashes --resolver=backtracking --output-file=requirements-dev.lock requirements-dev.txt
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}
