$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

$venvDir = Join-Path $PSScriptRoot ".venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"
$repoRoot = Split-Path $PSScriptRoot -Parent
$dlibWheel = Join-Path $repoRoot "dlib-19.22.99-cp310-cp310-win_amd64.whl"

if (-not (Test-Path $venvPython)) {
    Write-Host "Creating Python 3.10 virtual environment..."
    py -3.10 -m venv $venvDir
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
