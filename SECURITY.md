# Security Policy

## Shared API Key Approach

This application uses a **shared API key model** where the app owner provides their paid Gemini API key, which is embedded in the deployed application. This allows all users to access the app immediately without needing their own API key.

## For App Owner

### Critical Security Requirements

> [!CAUTION]
> Your API key is publicly visible in the JavaScript bundle. To prevent abuse and unexpected costs, you **MUST** configure the following security measures:

#### 1. HTTP Referrer Restrictions (CRITICAL)

Configure in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

- **Restrict key to specific domains**:
  ```
  yourusername.github.io/*
  your-custom-domain.com/*
  localhost:3000/*  (for development)
  ```

**This is your primary defense.** The API key will only function on domains you explicitly allow.

#### 2. API Restrictions

- Limit to **Generative Language API** (Gemini) only
- Prevents misuse for other Google services

#### 3. Usage Quotas

Set limits to prevent unexpected costs:
- **Daily requests**: 1,000-10,000 (adjust based on traffic)
- **Requests per minute**: 60 (prevents abuse)

#### 4. Billing Alerts

- Set up budget alerts at 50%, 90%, and 100% thresholds
- Add your email for notifications

📖 **Complete setup guide**: [API_SETUP.md](API_SETUP.md)

### Monitoring

**Daily (first week after deployment):**
- Check [API usage dashboard](https://console.cloud.google.com/apis/dashboard)
- Review costs in [billing reports](https://console.cloud.google.com/billing/reports)

**Weekly (ongoing):**
- Monitor usage trends
- Adjust quotas if needed
- Watch for quota exceeded errors

### Incident Response

**If quota is exceeded:**
1. Increase quota in Google Cloud Console
2. Optimize client-side caching to reduce calls
3. Consider implementing rate limiting

**If costs spike unexpectedly:**
1. Lower quotas immediately
2. Verify domain restrictions are active
3. Check usage logs for abuse patterns
4. Rotate API key if necessary

**If key is compromised:**
1. Create new API key with restrictions
2. Update GitHub Secret (if using GitHub Actions)
3. Redeploy application
4. Delete old key

## For Users

This app works immediately - no API key setup required! The app owner has provided access to the AI features.

**Privacy note**: Your conversations and data are processed by Google's Gemini API according to their [privacy policy](https://policies.google.com/privacy).

## Technical Architecture

### Why Client-Side Exposure is Unavoidable

This is a **single-page application (SPA)** that runs entirely in the browser. Any API key used must be included in the JavaScript bundle and is therefore accessible to anyone who:
- Views page source
- Inspects network requests
- Downloads the JavaScript bundle

### Why This Approach is Acceptable

With proper domain restrictions:
- ✅ API key only works on authorized domains
- ✅ Usage quotas prevent runaway costs
- ✅ Billing alerts provide early warning
- ✅ Key can be rotated if compromised

### Alternative for Higher Security

For production applications requiring stricter security, consider:

1. **Backend proxy server**
   - API keys stored server-side
   - Frontend calls your backend
   - Backend calls Gemini API
   - Enables authentication and rate limiting

2. **Serverless functions**
   - Use Vercel, Netlify, or AWS Lambda
   - API keys as environment variables
   - Function-level authentication

## Reporting Issues

If you discover a security vulnerability or observe abuse:

1. **For users**: Contact the app owner (repository maintainer)
2. **For owner**: Review [API_SETUP.md](API_SETUP.md) troubleshooting section

## Best Practices Summary

✅ Configure domain restrictions before first deployment  
✅ Set conservative quotas initially  
✅ Enable billing alerts  
✅ Monitor usage regularly  
✅ Test that restrictions work  

❌ Never disable domain restrictions  
❌ Never commit API keys to repository  
❌ Never skip quota configuration  

---

**Need help?** See [API_SETUP.md](API_SETUP.md) for detailed configuration instructions.
