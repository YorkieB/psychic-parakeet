# Real API Integration Setup Guide (UK)

## Overview

This guide sets up real integrations for:
- 📧 **Gmail** (your real inbox)
- 📅 **Google Calendar** (your real calendar)
- 💰 **Plaid UK** (your real UK bank accounts - Revolut, Starling, etc.)

All integrations use OAuth2 authentication and are production-ready with error handling and UK-specific support.

---

## Prerequisites

1. **Google Account** (for Gmail + Calendar)
2. **UK Bank Account** (Revolut, Starling, Monzo, or 500+ others)
3. **Plaid Account** (free for development)

---

## Part 1: Google APIs Setup (Gmail + Calendar)

### Step 1: Create Google Cloud Project

1. Go to: https://console.cloud.google.com/
2. Click **"Create Project"**
3. Name: **"Jarvis AI Assistant"**
4. Click **"Create"**

### Step 2: Enable APIs

1. In project dashboard, click **"Enable APIs and Services"**
2. Search for **"Gmail API"** → **Enable**
3. Search for **"Google Calendar API"** → **Enable**

### Step 3: Create OAuth2 Credentials

1. Go to: **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. **Configure consent screen**:
   - App name: `Jarvis AI Assistant`
   - Support email: `your-email@gmail.com`
   - Scopes: Gmail (read, send, modify), Calendar (all)
4. **Create OAuth client**:
   - Application type: **Desktop app**
   - Name: `Jarvis Desktop`
5. **Download credentials JSON** (optional, for reference)
6. **Copy Client ID and Client Secret** to `.env`:

```bash
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
```

### Step 4: Authenticate

```bash
npm run auth:google
```

**Follow prompts:**
1. Open URL in browser
2. Sign in with Google
3. Grant permissions (Gmail + Calendar)
4. Copy authorization code from URL
5. Paste into terminal

✅ **Gmail and Calendar now connected!**

---

## Part 2: Plaid UK Setup (Bank Accounts)

### Step 1: Create Plaid Account

1. Go to: https://dashboard.plaid.com/signup
2. Sign up (free for development)
3. Select **"UK"** as region
4. Complete verification

### Step 2: Get API Keys

1. **Dashboard** → **Team Settings** → **Keys**
2. Copy:
   - **Client ID**
   - **Sandbox secret** (for testing)
   - **Development secret** (for real banks)

3. Add to `.env`:

```bash
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_sandbox_secret
PLAID_ENV=sandbox  # Use 'development' for real banks
PLAID_WEBHOOK_URL=https://your-domain.com/webhooks/plaid  # Optional
```

### Step 3: Connect Bank (Sandbox Testing)

```bash
npm run connect:bank
```

**Follow prompts:**
1. Link token created
2. Open Plaid Link (in production, this opens automatically)
3. For sandbox testing:
   - Username: `user_good`
   - Password: `pass_good`
   - Select any UK bank
4. ✅ **Sandbox bank connected!**

### Step 4: Connect Real Bank (Production)

1. Change `.env`: `PLAID_ENV=development`
2. Use **development secret** from Plaid dashboard
3. Run: `npm run connect:bank`
4. Select real bank:
   - **Revolut** (UK accounts, multi-currency)
   - **Starling Bank** (UK challenger bank)
   - **Monzo** (UK digital bank)
   - Or any of **500+ UK banks**
5. Authenticate with your bank
6. Grant read-only access
7. ✅ **Real bank connected!**

---

## Part 3: Testing

### Test Gmail:

```bash
npm start
```

**Try:**
```
User: "Show me unread emails"
Jarvis: [Lists real unread emails from your Gmail]

User: "Send email to john@example.com subject 'Hello' body 'Test'"
Jarvis: [Sends real email]
```

### Test Calendar:

```
User: "What's my schedule today?"
Jarvis: [Shows real events from Google Calendar]

User: "Create meeting tomorrow at 2 PM called Budget Review"
Jarvis: [Creates real event in your calendar]
```

### Test Finance (Sandbox):

```
User: "How much did I spend this month?"
Jarvis: [Shows real transactions from connected bank]

User: "Show me all grocery transactions"
Jarvis: [Lists Tesco, Sainsbury's, etc. purchases]
```

---

## UK-Specific Features

### Multi-Currency (Revolut):

```
User: "What's my balance?"
Jarvis: "Your Revolut balances:
  • £2,847.52 GBP
  • €1,250.30 EUR
  • $450.00 USD
  Total in GBP: £3,956.21"
```

