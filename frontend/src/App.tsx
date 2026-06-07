import React, { useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  isConfigured 
} from './config/firebase';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged
} from 'firebase/auth';
import { Database, Mail, Lock, LogIn, UserPlus, AlertCircle, Play } from 'lucide-react';
import Dashboard from './components/Dashboard';

interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isDemo?: boolean;
}

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Monitor Auth state
  useEffect(() => {
    if (!isConfigured) {
      // In mock mode, check if there's an active mock session
      const mockSession = localStorage.getItem('vocalize_mock_user');
      if (mockSession) {
        setUser(JSON.parse(mockSession));
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        localStorage.setItem('vocalize_token', token);
        
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName
        });
      } else {
        localStorage.removeItem('vocalize_token');
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      if (authMode === 'signin') {
        const credentials = await signInWithEmailAndPassword(auth, email, password);
        const token = await credentials.user.getIdToken();
        localStorage.setItem('vocalize_token', token);
        setUser({
          uid: credentials.user.uid,
          email: credentials.user.email,
          displayName: credentials.user.displayName
        });
      } else {
        const credentials = await createUserWithEmailAndPassword(auth, email, password);
        const token = await credentials.user.getIdToken();
        localStorage.setItem('vocalize_token', token);
        setUser({
          uid: credentials.user.uid,
          email: credentials.user.email,
          displayName: credentials.user.displayName
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message.replace('Firebase: ', ''));
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      localStorage.setItem('vocalize_token', token);
      setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message.replace('Firebase: ', ''));
    }
  };

  const launchDemoMode = () => {
    const demoUser: AppUser = {
      uid: 'mock_user_123',
      email: 'demo_owner@vocalize.com',
      displayName: 'Demo Store Owner',
      isDemo: true
    };
    localStorage.setItem('vocalize_mock_user', JSON.stringify(demoUser));
    localStorage.setItem('vocalize_token', 'mock-token-123');
    setUser(demoUser);
  };

  const handleSignOut = async () => {
    if (user?.isDemo) {
      localStorage.removeItem('vocalize_mock_user');
      localStorage.removeItem('vocalize_token');
      setUser(null);
      return;
    }

    try {
      await signOut(auth);
      localStorage.removeItem('vocalize_token');
      setUser(null);
    } catch (err: any) {
      console.error('Error signing out:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 animate-spin flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Database className="w-6 h-6 text-white" />
          </div>
          <p className="text-xs font-semibold tracking-wider text-slate-400 font-terminal uppercase animate-pulse">
            Booting Vocalize system...
          </p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Dashboard user={user} onSignOut={handleSignOut} />;
  }

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Dynamic Background Gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center gap-6">
        
        {/* Logo and Brand */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="p-3 bg-gradient-to-tr from-violet-600 to-fuchsia-600 rounded-2xl shadow-xl shadow-violet-500/25">
            <Database className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-300">
            Vocalize
          </h1>
          <p className="text-xs text-slate-500 font-semibold tracking-widest uppercase">
            AI-POWERED VOICE INVENTORY LOG
          </p>
        </div>

        {/* Demo Fallback Alert Block */}
        {!isConfigured && (
          <div className="w-full glass-card p-4 border-l-3 border-l-amber-500 rounded-xl flex gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-400">Firebase Config Missing</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                The application is running in Mock Mode because Firebase is not configured in your environment variables. 
              </p>
              <button
                onClick={launchDemoMode}
                className="mt-3.5 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/10 hover:shadow-violet-600/20 transition duration-200 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Launch Demo Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Authentication Card (only if Firebase is configured) */}
        {isConfigured && (
          <div className="w-full glass-card rounded-2xl p-6 border border-slate-800/80">
            
            {/* Tab Selection */}
            <div className="grid grid-cols-2 rounded-xl bg-slate-950 p-1 border border-slate-900 mb-6">
              <button
                onClick={() => setAuthMode('signin')}
                className={`py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition ${
                  authMode === 'signin' 
                    ? 'bg-violet-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setAuthMode('signup')}
                className={`py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition ${
                  authMode === 'signup' 
                    ? 'bg-violet-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[11px] flex gap-2 items-center">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@store.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl glass-input text-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl glass-input text-slate-200"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-violet-500/15 transition duration-150 cursor-pointer"
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
            </form>

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <span className="relative px-3 bg-[#0c121e] text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Or continue with
              </span>
            </div>

            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleSignIn}
              type="button"
              className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition duration-150 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign In with Google
            </button>

            {/* Quick Demo Bypass (even when configured) */}
            <div className="mt-4 pt-4 border-t border-slate-900 text-center">
              <button
                onClick={launchDemoMode}
                className="text-[10px] text-slate-500 hover:text-violet-400 underline font-semibold transition"
              >
                Or launch sandbox demo directly
              </button>
            </div>

          </div>
        )}

        <p className="text-[10px] text-slate-600 font-medium">
          Protected by Firebase Authentication & Gemini AI Encryption
        </p>
      </div>
    </div>
  );
}
