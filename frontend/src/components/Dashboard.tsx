import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mic, MicOff, Search, ArrowUpDown, RefreshCw, 
  LogOut, Database, Terminal, Clock, Sparkles, 
  User, Calendar, Plus, Trash2, Edit2, X,
  AlertTriangle, CheckCircle2, Settings, Globe, UploadCloud,
  LayoutGrid, XCircle, Package, Send
} from 'lucide-react';
import logoWithoutText from '../assets/vocalize-logo-without-text.png';

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
    shopName?: string;
    uid: string;
    isDemo?: boolean;
    category?: string;
    currency?: string;
    language?: string;
  };
  onSignOut: () => void;
}

const getCurrencySymbol = (currencyCode: string | undefined): string => {
  switch (currencyCode) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'INR':
    default:
      return '₹';
  }
};

const getLanguageCode = (languageName: string | undefined): string => {
  switch (languageName) {
    case 'English (Indian Dialect)':
      return 'en-IN';
    case 'Hindi (हिंदी)':
      return 'hi-IN';
    case 'Spanish (Español)':
      return 'es-ES';
    case 'French (Français)':
      return 'fr-FR';
    case 'German (Deutsch)':
      return 'de-DE';
    case 'English (Standard)':
    default:
      return 'en-US';
  }
};

