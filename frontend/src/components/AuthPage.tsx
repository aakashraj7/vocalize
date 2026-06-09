import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, Lock, LogIn, UserPlus, AlertCircle, Play, Store, Globe, User, Eye, EyeOff, Shield
} from 'lucide-react';

import logoWithText from '../assets/vocalize-logo-with-text.png';
import logoWithoutText from '../assets/vocalize-logo-without-text.png';

interface AuthPageProps {
  authMode: 'signin' | 'signup';
  onEmailAuth: (
    email: string, 
    password: string, 
    mode: 'signin' | 'signup', 
    extra: { merchantName: string; shopName: string; category: string; currency: string; language: string }
  ) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onLaunchDemo: () => void;
  isConfigured: boolean;
  error: string | null;
  setError: (err: string | null) => void;
}

export default function AuthPage({
  authMode,
  onEmailAuth,
  onGoogleSignIn,
  onLaunchDemo,
  isConfigured,
  error,
  setError
}: AuthPageProps) {
  const navigate = useNavigate();

  // Local Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [merchantName, setMerchantName] = useState('');
  const [shopName, setShopName] = useState('');
  const [category, setCategory] = useState('General Retail');
  const [currency, setCurrency] = useState('INR');
  const [language, setLanguage] = useState('English (Standard)');

  // Clear errors when swapping route views
  useEffect(() => {
    setError(null);
  }, [authMode, setError]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (authMode === 'signup' && password !== confirmPassword) {
      setError("Passwords do not match. Please verify your password entries.");
      return;
    }
    onEmailAuth(email, password, authMode, {
      merchantName,
      shopName,
      category,
      currency,
      language
    });
  };

  const handleClearLocalStorage = () => {
    localStorage.removeItem('vocalize_mock_users');
    localStorage.removeItem('vocalize_mock_user');
    localStorage.removeItem('vocalize_token');
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('vocalize_settings_')) {
        localStorage.removeItem(key);
      }
    });
    setError('Sandbox accounts and settings wiped out successfully.');
  };

  return (
    <div className="min-h-screen w-full bg-[#070b13] flex flex-col md:flex-row relative overflow-hidden text-slate-100 font-sans">
      
      {/* Background radial glows */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-fuchsia-600/5 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* LEFT SIDE: Brand Showcase with 3D Holographic floating logo & visualizer */}
      <div className="hidden md:flex md:w-1/2 lg:w-[52%] flex-col justify-between p-12 lg:p-16 border-r border-slate-900 bg-slate-950/20 backdrop-blur-md relative z-10 select-none">
        
        {/* Subtle grid background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_45%,#000_70%,transparent_100%)] opacity-25" />

        {/* Top Header Logo (Goes back to landing page) */}
        <div className="relative flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img src={logoWithText} alt="Vocalize Logo" className="h-14 md:h-16 object-contain brightness-110" />
        </div>

        {/* Middle Animated Logo Portal */}
        <div className="relative my-auto flex flex-col items-center justify-center text-center gap-8">
          
          {/* Holographic Glowing Ring and Rotating Shield */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            
            {/* Spinning outline ring */}
            <div className="absolute inset-0 rounded-full border border-dashed border-violet-500/25 animate-spin-slow" />
            
            {/* Pulsing neon radial shadow */}
            <div className="absolute w-44 h-44 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 opacity-20 blur-3xl animate-glow-pulse" />
            
            {/* Solid secondary glow orb */}
            <div className="absolute w-40 h-40 rounded-full border border-fuchsia-500/10 animate-pulse-glow" />

            {/* 3D Floating Logo Asset */}
            <img 
              src={logoWithoutText} 
              alt="Vocalize Icon" 
              className="w-36 h-36 object-contain z-10 animate-float drop-shadow-[0_10px_20px_rgba(139,92,246,0.3)]"
            />
          </div>

          {/* Minimal Text Content */}
          <div className="flex flex-col gap-2 z-10 max-w-sm">
            <h2 className="text-2xl lg:text-3xl font-black leading-tight tracking-tight text-white">
              Inventory control. <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-300">
                Powered by your voice.
              </span>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed font-medium mt-1">
              Unlock hands-free catalog audit logging, dynamic price updates, and intelligent semantic alignment.
            </p>
          </div>

          {/* Interactive Bouncing Voice Waves */}
          <div className="flex items-end gap-1.5 h-12 justify-center mt-3 z-10">
            <div className="w-1 bg-violet-500 rounded-full animate-soundwave" style={{ animationDelay: '0.1s', animationDuration: '0.9s' }} />
            <div className="w-1 bg-fuchsia-500 rounded-full animate-soundwave" style={{ animationDelay: '0.3s', animationDuration: '0.7s' }} />
            <div className="w-1 bg-violet-400 rounded-full animate-soundwave" style={{ animationDelay: '0.5s', animationDuration: '1.2s' }} />
            <div className="w-1 bg-fuchsia-400 rounded-full animate-soundwave" style={{ animationDelay: '0.2s', animationDuration: '1.0s' }} />
            <div className="w-1 bg-indigo-500 rounded-full animate-soundwave" style={{ animationDelay: '0.4s', animationDuration: '0.6s' }} />
            <div className="w-1 bg-violet-600 rounded-full animate-soundwave" style={{ animationDelay: '0.7s', animationDuration: '1.4s' }} />
            <div className="w-1 bg-fuchsia-600 rounded-full animate-soundwave" style={{ animationDelay: '0.6s', animationDuration: '0.8s' }} />
            <div className="w-1 bg-indigo-400 rounded-full animate-soundwave" style={{ animationDelay: '0.8s', animationDuration: '1.1s' }} />
          </div>
        </div>

        {/* Footer Credit */}
        <div className="relative flex items-center justify-between text-[11px] text-slate-500 font-semibold tracking-wider uppercase">
          <span>&copy; {new Date().getFullYear()} Vocalize Inc.</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            AI node active
          </span>
        </div>
      </div>

      {/* RIGHT SIDE: Auth Form Container */}
      <div className="w-full md:w-1/2 lg:w-[48%] flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 relative z-10 min-h-screen">
        
        {/* Main interactive glassmorphism auth card */}
        <div className={`w-full max-w-md flex flex-col bg-slate-950/40 backdrop-blur-xl border border-violet-500/20 rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden select-none ${
          authMode === 'signup' ? 'max-h-[95vh] p-6 md:p-7' : 'max-h-[90vh] p-6 md:p-8'
        }`}>
          
          {/* Card Static Header */}
          <div className={`flex items-start justify-between shrink-0 border-b border-slate-900/60 ${
            authMode === 'signup' ? 'mb-3 pb-2' : 'mb-4 pb-2'
          }`}>
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                {authMode === 'signin' ? 'Welcome back' : 'Create sandbox profile'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-tight">
                {authMode === 'signin' 
                  ? 'Sign in to access your custom voice inventory log' 
                  : 'Register an account to start tracking store metrics'}
              </p>
            </div>
            <button 
              onClick={() => navigate('/')}
              className="text-[10px] text-violet-400 hover:text-violet-300 font-bold uppercase tracking-wider cursor-pointer shrink-0 transition"
            >
              Back to home &rarr;
            </button>
          </div>

          {/* Scrollable Container for form fields, tabs, etc. */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent flex flex-col gap-3">
            
            {/* Google Sign In (if configured) */}
            {isConfigured && (
              <button
                onClick={onGoogleSignIn}
                type="button"
                className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition duration-150 cursor-pointer shrink-0"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign In with Google
              </button>
            )}

            {/* Tab Selection */}
            <div className="grid grid-cols-2 rounded-2xl bg-slate-950/80 p-1 border border-slate-900 shrink-0">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className={`py-2.5 text-xs font-bold rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
                  authMode === 'signin' 
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/20' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className={`py-2.5 text-xs font-bold rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
                  authMode === 'signup' 
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/20' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Sign Up
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[11px] flex gap-2 items-center text-left shrink-0 animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Actual Auth Form */}
            <form id="auth-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
              
              {authMode === 'signin' ? (
                // Sign In Fields
                <>
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-slate-500" />
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@store.com"
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl glass-input text-slate-200 border border-slate-800/80 focus:border-violet-600/50 outline-none transition"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-slate-500" />
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl glass-input text-slate-200 border border-slate-800/80 focus:border-violet-600/50 outline-none transition"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 transition cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 animate-fade-in" /> : <Eye className="w-4 h-4 animate-fade-in" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                // Sign Up Fields
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                        <User className="w-3 h-3 text-slate-500" />
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={merchantName}
                          onChange={(e) => setMerchantName(e.target.value)}
                          placeholder="Sarah Nair"
                          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl glass-input text-slate-200 border border-slate-800/80 focus:border-violet-600/50 outline-none transition"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-500" />
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@store.com"
                          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl glass-input text-slate-200 border border-slate-800/80 focus:border-violet-600/50 outline-none transition"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-slate-500" />
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl glass-input text-slate-200 border border-slate-800/80 focus:border-violet-600/50 outline-none transition"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 transition cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-slate-500" />
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl glass-input text-slate-200 border border-slate-800/80 focus:border-violet-600/50 outline-none transition"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 transition cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                      <Store className="w-3 h-3 text-slate-500" />
                      Shop Name
                    </label>
                    <div className="relative">
                      <Store className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        placeholder="Sarah's Bakery Store"
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl glass-input text-slate-200 border border-slate-800/80 focus:border-violet-600/50 outline-none transition"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm rounded-xl glass-input text-slate-200 border border-slate-800/80 focus:border-violet-600/50 outline-none transition bg-[#090d16]"
                      >
                        <option value="General Retail">General Retail</option>
                        <option value="Bakery & Cafe">Bakery & Cafe</option>
                        <option value="Grocery Store">Grocery Store</option>
                        <option value="Apparel & Fashion">Apparel & Fashion</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Pharmacy">Pharmacy</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                        Currency
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm rounded-xl glass-input text-slate-200 border border-slate-800/80 focus:border-violet-600/50 outline-none transition bg-[#090d16]"
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 text-left shrink-0">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1.5">
                      <Globe className="w-3 h-3 text-slate-500" />
                      Voice Language Dialect
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl glass-input text-slate-200 border border-slate-800/80 focus:border-violet-600/50 outline-none transition bg-[#090d16]"
                      >
                        <option value="English (Standard)">English (Standard)</option>
                        <option value="English (Indian Dialect)">English (Indian Dialect)</option>
                        <option value="Hindi (हिंदी)">Hindi (हिंदी)</option>
                        <option value="Spanish (Español)">Spanish (Español)</option>
                        <option value="French (Français)">French (Français)</option>
                        <option value="German (Deutsch)">German (Deutsch)</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </form>

            {/* Sandbox Status Banner — sign-in only to keep signup form compact */}
            {authMode === 'signin' && <div className="relative my-2 text-center shrink-0">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-900" />
              </div>
              <span className="relative px-3 bg-[#080c14] text-[10px] font-bold uppercase tracking-widest text-slate-500">
                System Status
              </span>
            </div>}

            {authMode === 'signin' && <div className={`p-3 rounded-xl border flex items-center gap-3 text-left text-[11px] shrink-0 ${
              isConfigured 
                ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' 
                : 'bg-amber-500/5 border-amber-500/10 text-amber-400'
            }`}>
              <Shield className={`w-5 h-5 shrink-0 ${isConfigured ? 'text-emerald-400' : 'text-amber-400'}`} />
              <div className="flex-1">
                <span className="font-semibold block text-xs">
                  {isConfigured ? 'Firebase Authentication Engine Online' : 'Local Sandbox Mode Active'}
                </span>
                <span className="text-slate-500 font-medium mt-0.5 block">
                  {isConfigured 
                    ? 'Real-time database and secure credentials validated.' 
                    : 'Firebase config missing. Local mock storage sandbox enabled.'}
                </span>
                {!isConfigured && (
                  <button
                    type="button"
                    onClick={handleClearLocalStorage}
                    className="mt-2 text-[10px] text-amber-400 hover:text-amber-300 font-bold uppercase tracking-wider underline cursor-pointer block text-left"
                  >
                    Wipe Sandbox Accounts & Settings
                  </button>
                )}
              </div>
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isConfigured ? 'bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse' : 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'}`} />
            </div>}

            {/* Quick Demo Bypass — sign-in only */}
            {authMode === 'signin' && <div className="mt-3 pt-3 border-t border-slate-900/60 text-center flex flex-col gap-2">
              <button
                onClick={onLaunchDemo}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-slate-400 fill-current" />
                Launch Demo Dashboard
              </button>
              <span className="text-[10px] text-slate-500 font-medium">
                (Pre-seeded with mock items for quick preview)
              </span>
            </div>}

          </div>

          {/* Pinned submit — always visible above footer */}
          <button
            type="submit"
            form="auth-form"
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-violet-500/15 hover:shadow-violet-500/25 transition duration-150 cursor-pointer shrink-0 ${
              authMode === 'signup' ? 'mt-4' : 'mt-3'
            }`}
          >
            {authMode === 'signin' ? (
              <>
                <LogIn className="w-4 h-4" />
                Access Account
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Register Account
              </>
            )}
          </button>

          {/* Card Static Footer — sign-in only */}
          {authMode === 'signin' && (
            <div className="pt-4 mt-2 border-t border-slate-900/60 flex items-center justify-center gap-2 text-[10px] text-slate-500 font-semibold tracking-wider uppercase text-center select-none shrink-0">
              <Lock className="w-3 h-3 text-violet-500" />
              Vocalize AI Security Verified
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
