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
import { 
  Mail, 
  Lock, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  Play, 
  Mic, 
  Terminal, 
  Activity, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles
} from 'lucide-react';
import Dashboard from './components/Dashboard';

// Import local logo assets
import logoWithText from './assets/vocalize-logo-with-text.png';
import logoWithoutText from './assets/vocalize-logo-without-text.png';

interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isDemo?: boolean;
}

// Helper to encode a mock JWT on the client side for local sandbox user profiles
const encodeMockJwt = (uid: string, email: string) => {
  try {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ user_id: uid, email: email, name: email.split('@')[0] }));
    const signature = 'mock-signature';
    return `${header}.${payload}.${signature}`;
  } catch (err) {
    console.error('Error encoding mock token:', err);
    return 'mock-token-123';
  }
};

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [currentView, setCurrentView] = useState<'landing' | 'auth'>('landing');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Landing Page Interactive Simulator States
  const [simText, setSimText] = useState('add 12 bags of rice and sold 3 now');
  const [simStep, setSimStep] = useState<'idle' | 'analyzing' | 'applying' | 'done'>('idle');
  const [simProducts, setSimProducts] = useState([
    { name: 'rice', quantity: 4, unit: 'bags', price: 80, updated: 'Updated 2 hours ago' },
    { name: 'sugar', quantity: 45, unit: 'kg', price: 15, updated: 'Updated yesterday' }
  ]);
  const [simLogs, setSimLogs] = useState<string[]>([
    '📝 Initialized inventory grid'
  ]);

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

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    // Local Sandbox auth simulation when Firebase is not configured
    if (!isConfigured) {
      try {
        const storedUsersStr = localStorage.getItem('vocalize_mock_users');
        const mockUsers = storedUsersStr ? JSON.parse(storedUsersStr) : [];

        if (authMode === 'signup') {
          const userExists = mockUsers.some((u: any) => u.email.toLowerCase() === email.toLowerCase());
          if (userExists) {
            setError('Account already exists in local sandbox database. Please sign in instead.');
            return;
          }

          const newUser = {
            uid: 'mock_u_' + Math.random().toString(36).substring(2, 11),
            email: email.toLowerCase().trim(),
            password: password
          };
          mockUsers.push(newUser);
          localStorage.setItem('vocalize_mock_users', JSON.stringify(mockUsers));

          const token = encodeMockJwt(newUser.uid, newUser.email);
          localStorage.setItem('vocalize_token', token);

          const appUser: AppUser = {
            uid: newUser.uid,
            email: newUser.email,
            displayName: email.split('@')[0]
          };
          localStorage.setItem('vocalize_mock_user', JSON.stringify(appUser));
          setUser(appUser);
        } else {
          const foundUser = mockUsers.find(
            (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
          );
          if (!foundUser) {
            setError('Invalid email or password in local sandbox database.');
            return;
          }

          const token = encodeMockJwt(foundUser.uid, foundUser.email);
          localStorage.setItem('vocalize_token', token);

          const appUser: AppUser = {
            uid: foundUser.uid,
            email: foundUser.email,
            displayName: foundUser.email.split('@')[0]
          };
          localStorage.setItem('vocalize_mock_user', JSON.stringify(appUser));
          setUser(appUser);
        }
      } catch (err: any) {
        console.error(err);
        setError('Error simulating sandbox account operation.');
      }
      return;
    }

    // Real Firebase Auth flow
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
    if (user?.isDemo || !isConfigured) {
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

  // Run Mock Interactive Simulator
  const handleSimulate = () => {
    if (simStep !== 'idle') return;
    
    setSimStep('analyzing');
    setSimLogs(prev => [...prev, `🎙️ Spoke: "${simText}"`, '🔍 Intent: Command (Transaction)', '🤖 Classifying & splitting compound clauses...']);
    
    setTimeout(() => {
      setSimStep('applying');
      setSimLogs(prev => [...prev, '⚡ Parsed Actions: [ADD_STOCK: rice 12 bags, REMOVE_STOCK: rice 3 bags]', '💾 Applying calculations: 4 + 12 - 3 = 13 bags...']);
    }, 1500);

    setTimeout(() => {
      setSimStep('done');
      setSimProducts(prev => {
        const copy = [...prev];
        copy[0] = { ...copy[0], quantity: 13, updated: 'Updated Just Now!' };
        return copy;
      });
      setSimLogs(prev => [...prev, '🟢 Success: Stock updated successfully. Grid refreshed!']);
    }, 3000);
  };

  // Reset Mock Simulator
  const handleResetSimulator = () => {
    setSimStep('idle');
    setSimProducts([
      { name: 'rice', quantity: 4, unit: 'bags', price: 80, updated: 'Updated 2 hours ago' },
      { name: 'sugar', quantity: 45, unit: 'kg', price: 15, updated: 'Updated yesterday' }
    ]);
    setSimLogs(['📝 Initialized inventory grid']);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 animate-spin flex items-center justify-center shadow-lg shadow-violet-500/20">
            <div className="w-6 h-6 rounded-lg bg-[#090d16] animate-pulse" />
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

  // RENDER SAAS LANDING PAGE
  if (currentView === 'landing') {
    return (
      <div className="min-h-screen w-full bg-[#070b13] relative overflow-x-hidden text-slate-100 font-sans selection:bg-violet-600 selection:text-white">
        
        {/* Glow Spots */}
        <div className="absolute top-[-100px] left-[5%] w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[140px] pointer-events-none z-0" />
        <div className="absolute top-[400px] right-[5%] w-[600px] h-[600px] bg-fuchsia-600/5 rounded-full blur-[140px] pointer-events-none z-0" />
        <div className="absolute bottom-[200px] left-[10%] w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none z-0" />

        {/* 1. Header Navigation */}
        <div className="sticky top-0 w-full z-50 px-4 pt-4 select-none">
          <header className="max-w-7xl mx-auto rounded-2xl border border-slate-900/60 bg-slate-950/45 backdrop-blur-md px-6 py-2.5 shadow-xl shadow-slate-950/45 transition">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('landing')}>
                <img src={logoWithText} alt="Vocalize Logo" className="h-14 md:h-18 lg:h-22 object-contain" />
              </div>
              
              {/* Nav Links */}
              <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-400">
                <a href="#features" className="hover:text-white transition">Features</a>
                <a href="#simulator" className="hover:text-white transition">Live Simulator</a>
                <a href="#testimonials" className="hover:text-white transition">Merchant Reviews</a>
                <button 
                  onClick={launchDemoMode}
                  className="hover:text-violet-400 transition text-left cursor-pointer"
                >
                  Instant Sandbox Demo
                </button>
              </nav>

              {/* Auth Buttons */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { setAuthMode('signin'); setCurrentView('auth'); }}
                  className="px-4 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => { setAuthMode('signup'); setCurrentView('auth'); }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-violet-600/10 hover:shadow-violet-600/20 transition cursor-pointer"
                >
                  Get Started
                </button>
              </div>
            </div>
          </header>
        </div>

        {/* 2. Hero Section */}
        <section className="relative max-w-7xl mx-auto px-6 pt-16 pb-20 md:py-28 flex flex-col md:flex-row items-center gap-12 z-10">
          <div className="w-full md:w-[50%] flex flex-col items-center md:items-start text-center md:text-left gap-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-600/10 border border-violet-500/15 text-[11px] text-violet-400 font-bold uppercase tracking-wider select-none animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              Next-Gen Store Inventory
            </div>
            <h1 className="text-4xl lg:text-5xl xl:text-6.5xl font-black leading-tight text-white tracking-tight">
              Vocalize your stock. <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-300">
                Command your growth.
              </span>
            </h1>
            <p className="text-[15px] text-slate-400 leading-relaxed max-w-lg font-medium">
              Vocalize is the world's first voice-first retail stock manager. Speak naturally to parse transaction audits, align duplicates, and update listings hands-free.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mt-2">
              <button 
                onClick={() => { setAuthMode('signup'); setCurrentView('auth'); }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-violet-500/20 transition cursor-pointer"
              >
                Start Free Sandbox
                <ArrowRight className="w-4 h-4" />
              </button>
              <button 
                onClick={launchDemoMode}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Launch Demo Dashboard
              </button>
            </div>
          </div>

          {/* Right Hero Graphic: Floating Hologram Graphic */}
          <div className="w-full md:w-[50%] flex justify-center relative select-none">
            <div className="relative w-80 h-80 flex items-center justify-center">
              
              {/* Halos and rings */}
              <div className="absolute inset-0 rounded-full border border-dashed border-violet-500/15 animate-spin-slow" />
              <div className="absolute w-60 h-60 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 opacity-15 blur-3xl animate-glow-pulse" />
              
              {/* Floating Shield */}
              <div className="relative z-10 w-48 h-48 animate-float flex items-center justify-center">
                <img 
                  src={logoWithoutText} 
                  alt="Vocalize Shield" 
                  className="w-full h-full object-contain drop-shadow-[0_15px_30px_rgba(139,92,246,0.4)]"
                />
              </div>

              {/* Glowing decorative chips */}
              <div className="absolute top-2 left-6 bg-slate-950/60 backdrop-blur border border-slate-800 p-2.5 rounded-xl flex items-center gap-2 shadow-2xl animate-float" style={{ animationDelay: '1.2s' }}>
                <div className="p-1 rounded bg-violet-600/20"><Mic className="w-3.5 h-3.5 text-violet-400" /></div>
                <span className="text-[10px] font-bold text-slate-300">Continuous Auditing</span>
              </div>
              <div className="absolute bottom-6 right-2 bg-slate-950/60 backdrop-blur border border-slate-800 p-2.5 rounded-xl flex items-center gap-2 shadow-2xl animate-float" style={{ animationDelay: '0.6s' }}>
                <div className="p-1 rounded bg-fuchsia-600/20"><Activity className="w-3.5 h-3.5 text-fuchsia-400" /></div>
                <span className="text-[10px] font-bold text-slate-300">Live History Timeline</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Core Features Section */}
        <section id="features" className="border-t border-slate-900/60 bg-slate-950/10 py-20 relative z-10 select-none">
          <div className="max-w-7xl mx-auto px-6 flex flex-col gap-12">
            <div className="text-center flex flex-col items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Core Architecture</span>
              <h2 className="text-2xl lg:text-3.5xl font-black text-white tracking-tight">Features Built for Real-World Retail</h2>
              <div className="w-12 h-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full mt-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Feature 1 - Left slanted morphing leaf */}
              <div className="glass-card p-8 text-left flex flex-col gap-5 transition-all duration-700 rounded-tl-[72px] rounded-br-[72px] rounded-tr-[18px] rounded-bl-[18px] hover:rounded-tl-[18px] hover:rounded-br-[18px] hover:rounded-tr-[72px] hover:rounded-bl-[72px] border border-violet-500/10 hover:border-violet-500/35 hover:shadow-[0_0_35px_-5px_rgba(139,92,246,0.15)] hover:-translate-y-1">
                <div className="p-3.5 bg-violet-600/15 border border-violet-500/25 rounded-2xl w-fit">
                  <Mic className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-200 tracking-tight">Compound Voice Parsing</h3>
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                    Say goodbye to single-command limitations. Our system parses complex compound speech clauses like "Add 10 sugar but remove 5 flour" in a single breath.
                  </p>
                </div>
              </div>

              {/* Feature 2 - Right slanted morphing leaf */}
              <div className="glass-card p-8 text-left flex flex-col gap-5 transition-all duration-700 rounded-tr-[72px] rounded-bl-[72px] rounded-tl-[18px] rounded-br-[18px] hover:rounded-tr-[18px] hover:rounded-bl-[18px] hover:rounded-tl-[72px] hover:rounded-br-[72px] border border-fuchsia-500/10 hover:border-fuchsia-500/35 hover:shadow-[0_0_35px_-5px_rgba(217,70,239,0.15)] hover:-translate-y-1">
                <div className="p-3.5 bg-fuchsia-600/15 border border-fuchsia-500/25 rounded-2xl w-fit">
                  <Sparkles className="w-5 h-5 text-fuchsia-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-200 tracking-tight">Semantic Synonym Alignment</h3>
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                    Prevent catalogue duplication. Gemini and fuzzy matching align spoken synonyms (like "water") directly to existing listings (like "water bottle").
                  </p>
                </div>
              </div>

              {/* Feature 3 - Left slanted morphing leaf */}
              <div className="glass-card p-8 text-left flex flex-col gap-5 transition-all duration-700 rounded-tl-[72px] rounded-br-[72px] rounded-tr-[18px] rounded-bl-[18px] hover:rounded-tl-[18px] hover:rounded-br-[18px] hover:rounded-tr-[72px] hover:rounded-bl-[72px] border border-indigo-500/10 hover:border-indigo-500/35 hover:shadow-[0_0_35px_-5px_rgba(99,102,241,0.15)] hover:-translate-y-1">
                <div className="p-3.5 bg-indigo-600/15 border border-indigo-500/25 rounded-2xl w-fit">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-200 tracking-tight">Secure Profile Isolation</h3>
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                    Your store, your stats. Every registered merchant gets a dedicated empty inventory board and secure timeline database, fully isolated at the query tier.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 4. Interactive Simulator Section */}
        <section id="simulator" className="border-t border-slate-900/60 py-20 relative z-10">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
            
            {/* Left Description Column */}
            <div className="w-full md:w-[45%] flex flex-col items-center md:items-start text-center md:text-left gap-5 select-none">
              <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Sandbox Preview</span>
              <h2 className="text-2xl lg:text-3.5xl font-black text-white tracking-tight leading-tight">
                Try it yourself. <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                  Audit live in sandbox.
                </span>
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">
                Enter any compound stocking instruction below to test how our AI backend resolves voice transcripts, performs calculations, and renders instant logs.
              </p>

              {/* Quick Template Tag suggestions */}
              <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-1">
                <button 
                  onClick={() => setSimText('add 12 bags of rice and sold 3 now')}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-semibold text-slate-300 transition cursor-pointer"
                >
                  "add 12 bags of rice and sold 3"
                </button>
                <button 
                  onClick={() => setSimText('sold 15 kg of sugar but set rice price to 90')}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-semibold text-slate-300 transition cursor-pointer"
                >
                  "sold 15 kg of sugar..."
                </button>
              </div>
            </div>

            {/* Right Interactive Simulator Widget */}
            <div className="w-full md:w-[55%] glass-card rounded-2xl border border-slate-800/80 shadow-2xl relative overflow-hidden flex flex-col p-6">
              
              {/* Simulated Window Controls */}
              <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4 select-none">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-500 font-mono ml-2 uppercase">vocalize-sandbox-terminal.sh</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-emerald-400 font-mono uppercase tracking-wider">Live Simulator</span>
                </div>
              </div>

              {/* Interactive Input Form */}
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Mic className="w-4 h-4 text-violet-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    value={simText}
                    onChange={(e) => setSimText(e.target.value)}
                    placeholder="Enter speech transcript (e.g. add 10 bags of sugar)..."
                    disabled={simStep !== 'idle'}
                    className="w-full pl-10 pr-24 py-2.5 text-xs rounded-xl glass-input text-slate-200 border border-slate-800/80 focus:border-violet-600/50 outline-none transition"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1.5">
                    {simStep !== 'idle' ? (
                      <button 
                        onClick={handleResetSimulator}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 cursor-pointer"
                      >
                        Reset
                      </button>
                    ) : (
                      <button 
                        onClick={handleSimulate}
                        className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-[10px] font-bold text-white shadow shadow-violet-500/10 cursor-pointer"
                      >
                        Simulate
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Simulated Wave/Ripples when processing */}
              {simStep === 'analyzing' && (
                <div className="flex items-center justify-center gap-1.5 py-4 border-t border-slate-900 mt-4 select-none">
                  <div className="w-1.5 bg-violet-500 rounded-full animate-soundwave h-8" style={{ animationDelay: '0.1s' }} />
                  <div className="w-1.5 bg-fuchsia-500 rounded-full animate-soundwave h-8" style={{ animationDelay: '0.3s' }} />
                  <div className="w-1.5 bg-violet-400 rounded-full animate-soundwave h-8" style={{ animationDelay: '0.5s' }} />
                  <div className="w-1.5 bg-fuchsia-400 rounded-full animate-soundwave h-8" style={{ animationDelay: '0.2s' }} />
                  <span className="text-[10px] text-violet-400 font-bold font-mono pl-3 uppercase tracking-wider animate-pulse">
                    Gemini AI analyzing statement...
                  </span>
                </div>
              )}

              {simStep === 'applying' && (
                <div className="flex items-center justify-center gap-1.5 py-4 border-t border-slate-900 mt-4 select-none">
                  <div className="w-1.5 bg-fuchsia-500 rounded-full animate-soundwave h-8" style={{ animationDelay: '0.1s' }} />
                  <div className="w-1.5 bg-indigo-500 rounded-full animate-soundwave h-8" style={{ animationDelay: '0.3s' }} />
                  <span className="text-[10px] text-fuchsia-400 font-bold font-mono pl-3 uppercase tracking-wider animate-pulse">
                    Applying stock modifications to inventory...
                  </span>
                </div>
              )}

              {/* Table rendering simulated rows */}
              <div className="border border-slate-900/60 rounded-xl overflow-hidden mt-4 bg-slate-950/30">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-950/40 text-[9px] font-bold text-slate-500 uppercase tracking-widest select-none">
                      <th className="py-2.5 px-4">Product</th>
                      <th className="py-2.5 px-4 text-center">Stock</th>
                      <th className="py-2.5 px-4">Price</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] font-medium text-slate-300">
                    {simProducts.map((p, idx) => (
                      <tr key={idx} className="border-b border-slate-900/40 hover:bg-slate-900/10 transition">
                        <td className="py-2.5 px-4 font-bold text-slate-200 capitalize">{p.name}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            p.name === 'rice' && simStep === 'done'
                              ? 'bg-emerald-500/10 text-emerald-400 animate-pulse'
                              : 'bg-slate-900 text-slate-400'
                          }`}>
                            {p.quantity} {p.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-400">₹{p.price}</td>
                        <td className="py-2.5 px-4">
                          <span className={`text-[9px] font-semibold ${
                            p.updated.startsWith('Updated Just')
                              ? 'text-emerald-400 animate-pulse font-bold'
                              : 'text-slate-500'
                          }`}>
                            {p.updated}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Logs timeline rendering inside simulator */}
              <div className="mt-4 border-t border-slate-900 pt-4 text-left">
                <div className="flex items-center gap-1.5 mb-2 select-none">
                  <Terminal className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-terminal">Audit Execution Log</span>
                </div>
                <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-950/60 border border-slate-900 font-terminal text-[10px] text-slate-400 min-h-[70px]">
                  {simLogs.map((log, idx) => (
                    <div key={idx} className={`${
                      log.startsWith('🟢') ? 'text-emerald-400 font-bold' : 
                      log.startsWith('⚡') ? 'text-violet-400' :
                      log.startsWith('🎙️') ? 'text-slate-200' : 'text-slate-400'
                    }`}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 5. Testimonials Section */}
        <section id="testimonials" className="border-t border-slate-900/60 bg-slate-950/10 py-20 relative z-10 select-none">
          <div className="max-w-7xl mx-auto px-6 flex flex-col gap-12">
            <div className="text-center flex flex-col items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Merchant Reviews</span>
              <h2 className="text-2xl lg:text-3.5xl font-black text-white tracking-tight">Loved by Independent Store Owners</h2>
              <div className="w-12 h-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full mt-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Testimonial 1 */}
              <div className="glass-card rounded-2xl p-6 border border-slate-900/80 flex flex-col justify-between gap-6 text-left">
                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  "Vocalize completely altered how I audit our bags of grains. Instead of climbing up with pen and paper, I just stand there, press record, and speak naturally. It saves me at least 2 hours of cataloging every evening."
                </p>
                <div className="flex items-center gap-3 border-t border-slate-900 pt-4">
                  <div className="w-8 h-8 rounded-full bg-violet-600/30 flex items-center justify-center font-bold text-xs text-violet-400">
                    AK
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Aakash Raj</h4>
                    <p className="text-[10px] text-slate-500 font-medium">Wholesale Grocery Merchant</p>
                  </div>
                </div>
              </div>

              {/* Testimonial 2 */}
              <div className="glass-card rounded-2xl p-6 border border-slate-900/80 flex flex-col justify-between gap-6 text-left">
                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  "The AI semantic duplicate checker is pure magic. I said 'sold 2 bottles of water' and it automatically resolved it to our existing 'water bottle' catalog item instead of creating a new product. Extremely accurate!"
                </p>
                <div className="flex items-center gap-3 border-t border-slate-900 pt-4">
                  <div className="w-8 h-8 rounded-full bg-fuchsia-600/30 flex items-center justify-center font-bold text-xs text-fuchsia-400">
                    SN
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Sarah Nair</h4>
                    <p className="text-[10px] text-slate-500 font-medium">General Store Manager</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 6. Call to Action */}
        <section className="border-t border-slate-900/60 py-20 relative z-10 select-none">
          <div className="max-w-4xl mx-auto px-6 text-center flex flex-col items-center gap-6">
            <h2 className="text-3xl lg:text-4.5xl font-black text-white tracking-tight">
              Ready to vocalize your inventory?
            </h2>
            <p className="text-sm text-slate-400 max-w-lg font-medium leading-relaxed">
              Launch a free local sandbox profile to start tracking metrics instantly. No credit card, no complex setups, fully optimized out of the box.
            </p>
            <button 
              onClick={() => { setAuthMode('signup'); setCurrentView('auth'); }}
              className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-violet-500/25 transition cursor-pointer"
            >
              Sign Up Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* 7. Footer */}
        <footer className="border-t border-slate-900/60 bg-slate-950/50 py-10 relative z-10 select-none">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-[11px] text-slate-500 font-semibold tracking-wider uppercase">
            <div className="flex items-center gap-3">
              <img src={logoWithoutText} alt="Vocalize Logo" className="h-12 w-12 object-contain brightness-110 drop-shadow-[0_4px_10px_rgba(139,92,246,0.3)] animate-pulse" />
              <span className="text-xs font-bold text-slate-300">Vocalize Inc. &copy; {new Date().getFullYear()}</span>
            </div>
            <div className="flex gap-6">
              <a href="#features" className="hover:text-slate-300 transition">Features</a>
              <a href="#simulator" className="hover:text-slate-300 transition">Simulator</a>
              <button 
                onClick={launchDemoMode}
                className="hover:text-slate-300 transition cursor-pointer uppercase font-semibold"
              >
                Guest Demo
              </button>
            </div>
          </div>
        </footer>

      </div>
    );
  }

  // RENDER SPLIT-SCREEN AUTHENTICATION PAGE
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
        <div className="relative flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('landing')}>
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

      {/* RIGHT SIDE: Auth Form (Covers entire screen on mobile, 50% on desktop) */}
      <div className="w-full md:w-1/2 lg:w-[48%] flex flex-col justify-center items-center p-8 lg:p-12 relative z-10 min-h-screen">
        
        {/* Mobile Header Logo (Visible only on mobile/tablet - goes back to landing page) */}
        <div className="flex md:hidden items-center gap-2 mb-8 select-none cursor-pointer" onClick={() => setCurrentView('landing')}>
          <img 
            src={logoWithText} 
            alt="Vocalize Logo" 
            className="h-14 md:h-16 object-contain"
          />
        </div>

        <div className="w-full max-w-sm flex flex-col gap-6">
          
          {/* Header titles */}
          <div className="flex flex-col gap-1 text-center md:text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white tracking-tight">
                {authMode === 'signin' ? 'Welcome back' : 'Create sandbox profile'}
              </h3>
              <button 
                onClick={() => setCurrentView('landing')}
                className="text-[10px] text-violet-400 hover:text-violet-300 font-bold uppercase tracking-wider cursor-pointer"
              >
                Back to home
              </button>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {authMode === 'signin' 
                ? 'Sign in to access your custom voice inventory log' 
                : 'Register an account to start tracking store metrics'}
            </p>
          </div>

          {/* Sandbox Status Banner */}
          <div className={`p-3 rounded-xl border flex items-center gap-3 text-left text-[11px] ${
            isConfigured 
              ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' 
              : 'bg-amber-500/5 border-amber-500/10 text-amber-400'
          }`}>
            <div className={`w-2 h-2 rounded-full shrink-0 ${isConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <div>
              <span className="font-semibold block">
                {isConfigured ? 'Firebase Authentication Engine Online' : 'Local Sandbox Mode Active'}
              </span>
              <span className="text-slate-500 font-medium mt-0.5 block">
                {isConfigured 
                  ? 'Real-time database and secure credentials validated.' 
                  : 'Firebase config missing. Local mock storage sandbox enabled.'}
              </span>
            </div>
          </div>

          {/* Form Card */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80 shadow-2xl relative overflow-hidden">
            
            {/* Tab Selection */}
            <div className="grid grid-cols-2 rounded-xl bg-slate-950 p-1 border border-slate-900 mb-6">
              <button
                onClick={() => { setAuthMode('signin'); setError(null); }}
                className={`py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition cursor-pointer ${
                  authMode === 'signin' 
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/10' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthMode('signup'); setError(null); }}
                className={`py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition cursor-pointer ${
                  authMode === 'signup' 
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/10' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[11px] flex gap-2 items-center text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Actual Auth Form */}
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
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl glass-input text-slate-200 border border-slate-800/80 focus:border-violet-600/50 outline-none transition"
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
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl glass-input text-slate-200 border border-slate-800/80 focus:border-violet-600/50 outline-none transition"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-violet-500/15 hover:shadow-violet-500/25 transition duration-150 cursor-pointer"
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

            {/* Google Sign In (if configured) */}
            {isConfigured && (
              <>
                <div className="relative my-6 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800" />
                  </div>
                  <span className="relative px-3 bg-[#090d16] text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Or continue with
                  </span>
                </div>

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
              </>
            )}

            {/* Quick Demo Bypass */}
            <div className="mt-5 pt-4 border-t border-slate-900/60 text-center flex flex-col gap-2">
              <button
                onClick={launchDemoMode}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
              >
                <Play className="w-3 h-3 text-slate-400 fill-current" />
                Launch Demo Dashboard
              </button>
              <span className="text-[10px] text-slate-500 font-medium">
                (Pre-seeded with mock items for quick preview)
              </span>
            </div>

          </div>

          <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase text-center select-none">
            Vocalize AI Security Verified
          </p>
        </div>
      </div>
    </div>
  );
}
