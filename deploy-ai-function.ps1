param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-z0-9]{20}$')]
  [string]$ProjectRef
)

$ErrorActionPreference = 'Stop'
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  throw 'Supabase CLI was not found. Install it first: https://supabase.com/docs/guides/cli'
}
$projectFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$stageRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("devdirectory-supabase-" + [guid]::NewGuid().ToString('N'))
$functionFolder = Join-Path $stageRoot 'supabase/functions/developer-assistant'
$configFolder = Join-Path $stageRoot 'supabase'
try {
  New-Item -ItemType Directory -Path $functionFolder -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $projectFolder 'developer-assistant-function.ts') -Destination (Join-Path $functionFolder 'index.ts')
  Copy-Item -LiteralPath (Join-Path $projectFolder 'supabase-config.toml') -Destination (Join-Path $configFolder 'config.toml')
  Push-Location $stageRoot
  try {
    supabase functions deploy developer-assistant --project-ref $ProjectRef
    if ($LASTEXITCODE -ne 0) { throw 'Supabase Edge Function deployment failed.' }
  } finally {
    Pop-Location
  }
} finally {
  if (Test-Path -LiteralPath $stageRoot) { Remove-Item -LiteralPath $stageRoot -Recurse -Force }
}
