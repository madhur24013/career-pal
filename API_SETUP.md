# API Setup & Security Guide

## Overview

This application uses a **shared API key** approach - the owner provides their paid Gemini API key, which is embedded in the deployed application. This allows anyone to use the app immediately without needing their own API key.

## ⚠️ Critical: API Key Restrictions

> [!CAUTION]
> Your API key will be publicly visible in the browser's JavaScript bundle. To prevent abuse and unexpected costs, you **MUST** configure proper restrictions before deploying.

## Step-by-Step Setup

### 1. Access Google Cloud Console

Go to [Google Cloud Console → API Credentials](https://console.cloud.google.com/apis/credentials)

### 2. Configure HTTP Referrer Restrictions

**This is the most important security measure.**

1. Click on your Gemini API key
2. Under **Application restrictions**, select **HTTP referrers (web sites)**
3. Click **Add an item**
4. Add your deployment domain(s):

```
# For GitHub Pages
yourusername.github.io/*

# For custom domain
your-custom-domain.com/*

# For local development (optional)
localhost:3000/*
127.0.0.1:3000/*
```

5. Click **Done**, then **Save**

**Why this matters**: The API key will ONLY work on domains you specify. Anyone who extracts the key from your code cannot use it on their own domain.

### 3. Restrict to Gemini API Only

1. Under **API restrictions**, select **Restrict key**
2. Choose **Generative Language API** (Gemini)
3. Click **Save**

**Why this matters**: Prevents misuse of your key for other Google services.

### 4. Set Usage Quotas

1. Go to [Quotas & System Limits](https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas)
2. Set appropriate limits:
   - **Requests per day**: Start with 1,000-10,000 (adjust based on traffic)
   - **Requests per minute**: 60 (prevents single-user abuse)

**Why this matters**: Prevents runaway costs from excessive usage.

### 5. Enable Billing Alerts

1. Go to [Billing → Budgets & alerts](https://console.cloud.google.com/billing/budgets)
2. Create a new budget
3. Set alert thresholds:
   - 50% of budget
   - 90% of budget
   - 100% of budget
4. Add your email for notifications

**Why this matters**: You'll be notified before costs become excessive.

## Deployment Options

### Option A: GitHub Actions (Recommended)

**Advantages:**
- API key stored securely as GitHub Secret
- Automatic builds on every push
- Never expose key in repository

**Setup:**

1. **Create GitHub Secret**
   - Repository → Settings → Secrets and variables → Actions
   - New repository secret
   - Name: `GEMINI_API_KEY`
   - Value: Your API key
   - Save

2. **Verify workflow exists**
   - Check `.github/workflows/deploy.yml` exists in your repository
   - If not, the workflow file will be created for you

3. **Enable GitHub Pages**
   - Settings → Pages
   - Source: "GitHub Actions"
   - Save

4. **Push to main branch**
   ```bash
   git add .
   git commit -m "Deploy with GitHub Actions"
   git push origin main
   ```

5. **Check deployment**
   - Go to Actions tab
   - Watch the build process
   - Once complete, visit your GitHub Pages URL

### Option B: Manual Deployment

**Advantages:**
- Simple and direct
- Full control over build process

**Setup:**

1. **Build locally with your API key**
   ```bash
   # Ensure .env.local has your API key
   npm run build
   ```

2. **Deploy the dist folder**
   - GitHub Pages: Push `dist` folder to `gh-pages` branch
   - Vercel: `vercel --prod`
   - Netlify: Drag and drop `dist` folder

## Monitoring & Maintenance

### Daily Checks (First Week)

1. **Check API usage**
   - [Google Cloud Console → APIs & Services → Dashboard](https://console.cloud.google.com/apis/dashboard)
   - Look for unusual spikes

2. **Review costs**
   - [Billing → Reports](https://console.cloud.google.com/billing/reports)
   - Ensure costs are within expected range

### Weekly Checks (Ongoing)

- Monitor usage trends
- Adjust quotas if needed
- Check for any quota exceeded errors

## What If...?

### Quota is Exceeded

**Symptom**: Users see error messages in the app

**Solutions:**
1. **Increase quota** in Google Cloud Console
2. **Wait for quota reset** (usually 24 hours for daily quotas)
3. **Implement client-side caching** to reduce API calls

### Unexpected High Costs

**Immediate actions:**
1. **Lower quotas** in Google Cloud Console
2. **Check domain restrictions** are properly configured
3. **Review usage logs** for abuse patterns
4. **Rotate your API key** if compromise suspected

### Key is Compromised

**If someone is using your key on unauthorized domains:**

1. **Verify domain restrictions** are active
2. **Create a new API key** with proper restrictions
3. **Update GitHub Secret** (if using GitHub Actions)
4. **Rebuild and redeploy** the application
5. **Delete the old key** in Google Cloud Console

## Best Practices

✅ **Always** configure domain restrictions before first deployment  
✅ **Set** conservative quotas initially, increase as needed  
✅ **Enable** billing alerts  
✅ **Monitor** usage regularly  
✅ **Document** your deployment URL in restrictions  
✅ **Test** restrictions work (try using key from different domain)

❌ **Never** disable domain restrictions  
❌ **Never** commit API keys to repository  
❌ **Never** share your API key directly with users  
❌ **Never** skip quota configuration

## Support

- **Google Cloud Help**: [Support Portal](https://cloud.google.com/support)
- **Billing Issues**: [Billing Support](https://console.cloud.google.com/billing)
- **API Documentation**: [Gemini API Docs](https://ai.google.dev/docs)

---

**Remember**: Proper configuration of domain restrictions and quotas is essential to prevent abuse and unexpected costs. Take the time to set this up correctly before deploying publicly.
