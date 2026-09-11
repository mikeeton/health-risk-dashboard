[CmdletBinding()]
param(
    [switch]$KeepDatabase,
    [switch]$SkipBackendTests
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$composeFile = Join-Path $repositoryRoot "compose.test.yml"
$backendDirectory = Join-Path $repositoryRoot "backend"
$testDatabaseUrl = "postgresql://healthrisk_test:healthrisk_test@127.0.0.1:55432/healthrisk_test"
$composeArguments = @("compose", "-f", $composeFile, "-p", "health-risk-dashboard-test")

$hadDatabaseUrl = Test-Path Env:DATABASE_URL
$previousDatabaseUrl = $env:DATABASE_URL
$hadAppEnvironment = Test-Path Env:APP_ENV
$previousAppEnvironment = $env:APP_ENV
$hadRateLimit = Test-Path Env:RATE_LIMIT_ENABLED
$previousRateLimit = $env:RATE_LIMIT_ENABLED
$hadAiEnabled = Test-Path Env:AI_ENABLED
$previousAiEnabled = $env:AI_ENABLED

function Invoke-Checked {
    param(
        [Parameter(Mandatory)] [string]$Executable,
        [Parameter(Mandatory)] [string[]]$Arguments
    )

    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $Executable $($Arguments -join ' ')"
    }
}

function Restore-EnvironmentVariable {
    param(
        [Parameter(Mandatory)] [string]$Name,
        [Parameter(Mandatory)] [bool]$WasPresent,
        [AllowNull()] [string]$PreviousValue
    )

    if ($WasPresent) {
        Set-Item -LiteralPath "Env:$Name" -Value $PreviousValue
    }
    else {
        Remove-Item -LiteralPath "Env:$Name" -ErrorAction SilentlyContinue
    }
}

try {
    Invoke-Checked docker ($composeArguments + @("down", "--volumes", "--remove-orphans"))
    Invoke-Checked docker ($composeArguments + @("up", "-d", "--wait", "postgres-test"))

    $env:DATABASE_URL = $testDatabaseUrl
    $env:APP_ENV = "test"
    $env:RATE_LIMIT_ENABLED = "false"
    $env:AI_ENABLED = "false"

    $pythonExecutable = Join-Path $backendDirectory "venv\Scripts\python.exe"
    if (-not (Test-Path -LiteralPath $pythonExecutable)) {
        $pythonExecutable = (Get-Command python -ErrorAction Stop).Source
    }

    Push-Location $backendDirectory
    try {
        Write-Host "Applying all migrations to an empty PostgreSQL database..."
        Invoke-Checked $pythonExecutable @("-m", "alembic", "upgrade", "head")

        Write-Host "Rehearsing the CI downgrade target and returning to head..."
        Invoke-Checked $pythonExecutable @("-m", "alembic", "downgrade", "20260728_0005")
        Invoke-Checked $pythonExecutable @("-m", "alembic", "upgrade", "head")
        Invoke-Checked $pythonExecutable @("-m", "alembic", "current", "--check-heads")

        if (-not $SkipBackendTests) {
            Write-Host "Running the complete backend test suite against PostgreSQL..."
            Invoke-Checked $pythonExecutable @("-m", "pytest", "tests", "-q")
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    Restore-EnvironmentVariable "DATABASE_URL" $hadDatabaseUrl $previousDatabaseUrl
    Restore-EnvironmentVariable "APP_ENV" $hadAppEnvironment $previousAppEnvironment
    Restore-EnvironmentVariable "RATE_LIMIT_ENABLED" $hadRateLimit $previousRateLimit
    Restore-EnvironmentVariable "AI_ENABLED" $hadAiEnabled $previousAiEnabled

    if (-not $KeepDatabase) {
        & docker @composeArguments down --volumes --remove-orphans
    }
}
