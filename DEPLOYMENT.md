# 🚀 Deployment Guide

## Prerequisites

1. **Install Git**
   - Download: https://git-scm.com/download/win
   - Install with default settings

2. **Create GitHub Account**
   - Sign up at: https://github.com

3. **Create Vercel Account**
   - Sign up at: https://vercel.com (use GitHub to login)

## Step 1: Setup Git Repository

Open CMD or PowerShell in project folder and run:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit - NutriFit Bangla"
```

## Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `nutrifit-bangla` (or your choice)
3. Keep it **Public** (for free deployment)
4. **DON'T** initialize with README (we already have one)
5. Click "Create repository"

## Step 3: Push to GitHub

GitHub will show you commands. Run in your CMD:

```bash
# Add GitHub remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/nutrifit-bangla.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 4: Deploy to Vercel

### Option A: Using Vercel Website (Easier)

1. Go to https://vercel.com/new
2. Click "Import Project"
3. Select your GitHub repository
4. Vercel will auto-detect settings
5. Add Environment Variables:
   ```
   SUPABASE_PROJECT_ID=furqitxdaozjsdfbaayh
   SUPABASE_PUBLISHABLE_KEY=sb_publishable_jundI1VGE3RrFJP_49BysQ_eujtlIvP
   SUPABASE_URL=https://furqitxdaozjsdfbaayh.supabase.co
   VITE_SUPABASE_PROJECT_ID=furqitxdaozjsdfbaayh
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_jundI1VGE3RrFJP_49BysQ_eujtlIvP
   VITE_SUPABASE_URL=https://furqitxdaozjsdfbaayh.supabase.co
   LOVABLE_API_KEY=your-lovable-api-key-here
   ```
6. Click "Deploy"
7. Wait 2-3 minutes ⏳
8. Your app is live! 🎉

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts and add environment variables
```

## Step 5: Build Android APK

### Method 1: GitHub Actions (Automatic - Recommended)

1. Push code to GitHub (already done in Step 3)
2. Go to your repository → Actions tab
3. Click "Build Android APK" workflow
4. Click "Run workflow" → "Run workflow"
5. Wait 5-10 minutes for build to complete
6. Download APK from "Artifacts" section

### Method 2: Local Build (Manual)

**Prerequisites:**
- Android Studio installed
- Java JDK 17 or 21

**Steps:**

1. Install dependencies:
```bash
npm install
```

2. Build web app:
```bash
npm run build
```

3. Sync Capacitor:
```bash
npx cap sync android
```

4. Open Android Studio:
```bash
npx cap open android
```

5. In Android Studio:
   - Wait for Gradle sync
   - Build → Build Bundle(s) / APK(s) → Build APK(s)
   - APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

## Step 6: Update capacitor.config.ts

After Vercel deployment, update the server URL in `capacitor.config.ts`:

```typescript
server: {
  url: 'https://your-app-name.vercel.app', // Replace with your Vercel URL
  cleartext: true,
},
```

Then rebuild APK (repeat Step 5).

## Troubleshooting

### "git is not recognized"
- Install Git from https://git-scm.com/download/win
- Restart CMD/PowerShell after installation

### "npm install fails"
- Make sure Node.js is installed: https://nodejs.org
- Try deleting `node_modules` folder and `package-lock.json`
- Run `npm install` again

### "Build fails on Vercel"
- Check environment variables are correctly added
- Check build logs in Vercel dashboard
- Make sure `.env` is in `.gitignore` (don't push secrets!)

### "APK build fails"
- Make sure Java JDK 17+ is installed
- Check Android SDK is installed in Android Studio
- Run `./gradlew clean` in android folder then rebuild

## After Deployment

✅ Web App: `https://your-app.vercel.app`
✅ Android APK: Download from GitHub Actions artifacts
✅ Auto-deploys: Every push to `main` branch

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Capacitor Docs: https://capacitorjs.com/docs
- GitHub Issues: Create an issue in your repository

---

Happy Deploying! 🚀
