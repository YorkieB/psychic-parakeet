# pgAdmin Step-by-Step Guide

## You're Looking at the Dashboard - Here's What to Do:

### Step 1: Find "Servers" in the Left Sidebar

1. **Look at the LEFT side of pgAdmin** (the navigation tree)
2. **Find "Servers"** - it should be near the top with a right-pointing arrow ▶
3. **Click the arrow** to expand it (or double-click "Servers")

### Step 2: Find Your PostgreSQL Server

After expanding "Servers", you should see something like:
- **PostgreSQL 16** (or PostgreSQL 15, PostgreSQL 14, etc.)
- Or just **"PostgreSQL"**

### Step 3: Right-Click the Server

1. **Right-click** on the server name (PostgreSQL 16, etc.)
2. A menu will appear
3. Click **"Properties"** (or "Properties..." or "Server Properties")

### Step 4: Check Connection Settings

1. A window will open
2. Click the **"Connection"** tab at the top
3. You'll see:
   - Host name/address: `localhost` or `127.0.0.1`
   - Port: `5432`
   - Maintenance database: `postgres`
   - Username: `postgres`
   - **Password**: [This is what you need!]

### Step 5: Get or Set Password

**If password field is empty or you want to set a new one:**
- Type a password (remember it!)
- Click **"Save"** button

**If password is already there:**
- You can't see it (it's hidden), but it's saved
- Try connecting to see if it works

### Step 6: Create Database

1. **Go back to the left sidebar**
2. **Expand your server** (click the arrow next to it)
3. **Expand "Databases"** (click the arrow)
4. **Right-click "Databases"**
5. Select **"Create"** → **"Database..."**
6. Enter name: `jarvis_db`
7. Click **"Save"**

---

## Visual Guide:

```
pgAdmin Window:
┌─────────────────────────────────────┐
│  [Left Sidebar]  │  [Main Area]     │
│                  │                   │
│  ▶ Servers       │  Dashboard       │
│    └─▶ PostgreSQL│  (you are here)  │
│       └─▶ Databases                 │
│                                     │
└─────────────────────────────────────┘

Steps:
1. Click ▶ next to "Servers"
2. Click ▶ next to "PostgreSQL 16"
3. Right-click "PostgreSQL 16" → Properties
4. Click "Connection" tab
5. Check/set password
```
