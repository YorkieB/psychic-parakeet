# Using pgAdmin to Configure PostgreSQL Password

## Step 1: Open pgAdmin

1. **Find pgAdmin on your computer:**
   - Press `Windows Key` and type "pgAdmin"
   - Or look in Start Menu → PostgreSQL → pgAdmin 4
   - Or search for "pgAdmin" in your applications

2. **Launch pgAdmin 4**
   - It will open in your web browser (usually at http://127.0.0.1:xxxxx)
   - You may need to enter a master password (this is for pgAdmin itself, not PostgreSQL)

## Step 2: Connect to PostgreSQL Server

1. **In the left sidebar, expand "Servers"**
   - You should see a server (usually named "PostgreSQL" or "PostgreSQL 15" or similar)

2. **Right-click on the server** → Select "Properties"

3. **Go to the "Connection" tab**
   - You'll see:
     - **Host**: localhost (or 127.0.0.1)
     - **Port**: 5432
     - **Maintenance database**: postgres
     - **Username**: postgres
     - **Password**: [This is what you need!]

4. **If password is saved:**
   - You can see it's saved (but it's hidden)
   - Click "Save Password" to see if it's already configured

## Step 3: Find or Reset Password

### Option A: Password is Already Saved
- If pgAdmin connects successfully, the password is working
- You can test it by trying to connect
- If it connects, use that password in your `.env` file

### Option B: Reset the Password

1. **Right-click on the server** → Select "Disconnect Server" (if connected)

2. **Right-click on the server** → Select "Properties"

3. **Go to "Connection" tab**

4. **Enter a new password** in the password field

5. **Click "Save"**

6. **Test connection:**
   - Right-click server → "Connect Server"
   - Enter the password you just set
   - If it connects, that's your password!

## Step 4: Create the Database

1. **Expand your server** in the left sidebar

2. **Right-click on "Databases"** → Select "Create" → "Database..."

3. **Enter database name:**
   - Name: `jarvis_db`
   - Owner: `postgres` (default)
   - Click "Save"

## Step 5: Update Your .env File

Once you have the password, update your `.env` file:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD_HERE@localhost:5432/jarvis_db
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=jarvis_db
DATABASE_USER=postgres
DATABASE_PASSWORD=YOUR_PASSWORD_HERE
```

Replace `YOUR_PASSWORD_HERE` with the actual password.

## Alternative: Use pgAdmin Query Tool

If you prefer SQL commands:

1. **Right-click on "postgres" database** → Select "Query Tool"

2. **Run these commands:**

```sql
-- Create database
CREATE DATABASE jarvis_db;

-- Create user (optional, if you want a separate user)
CREATE USER jarvis_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE jarvis_db TO jarvis_user;
```

Then update `.env` with the new user credentials.

## Troubleshooting

### pgAdmin Won't Open
- Check if PostgreSQL service is running
- Try restarting PostgreSQL service
- Reinstall pgAdmin if needed

### Can't Remember Master Password
- pgAdmin master password is separate from PostgreSQL password
- You can reset it or use a password manager

### Connection Refused
- Make sure PostgreSQL service is running
- Check if port 5432 is available
- Verify firewall settings
