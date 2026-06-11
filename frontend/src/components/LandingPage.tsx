import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Play, Mic, Activity, ArrowRight, ShieldCheck, Terminal, UploadCloud, Target, Cpu, FileText 
} from 'lucide-react';


import logoWithText from '../assets/vocalize-logo-with-text.png';
import logoWithoutText from '../assets/vocalize-logo-without-text.png';

interface LandingPageProps {
  onLaunchDemo: () => void;
  user: any;
  onSignOut: () => Promise<void>;
}

export default function LandingPage({ onLaunchDemo, user, onSignOut }: LandingPageProps) {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Vocalize - Voice-First Retail Stock Manager";
  }, []);

  // Helper to parse voice logs for high fidelity timestamps and text
  const getVoiceLogDetails = (log: string) => {
    let text = log;
    let time = 'Today, 10:42 AM';
    
    // Strip initial emojis/ticks
    const emojiRegex = /^[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g;
    text = text.replace(emojiRegex, '').trim();

    if (text.includes('Initialized')) {
      time = 'Today, 10:42 AM';
    } else if (text.includes('Spoke') || text.includes('Intent') || text.includes('Classifying')) {
      time = 'Today, 10:43 AM';
    } else if (text.includes('Parsed') || text.includes('Applying')) {
      time = 'Today, 10:43 AM';
    } else if (text.includes('Success')) {
      time = 'Today, 10:44 AM';
    } else {
      time = 'Today, 10:43 AM';
    }
    return { text, time };
  };

  // Helper to parse OCR logs for high fidelity timestamps and text
  const getOcrLogDetails = (log: string) => {
    let text = log;
    let time = '10:42:33 AM';
    
    // Strip initial emojis/ticks/checkmarks
    const emojiRegex = /^[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]|✓/g;
    text = text.replace(emojiRegex, '').trim();

    if (text.includes('ready')) {
      time = '10:42:33 AM';
    } else if (text.includes('Uploaded') || text.includes('File type')) {
      time = '10:42:40 AM';
    } else if (text.includes('Calling') || text.includes('Extracting')) {
      time = '10:42:42 AM';
    } else if (text.includes('Success') || text.includes('Grid initialized')) {
      time = '10:42:45 AM';
    } else {
      time = '10:42:43 AM';
    }
    return { text, time };
  };

  // Landing Page Voice Simulator States
  const [voiceSimText, setVoiceSimText] = useState('add 12 bags of rice and sold 3 now');
  const [isListening, setIsListening] = useState(false);
  const [voiceSimStep, setVoiceSimStep] = useState<'idle' | 'analyzing' | 'applying' | 'done'>('idle');
  const [voiceSimProducts, setVoiceSimProducts] = useState([
    { name: 'rice', quantity: 4, unit: 'bags', price: 80, updated: 'Updated 2 hours ago' },
    { name: 'sugar', quantity: 45, unit: 'kg', price: 15, updated: 'Updated yesterday' }
  ]);
  const [voiceSimLogs, setVoiceSimLogs] = useState<string[]>([
    '📝 Initialized inventory grid'
  ]);

  // Landing Page Ledger OCR Simulator States
  const [ocrSimStep, setOcrSimStep] = useState<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const [ocrSimProducts, setOcrSimProducts] = useState<any[]>([]);
  const [ocrSimLogs, setOcrSimLogs] = useState<string[]>([
    '📝 System ready. Upload a document to start.'
  ]);
  const [ocrError, setOcrError] = useState('');

  // Run Voice Simulator
  const handleSimulateVoice = () => {
    if (voiceSimStep !== 'idle') return;
    
    setVoiceSimStep('analyzing');
    setVoiceSimLogs(prev => [...prev, `🎙️ Spoke: "${voiceSimText}"`, '🔍 Intent: Command (Transaction)', '🤖 Classifying & splitting compound clauses...']);
    
    setTimeout(() => {
      setVoiceSimStep('applying');
      setVoiceSimLogs(prev => [...prev, '⚡ Parsed Actions: [ADD_STOCK: rice 12 bags, REMOVE_STOCK: rice 3 bags]', '💾 Applying calculations: 4 + 12 - 3 = 13 bags...']);
    }, 1500);

    setTimeout(() => {
      setVoiceSimStep('done');
      setVoiceSimProducts(prev => {
        const copy = [...prev];
        copy[0] = { ...copy[0], quantity: 13, updated: 'Updated Just Now!' };
        return copy;
      });
      setVoiceSimLogs(prev => [...prev, '🟢 Success: Stock updated successfully. Grid refreshed!']);
    }, 3000);
  };

  // Reset Voice Simulator
  const handleResetVoiceSim = () => {
    setVoiceSimStep('idle');
    setVoiceSimProducts([
      { name: 'rice', quantity: 4, unit: 'bags', price: 80, updated: 'Updated 2 hours ago' },
      { name: 'sugar', quantity: 45, unit: 'kg', price: 15, updated: 'Updated yesterday' }
    ]);
    setVoiceSimLogs(['📝 Initialized inventory grid']);
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Web Speech API is not supported in this browser. Please type your command.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setVoiceSimStep('idle');
      setVoiceSimText('Listening...');
    };

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceSimText(transcript);
      setIsListening(false);
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error in simulator:', event.error);
      setIsListening(false);
      setVoiceSimText('add 12 bags of rice and sold 3 now');
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.start();
  };

  // Run Ledger OCR Simulator
  const handleSimulateLedgerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // Validate size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      setOcrError('File exceeds 20MB limit.');
      setOcrSimStep('error');
      return;
    }

    setOcrSimStep('analyzing');
    setOcrSimLogs([
      `📄 Uploaded inventory sheet: "${file.name}"`,
      `🔍 File type: ${file.type} | Size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      `🤖 Calling Gemini AI Scanner (gemini-2.5-flash-lite)...`,
      `⚡ Extracting product catalog...`
    ]);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const response = await fetch('/api/public/upload-ledger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileData: base64, mimeType: file.type })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          const items = data.items || [];
          setOcrSimProducts(items.map((it: any) => ({
            name: it.name,
            quantity: it.quantity,
            unit: it.unit || 'pcs',
            price: it.price || 0,
            updated: 'Extracted Just Now!'
          })));

          setOcrSimLogs(prev => [
            ...prev,
            `✓ Success: Extracted ${items.length} items.`,
            `🟢 Grid initialized with scanned products catalog!`
          ]);
          setOcrSimStep('done');
        } else {
          setOcrError(data.error || 'Failed to analyze the document.');
          setOcrSimStep('error');
        }
      } catch (err: any) {
        setOcrError(err.message || 'Error uploading file.');
        setOcrSimStep('error');
      }
    };
    reader.readAsDataURL(file);
  };

  // Reset Ledger OCR Simulator
  const handleResetOcrSim = () => {
    setOcrSimStep('idle');
    setOcrError('');
    setOcrSimProducts([]);
    setOcrSimLogs(['📝 System ready. Upload a document to start.']);
  };

  return (
    <div className="min-h-screen w-full bg-[#070b13] relative overflow-x-hidden text-slate-100 font-sans selection:bg-violet-600 selection:text-white">
      
      {/* Glow Spots */}
      <div className="absolute top-[-100px] left-[5%] w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-[400px] right-[5%] w-[600px] h-[600px] bg-fuchsia-600/5 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-[200px] left-[10%] w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* 1. Header Navigation */}
      <div className="fixed top-0 left-0 w-full z-50 px-4 pt-4 select-none">
        <header className="max-w-7xl mx-auto rounded-2xl border border-slate-900/60 bg-slate-950/45 backdrop-blur-md px-6 py-2.5 shadow-xl shadow-slate-950/45 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <img src={logoWithText} alt="Vocalize Logo" className="h-14 md:h-18 lg:h-22 object-contain" />
            </div>
            
            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-400">
              <a href="#features" className="hover:text-white transition">Features</a>
              <a href="#voice-simulator" className="hover:text-white transition">Voice Simulator</a>
              <a href="#ledger-simulator" className="hover:text-white transition">Ledger Scanner</a>
              <a href="#testimonials" className="hover:text-white transition">Reviews</a>
            </nav>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="px-4 py-1.5 text-sm font-bold text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    Dashboard
                  </button>
                  <button 
                    onClick={onSignOut}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-rose-600/10 hover:shadow-rose-600/20 transition cursor-pointer"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => navigate('/login')}
                    className="px-4 py-1.5 text-sm font-bold text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => navigate('/signup')}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-violet-600/10 hover:shadow-violet-600/20 transition cursor-pointer"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        </header>
      </div>

      {/* 2. Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-32 pb-20 md:pt-40 md:pb-28 flex flex-col md:flex-row items-center gap-12 z-10">
        <div className="w-full md:w-[50%] flex flex-col items-center md:items-start text-center md:text-left gap-6">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-violet-500/30 bg-violet-950/40 text-violet-400 font-bold uppercase text-[10px] tracking-wider shadow-[0_0_12px_rgba(168,85,247,0.15)] select-none">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            Next-Gen Store Inventory
          </div>
          <h1 className="text-4xl lg:text-5xl xl:text-6.5xl font-black leading-tight text-white tracking-tight">
            Vocalize your stock. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-fuchsia-500 to-cyan-400">
              Command your growth.
            </span>
          </h1>
          
          {/* Custom Divider */}
          <div className="flex items-center gap-2 select-none">
            <div className="h-1 w-12 rounded-full bg-violet-600 shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 opacity-60" />
          </div>

          <p className="text-[15px] text-slate-400 leading-relaxed max-w-lg font-medium">
            Vocalize is the world’s first voice-first retail stock manager. Speak naturally to parse transaction audits, align duplicates, and update listings hands-free.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mt-2">
            <button 
              onClick={() => navigate(user ? '/dashboard' : '/signup')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-violet-500/25 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-white/90" />
              {user ? 'Go to Dashboard' : 'Start Free Sandbox'}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={onLaunchDemo}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-slate-800 bg-slate-950/40 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider hover:border-slate-700 hover:bg-slate-900/40 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Launch Demo Dashboard
            </button>
          </div>

          {/* Lower Features Row */}
          <div className="flex flex-wrap items-center gap-6 mt-6 pt-8 border-t border-slate-900/60 text-left w-full select-none">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/15 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Secure by design</h4>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Your data stays yours</p>
              </div>
            </div>

            <div className="hidden sm:block h-8 w-[1px] bg-slate-900/60" />

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/15 mt-0.5">
                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Voice-first AI</h4>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Fast. Accurate. Natural.</p>
              </div>
            </div>

            <div className="hidden sm:block h-8 w-[1px] bg-slate-900/60" />

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/15 mt-0.5">
                <Sparkles className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Built for retail</h4>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">From stores, for stores</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Hero Graphic: High Fidelity Interactive Shield & Floating Particles */}
        <div className="w-full md:w-[50%] flex justify-center relative select-none">
          <div className="relative w-96 h-96 flex items-center justify-center">
            
            {/* Ambient glows and rotating high-tech orbits */}
            <div className="absolute w-[95%] h-[95%] rounded-full border border-violet-500/20 border-dashed animate-spin-slow opacity-60 pointer-events-none" />
            <div className="absolute w-[80%] h-[80%] rounded-full border border-indigo-500/15 animate-spin opacity-45 pointer-events-none" style={{ animationDuration: '12s', animationDirection: 'reverse' }} />
            <div className="absolute w-[65%] h-[65%] rounded-full border border-cyan-500/10 border-dashed animate-spin-slow opacity-30 pointer-events-none" style={{ animationDuration: '25s' }} />
            
            {/* Glowing radial backdrop */}
            <div className="absolute w-72 h-72 rounded-full bg-gradient-to-tr from-violet-600/10 via-fuchsia-600/10 to-cyan-500/10 blur-3xl animate-glow-pulse pointer-events-none" />

            {/* Orbiting/floating light particles */}
            <div className="absolute w-2 h-2 rounded-full bg-violet-400 blur-[2px] animate-float pointer-events-none" style={{ top: '15%', left: '20%', animationDelay: '0.2s', animationDuration: '4s' }} />
            <div className="absolute w-2 h-2 rounded-full bg-cyan-400 blur-[2px] animate-float pointer-events-none" style={{ bottom: '20%', right: '15%', animationDelay: '1.5s', animationDuration: '5s' }} />
            <div className="absolute w-1.5 h-1.5 rounded-full bg-fuchsia-400 blur-[2px] animate-float pointer-events-none" style={{ top: '25%', right: '25%', animationDelay: '0.8s', animationDuration: '3s' }} />

            {/* Central Circle holding the Large Brand Logo */}
            <div className="relative z-10 w-80 h-80 flex items-center justify-center">
              {/* Floating Shield Logo Image in the center */}
              <div className="absolute w-72 h-72 flex items-center justify-center z-10 animate-float pointer-events-none">
                <img 
                  src={logoWithoutText} 
                  alt="Vocalize Shield Logo" 
                  className="w-full h-full object-contain drop-shadow-[0_15px_35px_rgba(139,92,246,0.35)]"
                />
              </div>
            </div>

            {/* Overlapping Info Chip 1: Continuous Auditing */}
            <div className="absolute -top-4 -right-10 md:-right-12 bg-slate-950/80 backdrop-blur border border-purple-500/25 px-4 py-3 rounded-2xl flex items-center gap-3.5 shadow-2xl hover:border-purple-500/45 transition-all duration-300 w-60 md:w-64 text-left z-20 animate-float" style={{ animationDelay: '0.4s' }}>
              <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(168,85,247,0.15)]">
                <Mic className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h4 className="text-[11.5px] font-bold text-white tracking-wide">Continuous Auditing</h4>
                <p className="text-[9.5px] text-slate-400 font-semibold mt-0.5">Always listening. Always updating.</p>
              </div>
            </div>

            {/* Overlapping Info Chip 2: Live History Timeline */}
            <div className="absolute -bottom-4 -right-6 md:-right-8 bg-slate-950/80 backdrop-blur border border-purple-500/25 px-4 py-3 rounded-2xl flex items-center gap-3.5 shadow-2xl hover:border-purple-500/45 transition-all duration-300 w-52 md:w-56 text-left z-20 animate-float" style={{ animationDelay: '1.2s' }}>
              <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(168,85,247,0.15)]">
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h4 className="text-[11.5px] font-bold text-white tracking-wide">Live History Timeline</h4>
                <p className="text-[9.5px] text-slate-400 font-semibold mt-0.5">Every change, in real time.</p>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* 3. Core Features Section */}
      <section id="features" className="border-t border-slate-900/60 bg-slate-950/10 py-20 relative z-10 select-none">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-12">
          
          <div className="text-center flex flex-col items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-violet-500/30 bg-violet-950/40 text-violet-400 font-bold uppercase text-[10px] tracking-wider shadow-[0_0_12px_rgba(168,85,247,0.15)]">
              <Cpu className="w-3.5 h-3.5 text-violet-400" />
              Core Architecture
            </div>
            <h2 className="text-3xl lg:text-4.5xl font-black text-white tracking-tight mt-2 text-center">
              Features Built for <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-500 via-purple-400 to-cyan-400">Real-World Retail</span>
            </h2>
            <p className="text-sm text-slate-400 font-medium max-w-xl text-center leading-relaxed">
              Powerful capabilities designed to simplify cataloging, protect your data,<br className="hidden sm:inline" /> and give you real-time inventory intelligence.
            </p>
            
            {/* Custom Divider */}
            <div className="flex items-center gap-3 w-full justify-center mt-2 select-none">
              <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-violet-500/50" />
              <div className="h-1.5 w-10 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.7)]" />
              <div className="h-[1px] w-16 bg-gradient-to-r from-violet-500/50 to-transparent" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            
            {/* Feature 1 */}
            <div className="relative overflow-hidden rounded-3xl p-8 bg-[#080b15]/95 border border-purple-500/20 hover:border-purple-500/40 hover:-translate-y-1 transition-all duration-300 shadow-[0_0_25px_rgba(168,85,247,0.03)] hover:shadow-[0_0_35px_rgba(168,85,247,0.12)] flex flex-col justify-between h-full text-left">
              <div>
                <div className="flex items-center justify-between">
                  <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                    <div className="absolute inset-0 rounded-full border border-purple-500/30 border-dashed animate-spin-slow opacity-60" />
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)] z-10">
                      <Mic className="w-4.5 h-4.5 text-white" />
                    </div>
                  </div>
                  <span className="text-2xl font-black font-terminal text-purple-950/40 tracking-tight">01</span>
                </div>

                <h3 className="text-[17px] font-bold text-white tracking-tight mt-6">
                  Compound Voice Parsing
                </h3>
                <div className="w-8 h-[2px] bg-purple-500 mt-2.5 rounded-full" />

                <p className="text-sm text-slate-400 mt-4 leading-relaxed font-normal">
                  Say goodbye to single-command limitations. Our system parses complex compound speech clauses like <span className="text-purple-400 font-semibold">“Add 10 sugar but remove 5 flour”</span> in a single breath.
                </p>
              </div>

              <div className="flex items-center gap-2 mt-6 select-none">
                <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] shrink-0" />
                <div className="h-[1px] flex-1 border-t border-dashed border-purple-500/25" />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="relative overflow-hidden rounded-3xl p-8 bg-[#080b15]/95 border border-purple-500/20 hover:border-purple-500/40 hover:-translate-y-1 transition-all duration-300 shadow-[0_0_25px_rgba(168,85,247,0.03)] hover:shadow-[0_0_35px_rgba(168,85,247,0.12)] flex flex-col justify-between h-full text-left">
              <div>
                <div className="flex items-center justify-between">
                  <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                    <div className="absolute inset-0 rounded-full border border-purple-500/30 border-dashed animate-spin-slow opacity-60" />
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)] z-10">
                      <Sparkles className="w-4.5 h-4.5 text-white" />
                    </div>
                  </div>
                  <span className="text-2xl font-black font-terminal text-purple-950/40 tracking-tight">02</span>
                </div>

                <h3 className="text-[17px] font-bold text-white tracking-tight mt-6">
                  Semantic Synonym Alignment
                </h3>
                <div className="w-8 h-[2px] bg-purple-500 mt-2.5 rounded-full" />

                <p className="text-sm text-slate-400 mt-4 leading-relaxed font-normal">
                  Prevent catalogue duplication. Gemini and fuzzy matching align spoken synonyms (like <span className="text-purple-400 font-semibold">“water”</span>) directly to existing listings (like <span className="text-purple-400 font-semibold">“water bottle”</span>).
                </p>
              </div>

              <div className="flex items-center gap-2 mt-6 select-none">
                <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] shrink-0" />
                <div className="h-[1px] flex-1 border-t border-dashed border-purple-500/25" />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="relative overflow-hidden rounded-3xl p-8 bg-[#080b15]/95 border border-blue-500/20 hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-300 shadow-[0_0_25px_rgba(59,130,246,0.03)] hover:shadow-[0_0_35px_rgba(59,130,246,0.12)] flex flex-col justify-between h-full text-left">
              <div>
                <div className="flex items-center justify-between">
                  <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                    <div className="absolute inset-0 rounded-full border border-blue-500/30 border-dashed animate-spin-slow opacity-60" />
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)] z-10">
                      <ShieldCheck className="w-4.5 h-4.5 text-white" />
                    </div>
                  </div>
                  <span className="text-2xl font-black font-terminal text-blue-950/40 tracking-tight">03</span>
                </div>

                <h3 className="text-[17px] font-bold text-white tracking-tight mt-6">
                  Secure Profile Isolation
                </h3>
                <div className="w-8 h-[2px] bg-blue-500 mt-2.5 rounded-full" />

                <p className="text-sm text-slate-400 mt-4 leading-relaxed font-normal">
                  Your store, your stats. Every registered merchant gets a dedicated empty inventory board and secure timeline database, fully isolated at the query tier.
                </p>
              </div>

              <div className="flex items-center gap-2 mt-6 select-none">
                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] shrink-0" />
                <div className="h-[1px] flex-1 border-t border-dashed border-blue-500/25" />
              </div>
            </div>

            {/* Feature 4 */}
            <div className="relative overflow-hidden rounded-3xl p-8 bg-[#080b15]/95 border border-purple-500/20 hover:border-purple-500/40 hover:-translate-y-1 transition-all duration-300 shadow-[0_0_25px_rgba(168,85,247,0.03)] hover:shadow-[0_0_35px_rgba(168,85,247,0.12)] flex flex-col justify-between h-full text-left">
              <div>
                <div className="flex items-center justify-between">
                  <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                    <div className="absolute inset-0 rounded-full border border-purple-500/30 border-dashed animate-spin-slow opacity-60" />
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)] z-10">
                      <UploadCloud className="w-4.5 h-4.5 text-white" />
                    </div>
                  </div>
                  <span className="text-2xl font-black font-terminal text-purple-950/40 tracking-tight">04</span>
                </div>

                <h3 className="text-[17px] font-bold text-white tracking-tight mt-6">
                  Turn Handwritten Inventory into Real Inventory
                </h3>
                <div className="w-8 h-[2px] bg-purple-500 mt-2.5 rounded-full" />

                <p className="text-sm text-slate-400 mt-4 leading-relaxed font-normal">
                  Upload a handwritten ledger sheet or scanned document to instantly initialize your entire products catalog with quantities and prices using Gemini OCR.
                </p>
              </div>

              <div className="flex items-center gap-2 mt-6 select-none">
                <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] shrink-0" />
                <div className="h-[1px] flex-1 border-t border-dashed border-purple-500/25" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4a. Interactive Voice Simulator Section */}
      <section id="voice-simulator" className="border-t border-slate-900/60 py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
          
          {/* Left Description Column */}
          <div className="w-full md:w-[45%] flex flex-col items-center md:items-start text-center md:text-left gap-5 select-none">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 font-bold uppercase text-[10px] tracking-wider">
              <Target className="w-3.5 h-3.5" />
              Sandbox Preview A
            </div>
            <h2 className="text-3xl lg:text-4.5xl font-black text-white tracking-tight leading-tight">
              Mic & Voice Command <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                Quality Testing.
              </span>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed font-medium">
              Experience the natural speech parsing engine. Enter compound statements (such as adding stock to one item and selling another in a single breath) to test arithmetic logs and grid updates in real time.
            </p>

            {/* Quick Template Tag suggestions */}
            <div className="flex flex-col sm:flex-row gap-4 mt-2 w-full">
              <button 
                onClick={() => setVoiceSimText('add 12 bags of rice and sold 3 now')}
                className="flex-1 flex items-center gap-3.5 p-3.5 rounded-2xl border border-indigo-500/20 bg-slate-950/40 text-left hover:border-indigo-500/40 hover:bg-indigo-950/10 transition group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/15">
                  <svg className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M17 5v14M22 9v6M7 5v14M2 9v6" />
                  </svg>
                </div>
                <span className="text-[11px] font-mono text-slate-300 leading-normal">
                  "add 12 bags of rice and sold 3"
                </span>
              </button>

              <button 
                onClick={() => setVoiceSimText('sold 15 kg of sugar but set rice price to 90')}
                className="flex-1 flex items-center gap-3.5 p-3.5 rounded-2xl border border-fuchsia-500/20 bg-slate-950/40 text-left hover:border-fuchsia-500/40 hover:bg-fuchsia-950/10 transition group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center shrink-0 border border-fuchsia-500/15">
                  <svg className="w-5 h-5 text-fuchsia-400 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M17 5v14M22 9v6M7 5v14M2 9v6" />
                  </svg>
                </div>
                <span className="text-[11px] font-mono text-slate-300 leading-normal">
                  "sold 15 kg of sugar..."
                </span>
              </button>
            </div>

            {/* Decorative Ambient Soundwave */}
            <div className="relative w-full h-16 flex items-end justify-center gap-[3px] overflow-hidden mt-6 opacity-75">
              {Array.from({ length: 45 }).map((_, i) => {
                const distFromCenter = Math.abs(i - 22);
                const baseHeight = Math.max(4, 36 - distFromCenter * 1.5);
                const randomHeight = baseHeight + (i % 3 === 0 ? 8 : i % 2 === 0 ? -4 : 2);
                const height = Math.max(6, Math.min(52, randomHeight));
                return (
                  <div 
                    key={i} 
                    className="w-[3px] bg-gradient-to-t from-violet-600/80 to-indigo-400/80 rounded-full"
                    style={{ 
                      height: `${height}px`,
                      animation: 'soundwave 1.8s ease-in-out infinite alternate',
                      animationDelay: `${i * 0.03}s`
                    }} 
                  />
                );
              })}
              <div className="absolute bottom-0 w-32 h-6 bg-violet-600/10 blur-xl rounded-full" />
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
                <span className="text-[10px] font-bold text-slate-500 font-mono ml-2 uppercase">voice-sandbox-terminal.sh</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-bold text-emerald-400 font-mono uppercase tracking-wider">Voice Sim</span>
              </div>
            </div>

            {/* Interactive Input Form */}
            <div className="flex flex-col gap-6">
              
              {/* Concentric rings Microphone trigger flanking soundwave lines */}
              <div className="flex items-center justify-center gap-6 py-2 select-none">
                {/* Left soundwave line blocks */}
                <div className="flex items-center gap-[3px] opacity-70">
                  {[8, 16, 24, 12, 32, 20, 14, 8].map((h, idx) => (
                    <div 
                      key={idx} 
                      className="w-[2px] bg-indigo-500/40 rounded-full transition-all duration-300"
                      style={{ 
                        height: `${h}px`,
                        animation: isListening ? 'soundwave-mini 1s ease-in-out infinite alternate' : 'none',
                        animationDelay: `${idx * 0.08}s`
                      }}
                    />
                  ))}
                </div>

                {/* Mic concentric rings */}
                <div className="relative flex items-center justify-center">
                  <div className={`absolute w-24 h-24 rounded-full bg-violet-500/5 blur-md transition-all duration-300 ${isListening ? 'bg-rose-500/10 shadow-[0_0_25px_rgba(239,68,68,0.2)]' : ''}`} />
                  
                  <div className={`absolute w-18 h-18 rounded-full border border-violet-500/20 flex items-center justify-center transition-all ${
                    isListening ? 'animate-ping border-rose-500/40 w-22 h-22' : 'animate-pulse'
                  }`} />
                  
                  <div className={`absolute w-14 h-14 rounded-full border flex items-center justify-center bg-slate-950/60 shadow-[0_0_15px_rgba(139,92,246,0.15)] transition-all ${
                    isListening ? 'border-rose-500/30' : 'border-violet-500/40'
                  }`} />
                  
                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={voiceSimStep !== 'idle'}
                    className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 border ${
                      isListening 
                        ? 'bg-rose-600 border-rose-500 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]' 
                        : 'bg-gradient-to-b from-indigo-600 to-violet-600 border-indigo-500/80 text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)] hover:border-violet-400'
                    }`}
                  >
                    <Mic className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Right soundwave line blocks */}
                <div className="flex items-center gap-[3px] opacity-70">
                  {[8, 14, 20, 32, 12, 24, 16, 8].map((h, idx) => (
                    <div 
                      key={idx} 
                      className="w-[2px] bg-indigo-500/40 rounded-full transition-all duration-300"
                      style={{ 
                        height: `${h}px`,
                        animation: isListening ? 'soundwave-mini 1s ease-in-out infinite alternate' : 'none',
                        animationDelay: `${idx * 0.08}s`
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Click to start label */}
              <div className="text-center -mt-3 mb-1">
                <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-400 transition-all duration-200">
                  {isListening ? (
                    <span className="text-rose-400 animate-pulse">Listening... Speak now</span>
                  ) : (
                    <span>Click to start listening</span>
                  )}
                </span>
              </div>

              {/* Text Input Row */}
              <div className="relative">
                <input 
                  type="text"
                  value={voiceSimText}
                  onChange={(e) => setVoiceSimText(e.target.value)}
                  placeholder="Or edit speech transcript manually..."
                  disabled={voiceSimStep !== 'idle'}
                  className="w-full pl-4.5 pr-28 py-3 text-xs rounded-xl glass-input text-slate-200 border border-slate-800/80 focus:border-violet-600/50 outline-none transition"
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                  {voiceSimStep !== 'idle' ? (
                    <button 
                      onClick={handleResetVoiceSim}
                      className="px-4 py-1.5 rounded-full bg-slate-900 hover:bg-slate-855 border border-slate-800 text-[11px] font-bold text-slate-355 cursor-pointer transition-all"
                    >
                      Reset
                    </button>
                  ) : (
                    <button 
                      onClick={handleSimulateVoice}
                      className="px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-[11px] font-bold text-white shadow shadow-violet-600/20 hover:shadow-violet-600/30 flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Simulate
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Simulated Wave/Ripples when processing */}
            {voiceSimStep === 'analyzing' && (
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

            {voiceSimStep === 'applying' && (
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
                  {voiceSimProducts.map((p, idx) => {
                    const emoji = p.name === 'rice' ? '🌾' : p.name === 'sugar' ? '🍯' : '📦';
                    return (
                      <tr key={idx} className="border-b border-slate-900/40 hover:bg-slate-900/10 transition">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-sm shrink-0 shadow-inner">
                              {emoji}
                            </div>
                            <span className="font-bold text-slate-200 capitalize">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`inline-block border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 font-bold px-2.5 py-1 rounded-lg text-[10px] ${
                            p.name === 'rice' && voiceSimStep === 'done'
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 animate-pulse'
                              : ''
                          }`}>
                            {p.quantity} {p.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-300">₹{p.price}</td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                            <span className={`text-[10px] ${
                              p.updated.startsWith('Updated Just')
                                ? 'text-emerald-400 font-bold animate-pulse'
                                : 'text-slate-500'
                            }`}>
                              {p.updated}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Logs timeline rendering inside simulator */}
            <div className="mt-4 border-t border-slate-900 pt-4 text-left">
              <div className="flex items-center gap-1.5 mb-2.5 select-none">
                <Terminal className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest font-terminal">&gt;_ AUDIT EXECUTION LOG</span>
              </div>
              <div className="flex flex-col gap-1 p-2 rounded-lg bg-slate-950/60 border border-slate-900 font-terminal text-[10px] min-h-[72px] justify-center">
                {voiceSimLogs.map((log, idx) => {
                  const { text, time } = getVoiceLogDetails(log);
                  const isSuccess = log.includes('Success') || log.includes('🟢');
                  return (
                    <div key={idx} className="flex items-center justify-between py-1 px-2 rounded hover:bg-slate-900/30 transition">
                      <div className="flex items-center gap-2 text-slate-350 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className={`truncate ${isSuccess ? 'text-emerald-400 font-bold' : ''}`}>
                          {text}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono shrink-0 ml-4">
                        {time}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </section>

      <section id="ledger-simulator" className="border-t border-slate-900/60 py-20 relative z-10 bg-slate-950/10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row-reverse items-center gap-12">
          
          {/* Left Description Column */}
          <div className="w-full md:w-[45%] flex flex-col items-center md:items-start text-center md:text-left gap-5 select-none">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-bold uppercase text-[10px] tracking-wider">
              <Target className="w-3.5 h-3.5" />
              Sandbox Preview B
            </div>
            <h2 className="text-3xl lg:text-4.5xl font-black text-white tracking-tight leading-tight">
              AI Ledger Document <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-300">
                Importing & OCR.
              </span>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed font-medium">
              Experience Gemini document intelligence. Upload any handwritten stock note, invoice image, or inventory PDF catalog to parse lists, extract tabular attributes, and initialize your stock grid automatically.
            </p>
            <div className="w-full flex items-start gap-4 p-5 rounded-2xl bg-indigo-950/10 border border-violet-500/35 hover:border-violet-500/50 shadow-[0_0_20px_rgba(139,92,246,0.08)] transition-all mt-2 text-left">
              <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(139,92,246,0.2)]">
                <Cpu className="w-5 h-5 text-violet-400" />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">Gemini Multimodal Parser</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  understands lists, unstructured data and figures across various formats with high accuracy.
                </p>
              </div>
            </div>

            {/* Minimal Book-to-Excel transition animation */}
            <div className="w-full flex flex-col items-center justify-center py-6 mt-4 border border-slate-900/60 rounded-2xl bg-slate-950/20 select-none">
              <div className="w-full max-w-[260px] h-20 flex items-center justify-center">
                <svg width="240" height="80" viewBox="0 0 240 80" className="overflow-visible">
                  {/* Connection path curve */}
                  <path d="M 52,38 Q 120,15 188,38" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4,4" />
                  
                  {/* Floating particles moving from book to sheet */}
                  <circle r="3" fill="#818cf8">
                    <animateMotion dur="2.5s" repeatCount="indefinite" path="M 52,38 Q 120,15 188,38" begin="0s" />
                  </circle>
                  <circle r="2.5" fill="#22d3ee">
                    <animateMotion dur="2.5s" repeatCount="indefinite" path="M 52,38 Q 120,15 188,38" begin="0.8s" />
                  </circle>
                  <circle r="2" fill="#6366f1">
                    <animateMotion dur="2.5s" repeatCount="indefinite" path="M 52,38 Q 120,15 188,38" begin="1.6s" />
                  </circle>

                  {/* Book Icon Group */}
                  <g transform="translate(15, 22)">
                    <rect x="-4" y="-4" width="40" height="40" rx="8" fill="rgba(99, 102, 241, 0.05)" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="1" />
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </g>

                  {/* Spreadsheet Icon Group */}
                  <g transform="translate(193, 22)">
                    <rect x="-4" y="-4" width="40" height="40" rx="8" fill="rgba(6, 182, 212, 0.05)" stroke="rgba(6, 182, 212, 0.15)" strokeWidth="1" />
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
                    </svg>
                  </g>
                </svg>
              </div>
              <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase mt-3">
                Ledger notes &rarr; Structured database
              </span>
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
                <span className="text-[10px] font-bold text-slate-500 font-mono ml-2 uppercase">ledger-sandbox-terminal.sh</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-[9px] font-bold text-cyan-400 font-mono uppercase tracking-wider">Sandbox Mode</span>
              </div>
            </div>

            {/* Interactive Input Form */}
            <div className="flex flex-col gap-3">
              {ocrSimStep === 'idle' && (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-500/20 hover:border-indigo-500/40 rounded-2xl p-10 bg-slate-950/20 transition-all duration-200 relative group min-h-[260px]">
                  {/* Glowing background halo */}
                  <div className="absolute w-16 h-16 rounded-full bg-indigo-500/5 blur-xl group-hover:bg-indigo-500/10 transition-colors" />
                  
                  {/* Glowing cloud icon */}
                  <div className="relative z-10 p-4 rounded-full bg-indigo-500/5 border border-indigo-500/10 mb-4 group-hover:scale-105 transition-transform">
                    <svg className="w-10 h-10 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 13v8M12 13l3-3M12 13l-3-3" />
                      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                      <path d="M12 13v8" />
                    </svg>
                  </div>

                  <p className="text-xs font-bold text-slate-200 text-center mb-1 relative z-10 select-none">
                    Select a bank statement, ledger sheet or invoice PDF
                  </p>
                  <p className="text-[10px] text-slate-500 text-center mb-5 relative z-10 select-none font-semibold">
                    PDF, JPG, PNG, WEBP, JPEG • Max 20MB
                  </p>

                  <label className="px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-violet-600/20 hover:shadow-violet-600/35 transition-all duration-200 cursor-pointer flex items-center gap-2 select-none relative z-10">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleSimulateLedgerUpload}
                      className="hidden"
                    />
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                    Upload File
                  </label>

                  <span className="text-[10px] text-slate-500 mt-3 font-semibold relative z-10 select-none">
                    or drag and drop here
                  </span>
                </div>
              )}

              {ocrSimStep === 'error' && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span>Failed to parse document: {ocrError}</span>
                  <button onClick={handleResetOcrSim} className="px-4 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-full text-slate-350 font-bold transition cursor-pointer shrink-0">Try Again</button>
                </div>
              )}

              {ocrSimStep !== 'idle' && ocrSimStep !== 'error' && (
                <div className="flex justify-end select-none">
                  <button 
                    onClick={handleResetOcrSim}
                    className="px-4 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-slate-300 cursor-pointer transition-all"
                  >
                    Scan Another
                  </button>
                </div>
              )}
            </div>

            {/* Simulated Wave/Ripples when processing */}
            {ocrSimStep === 'analyzing' && (
              <div className="flex items-center justify-center gap-1.5 py-4 border-t border-slate-900 mt-4 select-none">
                <div className="w-1.5 bg-cyan-500 rounded-full animate-soundwave h-8" style={{ animationDelay: '0.1s' }} />
                <div className="w-1.5 bg-indigo-500 rounded-full animate-soundwave h-8" style={{ animationDelay: '0.3s' }} />
                <div className="w-1.5 bg-cyan-400 rounded-full animate-soundwave h-8" style={{ animationDelay: '0.5s' }} />
                <div className="w-1.5 bg-indigo-400 rounded-full animate-soundwave h-8" style={{ animationDelay: '0.2s' }} />
                <span className="text-[10px] text-cyan-400 font-bold font-mono pl-3 uppercase tracking-wider animate-pulse">
                  Gemini AI scanning and parsing ledger document...
                </span>
              </div>
            )}

            {/* Table rendering simulated rows */}
            {ocrSimProducts.length > 0 && (
              <div className="border border-slate-900/60 rounded-xl overflow-hidden mt-4 bg-slate-950/30">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-950/40 text-[9px] font-bold text-slate-500 uppercase tracking-widest select-none">
                      <th className="py-2.5 px-4">Extracted Product</th>
                      <th className="py-2.5 px-4 text-center">Stock</th>
                      <th className="py-2.5 px-4">Unit Price</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] font-medium text-slate-300">
                    {ocrSimProducts.map((p, idx) => {
                      const lowerName = p.name.toLowerCase();
                      const emoji = lowerName.includes('rice') ? '🌾' : 
                                    lowerName.includes('sugar') || lowerName.includes('honey') ? '🍯' : '📦';
                      return (
                        <tr key={idx} className="border-b border-slate-900/40 hover:bg-slate-900/10 transition">
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-sm shrink-0 shadow-inner">
                                {emoji}
                              </div>
                              <span className="font-bold text-slate-200 capitalize">{p.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="inline-block border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 font-bold px-2.5 py-1 rounded-lg text-[10px]">
                              {p.quantity} {p.unit}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-300">₹{p.price}</td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                              <span className="text-[10px] text-emerald-400 font-bold animate-pulse">
                                {p.updated}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Logs timeline rendering inside simulator */}
            <div className="mt-4 border-t border-slate-900 pt-4 text-left">
              <div className="flex items-center gap-1.5 mb-2.5 select-none">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-terminal">&gt;_ OCR EXECUTION LOG</span>
              </div>
              <div className="flex flex-col gap-1 p-2 rounded-lg bg-slate-950/60 border border-slate-900 font-terminal text-[10px] min-h-[72px] justify-center">
                {ocrSimLogs.map((log, idx) => {
                  const { text, time } = getOcrLogDetails(log);
                  const isSuccess = log.includes('Success') || log.includes('🟢');
                  return (
                    <div key={idx} className="flex items-center justify-between py-1 px-2 rounded hover:bg-slate-900/30 transition">
                      <div className="flex items-center gap-2 text-slate-350 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className={`truncate ${isSuccess ? 'text-emerald-400 font-bold' : ''}`}>
                          {text}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-mono shrink-0 ml-4">
                        {time}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. Testimonials Section */}
      <section id="testimonials" className="border-t border-slate-900/60 bg-slate-950/10 py-20 relative z-10 select-none">
        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-12">
          
          <div className="text-center flex flex-col items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-violet-500/30 bg-violet-950/40 text-violet-400 font-bold uppercase text-[10px] tracking-wider shadow-[0_0_12px_rgba(168,85,247,0.1)]">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              Merchant Reviews
            </div>
            <h2 className="text-3xl lg:text-5xl font-black text-white tracking-tight mt-2">
              Loved by <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400">Independent Store Owners</span>
            </h2>
            <p className="text-sm text-slate-400 font-medium">Real stories from merchants who trust Vocalize every day.</p>
            
            {/* Pulsing divider with heart */}
            <div className="flex items-center gap-4 w-full max-w-[200px] justify-center mt-2">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-violet-500/60" />
              <span className="text-violet-400 text-xs animate-pulse">💜</span>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-violet-500/60 to-transparent" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Testimonial 1 */}
            <div className="rounded-3xl p-8 bg-[#090d16]/80 border border-violet-500/20 hover:border-violet-500/40 shadow-[0_0_25px_rgba(168,85,247,0.03)] hover:shadow-[0_0_35px_rgba(168,85,247,0.08)] transition-all duration-300 flex flex-col justify-between gap-6 text-left">
              <div className="flex items-center justify-between">
                {/* 5 Stars */}
                <div className="flex items-center gap-1 text-violet-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  ))}
                </div>
                {/* Double Quotes */}
                <svg className="w-8 h-8 text-violet-500/30 rotate-180" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>

              <p className="text-[15px] text-slate-300 leading-relaxed font-normal">
                "Vocalize completely altered how I audit our bags of grains. Instead of climbing up with pen and paper, I just stand there, press record, and speak naturally. It saves me at least 2 hours of cataloging every evening."
              </p>
              
              <div className="w-full h-[1px] bg-slate-900/60" />

              <div className="flex items-center gap-4.5">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center font-bold text-sm text-white shrink-0 border border-violet-400/20 shadow-md">
                  AK
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-slate-200">Aakash Raj</h4>
                    <svg className="w-4 h-4 text-violet-400 fill-current shadow-sm" viewBox="0 0 24 24">
                      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </div>
                  <p className="text-[11px] text-slate-500 font-semibold tracking-wide">{`Wholesale Grocery Merchant`}</p>
                  
                  {/* Ahmedabad location badge */}
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-950/30 border border-indigo-500/10 text-[9px] font-bold text-indigo-400 mt-2.5 w-fit">
                    <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                      <path d="M3 9l3-6h12l3 6M12 3v6" />
                    </svg>
                    Ahmedabad, India
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="rounded-3xl p-8 bg-[#090d16]/80 border border-violet-500/20 hover:border-violet-500/40 shadow-[0_0_25px_rgba(168,85,247,0.03)] hover:shadow-[0_0_35px_rgba(168,85,247,0.08)] transition-all duration-300 flex flex-col justify-between gap-6 text-left">
              <div className="flex items-center justify-between">
                {/* 5 Stars */}
                <div className="flex items-center gap-1 text-violet-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  ))}
                </div>
                {/* Double Quotes */}
                <svg className="w-8 h-8 text-violet-500/30 rotate-180" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>

              <p className="text-[15px] text-slate-300 leading-relaxed font-normal">
                "The AI semantic duplicate checker is pure magic. I said 'sold 2 bottles of water' and it automatically resolved it to our existing 'water bottle' catalog item instead of creating a new product. Extremely accurate!"
              </p>
              
              <div className="w-full h-[1px] bg-slate-900/60" />

              <div className="flex items-center gap-4.5">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center font-bold text-sm text-white shrink-0 border border-violet-400/20 shadow-md">
                  SN
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-slate-200">Sarah Nair</h4>
                    <svg className="w-4 h-4 text-violet-400 fill-current shadow-sm" viewBox="0 0 24 24">
                      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </div>
                  <p className="text-[11px] text-slate-500 font-semibold tracking-wide">{`General Store Manager`}</p>
                  
                  {/* Kochi location badge */}
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-950/30 border border-indigo-500/10 text-[9px] font-bold text-indigo-400 mt-2.5 w-fit">
                    <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                      <path d="M3 9l3-6h12l3 6M12 3v6" />
                    </svg>
                    Kochi, India
                  </div>
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
            onClick={() => navigate(user ? '/dashboard' : '/signup')}
            className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-violet-500/25 transition cursor-pointer"
          >
            {user ? 'Go to Dashboard' : 'Sign Up Now'}
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
            <a href="#voice-simulator" className="hover:text-slate-300 transition">Voice Sim</a>
            <a href="#ledger-simulator" className="hover:text-slate-300 transition">Ledger Scanner</a>
            <button 
              onClick={onLaunchDemo}
              className="hover:text-slate-300 transition cursor-pointer uppercase font-semibold animate-pulse"
            >
              Guest Demo
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
