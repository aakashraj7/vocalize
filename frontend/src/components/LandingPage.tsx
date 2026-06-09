import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Play, Mic, Activity, ArrowRight, ShieldCheck, Terminal, UploadCloud 
} from 'lucide-react';

import logoWithText from '../assets/vocalize-logo-with-text.png';
import logoWithoutText from '../assets/vocalize-logo-without-text.png';

interface LandingPageProps {
  onLaunchDemo: () => void;
}

export default function LandingPage({ onLaunchDemo }: LandingPageProps) {
  const navigate = useNavigate();

  // Landing Page Interactive Simulator States
  const [simText, setSimText] = useState('add 12 bags of rice and sold 3 now');
  const [simStep, setSimStep] = useState<'idle' | 'analyzing' | 'applying' | 'done' | 'ledgerError'>('idle');
  const [simProducts, setSimProducts] = useState([
    { name: 'rice', quantity: 4, unit: 'bags', price: 80, updated: 'Updated 2 hours ago' },
    { name: 'sugar', quantity: 45, unit: 'kg', price: 15, updated: 'Updated yesterday' }
  ]);
  const [simLogs, setSimLogs] = useState<string[]>([
    '📝 Initialized inventory grid'
  ]);
  const [ledgerError, setLedgerError] = useState('');

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
    setLedgerError('');
    setSimProducts([
      { name: 'rice', quantity: 4, unit: 'bags', price: 80, updated: 'Updated 2 hours ago' },
      { name: 'sugar', quantity: 45, unit: 'kg', price: 15, updated: 'Updated yesterday' }
    ]);
    setSimLogs(['📝 Initialized inventory grid']);
  };

  const handleSimulateLedgerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // Validate size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      setLedgerError('File exceeds 20MB limit.');
      setSimStep('ledgerError');
      return;
    }

    setSimStep('analyzing');
    setSimLogs([
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
          setSimProducts(items.map((it: any) => ({
            name: it.name,
            quantity: it.quantity,
            unit: it.unit || 'pcs',
            price: it.price || 0,
            updated: 'Extracted Just Now!'
          })));

          setSimLogs(prev => [
            ...prev,
            `✓ Success: Extracted ${items.length} items.`,
            `🟢 Grid initialized with scanned products catalog!`
          ]);
          setSimStep('done');
        } else {
          setLedgerError(data.error || 'Failed to analyze the document.');
          setSimStep('ledgerError');
        }
      } catch (err: any) {
        setLedgerError(err.message || 'Error uploading file.');
        setSimStep('ledgerError');
      }
    };
    reader.readAsDataURL(file);
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
              <a href="#simulator" className="hover:text-white transition">Live Simulator</a>
              <a href="#testimonials" className="hover:text-white transition">Merchant Reviews</a>
              <button 
                onClick={onLaunchDemo}
                className="hover:text-violet-400 transition text-left cursor-pointer font-semibold"
              >
                Instant Sandbox Demo
              </button>
            </nav>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
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
            </div>
          </div>
        </header>
      </div>

      {/* 2. Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-32 pb-20 md:pt-40 md:pb-28 flex flex-col md:flex-row items-center gap-12 z-10">
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
              onClick={() => navigate('/signup')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-violet-500/20 transition cursor-pointer"
            >
              Start Free Sandbox
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={onLaunchDemo}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
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

            {/* Feature 4 - Right slanted morphing leaf */}
            <div className="glass-card p-8 text-left flex flex-col gap-5 transition-all duration-700 rounded-tr-[72px] rounded-bl-[72px] rounded-tl-[18px] rounded-br-[18px] hover:rounded-tr-[18px] hover:rounded-bl-[18px] hover:rounded-tl-[72px] hover:rounded-br-[72px] border border-violet-500/10 hover:border-violet-500/35 hover:shadow-[0_0_35px_-5px_rgba(139,92,246,0.15)] hover:-translate-y-1">
              <div className="p-3.5 bg-violet-600/15 border border-violet-500/25 rounded-2xl w-fit">
                <UploadCloud className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-200 tracking-tight">Turn Handwritten Inventory into Real Inventory</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  Upload a handwritten ledger sheet or scanned document to instantly initialize your entire products catalog with quantities and prices using Gemini OCR.
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
                  {simStep !== 'idle' && simStep !== 'ledgerError' ? (
                    <button 
                      onClick={handleResetSimulator}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 cursor-pointer"
                    >
                      Reset
                    </button>
                  ) : simStep === 'idle' ? (
                    <button 
                      onClick={handleSimulate}
                      className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-[10px] font-bold text-white shadow shadow-violet-500/10 cursor-pointer"
                    >
                      Simulate
                    </button>
                  ) : null}
                </div>
              </div>

              {/* public ledger scanner upload option on landing page */}
              {simStep === 'idle' && (
                <div className="flex items-center justify-between border border-dashed border-slate-800/60 rounded-xl px-4 py-2.5 bg-slate-950/20 text-[10px]">
                  <div className="flex items-center gap-2 text-slate-450">
                    <UploadCloud className="w-4 h-4 text-violet-400 animate-pulse" />
                    <span>Or experience the AI Ledger Scanner by uploading an image of your inventory:</span>
                  </div>
                  <label className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white font-bold text-slate-300 transition duration-150 cursor-pointer flex items-center gap-1 select-none whitespace-nowrap">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleSimulateLedgerUpload}
                      className="hidden"
                    />
                    Upload File
                  </label>
                </div>
              )}

              {simStep === 'ledgerError' && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-medium flex items-center justify-between">
                  <span>Failed to parse document: {ledgerError}</span>
                  <button onClick={handleResetSimulator} className="px-2 py-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-300 cursor-pointer font-bold">Reset</button>
                </div>
              )}
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
            onClick={() => navigate('/signup')}
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
