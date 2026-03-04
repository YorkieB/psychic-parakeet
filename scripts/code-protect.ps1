<#
  Code Protection Dome - Yorkie's file guardian.

  This script locks and unlocks critical files with password protection.
  It also runs pre-change validation (TypeScript errors, Biome lint) before
  unlocking, so you know if anything is broken BEFORE you touch the code.

  Usage:
    .\scripts\code-protect.ps1 lock FILE             # Lock a file (adds to protected list + read-only)
    .\scripts\code-protect.ps1 unlock FILE           # Unlock a file (password required + pre-change validation)
    .\scripts\code-protect.ps1 status                # Show all protected files and their status
    .\scripts\code-protect.ps1 validate FILE         # Run pre-change validation without unlocking
    .\scripts\code-protect.ps1 relock FILE           # Re-lock after editing (validates first)
    .\scripts\code-protect.ps1 init                  # Lock all files in protected-files.json
    .\scripts\code-protect.ps1 set-password          # Set or change the protection password
#>

param(
    [Parameter(Position = 0)]
    [ValidateSet("lock", "unlock", "status", "validate", "relock", "init", "set-password", "auto-lock")]
    [string]$Action,

    [Parameter(Position = 1)]
    [string]$FilePath
)

# --- Config ---
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ProtectedFilesJson = Join-Path $ProjectRoot "protected-files.json"
$PasswordFile = Join-Path $ProjectRoot ".code-protect-key"
$Separator = "=" * 60

# --- Colors ---
function Write-Shield   { param($msg) Write-Host "[SHIELD] $msg" -ForegroundColor Cyan }
function Write-Locked   { param($msg) Write-Host "[LOCKED] $msg" -ForegroundColor Yellow }
function Write-Unlocked { param($msg) Write-Host "[UNLOCKED] $msg" -ForegroundColor Green }
function Write-Err      { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Warn     { param($msg) Write-Host "[WARN] $msg" -ForegroundColor DarkYellow }
function Write-Ok       { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Info     { param($msg) Write-Host "[INFO] $msg" -ForegroundColor White }

# --- Password Hashing ---
function Get-PasswordHash {
    param([string]$PlainText)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($PlainText)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $hash = $sha.ComputeHash($bytes)
    return [BitConverter]::ToString($hash) -replace '-', ''
}

function Set-ProtectionPassword {
    Write-Shield "Set Code Protection Password"
    Write-Host $Separator

    if (Test-Path $PasswordFile) {
        $currentInput = Read-Host "Enter current password" -AsSecureString
        $currentPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($currentInput)
        )
        $currentHash = Get-PasswordHash $currentPlain
        $storedHash = Get-Content $PasswordFile -Raw
        if ($currentHash.Trim() -ne $storedHash.Trim()) {
            Write-Err "Current password is incorrect."
            return
        }
    }

    $newInput = Read-Host "Enter new protection password" -AsSecureString
    $confirmInput = Read-Host "Confirm new password" -AsSecureString

    $newPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($newInput)
    )
    $confirmPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmInput)
    )

    if ($newPlain -ne $confirmPlain) {
        Write-Err "Passwords do not match. Try again."
        return
    }

    if ($newPlain.Length -lt 4) {
        Write-Err "Password must be at least 4 characters."
        return
    }

    $hash = Get-PasswordHash $newPlain
    Set-Content -Path $PasswordFile -Value $hash -NoNewline
    Write-Ok "Protection password set successfully."
    Write-Info "Password hash stored in .code-protect-key (already in .gitignore)"
}

function Confirm-ProtectionPassword {
    if (-not (Test-Path $PasswordFile)) {
        Write-Err "No password set. Run: .\scripts\code-protect.ps1 set-password"
        return $false
    }

    $secureInput = Read-Host "Enter protection password" -AsSecureString
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureInput)
    )
    $inputHash = Get-PasswordHash $plain
    $storedHash = (Get-Content $PasswordFile -Raw).Trim()

    if ($inputHash -ne $storedHash) {
        Write-Err "Incorrect password. Access denied."
        return $false
    }
    return $true
}