### UK Merchants:

Jarvis recognizes UK merchants:
- **Tesco, Sainsbury's, Asda** → Groceries
- **TfL, Oyster** → Transportation
- **Pret, Costa** → Dining
- **Boots, Superdrug** → Shopping

### Faster Payments:

UK transactions appear in **real-time** (not delayed like US ACH).

---

## Security & Privacy

### Gmail & Calendar:
- ✅ OAuth2 (no passwords stored)
- ✅ Granular permissions
- ✅ Revokable access
- ✅ Google-managed security

### Plaid UK (Open Banking):
- ✅ Bank credentials **NEVER** go to Jarvis
- ✅ FCA-regulated
- ✅ Read-only access (cannot transfer money)
- ✅ Bank-level encryption (256-bit)
- ✅ SOC 2 Type II certified

### Data Storage:
- ✅ Tokens encrypted on disk
- ✅ No transaction data stored (fetched live)
- ✅ Config files in `.gitignore`

---

## Costs

| Service | Cost | Notes |
|---------|------|-------|
| Gmail API | **FREE** | 1 billion requests/day |
| Calendar API | **FREE** | 1 million requests/day |
| Plaid Sandbox | **FREE** | Unlimited testing |
| Plaid Development | **FREE** | 100 users |
| Plaid Production | £0.20-0.50/user/month | Volume discounts |

**Total for personal use: £0/month** ✅

---

## Troubleshooting

### Gmail not working:
- ✅ Check credentials in `.env`
- ✅ Re-run `npm run auth:google`
- ✅ Check Gmail API enabled in Cloud Console

### Calendar not showing events:
- ✅ Same OAuth token as Gmail (should work together)
- ✅ Check Calendar API enabled
- ✅ Verify UK timezone (Europe/London)

### Plaid connection failed:
- ✅ Check `PLAID_CLIENT_ID` and `PLAID_SECRET`
- ✅ Verify environment (sandbox/development)
- ✅ For real banks: use development environment
- ✅ Revolut/Starling: ensure UK accounts

### No transactions:
- ✅ Check date range (last 2 years available)
- ✅ Verify bank connection (run health check)
- ✅ For Revolut: transactions may take 1-2 min to appear

---

## Next Steps

✅ **All 3 agents now use REAL data!**

Test complete workflows:
- Morning briefing (email + calendar + finance)
- Create calendar event from email
- Track spending with receipt matching
- Multi-modal queries across agents

---

## File Structure

```
src/
  services/
    gmail-service.ts          # Real Gmail API integration
    calendar-service.ts       # Real Google Calendar integration
    plaid-service-uk.ts       # Real UK bank integration
  agents/
    email-agent.ts            # Updated to use GmailService
    calendar-agent.ts         # Updated to use CalendarService
    finance-agent.ts          # Updated to use PlaidServiceUK
scripts/
  auth-google.ts              # Google OAuth authentication
  connect-bank.ts             # Plaid bank connection
config/
  gmail-token.json           # Saved Gmail OAuth token
  calendar-token.json        # Saved Calendar OAuth token
  plaid-tokens.json          # Saved Plaid access tokens
```

---

## Environment Variables

Add to `.env`:

```bash
# Google APIs (Gmail + Calendar)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback

# Plaid UK (Open Banking)
PLAID_CLIENT_ID=your_plaid_client_id_here
PLAID_SECRET=your_plaid_secret_here
PLAID_ENV=sandbox  # or 'development' or 'production'
PLAID_WEBHOOK_URL=https://your-domain.com/webhooks/plaid  # Optional
```

---

## Installation

1. **Install dependencies:**
```bash
npm install googleapis google-auth-library plaid
```

2. **Add credentials to `.env`** (see above)

3. **Authenticate:**
```bash
npm run auth:google      # Gmail + Calendar
npm run connect:bank     # Plaid UK
```

4. **Test:**
```bash
npm start
# Try: "Show me unread emails"
# Try: "What's my schedule today?"
# Try: "How much did I spend this month?"
```

---

## Expected Behavior

✅ **Email Agent**: Shows REAL emails from your Gmail inbox  
✅ **Calendar Agent**: Shows REAL events from Google Calendar  
✅ **Finance Agent**: Shows REAL transactions from UK bank (Revolut, Starling, etc.)

**All data is LIVE and updates in real-time!**
