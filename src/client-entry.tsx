import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/lib/theme';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { Dumbbell, Home, MessageCircle, User, Utensils, Droplet, Apple, Plus } from 'lucide-react';
import './styles.css';

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">NutriFit Bangla</h1>
          <p className="text-muted-foreground">AI Diet & Fitness Planner</p>
        </div>
        
        <div className="surface-card p-6 space-y-4">
          <div className="text-left space-y-2">
            <h2 className="text-xl font-semibold">Welcome! 🎉</h2>
            <p className="text-sm text-muted-foreground">
              Your personalized Bangladeshi diet, fitness & water tracking app with an AI coach.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="surface-card p-4">
              <div className="text-2xl font-bold text-primary">100%</div>
              <div className="text-muted-foreground">Local foods</div>
            </div>
            <div className="surface-card p-4">
              <div className="text-2xl font-bold text-primary">EN/বাং</div>
              <div className="text-muted-foreground">Bilingual</div>
            </div>
          </div>
          
          <button 
            onClick={onStart}
            className="w-full bg-primary text-primary-foreground px-4 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Get Started
          </button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} NutriFit Bangla
        </p>
      </div>
    </div>
  );
}

function MainApp() {
  const [activeTab, setActiveTab] = useState('home');
  const { lang, setLang } = useI18n();
  
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Dumbbell className="h-4 w-4" />
            </div>
            <span className="font-bold">NutriFit</span>
          </div>
          <div className="inline-flex items-center rounded-full border border-border bg-secondary p-0.5 text-xs">
            <button
              onClick={() => setLang("en")}
              className={`rounded-full px-2 py-1 transition-colors ${lang === "en" ? "bg-card shadow-sm" : ""}`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("bn")}
              className={`rounded-full px-2 py-1 transition-colors ${lang === "bn" ? "bg-card shadow-sm" : ""}`}
            >
              বাং
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 space-y-4">
        {activeTab === 'home' && <HomeTab lang={lang} />}
        {activeTab === 'meals' && <MealsTab lang={lang} />}
        {activeTab === 'ai' && <AITab lang={lang} />}
        {activeTab === 'profile' && <ProfileTab lang={lang} />}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background">
        <div className="grid grid-cols-4 gap-1 p-2">
          <NavButton 
            icon={<Home className="h-5 w-5" />} 
            label={lang === 'bn' ? 'হোম' : 'Home'}
            active={activeTab === 'home'}
            onClick={() => setActiveTab('home')}
          />
          <NavButton 
            icon={<Utensils className="h-5 w-5" />} 
            label={lang === 'bn' ? 'খাবার' : 'Meals'}
            active={activeTab === 'meals'}
            onClick={() => setActiveTab('meals')}
          />
          <NavButton 
            icon={<MessageCircle className="h-5 w-5" />} 
            label={lang === 'bn' ? 'AI কোচ' : 'AI Coach'}
            active={activeTab === 'ai'}
            onClick={() => setActiveTab('ai')}
          />
          <NavButton 
            icon={<User className="h-5 w-5" />} 
            label={lang === 'bn' ? 'প্রোফাইল' : 'Profile'}
            active={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
          />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition-colors ${
        active ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function HomeTab({ lang }: { lang: string }) {
  const [water, setWater] = useState(1200);
  const waterGoal = 2500;
  
  return (
    <div className="space-y-4">
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {lang === 'bn' ? 'আজকের সামারি' : 'Today\'s Summary'}
          </span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
            {lang === 'bn' ? 'ট্র্যাকে আছেন' : 'On track'}
          </span>
        </div>
        <div className="flex items-end gap-4">
          <div>
            <div className="text-4xl font-bold text-primary">1,640</div>
            <div className="text-sm text-muted-foreground">
              / 1,800 {lang === 'bn' ? 'ক্যালরি' : 'kcal'}
            </div>
          </div>
        </div>
      </div>

      {/* Water Tracker */}
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplet className="h-4 w-4 text-primary" />
            <span className="font-semibold">{lang === 'bn' ? 'পানি ট্র্যাকার' : 'Water Tracker'}</span>
          </div>
          <span className="text-sm text-muted-foreground">{water}ml / {waterGoal}ml</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setWater(Math.min(water + 250, waterGoal))}
            className="flex-1 bg-primary/10 text-primary px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            + 250ml
          </button>
          <button 
            onClick={() => setWater(Math.min(water + 500, waterGoal))}
            className="flex-1 bg-primary/10 text-primary px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            + 500ml
          </button>
        </div>
      </div>

      {/* Today's Meals */}
      <div className="surface-card p-4">
        <h3 className="font-semibold mb-3">{lang === 'bn' ? 'আজকের খাবার' : 'Today\'s Meals'}</h3>
        <div className="space-y-2">
          <MealItem time="08:00" name={lang === 'bn' ? 'রুটি + ডিম' : 'Roti + Egg'} kcal={420} />
          <MealItem time="13:30" name={lang === 'bn' ? 'ভাত + মাছ' : 'Rice + Fish'} kcal={680} />
          <MealItem time="19:30" name={lang === 'bn' ? 'রুটি + মুরগি' : 'Roti + Chicken'} kcal={540} />
        </div>
      </div>
    </div>
  );
}

function MealItem({ time, name, kcal }: any) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary">
      <Apple className="h-4 w-4 text-primary" />
      <div className="flex-1">
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{time}</div>
      </div>
      <div className="text-sm font-semibold">{kcal} kcal</div>
    </div>
  );
}

