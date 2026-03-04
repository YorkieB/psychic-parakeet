# PostgreSQL Setup for Vision Engine

## Status
✅ **PostgreSQL is INSTALLED and RUNNING**
- Port 5432 is listening
- Installation found at: `C:\Program Files\PostgreSQL`

## Connection Issue
The Vision Engine is failing to connect because PostgreSQL requires authentication, but no password is configured in the `.env` file.

## Quick Fix Options

### Option 1: Set PostgreSQL Password in .env (Recommended)
1. Find your PostgreSQL password (if you set one during installation)
2. Update `.env` file:
   ```
   DB_PASSWORD=your_postgres_password_here
   ```

### Option 2: Use Default PostgreSQL Credentials
If you installed PostgreSQL with default settings, try:
- Username: `postgres`
- Password: (the one you set during installation, or empty if you didn't set one)

Update `.env`:
```
DB_USER=postgres
DB_PASSWORD=your_password_here
```

### Option 3: Create Vision Engine Database User
If you want a dedicated user for Vision Engine:

1. Open PowerShell as Administrator
2. Navigate to PostgreSQL bin directory:
   ```powershell
   cd "C:\Program Files\PostgreSQL\[VERSION]\bin"
   ```
3. Connect to PostgreSQL:
   ```powershell
   .\psql.exe -U postgres
   ```
4. Create database and user:
   ```sql
   CREATE DATABASE visionengine;
   CREATE USER vision WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE visionengine TO vision;
   \q
   ```
5. Update `.env`:
   ```
   DB_USER=vision
   DB_PASSWORD=your_secure_password
   DB_NAME=visionengine
   ```

### Option 4: Continue Without Database (Current Behavior)
The Vision Engine will automatically use in-memory SQLite if PostgreSQL connection fails. This works for testing but **data will not persist** between restarts.

## Test Connection
After updating `.env`, test the connection:
```powershell
python setup_database.py
```

## Next Steps
Once PostgreSQL is configured:
1. Run `python setup_database.py` to create the database and tables
2. Start the Vision Engine: `python -m src.main` or `python quick_start.py`
3. The system will use full database persistence