# --- Protected Files Management ---
function Get-ProtectedFiles {
    if (-not (Test-Path $ProtectedFilesJson)) {
        return @{ description = "Code Protection Dome"; version = "1.0.0"; files = @() }
    }
    return Get-Content $ProtectedFilesJson -Raw | ConvertFrom-Json
}

function Save-ProtectedFiles {
    param($data)
    $data | ConvertTo-Json -Depth 4 | Set-Content $ProtectedFilesJson -Encoding UTF8
}

function Test-FileProtected {
    param([string]$relativePath)
    $data = Get-ProtectedFiles
    $normalizedPath = $relativePath -replace '\\', '/'
    foreach ($f in $data.files) {
        $normalizedF = $f.path -replace '\\', '/'
        if ($normalizedF -eq $normalizedPath) { return $true }
    }
    return $false
}

function Get-RelativePath {
    param([string]$inputPath)
    $resolved = Resolve-Path -Path (Join-Path $ProjectRoot $inputPath) -ErrorAction SilentlyContinue
    if (-not $resolved) {
        $resolved = Resolve-Path -Path $inputPath -ErrorAction SilentlyContinue
    }
    if (-not $resolved) { return $null }

    $fullPath = $resolved.Path
    $relative = $fullPath.Replace($ProjectRoot, "").TrimStart("\", "/") -replace '\\', '/'
    return $relative
}

# --- Pre-Change Validation ---
function Invoke-PreChangeValidation {
    param([string]$relativePath)

    Write-Host ""
    Write-Shield "PRE-CHANGE VALIDATION"
    Write-Host $Separator
    $errors = @()
    $warnings = @()

    # 1. Check if file exists and is readable
    $fullPath = Join-Path $ProjectRoot $relativePath
    if (-not (Test-Path $fullPath)) {
        $errors += "File not found: $relativePath"
        Show-ValidationResults $errors $warnings
        return $errors.Count -eq 0
    }
    Write-Ok "File exists: $relativePath"

    # 2. Get current file hash (for change detection later)
    $hash = (Get-FileHash $fullPath -Algorithm SHA256).Hash
    Write-Info "Current file hash: $($hash.Substring(0, 16))..."

    # 3. Check TypeScript errors in this file
    Write-Info "Checking TypeScript errors..."
    try {
        $tsOutput = & npx tsc --noEmit 2>&1 | Out-String
        $fileErrors = $tsOutput -split "`n" | Where-Object { $_ -match [regex]::Escape($relativePath) }
        if ($fileErrors.Count -gt 0) {
            $warnings += "TypeScript: $($fileErrors.Count) existing error(s) in this file"
            foreach ($e in $fileErrors | Select-Object -First 3) {
                $warnings += "  -> $($e.Trim())"
            }
        } else {
            Write-Ok "TypeScript: No errors in this file"
        }
    } catch {
        $warnings += "TypeScript check skipped (tsc not available)"
    }

    # 4. Check Biome lint
    Write-Info "Checking Biome lint..."
    try {
        $biomeOutput = & npx biome check $fullPath 2>&1 | Out-String
        if ($biomeOutput -match "error" -or $biomeOutput -match "Found \d+ error") {
            $warnings += "Biome: lint issues detected in file"
        } else {
            Write-Ok "Biome: File is clean"
        }
    } catch {
        $warnings += "Biome check skipped (biome not available)"
    }

    # 5. Check file size (flag unusually large changes)
    $fileSize = (Get-Item $fullPath).Length
    if ($fileSize -gt 50000) {
        $warnings += "Large file ($([math]::Round($fileSize/1024, 1)) KB) -- be extra careful with changes"
    }

    # 6. Check git status for uncommitted changes
    Write-Info "Checking git status..."
    try {
        $gitStatus = & git status --porcelain $fullPath 2>&1 | Out-String
        if ($gitStatus.Trim()) {
            $warnings += "Git: File has uncommitted changes -- commit or stash first!"
        } else {
            Write-Ok "Git: File is clean (committed)"
        }
    } catch {
        $warnings += "Git check skipped"
    }

    Show-ValidationResults $errors $warnings
    return $errors.Count -eq 0
}

function Show-ValidationResults {
    param($errors, $warnings)

    Write-Host ""
    Write-Host $Separator

    if ($errors.Count -gt 0) {
        Write-Err "VALIDATION FAILED -- $($errors.Count) error(s):"
        foreach ($e in $errors) { Write-Host "  [X] $e" -ForegroundColor Red }
    }

    if ($warnings.Count -gt 0) {
        Write-Warn "WARNINGS -- $($warnings.Count) issue(s) to review:"
        foreach ($w in $warnings) { Write-Host "  [!] $w" -ForegroundColor DarkYellow }
    }

    if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
        Write-Ok "ALL CHECKS PASSED -- file is clean and safe to edit"
    } elseif ($errors.Count -eq 0) {
        Write-Warn "File can be unlocked, but review warnings above"
    }

    Write-Host $Separator
}

