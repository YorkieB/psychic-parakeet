# Quick Database Setup Guide

## pgAdmin is Opening Now! 🚀

Follow these steps in pgAdmin:

### Step 1: Find Your Password (2 minutes)

1. **In pgAdmin (left sidebar):**
   - Expand **"Servers"**
   - Right-click on **"PostgreSQL 16"** (or similar)
   - Select **"Properties"**

2. **In the Properties window:**
   - Click **"Connection"** tab
   - Look at the **"Password"** field
   - If it's empty or you want to change it:
     - Enter a password (remember it!)
     - Click **"Save"**

### Step 2: Create Database (1 minute)

1. **In pgAdmin (left sidebar):**
   - Expand your server
   - Right-click **"Databases"**
   - Select **"Create"** → **"Database..."**

2. **In the Create Database window:**
   - **Name**: `jarvis_db`
   - **Owner**: `postgres` (default)
   - Click **"Save"**

### Step 3: Tell Me the Password

Once you have the password, just tell me:
- "The password is: [your password]"

And I'll update your `.env` file automatically!

---

## Alternative: Use Command Line

If you prefer command line, you can also:

```powershell
# Connect to PostgreSQL
psql -U postgres

# Then run:
CREATE DATABASE jarvis_db;
\q
```

But pgAdmin is easier! 😊
