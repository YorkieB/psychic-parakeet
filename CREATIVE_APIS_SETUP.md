# Creative APIs Setup Guide

## Overview

Jarvis now includes 5 powerful creative agents:
1. **Music Agent** - Generate original music with Suno AI
2. **Image Agent** - Create images with DALL-E 3
3. **Video Agent** - Generate videos with Runway Gen-3
4. **Spotify Agent** - Full control over Spotify playback
5. **Apple Music Agent** - Full control over Apple Music playback (alternative to Spotify)

## Prerequisites

### 1. Suno API (Music Generation)
- Sign up: https://aimlapi.com/suno-ai-api
- Get API key from dashboard
- Cost: ~$0.10-0.50 per song

### 2. DALL-E 3 (Image Generation)
- Already using OpenAI API
- No additional setup needed
- Cost: ~$0.04-0.12 per image

### 3. Runway Gen-3 (Video Generation)
- Sign up: https://runwayml.com/
- Get API key from dashboard
- Cost: ~$0.75/second of video

### 4. Spotify API (Music Control)
**⚠️ IMPORTANT:** Spotify is currently **not accepting new developer app registrations**. However, you can still use Spotify control if you have:

**Option A: Existing Spotify App Credentials**
- If you already have a Spotify app registered, use those credentials
- Get Client ID and Secret from: https://developer.spotify.com/dashboard
- Free to use (requires Premium account for playback)

**Option B: Use Existing Access Tokens**
- If you have access tokens from an existing app, you can use them directly
- Tokens can be refreshed using the refresh token

**Option C: Manual Token Generation (Advanced)**
- Use an existing Spotify app's credentials
- Generate tokens manually using OAuth flow
- Add tokens to `.env` file

**Note:** Without credentials, the Spotify agent will still register but will show a warning. You can add credentials later when available.

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:

```bash
# Music Generation
SUNO_API_KEY=your_suno_api_key_here

# Image Generation (using existing OpenAI key)
# OPENAI_API_KEY=already_configured

# Video Generation
RUNWAY_API_KEY=your_runway_api_key_here

# Spotify
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:8888/callback
SPOTIFY_ACCESS_TOKEN=your_access_token_after_auth
SPOTIFY_REFRESH_TOKEN=your_refresh_token_after_auth

# Apple Music (Alternative to Spotify)
APPLE_MUSIC_DEVELOPER_TOKEN=your_jwt_developer_token
APPLE_MUSIC_USER_TOKEN=your_user_token
APPLE_MUSIC_MUSIC_USER_TOKEN=your_music_user_token
APPLE_MUSIC_STOREFRONT=us
APPLE_MUSIC_AGENT_PORT=3013
```

## Spotify Authentication

### ⚠️ Current Limitation
Spotify is **not accepting new developer app registrations** at this time. If you don't have existing credentials, the Spotify agent will register but show a warning. You can still use other agents (Music, Image, Video) without Spotify.

### If You Have Existing Spotify App Credentials:

#### One-Time Setup:

1. **Use your existing Spotify app** from https://developer.spotify.com/dashboard

2. **Ensure redirect URI is set**: `http://localhost:8888/callback`

3. **Get authorization code**:
   - Visit this URL (replace `YOUR_CLIENT_ID`):
   ```
   https://accounts.spotify.com/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost:8888/callback&scope=user-read-playback-state%20user-modify-playback-state%20user-read-currently-playing%20playlist-modify-public%20playlist-modify-private
   ```
   - Authorize the app
   - Copy the `code` from the redirect URL

4. **Exchange code for tokens**:
   ```bash
   curl -X POST "https://accounts.spotify.com/api/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code&code=YOUR_CODE&redirect_uri=http://localhost:8888/callback&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"
   ```

5. **Add tokens to `.env`**:
   ```bash
   SPOTIFY_ACCESS_TOKEN=your_access_token
   SPOTIFY_REFRESH_TOKEN=your_refresh_token
   ```

### Alternative: Using Existing Tokens

If you already have valid Spotify access tokens from another application:

1. **Add to `.env`**:
   ```bash
   SPOTIFY_CLIENT_ID=your_existing_client_id
   SPOTIFY_CLIENT_SECRET=your_existing_client_secret
   SPOTIFY_ACCESS_TOKEN=your_existing_access_token
   SPOTIFY_REFRESH_TOKEN=your_existing_refresh_token
   ```

2. **The agent will automatically refresh tokens** when they expire

### Without Spotify Credentials

The Spotify agent will:
- ✅ Still register with the orchestrator
- ⚠️ Show a warning that credentials are missing
- ❌ Return errors when Spotify actions are requested
- 💡 Allow you to add credentials later without restarting