export default function Dashboard({ 
  user, 
  onSignOut
}: DashboardProps) {
  const currencySymbol = getCurrencySymbol(user.currency);
  const navigate = useNavigate();
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

  // Profile settings modal state removed (redirects to dedicated settings page)

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

  // Ledger OCR modal state
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  // Ledger OCR upload states
  const [isProcessingLedger, setIsProcessingLedger] = useState(false);
  const [extractedItems, setExtractedItems] = useState<{ name: string; quantity: number; unit: string; price?: number }[]>([]);
  const [ledgerError, setLedgerError] = useState<string>('');

  // Highlights for updated products (voice or OCR)
  const [updatedProductIds, setUpdatedProductIds] = useState<string[]>([]);
  const highlightTimerRef = useRef<any>(null);

  useEffect(() => {
    document.title = "Inventory Database | Vocalize";
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

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
      rec.lang = getLanguageCode(user.language);

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
    addTerminalLog(`💾 Saving price ${currencySymbol}${priceVal} for product "${pricePromptProduct}"...`);

    try {
      const response = await fetch('/api/products/set-price', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ productName: pricePromptProduct, price: priceVal })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        addTerminalLog(`✓ Success: Price for "${pricePromptProduct}" updated to ${currencySymbol}${priceVal}.`);
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

  const handleLedgerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    // Validate file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      setLedgerError('File exceeds the 20MB size limit.');
      return;
    }
    
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setLedgerError('Unsupported file type. Please upload PNG, JPG, JPEG, WEBP, or PDF.');
      return;
    }
    
    setIsProcessingLedger(true);
    setLedgerError('');
    setExtractedItems([]);
    
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const response = await fetch('/api/products/upload-ledger', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ fileData: base64, mimeType: file.type })
        });
        
        const data = await response.json();
        if (response.ok && data.success) {
          setExtractedItems(data.items || []);
          addTerminalLog(`✓ OCR: Extracted ${data.items?.length || 0} items from ledger file.`);
        } else {
          setLedgerError(data.error || 'Failed to analyze the ledger sheet.');
        }
      } catch (err: any) {
        setLedgerError(err.message || 'Error processing ledger upload.');
      } finally {
        setIsProcessingLedger(false);
      }
    };
    
    reader.onerror = () => {
      setLedgerError('Error reading file.');
      setIsProcessingLedger(false);
    };
    
    reader.readAsDataURL(file);
  };

  const handleUpdateExtractedItem = (index: number, field: string, value: any) => {
    setExtractedItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleRemoveExtractedItem = (index: number) => {
    setExtractedItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleImportLedgerItems = async () => {
    if (extractedItems.length === 0) return;
    
    setIsProcessingLedger(true);
    setLedgerError('');
    
    try {
      const response = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ items: extractedItems })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        setProducts(data.products);
        if (data.summaries) setSummaries(data.summaries);

        if (data.updatedProductIds && Array.isArray(data.updatedProductIds)) {
          setUpdatedProductIds(data.updatedProductIds);
          if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
          highlightTimerRef.current = setTimeout(() => {
            setUpdatedProductIds([]);
          }, 8000);
        }
        
        // Propagate log entry
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
        
        showToast(`Successfully imported ${extractedItems.length} items to inventory.`);
        addTerminalLog(`✓ Success: Bulk imported ${extractedItems.length} items into database.`);
        
        // Close modal
        setIsLedgerModalOpen(false);
        setExtractedItems([]);
      } else {
        setLedgerError(data.error || 'Failed to bulk import products.');
      }
    } catch (err: any) {
      setLedgerError(err.message || 'Network error executing bulk import.');
    } finally {
      setIsProcessingLedger(false);
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
        if (data.parsedActions && Array.isArray(data.parsedActions)) {
          data.parsedActions.forEach((act: any) => {
            addTerminalLog(`⚙️ Action: ${act.actionType} | Product: "${act.productName}" | Qty: ${act.numericValue} ${act.unit}`);
          });
        } else {
          addTerminalLog(`⚙️ Action: ${data.parsed.actionType} | Product: "${data.parsed.productName}" | Qty: ${data.parsed.numericValue} ${data.parsed.unit}`);
        }
        
        if (data.products) setProducts(data.products);
        if (data.summaries) setSummaries(data.summaries);

        if (data.updatedProductIds && Array.isArray(data.updatedProductIds)) {
          setUpdatedProductIds(data.updatedProductIds);
          if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
          highlightTimerRef.current = setTimeout(() => {
            setUpdatedProductIds([]);
          }, 8000);
        }

        // Prepend new log details directly into the cache for Today
        const todayStr = new Date().toISOString().split('T')[0];
        if (data.logs && Array.isArray(data.logs)) {
          setDetailedLogsCache(prev => {
            const todayLogs = prev[todayStr] ? [...prev[todayStr]] : [];
            const logsToPrepend = [...data.logs].reverse();
            logsToPrepend.forEach((log: any) => {
              if (!todayLogs.some(l => l._id === log._id)) {
                todayLogs.unshift(log);
              }
            });
            return { ...prev, [todayStr]: todayLogs };
          });
          setExpandedDates(prev => ({ ...prev, [todayStr]: true }));
        } else if (data.log) {
          setDetailedLogsCache(prev => {
            const todayLogs = prev[todayStr] ? [...prev[todayStr]] : [];
            if (!todayLogs.some(l => l._id === data.log._id)) {
              todayLogs.unshift(data.log);
            }
            return { ...prev, [todayStr]: todayLogs };
          });
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
      <header className="px-6 pt-6 pb-2 bg-[#090d16]/70">
        <div className="relative bg-[#060814]/85 backdrop-blur-xl border border-slate-800/80 rounded-3xl px-6 py-4 shadow-[0_20px_45px_-15px_rgba(0,0,0,0.9),_inset_0_1px_1px_rgba(255,255,255,0.03)] flex items-center justify-between overflow-hidden">
          
          {/* Subtle top/bottom gradient lines for premium neon glow */}
          <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
          <div className="absolute bottom-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

          {/* Logo and title */}
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="relative w-12 h-12 flex items-center justify-center rounded-2xl bg-[#090b14] border border-cyan-500/30 shadow-[0_0_20px_-3px_rgba(34,211,238,0.4)] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/10 to-cyan-500/10" />
              <img src={logoWithoutText} alt="Vocalize Logo" className="w-8 h-8 object-contain filter drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]" />
            </div>
            <div>
              <div className="flex items-center">
                <h1 className="text-xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-300 animate-pulse">
                  Vocalize
                </h1>
                {/* Small animated soundwave next to Vocalize logo */}
                <div className="flex items-end gap-0.5 h-3.5 ml-2.5 mb-1">
                  <div className="w-0.5 bg-violet-400 rounded-full animate-soundwave-mini" style={{ animationDelay: '0.1s', animationDuration: '0.7s' }} />
                  <div className="w-0.5 bg-cyan-400 rounded-full animate-soundwave-mini" style={{ animationDelay: '0.3s', animationDuration: '0.9s' }} />
                  <div className="w-0.5 bg-fuchsia-400 rounded-full animate-soundwave-mini" style={{ animationDelay: '0.5s', animationDuration: '0.6s' }} />
                  <div className="w-0.5 bg-violet-400 rounded-full animate-soundwave-mini" style={{ animationDelay: '0.2s', animationDuration: '0.8s' }} />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-widest mt-1 uppercase">
                AI Voice Inventory Log
              </p>
            </div>
          </div>

          {/* Right details group */}
          <div className="flex items-center gap-4 relative z-10">
            {/* Separate Language Badge */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-950/60 border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)] rounded-full text-[10px] font-extrabold tracking-wider uppercase text-slate-200">
              <Globe className="w-3.5 h-3.5 text-violet-400" />
              {(user.language || 'English').toUpperCase()}
            </div>

            {/* Vertical divider */}
            <div className="hidden md:block w-[1px] h-8 bg-slate-800/60" />

            {/* Profile Badge (Clean layout showing Name and Shop Name only) */}
            <div className="flex items-center gap-3 bg-[#090b14] border border-slate-800 px-4 py-2 rounded-2xl">
              {/* Person avatar circle with glowing border */}
              <div className="w-9 h-9 rounded-full bg-slate-950 border border-violet-500/40 shadow-[0_0_12px_rgba(139,92,246,0.4)] flex items-center justify-center text-violet-400">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white tracking-wide">
                  {user.displayName || 'Store Owner'}
                </p>
                {user.shopName && (
                  <p className="text-[10px] text-slate-400 font-medium truncate max-w-[140px] mt-0.5">
                    {user.shopName}
                  </p>
                )}
              </div>
            </div>

            {/* Vertical divider */}
            <div className="hidden sm:block w-[1px] h-8 bg-slate-800/60" />

            {/* Dedicated Settings Button */}
            <button 
              onClick={() => navigate('/settings')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-350 hover:text-white transition duration-200 cursor-pointer"
            >
              <Settings className="w-4 h-4 text-violet-400" />
              Settings
            </button>

            {/* Sign Out Button (Gradient filled capsule button) */}
            <button 
              onClick={onSignOut}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition duration-200 cursor-pointer shadow-lg shadow-violet-900/20 active:scale-95 whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] w-full mx-auto">
            {/* Left Hand side Panel: Terminal & Mic, and Audit Timeline (4 Columns) */}
            <div className="lg:col-span-4 flex flex-col gap-6 h-full min-h-0">
          
          {/* Section A: Command Center (Voice Logger Terminal) */}
          <section className="glass-card rounded-3xl p-6 border border-slate-800/60 relative overflow-hidden flex flex-col gap-5">
            {/* Version Badge Top Right */}
            <div className="absolute top-6 right-6 px-3 py-1 rounded-full border border-slate-800 bg-slate-950/40 text-[10px] font-bold text-slate-500 font-mono select-none">
              v1.0.0
            </div>
            
            {/* Title Header */}
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <h2 className="text-sm font-black tracking-wider uppercase text-white">
                COMMAND <span className="text-violet-500">CENTER</span>
              </h2>
            </div>

            {/* Concentric Microphone button and soundwaves */}
            <div className="flex items-center justify-center gap-6 py-4 relative select-none">
              
              {/* Left Side: Mock Soundwave bars */}
              <div className="flex items-center gap-0.5 opacity-30">
                <div className="w-0.5 h-2.5 bg-violet-400 rounded-full" />
                <div className="w-0.5 h-5 bg-violet-400 rounded-full" />
                <div className="w-0.5 h-3.5 bg-violet-400 rounded-full" />
                <div className="w-0.5 h-6 bg-violet-400 rounded-full animate-soundwave-mini" style={{ animationDelay: '0.1s', animationDuration: '0.7s' }} />
                <div className="w-0.5 h-3 bg-violet-400 rounded-full" />
                <div className="w-0.5 h-4.5 bg-violet-400 rounded-full animate-soundwave-mini" style={{ animationDelay: '0.3s', animationDuration: '0.9s' }} />
                <div className="w-0.5 h-2 bg-violet-400 rounded-full" />
              </div>

              {/* Concentric Microphone Trigger */}
              <div className="relative flex items-center justify-center">
                {/* Concentric circle 1 (Outer glow ring) */}
                <div className={`absolute rounded-full border border-violet-500/10 flex items-center justify-center transition-all duration-300 w-28 h-28 ${
                  isListening ? 'shadow-[0_0_35px_rgba(239,68,68,0.25)] border-rose-500/25 animate-ping' : 'shadow-[0_0_25px_rgba(139,92,246,0.1)]'
                }`} />
                {/* Concentric circle 2 (Inner outline border) */}
                <div className={`absolute rounded-full border border-violet-500/20 flex items-center justify-center transition-all duration-300 w-24 h-24 ${
                  isListening ? 'border-rose-500/40 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'shadow-[0_0_20px_rgba(139,92,246,0.15)]'
                }`} />

                {/* Inner Gradient Mic Button */}
                <button
                  onClick={toggleListening}
                  className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer hover:scale-105 active:scale-95 ${
                    isListening 
                      ? 'bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-rose-500/30' 
                      : 'bg-gradient-to-tr from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-violet-500/30'
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

              {/* Right Side: Mock Soundwave bars */}
              <div className="flex items-center gap-0.5 opacity-30">
                <div className="w-0.5 h-2 bg-violet-400 rounded-full" />
                <div className="w-0.5 h-4.5 bg-violet-400 rounded-full animate-soundwave-mini" style={{ animationDelay: '0.2s', animationDuration: '0.8s' }} />
                <div className="w-0.5 h-3 bg-violet-400 rounded-full" />
                <div className="w-0.5 h-6 bg-violet-400 rounded-full animate-soundwave-mini" style={{ animationDelay: '0.4s', animationDuration: '0.6s' }} />
                <div className="w-0.5 h-3.5 bg-violet-400 rounded-full" />
                <div className="w-0.5 h-5 bg-violet-400 rounded-full" />
                <div className="w-0.5 h-2.5 bg-violet-400 rounded-full" />
              </div>

            </div>

            {/* Instruction Speech text */}
            <div className="text-center mb-1">
              <p className="text-xs font-semibold text-slate-350 select-none">
                {isListening ? (
                  <span className="text-rose-400 animate-pulse font-terminal tracking-wider uppercase">Listening actively... Speak now</span>
                ) : (
                  <span>Click mic and say: <span className="text-violet-400 font-medium italic">"Add 10 bags of flour"</span></span>
                )}
              </p>
            </div>

            {/* Terminal Window Logger */}
            <div className="flex-1 flex flex-col mt-1">
              <div className="rounded-2xl p-4 flex-1 flex flex-col min-h-[220px] max-h-[280px] bg-slate-950/80 border border-slate-800/80 relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] overflow-hidden">
                {/* Terminal Header */}
                <div className="flex items-center justify-between border-b border-slate-900 pb-2.5 mb-2.5">
                  <div className="flex items-center gap-1.5 select-none">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-terminal">
                    <Terminal className="w-3.5 h-3.5 text-violet-400" />
                    realtime_voice_logger.sh
                  </div>
                </div>
                
                {/* Terminal Lines Container */}
                <div className="flex-1 overflow-y-auto font-terminal text-[11px] leading-relaxed text-slate-400 pr-1 flex flex-col gap-1.5 scrollbar-thin">
                  {/* Print initial ready prompt in terminal if no logs */}
                  {terminalLogs.length === 0 ? (
                    <div className="text-slate-400">
                      <span className="text-violet-400 font-bold">[System]</span> Ready. Click Microphone to speak or type command below.
                    </div>
                  ) : (
                    terminalLogs.map((logLine, idx) => {
                      let color = 'text-slate-400';
                      if (logLine.includes('✓ Success')) color = 'text-emerald-400 font-semibold';
                      else if (logLine.includes('❌') || logLine.includes('⚠️')) color = 'text-rose-400';
                      else if (logLine.includes('🎙️ Listening')) color = 'text-violet-400';
                      else if (logLine.includes('✍️ Transcribed')) color = 'text-blue-300';
                      else if (logLine.includes('🤖 Gemini AI') || logLine.includes('🤖 Gemini:') || logLine.includes('⚙️ Action')) color = 'text-indigo-300';
                      
                      // Format system prefix in logs
                      if (logLine.startsWith('[System]')) {
                        return (
                          <div key={idx} className={color}>
                            <span className="text-violet-400 font-bold">[System]</span> {logLine.substring(8)}
                          </div>
                        );
                      }

                      return (
                        <div key={idx} className={color}>
                          {logLine}
                        </div>
                      );
                    })
                  )}
                  
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
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-violet-600"
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
                  className="flex-1 text-[11px] font-terminal rounded-xl bg-slate-950 border border-violet-500/40 px-3.5 py-2.5 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                />
                <button
                  type="submit"
                  disabled={!manualCommand.trim()}
                  className="p-2.5 bg-slate-950/40 border border-violet-500/40 hover:bg-violet-600 hover:text-white rounded-xl text-violet-400 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)] transition duration-200 cursor-pointer active:scale-95 flex items-center justify-center shrink-0 disabled:bg-slate-900 disabled:border-slate-800 disabled:text-slate-600 disabled:shadow-none"
                >
                  <Send className="w-3.5 h-3.5" />
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
                                    <span>{log.calculationDetail ? log.calculationDetail.replace(/₹/g, currencySymbol) : ''}</span>
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
            <div className="relative bg-[#060814]/85 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-[0_20px_45px_-15px_rgba(0,0,0,0.9),_inset_0_1px_1px_rgba(255,255,255,0.03)] overflow-hidden mb-6 flex flex-col gap-6">
              
              {/* Subtle top/bottom gradient lines for premium neon glow */}
              <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
              <div className="absolute bottom-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

              {/* Bottom purple blur glow behind the header */}
              <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[350px] h-20 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

              {/* Row 1: Title block & Product Count */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full relative z-10">
                <div className="flex items-center gap-4">
                  {/* Database Icon Container */}
                  <div className="relative w-14 h-14 flex items-center justify-center rounded-2xl bg-[#090b14] border border-cyan-500/30 shadow-[0_0_20px_-3px_rgba(34,211,238,0.4)] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/10 to-cyan-500/10" />
                    <Database className="w-7 h-7 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-wider text-white uppercase flex items-center gap-1.5">
                      INVENTORY <span className="text-violet-500">DATABASE</span>
                      {loading && (
                        <RefreshCw className="w-4 h-4 text-violet-400 animate-spin ml-1.5" />
                      )}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-medium tracking-widest mt-1.5 uppercase">
                      OVERVIEW & STOCK MANAGEMENT
                    </p>
                  </div>
                </div>

                {/* CTAs and Products Count Badge on the right */}
                <div className="flex items-center gap-3">
                  {/* Add Product Button */}
                  <button
                    onClick={handleOpenAddModal}
                    className="px-4.5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition duration-150 cursor-pointer border border-violet-500/25 active:scale-95 shadow-lg shadow-violet-900/30 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    Add Product
                  </button>

                  {/* Manual Reload Button */}
                  <button
                    onClick={fetchData}
                    className="p-2.5 bg-slate-950/60 border border-slate-800/85 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl transition duration-150 cursor-pointer shrink-0 active:scale-95 shadow-md"
                    title="Reload table"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  {/* Products Count Badge */}
                  <div className="flex items-center gap-2.5 px-4.5 py-2.5 rounded-xl border border-violet-500/30 hover:border-violet-500/50 bg-slate-950/80 shadow-[inset_0_0_12px_rgba(139,92,246,0.15),_0_0_15px_rgba(139,92,246,0.1)] transition duration-200">
                    <Package className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-widest font-mono">
                      {products.length} {products.length === 1 ? 'PRODUCT' : 'PRODUCTS'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2: Search, Filters & Actions side-by-side */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1 relative z-10 w-full">
                {/* Left Side: Search Bar & Divider */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 flex-1">
                  {/* Search Input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-violet-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search product..."
                      className="pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-950/60 border border-slate-800/80 focus:border-violet-500 outline-none transition text-slate-200 placeholder:text-slate-500 w-full"
                    />
                  </div>
                  
                  {/* Vertical Divider (Hidden on mobile) */}
                  <div className="hidden sm:block w-[1px] h-8 bg-slate-800/40 mx-2" />

                  {/* Status Badges Selector Filter */}
                  <div className="flex rounded-xl bg-slate-950/80 p-0.5 border border-slate-800/80 overflow-x-auto scrollbar-none w-fit">
                    {(['all', 'in_stock', 'low_stock', 'out_of_stock'] as const).map(f => {
                      const isActive = statusFilter === f;
                      let label = '';
                      let IconComponent = null;

                      if (f === 'all') {
                        label = 'ALL';
                        IconComponent = LayoutGrid;
                      } else if (f === 'in_stock') {
                        label = 'IN STOCK';
                        IconComponent = CheckCircle2;
                      } else if (f === 'low_stock') {
                        label = 'LOW STOCK';
                        IconComponent = AlertTriangle;
                      } else {
                        label = 'OUT OF STOCK';
                        IconComponent = XCircle;
                      }

                      let buttonStyle = 'text-slate-400 hover:text-white border border-transparent';
                      if (isActive) {
                        buttonStyle = 'bg-violet-600/15 border border-violet-500/40 shadow-[0_0_12px_rgba(139,92,246,0.3)] text-white';
                      }

                      let iconColor = 'text-violet-400';
                      if (f === 'in_stock') iconColor = 'text-emerald-400';
                      if (f === 'low_stock') iconColor = 'text-amber-500';
                      if (f === 'out_of_stock') iconColor = 'text-rose-500';

                      return (
                        <button
                          key={f}
                          onClick={() => setStatusFilter(f)}
                          className={`px-3.5 py-2 text-[10px] font-extrabold rounded-lg tracking-wider transition duration-150 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${buttonStyle}`}
                        >
                          {IconComponent && <IconComponent className={`w-3.5 h-3.5 ${iconColor}`} />}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Side: Action Buttons */}
                <div className="flex items-center gap-3">
                  {/* Import Ledger Button */}
                  <button
                    onClick={() => {
                      setLedgerError('');
                      setExtractedItems([]);
                      setIsLedgerModalOpen(true);
                    }}
                    className="px-4 py-2.5 bg-slate-950/60 border border-slate-800/85 hover:bg-slate-900 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-2 transition duration-150 cursor-pointer active:scale-95 shadow-md shadow-slate-950/20 whitespace-nowrap"
                  >
                    <UploadCloud className="w-4 h-4 text-violet-400" />
                    Import Ledger
                  </button>
                </div>
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
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center max-w-md mx-auto py-8">
                          <div className="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4 animate-bounce">
                            <UploadCloud className="w-8 h-8" />
                          </div>
                          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Initialize Your Inventory</h3>
                          <p className="text-xs text-slate-500 mt-2 mb-6 leading-relaxed">
                            Your inventory catalog is currently empty. Get started quickly by uploading a handwritten page or scanned sheet of your stock.
                          </p>
                          <button
                            onClick={() => {
                              setLedgerError('');
                              setExtractedItems([]);
                              setIsLedgerModalOpen(true);
                            }}
                            className="px-4.5 py-2.5 bg-violet-600 hover:bg-violet-750 text-white rounded-xl text-xs font-bold transition duration-150 cursor-pointer border border-violet-500/30 flex items-center gap-2 shadow-lg shadow-violet-900/20 active:scale-95"
                          >
                            <UploadCloud className="w-4 h-4" />
                            Upload Ledger Sheet
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center text-slate-500 text-sm">
                        <Database className="w-10 h-10 mx-auto mb-3 opacity-25" />
                        No product matches. Try searching for a different keyword.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map(product => {
                      const isHighlighted = updatedProductIds.includes(product._id);
                      return (
                        <tr 
                          key={product._id} 
                          className={`transition duration-150 group ${isHighlighted ? 'highlight-row-purple' : 'hover:bg-slate-900/35'}`}
                        >
                        <td className="px-5 py-4 text-sm font-semibold text-slate-200 capitalize max-w-[140px] md:max-w-[200px] lg:max-w-[260px]">
                          <div className="w-full overflow-x-auto whitespace-nowrap product-name-scrollbar pb-1.5">
                            {product.name}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-mono text-slate-300 whitespace-nowrap">
                          {product.price !== undefined && product.price !== null ? `${currencySymbol}${product.price.toFixed(2)}` : '—'}
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
                    );
                  })
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

      {/* Ledger OCR Upload Modal */}
      {isLedgerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
          <div 
            className="glass-card w-full max-w-6xl p-6 rounded-3xl border border-slate-850 shadow-2xl relative flex flex-col gap-6 max-h-[90vh] overflow-hidden text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsLedgerModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-800 hover:text-white text-slate-400 transition cursor-pointer z-10"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto pr-1">
              {/* Left Panel: Ledger File Uploader Dropzone (col-span-4) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <section className="glass-card rounded-3xl p-6 border border-slate-800/60 relative overflow-hidden flex flex-col gap-5 h-full">
                  <div className="flex items-center gap-2 mb-1">
                    <UploadCloud className="w-5 h-5 text-cyan-400 animate-pulse" />
                    <h2 className="text-sm font-black tracking-wider uppercase text-white">
                      LEDGER <span className="text-cyan-400">SCANNER</span>
                    </h2>
                  </div>

                  {ledgerError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium text-xs">
                      {ledgerError}
                    </div>
                  )}

                  {/* Dropzone or File summary */}
                  {extractedItems.length === 0 && !isProcessingLedger ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-cyan-500/40 rounded-2xl p-6 bg-slate-950/40 transition-colors duration-200 relative group min-h-[300px]">
                      <input
                        type="file"
                        onChange={handleLedgerFileUpload}
                        accept="image/png, image/jpeg, image/jpg, image/webp, application/pdf"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <UploadCloud className="w-12 h-12 text-slate-500 group-hover:text-cyan-400 transition-colors duration-200 mb-3" />
                      <p className="text-xs font-semibold text-slate-350 text-center mb-1 leading-relaxed">
                        Drag & drop your handwritten or printed ledger sheet here, or click to browse
                      </p>
                      <p className="text-[10px] text-slate-500 text-center mt-1">
                        Supports PNG, JPG, JPEG, WEBP, or PDF up to 20MB
                      </p>
                    </div>
                  ) : isProcessingLedger ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4 min-h-[300px]">
                      <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin" />
                      <div className="text-center">
                        <p className="text-xs font-semibold text-slate-300">Processing document with Gemini AI...</p>
                        <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                          Extracting product names, stock quantities, units, and prices...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center border border-slate-800 rounded-2xl p-6 bg-[#060814]/30 min-h-[300px] text-center gap-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-200">Ledger Sheet Processed</p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Successfully extracted {extractedItems.length} items. Edit details on the right review panel.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setExtractedItems([]);
                          setLedgerError('');
                        }}
                        className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white rounded-xl text-slate-300 transition cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                      >
                        Scan Another Sheet
                      </button>
                    </div>
                  )}
                </section>
              </div>

              {/* Right Panel: Extracted Items Review Grid (col-span-8) */}
              <div className="lg:col-span-8 flex flex-col h-full min-h-[500px]">
                <section className="glass-card rounded-2xl p-5 border border-slate-800/60 flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-cyan-400" />
                      <h2 className="text-sm font-black tracking-wider uppercase text-white">
                        REVIEW & <span className="text-cyan-400">EDIT GRID</span>
                      </h2>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-slate-950 px-2.5 py-1 rounded border border-slate-900">
                      {extractedItems.length} Extracted Items
                    </span>
                  </div>

                  {extractedItems.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center py-20 bg-[#06090f] border border-slate-855 rounded-xl">
                      <Database className="w-10 h-10 mb-3 opacity-25" />
                      <p className="text-xs">No items scanned yet.</p>
                      <p className="text-[10px] opacity-75 mt-1 leading-relaxed">
                        Upload your stock inventory document on the left panel. <br />
                        The extracted list will display here for editing.
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col justify-between overflow-hidden">
                      <div className="flex-1 overflow-x-auto border border-slate-850 rounded-xl bg-[#06090f] overflow-y-auto max-h-[480px]">
                        <table className="w-full text-left border-collapse table-auto text-xs">
                          <thead>
                            <tr className="border-b border-slate-800 bg-slate-950/80 sticky top-0 z-10 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <th className="px-4 py-3">Product Name</th>
                              <th className="px-4 py-3 w-24">Quantity</th>
                              <th className="px-4 py-3 w-28">Unit</th>
                              <th className="px-4 py-3 w-32">Price ({currencySymbol})</th>
                              <th className="px-4 py-3 text-right w-20">Remove</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850 text-slate-300">
                            {extractedItems.map((item, index) => (
                              <tr key={index} className="hover:bg-slate-900/30">
                                <td className="px-4 py-2 font-semibold">
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => handleUpdateExtractedItem(index, 'name', e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-900 focus:border-violet-600/50 text-slate-200 focus:outline-none rounded px-2.5 py-1.5 capitalize"
                                  />
                                </td>
                                <td className="px-4 py-2 font-mono">
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateExtractedItem(index, 'quantity', Number(e.target.value))}
                                    className="w-full bg-slate-950/50 border border-slate-900 focus:border-violet-600/50 text-slate-200 focus:outline-none rounded px-2.5 py-1.5"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="text"
                                    value={item.unit}
                                    onChange={(e) => handleUpdateExtractedItem(index, 'unit', e.target.value)}
                                    className="w-full bg-slate-950/50 border border-slate-900 focus:border-violet-600/50 text-slate-200 focus:outline-none rounded px-2.5 py-1.5 lowercase"
                                  />
                                </td>
                                <td className="px-4 py-2 font-mono">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.price !== undefined ? item.price : ''}
                                    onChange={(e) => handleUpdateExtractedItem(index, 'price', e.target.value === '' ? undefined : Number(e.target.value))}
                                    placeholder="Not Set"
                                    className="w-full bg-slate-950/50 border border-slate-900 focus:border-violet-600/50 text-slate-200 focus:outline-none rounded px-2.5 py-1.5 placeholder:text-slate-700"
                                  />
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveExtractedItem(index)}
                                    className="p-2 hover:text-rose-500 hover:bg-slate-900 rounded-lg transition duration-150 cursor-pointer text-slate-500"
                                    title="Remove item"
                                  >
                                    <Trash2 className="w-4.5 h-4.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => {
                            setExtractedItems([]);
                            setLedgerError('');
                          }}
                          className="px-4 py-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 hover:text-white rounded-xl text-slate-350 transition cursor-pointer font-bold text-xs uppercase tracking-wider"
                        >
                          Reset List
                        </button>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setExtractedItems([]);
                              setLedgerError('');
                              setIsLedgerModalOpen(false);
                            }}
                            className="px-4 py-2.5 bg-slate-900 border border-slate-850 hover:bg-slate-800 hover:text-white rounded-xl text-slate-350 transition cursor-pointer font-bold text-xs uppercase tracking-wider"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleImportLedgerItems}
                            className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl transition cursor-pointer font-bold text-xs uppercase tracking-wider border border-violet-500/30 flex items-center gap-1.5 shadow-lg shadow-violet-900/20 active:scale-95"
                          >
                            Import {extractedItems.length} Products
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unit Price ({currencySymbol})</label>
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