# --- Actions ---

function Lock-File {
    param([string]$inputPath)

    $relative = Get-RelativePath $inputPath
    if (-not $relative) {
        Write-Err "File not found: $inputPath"
        return
    }

    $fullPath = Join-Path $ProjectRoot $relative

    if (Test-FileProtected $relative) {
        Write-Locked "$relative is already protected"
        return
    }

    # Make file read-only
    Set-ItemProperty -Path $fullPath -Name IsReadOnly -Value $true

    # Add to protected files list
    $data = Get-ProtectedFiles
    $entry = @{
        path     = $relative
        reason   = Read-Host "Why is this file being protected? (brief reason)"
        lockedAt = (Get-Date).ToUniversalTime().ToString("o")
        lockedBy = "Yorkie"
    }
    $data.files += $entry
    Save-ProtectedFiles $data

    Write-Host ""
    Write-Locked "PROTECTED: $relative"
    Write-Info "File is now read-only and listed in protected-files.json"
    Write-Info "To edit, run: .\scripts\code-protect.ps1 unlock $relative"
}

function Unlock-File {
    param([string]$inputPath)

    $relative = Get-RelativePath $inputPath
    if (-not $relative) {
        Write-Err "File not found: $inputPath"
        return
    }

    if (-not (Test-FileProtected $relative)) {
        Write-Warn "$relative is not in the protected files list"
        return
    }

    Write-Host ""
    Write-Shield "UNLOCK REQUEST: $relative"
    Write-Host $Separator

    # Step 1: Password check
    Write-Info "Step 1/3: Password verification"
    if (-not (Confirm-ProtectionPassword)) { return }
    Write-Ok "Password accepted"

    # Step 2: Pre-change validation
    Write-Info "Step 2/3: Pre-change validation"
    $valid = Invoke-PreChangeValidation $relative
    if (-not $valid) {
        Write-Err "Validation failed. Fix errors before unlocking."
        return
    }

    # Step 3: Confirm intent
    Write-Info "Step 3/3: Confirm intent"
    $confirm = Read-Host "Type UNLOCK to confirm you want to edit this protected file"
    if ($confirm -ne "UNLOCK") {
        Write-Warn "Unlock cancelled."
        return
    }

    # Unlock the file
    $fullPath = Join-Path $ProjectRoot $relative
    Set-ItemProperty -Path $fullPath -Name IsReadOnly -Value $false

    Write-Host ""
    Write-Unlocked "UNLOCKED: $relative"
    Write-Warn "Remember to re-lock when done: .\scripts\code-protect.ps1 relock $relative"
    Write-Warn "The file is temporarily unprotected -- make your changes and re-lock ASAP!"
}

