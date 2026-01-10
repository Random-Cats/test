param(
  [string]$Region = "us-west-2",
  [string]$StackName = "randomcatclicker-backend"
)

$ErrorActionPreference = "Stop"

Write-Host "== RandomCatClicker SAM deploy =="
Write-Host "Region: $Region"
Write-Host "Stack:  $StackName"

# Ensure local node tools are discoverable for SAM's esbuild builder.
$env:PATH = "$PSScriptRoot\..\node_modules\.bin;$env:PATH"

# Check Docker availability (required for the ML processor container-image Lambda)
try {
  docker info | Out-Null
} catch {
  throw "Docker is required and not running. Start Docker Desktop, then re-run this script."
}

Push-Location "$PSScriptRoot\.."
try {
  sam validate --region $Region
  sam build
  sam deploy --guided --region $Region --stack-name $StackName
} finally {
  Pop-Location
}
