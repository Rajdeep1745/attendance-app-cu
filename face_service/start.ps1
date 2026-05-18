$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

$venvDir = Join-Path $PSScriptRoot ".venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"
$repoRoot = Split-Path $PSScriptRoot -Parent
$dlibWheel = Join-Path $repoRoot "dlib-19.22.99-cp310-cp310-win_amd64.whl"

function Test-Python310Command {
    param(
        [string]$Command,
        [string[]]$Arguments = @()
    )

    try {
        $version = & $Command @Arguments -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>$null
        return ($LASTEXITCODE -eq 0 -and $version.Trim() -eq "3.10")
    }
    catch {
        return $false
    }
}

$pythonCommand = $null
$pythonArguments = @()

if (-not (Test-Path $venvPython)) {
    if (Test-Python310Command -Command "py" -Arguments @("-3.10")) {
        $pythonCommand = "py"
        $pythonArguments = @("-3.10")
    }
    elseif (Test-Python310Command -Command "python3.10") {
        $pythonCommand = "python3.10"
    }
    elseif (Test-Python310Command -Command "python") {
        $pythonCommand = "python"
    }
    else {
        Write-Warning "Python 3.10 was not found, so the face service was not started."
        Write-Warning "Install 64-bit Python 3.10, close and reopen VS Code, then run: npm run face-service"
        exit 0
    }

    Write-Host "Creating Python 3.10 virtual environment..."
    & $pythonCommand @pythonArguments -m venv $venvDir
}

if (-not (Test-Path $venvPython)) {
    Write-Warning "The virtual environment was not created at $venvDir."
    Write-Warning "Install 64-bit Python 3.10, close and reopen VS Code, then run: npm run face-service"
    exit 0
}

Write-Host "Using face service Python:"
& $venvPython --version

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
& $venvPython -c "import dlib" 2>$null
$dlibImportExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference

if ($dlibImportExitCode -ne 0) {
    if (Test-Path $dlibWheel) {
        Write-Host "Installing dlib from local Python 3.10 wheel..."
        & $venvPython -m pip install --disable-pip-version-check $dlibWheel
    }
}

& $venvPython -m pip install --disable-pip-version-check -r requirements.txt

if (-not $env:FACE_SERVICE_PORT) {
    $env:FACE_SERVICE_PORT = "5001"
}

& $venvPython app.py