function Set-FileLock {
    param([string]$inputPath)

    $relative = Get-RelativePath $inputPath
    if (-not $relative) {
        Write-Err "File not found: $inputPath"
        return
    }

    Write-Shield "RE-LOCKING: $relative"

    # Run validation to make sure the new code is clean
    $valid = Invoke-PreChangeValidation $relative
    if (-not $valid) {
        Write-Err "Validation failed! The file has errors. Fix them before re-locking."
        $force = Read-Host "Force re-lock anyway? (yes/no)"
        if ($force -ne "yes") { return }
        Write-Warn "Force re-locking despite errors..."
    }

    $fullPath = Join-Path $ProjectRoot $relative
    Set-ItemProperty -Path $fullPath -Name IsReadOnly -Value $true

    # Update timestamp
    $data = Get-ProtectedFiles
    foreach ($f in $data.files) {
        if (($f.path -replace '\\', '/') -eq ($relative -replace '\\', '/')) {
            $f.lockedAt = (Get-Date).ToUniversalTime().ToString("o")
        }
    }
    Save-ProtectedFiles $data

    Write-Locked "RE-LOCKED: $relative"
    Write-Ok "File is protected again."
}

function Show-Status {
    $data = Get-ProtectedFiles

    Write-Host ""
    Write-Shield "CODE PROTECTION DOME -- STATUS"
    Write-Host $Separator

    if ($data.files.Count -eq 0) {
        Write-Info "No files are currently protected."
        Write-Info "Lock a file: .\scripts\code-protect.ps1 lock FILEPATH"
        return
    }

    Write-Host ""
    Write-Host "  Protected files: $($data.files.Count)" -ForegroundColor Cyan
    Write-Host ""

    foreach ($f in $data.files) {
        $fullPath = Join-Path $ProjectRoot $f.path
        $isReadOnly = $false
        if (Test-Path $fullPath) {
            $isReadOnly = (Get-Item $fullPath).IsReadOnly
        }

        $icon = if ($isReadOnly) { "[LOCKED]" } else { "[OPEN]" }
        $statusText = if ($isReadOnly) { "LOCKED" } else { "UNLOCKED (exposed!)" }
        $color = if ($isReadOnly) { "Yellow" } else { "Red" }

        Write-Host "  $icon " -NoNewline
        Write-Host "$($f.path)" -ForegroundColor White -NoNewline
        Write-Host " -- $statusText" -ForegroundColor $color
        Write-Host "     Reason: $($f.reason)" -ForegroundColor DarkGray
        Write-Host "     Locked: $($f.lockedAt) by $($f.lockedBy)" -ForegroundColor DarkGray
        Write-Host ""
    }

    Write-Host $Separator
}

function Initialize-Protection {
    Write-Shield "INITIALIZING CODE PROTECTION DOME"
    Write-Host $Separator

    # Set password if not already set
    if (-not (Test-Path $PasswordFile)) {
        Write-Warn "No password set yet. Creating one now."
        Set-ProtectionPassword
        if (-not (Test-Path $PasswordFile)) { return }
    }

    $data = Get-ProtectedFiles

    foreach ($f in $data.files) {
        $fullPath = Join-Path $ProjectRoot $f.path
        if (Test-Path $fullPath) {
            Set-ItemProperty -Path $fullPath -Name IsReadOnly -Value $true
            Write-Locked "Locked: $($f.path)"
        } else {
            Write-Warn "File not found (skipped): $($f.path)"
        }
    }

    Write-Host ""
    Write-Ok "Code Protection Dome is ACTIVE -- $($data.files.Count) file(s) protected"
    Write-Info "Run .\scripts\code-protect.ps1 status to see all protected files"
}