**All other agents (Music, Image, Video) work independently and don't require Spotify.**

### 5. Apple Music API (Music Control - Alternative to Spotify)

**✅ Apple Music is accepting new developer registrations!**

Apple Music provides an alternative to Spotify with similar capabilities. However, it requires:
- **Apple Developer account** ($99/year)
- **MusicKit authorization**
- **Developer token (JWT)** - Generated from your Apple Developer account
- **User token** - From OAuth authentication

#### Setup Steps:

1. **Create Apple Developer Account**
   - Sign up: https://developer.apple.com/programs/
   - Cost: $99/year
   - Required for MusicKit API access

2. **Generate Developer Token (JWT)**
   - Go to: https://developer.apple.com/account/resources/identifiers/list
   - Create a MusicKit identifier
   - Generate a private key
   - Create JWT token using your Team ID, Key ID, and private key
   - See: https://developer.apple.com/documentation/applemusicapi/getting_keys_and_creating_tokens

3. **Get User Token (OAuth)**
   - Implement OAuth flow for user authentication
   - User must authorize your app
   - Get Music User Token from OAuth response

4. **Add to `.env`**:
   ```bash
   # Apple Music
   APPLE_MUSIC_DEVELOPER_TOKEN=your_jwt_developer_token
   APPLE_MUSIC_USER_TOKEN=your_user_token
   APPLE_MUSIC_MUSIC_USER_TOKEN=your_music_user_token
   APPLE_MUSIC_STOREFRONT=us  # or your country code (us, gb, jp, etc.)
   APPLE_MUSIC_AGENT_PORT=3013
   ```

#### Apple Music vs Spotify:

| Feature | Apple Music | Spotify |
|---------|-------------|---------|
| New Registrations | ✅ Accepting | ❌ Not accepting |
| Developer Cost | $99/year | Free |
| API Access | MusicKit API | Web API |
| Playback Control | Requires MusicKit JS | Direct API control |
| Search | ✅ Full catalog | ✅ Full catalog |
| Playlists | ✅ User library | ✅ User library |

**Note:** Apple Music API has some limitations:
- Playback control requires MusicKit JS (browser) or native app integration
- Server-side API is primarily for catalog search and library management
- For full playback control, you'd need to integrate MusicKit JS in a web interface

## Usage Examples

### Music Generation:
```
User: "Jarvis, create a rock song about relationship breakup"

Jarvis: "I'd be happy to! A few questions:
  • Male or female vocals?
  • Aggressive or melancholic rock?
  • With lyrics or instrumental?"

User: "Female vocals, melancholic, with lyrics"

Jarvis: "Generating... [30 seconds]
  ✅ Song created: 'Fading Echoes'
  🎵 Playing now..."
```

### Image Generation:
```
User: "Generate an image of a cyberpunk city"

Jarvis: "Generating... [10 seconds]
  ✅ Image created: output/images/image_1234.png
  [Opens image]"
```

### Video Generation:
```
User: "Create a 4-second video of waves crashing"

Jarvis: "Generating... This will take ~2 minutes
  [Progress: 50%]
  [Progress: 100%]
  ✅ Video ready: output/videos/video_1234.mp4"
```

### Spotify Control:
```
User: "Play some jazz music"

Jarvis: "Playing: 'Take Five' by Dave Brubeck"

User: "Skip"

Jarvis: "Skipped. Now playing: 'So What' by Miles Davis"

User: "Create a playlist called 'Work Focus' with calm music"

Jarvis: "✅ Created 'Work Focus' playlist with 15 tracks"
```

## Costs

| Service | Cost | Monthly (moderate use) |
|---------|------|------------------------|
| Suno | $0.30/song | 20 songs = $6 |
| DALL-E 3 | $0.08/image | 100 images = $8 |
| Runway | $3/4s video | 5 videos = $15 |
| Spotify | Free | $0 |
| **TOTAL** | - | **~$29/month** |

## Troubleshooting

### Music generation fails:
- Check `SUNO_API_KEY` is set
- Verify API quota
- Reduce song duration

### Image generation fails:
- Check `OPENAI_API_KEY` is set
- Verify billing enabled
- Simplify prompt

### Video generation slow:
- Normal (30s per 1s of video)
- Check Runway API status
- Reduce video duration

### Spotify not responding:
- Refresh access token
- Check Spotify is open on a device
- Verify Premium account

## Agent Ports

- Music Agent: 3009
- Image Agent: 3010
- Video Agent: 3011
- Spotify Agent: 3012

## Output Directories

- Music: `./output/music/`
- Images: `./output/images/`
- Videos: `./output/videos/`