function MealsTab({ lang }: { lang: string }) {
  return (
    <div className="space-y-4">
      <div className="surface-card p-4">
        <h2 className="text-xl font-bold mb-2">{lang === 'bn' ? 'খাবার লগ করুন' : 'Log Your Meals'}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {lang === 'bn' ? 'আপনার খাবার যোগ করুন এবং ক্যালরি ট্র্যাক করুন' : 'Add your meals and track calories'}
        </p>
        <button className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-lg font-medium">
          <Plus className="h-4 w-4" />
          {lang === 'bn' ? 'নতুন খাবার যোগ করুন' : 'Add New Meal'}
        </button>
      </div>
    </div>
  );
}

function AITab({ lang }: { lang: string }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: lang === 'bn' ? 'হ্যালো! আমি আপনার AI কোচ। আমাকে ডায়েট বা ফিটনেস সম্পর্কে যেকোনো প্রশ্ন করুন!' : 'Hello! I\'m your AI coach. Ask me anything about diet or fitness!' }
  ]);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (!input.trim()) return;
    
    setMessages([...messages, 
      { role: 'user', content: input },
      { role: 'assistant', content: lang === 'bn' ? 'এটি একটি ডেমো রেসপন্স। AI integration শীঘ্রই আসছে!' : 'This is a demo response. AI integration coming soon!' }
    ]);
    setInput('');
  };

  return (
    <div className="space-y-4">
      <div className="surface-card p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-secondary mr-8'}`}>
            <p className="text-sm">{msg.content}</p>
          </div>
        ))}
      </div>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={lang === 'bn' ? 'আপনার প্রশ্ন লিখুন...' : 'Type your question...'}
          className="flex-1 px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button 
          onClick={sendMessage}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium"
        >
          {lang === 'bn' ? 'পাঠান' : 'Send'}
        </button>
      </div>
    </div>
  );
}

function ProfileTab({ lang }: { lang: string }) {
  return (
    <div className="space-y-4">
      <div className="surface-card p-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{lang === 'bn' ? 'ব্যবহারকারী' : 'User'}</h2>
            <p className="text-sm text-muted-foreground">NutriFit Member</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-t border-border">
            <span className="text-muted-foreground">{lang === 'bn' ? 'BMI' : 'BMI'}</span>
            <span className="font-semibold">22.4</span>
          </div>
          <div className="flex justify-between py-2 border-t border-border">
            <span className="text-muted-foreground">{lang === 'bn' ? 'লক্ষ্য' : 'Goal'}</span>
            <span className="font-semibold">{lang === 'bn' ? 'ওজন কমানো' : 'Weight Loss'}</span>
          </div>
          <div className="flex justify-between py-2 border-t border-border">
            <span className="text-muted-foreground">{lang === 'bn' ? 'দৈনিক ক্যালরি' : 'Daily Calories'}</span>
            <span className="font-semibold">1,800 kcal</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [started, setStarted] = useState(false);
  
  return started ? <MainApp /> : <WelcomeScreen onStart={() => setStarted(true)} />;
}

const queryClient = new QueryClient();
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <App />
          <Toaster richColors position="top-center" />
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
