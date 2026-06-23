# NutriFit Bangla 🥗💪

Personalized Bangladeshi diet & fitness plans powered by AI.

## Features

- 🎯 **Smart BMI & Calorie Calculator** - Mifflin-St Jeor formula
- 🍛 **Bangladeshi Meal Plans** - Rice, roti, fish, daal with budget options
- 💪 **Home & Gym Workouts** - 2-6 day routines
- 💧 **Water Tracking** - Daily hydration goals
- 📝 **Meal Logging** - Track calories vs targets
- 🤖 **AI Coach** - Bangla/English support with vision capabilities
- 📱 **Progressive Web App** - Install on mobile devices
- 🤖 **Android App** - Native mobile experience

## Tech Stack

- **Framework:** TanStack Start (React)
- **Styling:** Tailwind CSS v4
- **Backend:** Supabase (Auth + Database)
- **AI:** Lovable AI Gateway (Gemini)
- **Mobile:** Capacitor for Android
- **UI Components:** Radix UI + shadcn

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd my-smart-diet-main
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your:
- Supabase credentials
- Lovable AI API key

4. Run development server:
```bash
npm run dev
```

Visit `http://localhost:5173`

## Deployment

### Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables from `.env`
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Build for Production

```bash
npm run build
```

## Building Android APK

### Prerequisites

- Android Studio installed
- Java JDK 17+

### Steps

1. Build the web app:
```bash
npm run build
```

2. Sync Capacitor:
```bash
npx cap sync android
```

3. Open in Android Studio:
```bash
npx cap open android
```

4. Build APK:
   - In Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)
   - APK will be in `android/app/build/outputs/apk/`

### Or use GitHub Actions

The project includes a workflow (`.github/workflows/build-android.yml`) for automatic APK builds.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase anonymous key |
| `LOVABLE_API_KEY` | Lovable AI API key for coach features |

## Project Structure

```
src/
├── components/       # Reusable UI components
├── routes/          # TanStack Router pages
├── lib/             # Utilities and helpers
├── integrations/    # Supabase integration
└── hooks/           # Custom React hooks
```

## Features in Detail

### AI Coach
- Daily personalized insights
- Weekly progress reports  
- Recipe generation from ingredients
- Meal photo analysis with vision AI

### Authentication
- Email/Password sign-up
- Google OAuth
- Powered by Supabase Auth

### Offline Support
- PWA with service worker
- Works without internet (limited features)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use for personal or commercial projects.

## Support

For issues or questions, please open an issue on GitHub.

---

Made with ❤️ for Bangladesh 🇧🇩
