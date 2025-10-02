# Google Gemini 2.5 Flash OAuth2 Setup Guide

## Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** or select existing one
3. **Enable APIs**:
   - Go to "APIs & Services" > "Library"
   - Search for "Generative Language API"
   - Click "Enable"

## Step 2: Create Service Account

1. **Go to IAM & Admin** > **Service Accounts**
2. **Click "Create Service Account"**
3. **Fill details**:
   - Name: `gemini-coach-service`
   - Description: `Service account for Gemini AI Coach`
4. **Grant roles**:
   - `Generative AI User`
   - `AI Platform User` (if available)
5. **Click "Done"**

## Step 3: Generate Service Account Key

1. **Click on your service account**
2. **Go to "Keys" tab**
3. **Click "Add Key" > "Create new key"**
4. **Select "JSON"** and download
5. **Copy the entire JSON content**

## Step 4: Update Environment Variables

Replace the `GOOGLE_SERVICE_ACCOUNT_KEY` in your `.env.local` with the JSON you downloaded:

```bash
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-actual-project-id",...}
```

**Important**: Make sure the JSON is on a single line and properly escaped.

## Step 5: Alternative API Key Method

If OAuth seems complex, you can still use API keys with `gemini-1.5-pro` or `gemini-1.5-flash`:

1. Go to https://aistudio.google.com/
2. Get API key (starts with `AIza`)
3. Update model name to `gemini-1.5-flash` in the code

## Current Implementation

The code now supports both methods:
- **OAuth2**: Uses service account for `gemini-2.5-flash`
- **API Key**: Fallback for other models

## Test Your Setup

1. Update your `.env.local` with real service account JSON
2. Restart your server: `npm run dev`
3. Try generating a coaching plan
4. Check console for auth method confirmation

## Troubleshooting

- Ensure JSON is properly formatted (no line breaks)
- Verify the service account has proper permissions
- Check that the Generative Language API is enabled
- Make sure the project ID matches your Google Cloud project

## Security Note

Never commit your service account JSON to version control!
Add `.env.local` to your `.gitignore` file.