function Invoke-AutoLock {
    Write-Shield "AUTO-LOCK: Validating all protected files..."
    Write-Host $Separator

    $data = Get-ProtectedFiles
    if ($data.files.Count -eq 0) {
        Write-Info "No files in protected list. Nothing to auto-lock."
        return
    }

    $locked = 0
    $failed = 0
    $alreadyLocked = 0

    foreach ($f in $data.files) {
        $fullPath = Join-Path $ProjectRoot $f.path
        if (-not (Test-Path $fullPath)) {
            Write-Warn "Skipped (not found): $($f.path)"
            $failed++
            continue
        }

        # Already locked?
        if ((Get-Item $fullPath).IsReadOnly) {
            Write-Locked "Already locked: $($f.path)"
            $alreadyLocked++
            continue
        }

        # Quick validation: TypeScript errors for this specific file
        $hasErrors = $false
        Write-Info "Validating: $($f.path)"

        # Check TypeScript
        try {
            $tsOut = & npx tsc --noEmit 2>&1 | Out-String
            $fileErrs = $tsOut -split "`n" | Where-Object { $_ -match [regex]::Escape($f.path) }
            if ($fileErrs.Count -gt 0) {
                Write-Warn "  TypeScript: $($fileErrs.Count) error(s) -- skipping lock"
                $hasErrors = $true
            }
        } catch { }

        # Check Biome (lint only -- formatting differences should not block locking)
        if (-not $hasErrors) {
            try {
                $biomeOut = & npx biome lint $fullPath 2>&1 | Out-String
                if ($LASTEXITCODE -ne 0 -and $biomeOut -match "Found \d+ error") {
                    Write-Warn "  Biome lint: code issues found -- skipping lock"
                    $hasErrors = $true
                }
            } catch { }
        }

        if ($hasErrors) {
            $failed++
            continue
        }

        # All checks passed -- lock it
        Set-ItemProperty -Path $fullPath -Name IsReadOnly -Value $true
        $f.lockedAt = (Get-Date).ToUniversalTime().ToString("o")
        Write-Ok "Auto-locked: $($f.path)"
        $locked++
    }

    Save-ProtectedFiles $data

    Write-Host ""
    Write-Host $Separator
    Write-Shield "AUTO-LOCK COMPLETE"
    Write-Info "  Locked: $locked | Already locked: $alreadyLocked | Failed validation: $failed"
    Write-Host $Separator
}

# --- Main ---

Write-Host ""
Write-Host "  +======================================+" -ForegroundColor Cyan
Write-Host "  |   [SHIELD] CODE PROTECTION DOME      |" -ForegroundColor Cyan
Write-Host "  +======================================+" -ForegroundColor Cyan
Write-Host ""

switch ($Action) {
    "lock"         { Lock-File $FilePath }
    "unlock"       { Unlock-File $FilePath }
    "relock"       { Set-FileLock $FilePath }
    "status"       { Show-Status }
    "validate"     {
        $relative = Get-RelativePath $FilePath
        if ($relative) { Invoke-PreChangeValidation $relative }
        else { Write-Err "File not found: $FilePath" }
    }
    "init"         { Initialize-Protection }
    "set-password" { Set-ProtectionPassword }
    "auto-lock"    { Invoke-AutoLock }
    default {
        Write-Info "Usage:"
        Write-Host "  .\scripts\code-protect.ps1 init                  -- Set password and lock all protected files"
        Write-Host "  .\scripts\code-protect.ps1 lock FILE             -- Lock a new file"
        Write-Host "  .\scripts\code-protect.ps1 unlock FILE           -- Unlock (password + validation)"
        Write-Host "  .\scripts\code-protect.ps1 relock FILE           -- Re-lock after editing"
        Write-Host "  .\scripts\code-protect.ps1 status                -- Show all protected files"
        Write-Host "  .\scripts\code-protect.ps1 validate FILE         -- Run pre-change checks"
        Write-Host "  .\scripts\code-protect.ps1 set-password          -- Set/change password"
        Write-Host "  .\scripts\code-protect.ps1 auto-lock              -- Validate and lock all passing files"
    }
}

Write-Host ""
