import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Search, ArrowUpDown, RefreshCw, 
  LogOut, Database, Terminal, Clock, Sparkles, 
  Play, User, Calendar
} from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  quantity: number;
  unit: string;
  price?: number;
  updatedAt: string;
}

interface AuditLog {
  _id: string;
  timestamp: string;
  originalTranscript: string;
  parsedAction: string;
  calculationDetail: string;
  targetProduct: string;
  quantityChanged: number;
  finalQuantity: number;
}

interface DashboardProps {
  user: {
    email: string | null;
    displayName: string | null;
    uid: string;
    isDemo?: boolean;
  };
  onSignOut: () => void;
}

export default function Dashboard({ user, onSignOut }: DashboardProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [terminalState, setTerminalState] = useState<'idle' | 'listening' | 'transcribing' | 'processing' | 'success' | 'error'>('idle');
  const [terminalLogs, setTerminalLogs] = useState<string[]>(['[System] Ready. Click Microphone to speak or type command below.']);
  const [manualCommand, setManualCommand] = useState<string>('');
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all, in_stock, low_stock, out_of_stock
  const [sortField, setSortField] = useState<'name' | 'quantity' | 'updatedAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const recognitionRef = useRef<any>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setTerminalState('listening');
        addTerminalLog('🎙️ Microphone active. Listening for voice command...');
      };

      rec.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        setTerminalState('transcribing');
        addTerminalLog(`✍️ Transcribed Speech: "${transcript}"`);
        
        await processVoiceCommand(transcript);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setTerminalState('error');
        addTerminalLog(`⚠️ Speech Recognition Error: ${event.error}. Please try again or type the command.`);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    } else {
      addTerminalLog('⚠️ Web Speech API not supported in this browser. Please use manual terminal entry.');
    }

    // Load initial inventory and logs
    fetchData();
  }, []);

  // Scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  const addTerminalLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTerminalLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const getHeaders = () => {
    const token = user.isDemo ? 'mock-token-123' : localStorage.getItem('vocalize_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get auth headers
      const headers = getHeaders();
      
      const [prodRes, logRes] = await Promise.all([
        fetch('/api/products', { headers }),
        fetch('/api/logs', { headers })
      ]);

      if (prodRes.ok && logRes.ok) {
        const prodData = await prodRes.json();
        const logData = await logRes.json();
        setProducts(prodData);
        setLogs(logData);
      } else {
        console.error('Failed to load products or logs');
        addTerminalLog('⚠️ Failed to sync with database. Retrying...');
      }
    } catch (error) {
      console.error('Network error fetching data:', error);
      addTerminalLog('⚠️ Network error. Please check backend status.');
    } finally {
      setLoading(false);
    }
  };

  const processVoiceCommand = async (transcript: string) => {
    setTerminalState('processing');
    addTerminalLog('🤖 Gemini AI analyzing statement for function calling...');

    try {
      const response = await fetch('/api/voice-command', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ transcript })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTerminalState('success');
        addTerminalLog(`✓ Success: ${data.message}`);
        addTerminalLog(`⚙️ Action: ${data.parsed.actionType} | Product: "${data.parsed.productName}" | Qty: ${data.parsed.numericValue} ${data.parsed.unit}`);
        
        // Update states directly from API response to avoid extra fetches
        if (data.products) setProducts(data.products);
        if (data.logs) setLogs(data.logs);
      } else {
        setTerminalState('error');
        addTerminalLog(`❌ AI Parsing Error: ${data.error || 'Unable to update inventory'}`);
      }
    } catch (err: any) {
      setTerminalState('error');
      addTerminalLog(`❌ Connection Error: ${err.message}`);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      addTerminalLog('⚠️ Speech recognition unavailable. Use manual command line entry.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTerminalState('idle');
      recognitionRef.current.start();
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCommand.trim()) return;

    const cmd = manualCommand.trim();
    setManualCommand('');
    addTerminalLog(`⌨️ Keyboard Command Entered: "${cmd}"`);
    await processVoiceCommand(cmd);
  };

  // Sort & Filter functions
  const handleSort = (field: 'name' | 'quantity' | 'updatedAt') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredProducts = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (statusFilter === 'all') return matchesSearch;
      if (statusFilter === 'in_stock') return matchesSearch && p.quantity >= 5;
      if (statusFilter === 'low_stock') return matchesSearch && p.quantity > 0 && p.quantity < 5;
      if (statusFilter === 'out_of_stock') return matchesSearch && p.quantity <= 0;
      return matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'quantity') {
        comparison = a.quantity - b.quantity;
      } else if (sortField === 'updatedAt') {
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Group Logs by Day
  const getGroupedLogs = () => {
    const groups: { [key: string]: AuditLog[] } = {};
    
    logs.forEach(log => {
      const date = new Date(log.timestamp);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      
      let dateHeader = '';
      if (date.toDateString() === today.toDateString()) {
        dateHeader = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateHeader = 'Yesterday';
      } else {
        dateHeader = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }

      if (!groups[dateHeader]) {
        groups[dateHeader] = [];
      }
      groups[dateHeader].push(log);
    });

    return groups;
  };

  const groupedLogs = getGroupedLogs();

  // Badge styler helper
  const getStockBadge = (qty: number) => {
    if (qty >= 5) {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          In Stock
        </span>
      );
    } else if (qty > 0) {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Low Stock
        </span>
      );
    } else {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
          Out of Stock
        </span>
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-violet-600/30">
      
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-violet-600 to-fuchsia-600 rounded-xl shadow-lg shadow-violet-500/20">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-300">
              Vocalize
            </h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">
              AI Voice Inventory Log
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800/80 px-4 py-1.5 rounded-full">
            <div className="p-1 bg-violet-500/10 text-violet-400 rounded-full">
              <User className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-xs font-medium text-slate-300">
                {user.displayName || user.email?.split('@')[0] || 'Store Owner'}
              </p>
              <p className="text-[9px] text-slate-500 font-semibold uppercase">
                {user.isDemo ? 'Demo Mode' : 'Production'}
              </p>
            </div>
          </div>

          <button 
            onClick={onSignOut}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-900/40 hover:bg-rose-950/20 border border-slate-800/80 hover:border-rose-900/30 rounded-xl transition duration-200 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] w-full mx-auto">
        
        {/* Left Hand side Panel: Terminal & Mic, and Audit Timeline (4 Columns) */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-full min-h-0">
          
          {/* Section A: Command Center (Voice Logger Terminal) */}
          <section className="glass-card rounded-2xl p-5 border border-slate-800/60 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 p-3 text-[10px] text-slate-700 font-terminal">
              v1.0.0
            </div>
            
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-bold tracking-wide uppercase text-slate-400">
                Command Center
              </h2>
            </div>

            {/* Glowing Microphone button container */}
            <div className="flex flex-col items-center justify-center py-6 relative">
              <div className="relative flex items-center justify-center">
                {isListening && (
                  <div className="absolute w-24 h-24 rounded-full bg-violet-600/20 animate-ripple z-0" />
                )}
                <button
                  onClick={toggleListening}
                  className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                    isListening 
                      ? 'bg-rose-500 text-white animate-pulse-glow shadow-rose-500/20' 
                      : 'bg-gradient-to-tr from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-violet-500/20 hover:scale-105'
                  }`}
                  title={isListening ? 'Click to stop recording' : 'Click to speak inventory command'}
                >
                  {isListening ? (
                    <MicOff className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8 animate-pulse" />
                  )}
                </button>
              </div>
              <p className="mt-4 text-xs font-semibold text-slate-300">
                {isListening ? (
                  <span className="text-rose-400 animate-pulse font-terminal">LISTENING ACTIVELY...</span>
                ) : (
                  <span>Click mic and say: <span className="text-violet-400 italic">"Add 10 bags of flour"</span></span>
                )}
              </p>
            </div>

            {/* Floating Interactive Terminal Window */}
            <div className="flex-1 flex flex-col mt-2">
              <div className="terminal-window rounded-xl p-4 flex-1 flex flex-col min-h-[200px] max-h-[280px]">
                {/* Terminal Header */}
                <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-terminal">
                    <Terminal className="w-3.5 h-3.5" />
                    realtime_voice_logger.sh
                  </div>
                </div>
                
                {/* Terminal Lines Container */}
                <div className="flex-1 overflow-y-auto font-terminal text-[11px] leading-relaxed text-slate-400 pr-1 flex flex-col gap-1.5 scrollbar-thin">
                  {terminalLogs.map((logLine, idx) => {
                    let color = 'text-slate-400';
                    if (logLine.includes('✓ Success')) color = 'text-emerald-400 font-semibold';
                    else if (logLine.includes('❌') || logLine.includes('⚠️')) color = 'text-rose-400';
                    else if (logLine.includes('🎙️ Listening')) color = 'text-violet-400';
                    else if (logLine.includes('✍️ Transcribed')) color = 'text-blue-300';
                    else if (logLine.includes('🤖 Gemini AI') || logLine.includes('⚙️ Action')) color = 'text-indigo-300';
                    
                    return (
                      <div key={idx} className={color}>
                        {logLine}
                      </div>
                    );
                  })}
                  
                  {/* Dynamic Terminal State line */}
                  {terminalState === 'listening' && (
                    <div className="text-violet-400 animate-terminal-flash font-semibold">
                      Listening... <span className="animate-pulse">_</span>
                    </div>
                  )}
                  {terminalState === 'transcribing' && (
                    <div className="text-blue-300 animate-terminal-flash font-semibold">
                      Transcribing audio stream... <span className="animate-pulse">_</span>
                    </div>
                  )}
                  {terminalState === 'processing' && (
                    <div className="text-indigo-300 animate-terminal-flash font-semibold">
                      AI Processing parameters via Gemini Function Calling... <span className="animate-pulse">_</span>
                    </div>
                  )}
                  
                  <div ref={terminalEndRef} />
                </div>
              </div>

              {/* Terminal command keyboard fallback input */}
              <form onSubmit={handleManualSubmit} className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={manualCommand}
                  onChange={(e) => setManualCommand(e.target.value)}
                  placeholder="Or type inventory command manually..."
                  className="flex-1 text-[11px] font-terminal rounded-xl bg-slate-950 border border-slate-800/80 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600/30"
                />
                <button
                  type="submit"
                  disabled={!manualCommand.trim()}
                  className="px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl text-xs font-semibold text-white transition duration-150 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </section>

          {/* Section C: Daily History Timeline (The Action Cards) */}
          <section className="glass-card rounded-2xl p-5 border border-slate-800/60 flex-1 flex flex-col min-h-[300px] overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-bold tracking-wide uppercase text-slate-400">
                Daily Activity History
              </h2>
            </div>

            {/* Scrollable history logs */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-6">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center py-12">
                  <Clock className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs">No voice logs generated yet.</p>
                  <p className="text-[10px] opacity-75 mt-1">Updates will display here sequentially.</p>
                </div>
              ) : (
                Object.keys(groupedLogs).map(day => (
                  <div key={day} className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {day}
                      </span>
                      <div className="flex-1 h-px bg-slate-800/60 ml-2" />
                    </div>
                    
                    <div className="relative pl-3 border-l border-slate-800/80 ml-1.5 flex flex-col gap-3">
                      {groupedLogs[day].map(log => {
                        let colorClass = 'border-l-indigo-500';
                        if (log.parsedAction === 'ADD_STOCK') colorClass = 'border-l-emerald-500';
                        if (log.parsedAction === 'REMOVE_STOCK') colorClass = 'border-l-rose-500';

                        return (
                          <div 
                            key={log._id}
                            className={`glass-card p-3.5 rounded-xl border border-slate-800/40 border-l-3 ${colorClass} hover:border-slate-700/60 transition duration-150`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="px-2 py-0.5 text-[9px] font-mono rounded bg-slate-900 text-slate-400">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-[10px] font-bold tracking-wider text-slate-500">
                                {log.targetProduct.toUpperCase()}
                              </span>
                            </div>
                            
                            <p className="text-xs text-slate-300 font-medium leading-relaxed flex items-start gap-2">
                              <Mic className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                              <span>{log.calculationDetail}</span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Hand side Panel: Database Grid (8 Columns) */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-[600px] lg:min-h-0">
          
          {/* Section B: Core Database Grid (Airtable Style Table) */}
          <section className="glass-card rounded-2xl p-5 border border-slate-800/60 flex-1 flex flex-col overflow-hidden">
            
            {/* Grid Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-violet-400" />
                <h2 className="text-sm font-bold tracking-wide uppercase text-slate-400">
                  Inventory Database
                </h2>
                {loading && (
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin ml-2" />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search product..."
                    className="pl-9 pr-4 py-1.5 text-xs rounded-xl glass-input w-48 md:w-56 text-slate-200 placeholder:text-slate-500"
                  />
                </div>

                {/* Status Badges Selector Filter */}
                <div className="flex rounded-xl bg-slate-950/80 p-0.5 border border-slate-800/80">
                  {(['all', 'in_stock', 'low_stock', 'out_of_stock'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`px-3 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wide transition duration-150 cursor-pointer ${
                        statusFilter === f 
                          ? 'bg-violet-600 text-white shadow-sm' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {/* Manual Reload Button */}
                <button
                  onClick={fetchData}
                  className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition duration-150 cursor-pointer"
                  title="Reload table"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Airtable Style Data Grid */}
            <div className="flex-1 overflow-x-auto border border-slate-800/50 rounded-xl bg-[#06090f] overflow-y-auto">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 sticky top-0 z-10">
                    <th 
                      onClick={() => handleSort('name')} 
                      className="px-5 py-4.5 text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition duration-150 select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        Product Name
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('quantity')} 
                      className="px-5 py-4.5 text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition duration-150 select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        Stock Quantity
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th className="px-5 py-4.5 text-xs font-bold text-slate-400 uppercase tracking-wider select-none">
                      Unit Type
                    </th>
                    <th 
                      onClick={() => handleSort('updatedAt')} 
                      className="px-5 py-4.5 text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition duration-150 select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        Last Updated Time
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th className="px-5 py-4.5 text-xs font-bold text-slate-400 uppercase tracking-wider select-none">
                      Status Badge
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-slate-500 text-sm">
                        <Database className="w-10 h-10 mx-auto mb-3 opacity-25" />
                        No product matches. Speak or type to add inventory.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map(product => (
                      <tr 
                        key={product._id} 
                        className="hover:bg-slate-900/35 transition duration-150 group"
                      >
                        <td className="px-5 py-4 text-sm font-semibold text-slate-200 capitalize">
                          {product.name}
                        </td>
                        <td className="px-5 py-4 text-sm font-mono font-medium text-slate-200">
                          {product.quantity}
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-slate-400 uppercase">
                          {product.unit}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-400">
                          {new Date(product.updatedAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </td>
                        <td className="px-5 py-4">
                          {getStockBadge(product.quantity)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Grid Footer details */}
            <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 mt-4 text-[10px] text-slate-500 font-terminal">
              <div>
                SHOWING {filteredProducts.length} OF {products.length} PRODUCTS
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  IN STOCK ({" >="} 5)
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  LOW STOCK ({"<"} 5)
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  OUT OF STOCK
                </div>
              </div>
            </div>

          </section>

        </div>

      </main>
    </div>
  );
}
