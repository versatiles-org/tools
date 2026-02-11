#!/usr/bin/env pwsh
# Smoke-tests a generated Windows script by:
# 1. Copying fixtures into a work directory
# 2. Starting the server as a background process
# 3. Polling for HTTP 200
# 4. Cleaning up
#
# Usage: pwsh tests/integration/smoke_test.ps1 <os> <method>
# Example: pwsh tests/integration/smoke_test.ps1 windows script

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$GeneratedDir = Join-Path $ScriptDir 'fixtures/generated'
$Fixture = Join-Path $ScriptDir 'fixtures/tiny.versatiles'

if ($args.Count -lt 2) {
	Write-Error 'Usage: smoke_test.ps1 <os> <method>'
	exit 1
}

$OS = $args[0]
$Method = $args[1]
$Script = Join-Path $GeneratedDir "${OS}_${Method}.ps1"

if (-not (Test-Path $Script)) {
	Write-Error "Script not found: $Script"
	exit 1
}

if (-not (Test-Path $Fixture)) {
	Write-Error "Fixture not found: $Fixture. Run 'bash tests/integration/create_fixture.sh' first."
	exit 1
}

$WorkDir = Join-Path ([System.IO.Path]::GetTempPath()) "versatiles-smoke-$(Get-Random)"
New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null

$Port = 8080
$ServerProcess = $null

function Cleanup {
	Write-Host '=== Cleaning up ==='
	if ($null -ne $ServerProcess -and -not $ServerProcess.HasExited) {
		Stop-Process -Id $ServerProcess.Id -Force -ErrorAction SilentlyContinue
		Start-Sleep -Seconds 1
	}
	Remove-Item -Recurse -Force $WorkDir -ErrorAction SilentlyContinue
}

try {
	# Copy fixtures into work dir
	Copy-Item $Fixture (Join-Path $WorkDir 'osm.versatiles')

	# Detect frontend usage
	$HasFrontend = $false
	$FrontendFile = Join-Path $ScriptDir 'fixtures/frontend.br.tar.gz'
	$ScriptContent = Get-Content $Script -Raw
	if ($ScriptContent -match '--static|FRONTEND=') {
		if ((Test-Path $FrontendFile) -and (Get-Item $FrontendFile).Length -gt 0) {
			$HasFrontend = $true
			Copy-Item $FrontendFile (Join-Path $WorkDir 'frontend.br.tar.gz')
		} else {
			Write-Host "WARNING: Generated script uses a frontend but $FrontendFile not found or empty."
			Write-Host '         Falling back to health check on /status.'
		}
	}

	Write-Host "=== Smoke testing: ${OS}/${Method} ==="
	Write-Host "    Work dir: $WorkDir"
	Write-Host "    Frontend: $HasFrontend"

	# Build serve arguments
	$ServeArgs = @('serve', '--port', "$Port", 'osm.versatiles')
	if ($HasFrontend) {
		$ServeArgs = @('serve', '--port', "$Port", '--static', 'frontend.br.tar.gz', 'osm.versatiles')
	}

	# Start the server as a background process
	Write-Host '=== Starting server ==='
	$ServerProcess = Start-Process -FilePath 'versatiles.exe' `
		-ArgumentList $ServeArgs `
		-WorkingDirectory $WorkDir `
		-PassThru `
		-NoNewWindow

	Write-Host "    Server PID: $($ServerProcess.Id)"

	# Health check
	if ($HasFrontend) {
		$HealthUrl = "http://localhost:$Port/"
	} else {
		$HealthUrl = "http://localhost:$Port/status"
	}

	Write-Host "=== Health check: polling $HealthUrl ==="
	$MaxAttempts = 15
	$Success = $false

	for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
		try {
			$response = Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
			if ($response.StatusCode -eq 200) {
				Write-Host "    Attempt ${attempt}: HTTP $($response.StatusCode) - OK"
				$Success = $true
				break
			}
			Write-Host "    Attempt ${attempt}: HTTP $($response.StatusCode) - retrying..."
		} catch {
			Write-Host "    Attempt ${attempt}: not ready - retrying..."
		}
		Start-Sleep -Seconds 2
	}

	if ($Success) {
		Write-Host ''
		Write-Host "PASSED: ${OS}/${Method} smoke test"
	} else {
		Write-Host ''
		Write-Host "FAILED: ${OS}/${Method} - server did not return HTTP 200 after $MaxAttempts attempts"
		exit 1
	}
} finally {
	Cleanup
}
