[CmdletBinding()]
param([ValidatePattern('^\d{1,2}$')][string]$Id)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
function Find-NextId {
  $status = Get-Content (Join-Path $Root 'PROJECT_STATUS.md') -Raw -Encoding UTF8
  $match = [regex]::Match($status, '(?m)^- \[ \] NANO-(\d{2})\s*$')
  if (-not $match.Success) { throw 'No unchecked NANO prompt was found in PROJECT_STATUS.md.' }
  return $match.Groups[1].Value
}
if (-not $Id) { $Id = Find-NextId }
$normalized = ([int]$Id).ToString('00')
if ([int]$normalized -gt 11) { throw "Unsupported prompt ID: $Id. Valid IDs are 00-11." }
$files = @(Get-ChildItem -Path (Join-Path $Root "prompts\$normalized-*.md") -File)
if ($files.Count -ne 1) { throw "Expected exactly one prompt file for '$normalized', found $($files.Count)." }
$content = Get-Content $files[0].FullName -Raw -Encoding UTF8
$match = [regex]::Match($content, '(?s)```text\s*\r?\n(.*?)\r?\n```')
if (-not $match.Success) { throw "No fenced text prompt found in $($files[0].Name)." }
$prompt = $match.Groups[1].Value.Trim()
Set-Clipboard -Value $prompt
[System.IO.File]::WriteAllText((Join-Path $Root '.nano-current-prompt.txt'), $prompt + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
Write-Host "Copied to clipboard: $($files[0].Name)" -ForegroundColor Green
Write-Host 'Paste it into Claude Code. Execute one prompt at a time.'
