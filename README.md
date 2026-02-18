# CareerPal | Your Friendly Career Sidekick

> An AI-powered career assistant built with React, TypeScript, and Google's Gemini API

**🎉 Ready to use immediately!** This app includes an embedded API key - just visit the deployed site and start using all features right away.

## ⚠️ Important for App Owner

> [!CAUTION]
> **You are providing your paid API key to all users.** To prevent abuse and unexpected costs, you MUST configure API restrictions in Google Cloud Console before deploying. See [API_SETUP.md](API_SETUP.md) for detailed instructions.

## 🚀 For Users

Simply visit the deployed application and start using it - no setup required!

**Features available:**
- **Resume Helper**: AI-powered resume editing and optimization
- **Picture Pal**: Generate professional portfolio images
- **Interview Practice**: Prepare for interviews with AI coaching
- **Deep Thoughts Mode**: Advanced strategic career analysis

## 🔧 For Developers / Contributors

### Prerequisites
- Node.js 18+ ([Download](https://nodejs.org/))

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd "Career pal"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up your API key** (for local development)
   ```bash
   # Copy the environment template
   cp .env.example .env.local
   
   # Add your Gemini API key to .env.local
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📦 Deployment

### Option 1: GitHub Actions (Recommended)

This repository includes automated deployment via GitHub Actions:

1. **Set up GitHub Secret**
   - Go to your repository → Settings → Secrets and variables → Actions
   - Create new secret: `GEMINI_API_KEY`
   - Paste your API key value

2. **Enable GitHub Pages**
   - Settings → Pages → Source: "GitHub Actions"

3. **Push to main branch**
   - GitHub Actions will automatically build and deploy

### Option 2: Manual Deployment

```bash
# Build with your API key
npm run build

# Deploy the dist/ folder to your hosting service
```

## 🔐 Security & API Management

### Required: Configure API Restrictions

**Before deploying publicly**, secure your API key:

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Select your Gemini API key
3. Configure restrictions:
   - **Application restrictions**: HTTP referrers
   - **Website restrictions**: Add your deployment domain(s)
     ```
     yourusername.github.io/*
     your-custom-domain.com/*
     ```
   - **API restrictions**: Gemini API only
4. Set **usage quotas** to prevent unexpected charges
5. Enable **billing alerts**

📖 **Full setup guide**: See [API_SETUP.md](API_SETUP.md)

### Monitoring Usage

- Check [Google Cloud Console](https://console.cloud.google.com) regularly
- Monitor API usage and costs
- Adjust quotas as needed

## 🧰 Tech Stack

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **AI**: Google Gemini 3 Flash & Pro
- **Storage**: IndexedDB

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🤝 Contributing

Contributions welcome! Please fork the repository and submit a pull request.

## 📄 License

Open source under the MIT License.

---

**Questions?** See [API_SETUP.md](API_SETUP.md) or open an issue on GitHub.
