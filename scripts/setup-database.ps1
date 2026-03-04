# Database setup script for Jarvis AI Assistant (PowerShell)

Write-Host "🗄️  Setting up PostgreSQL database for Jarvis..." -ForegroundColor Cyan

# Check if PostgreSQL is installed
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "❌ PostgreSQL is not installed. Please install PostgreSQL first." -ForegroundColor Red
    exit 1
}

# Load environment variables
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Default values
$DB_NAME = if ($env:DATABASE_NAME) { $env:DATABASE_NAME } else { "jarvis_db" }
$DB_USER = if ($env:DATABASE_USER) { $env:DATABASE_USER } else { "jarvis_user" }
$DB_PASSWORD = if ($env:DATABASE_PASSWORD) { $env:DATABASE_PASSWORD } else { "jarvis_password" }
$DB_HOST = if ($env:DATABASE_HOST) { $env:DATABASE_HOST } else { "localhost" }
$DB_PORT = if ($env:DATABASE_PORT) { $env:DATABASE_PORT } else { "5432" }

Write-Host "Creating database: $DB_NAME"
Write-Host "Creating user: $DB_USER"

# Create user and database
$createScript = @"
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
"@

$createScript | psql -h $DB_HOST -p $DB_PORT -U postgres

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database and user created successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️  Database or user may already exist" -ForegroundColor Yellow
}

# Run schema initialization
Write-Host "Initializing database schema..."
$schemaPath = Join-Path $PSScriptRoot "..\src\database\schema.sql"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $schemaPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database schema initialized successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to initialize schema" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Database setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Connection details:"
Write-Host "  Host: $DB_HOST"
Write-Host "  Port: $DB_PORT"
Write-Host "  Database: $DB_NAME"
Write-Host "  User: $DB_USER"
Write-Host ""
Write-Host "Add to your .env file:"
Write-Host "DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
