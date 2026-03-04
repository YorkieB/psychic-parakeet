# Opens Windows System Properties so you can increase Virtual Memory (page file).
# Run: .\scripts\open-virtual-memory-settings.ps1
# Then: Advanced tab -> Performance Settings -> Advanced -> Virtual memory -> Change
#       Set Custom size (e.g. Initial 24576 MB, Maximum 49152 MB), OK, restart.

Start-Process "sysdm.cpl"
Write-Host "System Properties opened. Go to: Advanced -> Performance Settings -> Advanced -> Virtual memory -> Change."
Write-Host "Set Custom size (e.g. Initial 24576, Maximum 49152 MB), then restart to get more 'available' memory."
Write-Host ""
Write-Host "See docs/MORE_MEMORY_GUIDE.md for full steps and model-size tips."
