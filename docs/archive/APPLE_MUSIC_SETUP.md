# Apple Music Agent - Future Setup Guide

## Current Status

✅ **Apple Music Agent is already integrated and registered in your system!**

The agent is currently running on **Port 3013** and will show helpful warnings when credentials are missing. It won't break your system - it just won't be able to perform Apple Music actions until you add credentials.

## When You're Ready to Enable Apple Music

### Step 1: Get Apple Developer Account

1. Sign up: https://developer.apple.com/programs/
2. Cost: $99/year
3. Required for MusicKit API access

### Step 2: Generate Developer Token (JWT)

1. Go to: https://developer.apple.com/account/resources/identifiers/list
2. Create a **MusicKit identifier**
3. Generate a **private key** (download and save securely)
4. Create JWT token using:
   - Your Team ID
   - Key ID
   - Private key file
5. See detailed guide: https://developer.apple.com/documentation/applemusicapi/getting_keys_and_creating_tokens

### Step 3: Get User Token (OAuth)

1. Implement OAuth flow for user authentication
2. User must authorize your app
3. Get Music User Token from OAuth response

### Step 4: Add to `.env` File

Simply add these lines to your `.env` file:

```bash
# Apple Music Configuration
APPLE_MUSIC_DEVELOPER_TOKEN=your_jwt_developer_token_here
APPLE_MUSIC_USER_TOKEN=your_user_token_here
APPLE_MUSIC_MUSIC_USER_TOKEN=your_music_user_token_here
APPLE_MUSIC_STOREFRONT=us  # Change to your country code (us, gb, jp, etc.)
APPLE_MUSIC_AGENT_PORT=3013
```

### Step 5: Restart Jarvis

After adding credentials, restart Jarvis:

```bash
npm start
```

The Apple Music agent will automatically detect the credentials and become fully functional!

## Current Behavior (Without Credentials)

- ✅ Agent is **registered** with orchestrator
- ✅ Agent shows **helpful warnings** about missing credentials
- ✅ Agent **won't break** your system
- ✅ Other agents work normally
- ⚠️ Apple Music actions will return errors (expected)

## Capabilities (When Enabled)

Once credentials are added, the Apple Music agent provides:

- 🔍 **Search** - Search Apple Music catalog
- 📋 **Playlists** - Get, create, and manage playlists
- 🎵 **Library** - Access user's music library
- 📊 **Recently Played** - Get recently played tracks
- 💡 **Recommendations** - Get music recommendations
- ⏯️ **Playback Info** - Get currently playing info (requires MusicKit JS)

## Notes

- **Playback control** requires MusicKit JS (browser) or native app integration
- Server-side API is primarily for **catalog search** and **library management**
- For full playback control, you'd need to integrate MusicKit JS in a web interface
- The agent is **already integrated** - just add credentials when ready!

## Quick Reference

**Agent ID:** `AppleMusic`  
**Port:** `3013`  
**Status:** Registered (waiting for credentials)  
**Documentation:** See `CREATIVE_APIS_SETUP.md` for full details
