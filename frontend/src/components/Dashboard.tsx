import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Search, ArrowUpDown, RefreshCw, 
  LogOut, Database, Terminal, Clock, Sparkles, 
  Play, User, Calendar, Plus, Trash2, Edit2, X,
  AlertTriangle, CheckCircle2
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
  
  // New Lazy Loading & Caching State
  const [summaries, setSummaries] = useState<{ date: string; count: number }[]>([]);
  const [detailedLogsCache, setDetailedLogsCache] = useState<{ [date: string]: AuditLog[] }>({});
  const [expandedDates, setExpandedDates] = useState<{ [date: string]: boolean }>({});
  const [loadingDates, setLoadingDates] = useState<{ [date: string]: boolean }>({});

  // Price prompting states
  const [pricePromptProduct, setPricePromptProduct] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<string>('');
  const [submittingPrice, setSubmittingPrice] = useState<boolean>(false);

  // Modal & form states for manual edit/addition
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formProductId, setFormProductId] = useState('');
  const [formName, setFormName] = useState('');
  const [formQuantity, setFormQuantity] = useState(0);
  const [formUnit, setFormUnit] = useState('pcs');
  const [formPrice, setFormPrice] = useState('');
  const [formError, setFormError] = useState('');
  const [savingForm, setSavingForm] = useState(false);

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

  // Custom delete confirm modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Custom toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
      
      const [prodRes, summaryRes] = await Promise.all([
        fetch('/api/products', { headers }),
        fetch('/api/logs/summaries', { headers })
      ]);

      if (prodRes.ok && summaryRes.ok) {
        const prodData = await prodRes.json();
        const summaryData = await summaryRes.json();
        setProducts(prodData);
        setSummaries(summaryData);
      } else {
        console.error('Failed to load products or summaries');
        addTerminalLog('⚠️ Failed to sync with database. Retrying...');
      }
    } catch (error) {
      console.error('Network error fetching data:', error);
      addTerminalLog('⚠️ Network error. Please check backend status.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pricePromptProduct || !priceInput.trim()) return;

    const priceVal = parseFloat(priceInput);
    if (isNaN(priceVal) || priceVal < 0) {
      addTerminalLog('⚠️ Invalid price value. Must be a positive number.');
      return;
    }

    setSubmittingPrice(true);
    addTerminalLog(`💾 Saving price ₹${priceVal} for product "${pricePromptProduct}"...`);

    try {
      const response = await fetch('/api/products/set-price', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ productName: pricePromptProduct, price: priceVal })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        addTerminalLog(`✓ Success: Price for "${pricePromptProduct}" updated to ₹${priceVal}.`);
        if (data.products) setProducts(data.products);
        if (data.summaries) setSummaries(data.summaries);
        setPricePromptProduct(null);
        setPriceInput('');
      } else {
        addTerminalLog(`❌ Failed to update price: ${data.error || 'Server error'}`);
      }
    } catch (err: any) {
      addTerminalLog(`❌ Connection Error: ${err.message}`);
    } finally {
      setSubmittingPrice(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Product name is required');
      return;
    }
    
    setSavingForm(true);
    setFormError('');
    
    try {
      const url = modalMode === 'add' 
        ? '/api/products' 
        : `/api/products/${formProductId}`;
      const method = modalMode === 'add' ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify({
          name: formName,
          quantity: Number(formQuantity),
          unit: formUnit,
          price: formPrice !== '' ? Number(formPrice) : null
        })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        setProducts(data.products);
        if (data.summaries) setSummaries(data.summaries);
        
        // Propagate manual log entry into today's timeline cache
        if (data.log) {
          const todayStr = new Date().toISOString().split('T')[0];
          setDetailedLogsCache(prev => {
            const todayLogs = prev[todayStr] ? [...prev[todayStr]] : [];
            if (!todayLogs.some(l => l._id === data.log._id)) {
              todayLogs.unshift(data.log);
            }
            return { ...prev, [todayStr]: todayLogs };
          });
          setExpandedDates(prev => ({ ...prev, [todayStr]: true }));
        }

        setIsModalOpen(false);
        setFormName('');
        setFormQuantity(0);
        setFormUnit('pcs');
        setFormPrice('');
      } else {
        setFormError(data.error || 'Server error saving product');
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error');
    } finally {
      setSavingForm(false);
    }
  };

  const handleQuantityAdjust = async (product: Product, delta: number) => {
    const newQty = Math.max(0, product.quantity + delta);
    if (newQty === product.quantity) return;
    
    // Optimistic UI update
    setProducts(prev => prev.map(p => p._id === product._id ? { ...p, quantity: newQty } : p));
    
    try {
      const response = await fetch(`/api/products/${product._id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          quantity: newQty
        })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        setProducts(data.products);
        if (data.summaries) setSummaries(data.summaries);
        
        // Propagate manual quantity adjustment log
        if (data.log) {
          const todayStr = new Date().toISOString().split('T')[0];
          setDetailedLogsCache(prev => {
            const todayLogs = prev[todayStr] ? [...prev[todayStr]] : [];
            if (!todayLogs.some(l => l._id === data.log._id)) {
              todayLogs.unshift(data.log);
            }
            return { ...prev, [todayStr]: todayLogs };
          });
        }
      } else {
        console.error('Failed to update quantity:', data.error);
        fetchData();
      }
    } catch (err) {
      console.error('Network error adjusting quantity:', err);
      fetchData();
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    try {
      const response = await fetch(`/api/products/${product._id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        setProducts(data.products);
        if (data.summaries) setSummaries(data.summaries);
        showToast(`Successfully deleted "${product.name}"`);
        
        // Propagate deletion log entry
        if (data.log) {
          const todayStr = new Date().toISOString().split('T')[0];
          setDetailedLogsCache(prev => {
            const todayLogs = prev[todayStr] ? [...prev[todayStr]] : [];
            if (!todayLogs.some(l => l._id === data.log._id)) {
              todayLogs.unshift(data.log);
            }
            return { ...prev, [todayStr]: todayLogs };
          });
        }
      } else {
        showToast(data.error || 'Failed to delete product', 'error');
      }
    } catch (err) {
      console.error('Network error deleting product:', err);
      showToast('Network error deleting product', 'error');
    }
  };

  const handleOpenAddModal = () => {
    setModalMode('add');
    setFormProductId('');
    setFormName('');
    setFormQuantity(0);
    setFormUnit('pcs');
    setFormPrice('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setModalMode('edit');
    setFormProductId(product._id);
    setFormName(product.name);
    setFormQuantity(product.quantity);
    setFormUnit(product.unit);
    setFormPrice(product.price !== undefined && product.price !== null ? String(product.price) : '');
    setFormError('');
    setIsModalOpen(true);
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
        if (data.type === 'chat' || data.isConversational) {
          setTerminalState('idle');
          addTerminalLog(`🤖 Gemini: "${data.message || data.reply}"`);
          return;
        }

        setTerminalState('success');
        if (data.conversationalReply) {
          addTerminalLog(`🤖 Gemini: "${data.conversationalReply}"`);
        }
        addTerminalLog(`✓ Success: ${data.message}`);
        addTerminalLog(`⚙️ Action: ${data.parsed.actionType} | Product: "${data.parsed.productName}" | Qty: ${data.parsed.numericValue} ${data.parsed.unit}`);
        
        if (data.products) setProducts(data.products);
        if (data.summaries) setSummaries(data.summaries);

        // Prepend new log details directly into the cache for Today
        const todayStr = new Date().toISOString().split('T')[0];
        if (data.log) {
          setDetailedLogsCache(prev => {
            const todayLogs = prev[todayStr] ? [...prev[todayStr]] : [];
            if (!todayLogs.some(l => l._id === data.log._id)) {
              todayLogs.unshift(data.log);
            }
            return { ...prev, [todayStr]: todayLogs };
          });
          // Auto expand Today's chapter to highlight updates
          setExpandedDates(prev => ({ ...prev, [todayStr]: true }));
        }

        // Trigger pricing prompt modal inline if backend flags missing price
        if (data.promptForPrice) {
          const missingProd = data.promptForPrice.productName;
          setPricePromptProduct(missingProd);
          setTerminalState('idle');
          addTerminalLog(`⚠️ Price for "${missingProd}" is not set. Please supply the price below.`);
        }
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

  // Toggle Expand date details (with lazy loading and caching, bypassing today)
  const handleToggleExpand = async (date: string) => {
    const isCurrentlyExpanded = !!expandedDates[date];
    
    // Toggle UI expansion
    setExpandedDates(prev => ({ ...prev, [date]: !isCurrentlyExpanded }));

    // Fetch if expanding
    if (!isCurrentlyExpanded) {
      const todayStr = new Date().toISOString().split('T')[0];
      const isToday = date === todayStr;
      
      // If not cached OR is today (today bypasses cache)
      if (!detailedLogsCache[date] || isToday) {
        setLoadingDates(prev => ({ ...prev, [date]: true }));
        try {
          const headers = getHeaders();
          const response = await fetch(`/api/logs/details/${date}`, { headers });
          if (response.ok) {
            const data = await response.json();
            setDetailedLogsCache(prev => ({ ...prev, [date]: data }));
          } else {
            console.error('Failed to fetch details for date:', date);
          }
        } catch (error) {
          console.error('Error fetching logs for date:', date, error);
        } finally {
          setLoadingDates(prev => ({ ...prev, [date]: false }));
        }
      }
    }
  };

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
                    else if (logLine.includes('🤖 Gemini AI') || logLine.includes('🤖 Gemini:') || logLine.includes('⚙️ Action')) color = 'text-indigo-300';
                    
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

                  {/* Price prompt form rendered inline inside terminal */}
                  {pricePromptProduct && (
                    <form onSubmit={handleSavePrice} className="mt-3 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                      <p className="text-[11px] font-bold text-violet-400">
                        💰 Enter unit price for "{pricePromptProduct}":
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={priceInput}
                          onChange={(e) => setPriceInput(e.target.value)}
                          placeholder="Price (e.g. 15.50)"
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-600"
                          autoFocus
                          required
                        />
                        <button
                          type="submit"
                          disabled={submittingPrice}
                          className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-xs font-bold text-white transition cursor-pointer"
                        >
                          {submittingPrice ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </form>
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
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
              {summaries.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center py-12">
                  <Clock className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs">No voice logs generated yet.</p>
                  <p className="text-[10px] opacity-75 mt-1">Updates will display here sequentially.</p>
                </div>
              ) : (
                summaries.map(summary => {
                  const date = summary.date;
                  const count = summary.count;
                  
                  const getReadableDate = (dateStr: string) => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];
                    
                    if (dateStr === todayStr) return 'Today';
                    if (dateStr === yesterdayStr) return 'Yesterday';
                    
                    const parts = dateStr.split('-');
                    if (parts.length === 3) {
                      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    }
                    return dateStr;
                  };

                  const dateLabel = getReadableDate(date);
                  const isExpanded = !!expandedDates[date];
                  const isLoading = !!loadingDates[date];
                  const dayLogs = detailedLogsCache[date] || [];

                  return (
                    <div key={date} className="flex flex-col border border-slate-800/40 rounded-xl overflow-hidden bg-slate-950/20">
                      {/* Accordion Header */}
                      <button
                        onClick={() => handleToggleExpand(date)}
                        className="w-full flex items-center justify-between p-3.5 hover:bg-slate-900/40 transition duration-150 text-left select-none cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-violet-400 shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-slate-300">
                              {dateLabel}
                            </span>
                            <span className="ml-2.5 text-[10px] text-slate-500 font-semibold font-mono uppercase bg-slate-900 px-2 py-0.5 rounded">
                              {count} {count === 1 ? 'log' : 'logs'}
                            </span>
                          </div>
                        </div>
                        <svg 
                          className={`w-4.5 h-4.5 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Collapsible Content */}
                      <div 
                        className={`transition-all duration-300 ease-in-out overflow-hidden ${
                          isExpanded ? 'max-h-[800px] border-t border-slate-900 opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="p-3.5 pl-4 flex flex-col gap-3 relative border-l border-slate-800/40 ml-5.5 my-2">
                          {isLoading ? (
                            <div className="flex flex-col gap-3 animate-pulse">
                              <div className="h-16 bg-slate-900/40 border border-slate-800/20 rounded-xl" />
                              <div className="h-16 bg-slate-900/40 border border-slate-800/20 rounded-xl" />
                            </div>
                          ) : dayLogs.length === 0 ? (
                            <p className="text-[10px] text-slate-500 font-terminal italic">No detail logs found.</p>
                          ) : (
                            dayLogs.map(log => {
                              let colorClass = 'border-l-indigo-500';
                              if (log.parsedAction === 'ADD_STOCK') colorClass = 'border-l-emerald-500';
                              if (log.parsedAction === 'REMOVE_STOCK') colorClass = 'border-l-rose-500';

                              return (
                                <div 
                                  key={log._id}
                                  className={`glass-card p-3 rounded-xl border border-slate-800/30 border-l-3 ${colorClass} hover:border-slate-700/40 transition duration-150`}
                                >
                                  <div className="flex justify-between items-start mb-1.5">
                                    <span className="px-2 py-0.5 text-[9px] font-mono rounded bg-slate-900 text-slate-400">
                                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                                      {log.targetProduct}
                                    </span>
                                  </div>
                                  
                                  <p className="text-[11px] text-slate-300 font-medium leading-relaxed flex items-start gap-2">
                                    <Mic className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                                    <span>{log.calculationDetail}</span>
                                  </p>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
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

                {/* Add Product Button */}
                <button
                  onClick={handleOpenAddModal}
                  className="px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition duration-150 cursor-pointer border border-violet-500/30 active:scale-95 shadow-lg shadow-violet-900/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Product
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
                    <th className="px-5 py-4.5 text-xs font-bold text-slate-400 uppercase tracking-wider select-none">
                      Unit Price
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
                    <th className="px-5 py-4.5 text-xs font-bold text-slate-400 uppercase tracking-wider select-none text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center text-slate-500 text-sm">
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
                        <td className="px-5 py-4 text-sm font-semibold text-slate-200 capitalize max-w-[140px] md:max-w-[200px] lg:max-w-[260px]">
                          <div className="w-full overflow-x-auto whitespace-nowrap product-name-scrollbar pb-1.5">
                            {product.name}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-mono text-slate-300 whitespace-nowrap">
                          {product.price !== undefined && product.price !== null ? `₹${product.price.toFixed(2)}` : '—'}
                        </td>
                        <td className="px-5 py-4 text-sm font-mono font-medium text-slate-200 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={() => handleQuantityAdjust(product, -1)}
                              className="w-5 h-5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white flex items-center justify-center transition duration-100 cursor-pointer text-slate-400 select-none text-xs"
                              title="Subtract 1"
                            >
                              -
                            </button>
                            <span>{product.quantity}</span>
                            <button
                              onClick={() => handleQuantityAdjust(product, 1)}
                              className="w-5 h-5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white flex items-center justify-center transition duration-100 cursor-pointer text-slate-400 select-none text-xs"
                              title="Add 1"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-slate-400 uppercase whitespace-nowrap">
                          {product.unit}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-400">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-300 whitespace-nowrap">
                              {new Date(product.updatedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5 whitespace-nowrap">
                              {new Date(product.updatedAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {getStockBadge(product.quantity)}
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition duration-150">
                            <button
                              onClick={() => handleOpenEditModal(product)}
                              className="p-1.5 text-slate-400 hover:text-violet-400 hover:bg-slate-800/50 rounded-lg transition duration-150 cursor-pointer"
                              title="Edit product"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setProductToDelete(product);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-800/50 rounded-lg transition duration-150 cursor-pointer"
                              title="Delete product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* Sleek Manual Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md transition-opacity duration-200">
          <div 
            className="glass-card w-full max-w-sm p-6 rounded-2xl border border-slate-850 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-800 hover:text-white text-slate-400 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-4.5 h-4.5 text-violet-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                {modalMode === 'add' ? 'Manually Add Product' : 'Manually Edit Product'}
              </h3>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium">
                  {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Product Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. coffee, milk, rice"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-200 placeholder:text-slate-500 border border-slate-800/80 focus:border-violet-500 transition outline-none capitalize"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quantity</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-200 border border-slate-800/80 focus:border-violet-500 transition outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unit Type</label>
                  <input
                    type="text"
                    required
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="e.g. pcs, kg, bags"
                    className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-200 placeholder:text-slate-500 border border-slate-800/80 focus:border-violet-500 transition outline-none lowercase"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unit Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="e.g. 2.99 (optional)"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-200 placeholder:text-slate-500 border border-slate-800/80 focus:border-violet-500 transition outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 hover:text-white rounded-xl text-slate-300 transition cursor-pointer font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingForm}
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-800 text-white rounded-xl transition cursor-pointer font-bold flex items-center justify-center gap-1.5 border border-violet-500/30"
                >
                  {savingForm ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    modalMode === 'add' ? 'Create Product' : 'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md transition-opacity duration-200">
          <div 
            className="glass-card w-full max-w-sm p-6 rounded-2xl border border-slate-850 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setProductToDelete(null);
              }}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-800 hover:text-white text-slate-400 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                Delete Product
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Are you sure you want to delete <strong className="text-white font-semibold">"{productToDelete.name}"</strong> from the inventory? This action cannot be undone.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setProductToDelete(null);
                }}
                className="flex-1 py-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 hover:text-white rounded-xl text-slate-300 transition cursor-pointer font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const prod = productToDelete;
                  setIsDeleteModalOpen(false);
                  setProductToDelete(null);
                  await handleDeleteProduct(prod);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition cursor-pointer font-bold text-xs border border-rose-500/30"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4.5 py-3.5 rounded-xl border shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300 text-xs font-semibold ${
          toast.type === 'error' 
            ? 'bg-rose-950/90 border-rose-500/30 text-rose-250 backdrop-blur-md shadow-rose-950/20'
            : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-250 backdrop-blur-md shadow-emerald-950/20'
        }`}>
          {toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:text-white opacity-60 hover:opacity-100 transition cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
