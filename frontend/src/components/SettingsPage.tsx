import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Lock, Trash2, ArrowLeft, AlertTriangle, 
  CheckCircle2, Sparkles, Store, LogOut
} from 'lucide-react';
import logoWithoutText from '../assets/vocalize-logo-without-text.png';

interface SettingsPageProps {
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
  onUpdateUser: (updatedData: {
    displayName: string;
    shopName: string;
    category: string;
    currency: string;
    language: string;
  }) => Promise<void>;
  onPasswordReset: () => Promise<{ success: boolean; message: string }>;
  onDeleteAccount: () => Promise<{ success: boolean }>;
}

export default function SettingsPage({
  user,
  onSignOut,
  onUpdateUser,
  onPasswordReset,
  onDeleteAccount
}: SettingsPageProps) {
  const navigate = useNavigate();

  // Active Category State
  const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'delete'>('personal');

  // Input States
  const [profileName, setProfileName] = useState('');
  const [profileShopName, setProfileShopName] = useState('');
  const [profileCategory, setProfileCategory] = useState('');
  const [profileCurrency, setProfileCurrency] = useState('');
  const [profileLanguage, setProfileLanguage] = useState('');

  // Status Alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Action states
  const [isSaving, setIsSaving] = useState(false);
  const [deleteInputCode, setDeleteInputCode] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Set document title
  useEffect(() => {
    document.title = "Account Settings | Vocalize";
  }, []);

  // Sync state with user data
  useEffect(() => {
    if (user) {
      setProfileName(user.displayName || '');
      setProfileShopName(user.shopName || '');
      setProfileCategory(user.category || 'General Retail');
      setProfileCurrency(user.currency || 'INR');
      setProfileLanguage(user.language || 'English (Standard)');
    }
  }, [user]);

  // Derived deletion code target
  const verificationCode = `${user.displayName || 'Store Owner'}@${user.shopName || 'My Store'}`;

  // Form Submit Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    if (!profileName.trim()) {
      setErrorMsg('Please enter your Full Name.');
      return;
    }
    if (!profileShopName.trim()) {
      setErrorMsg('Please enter your Shop Name.');
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateUser({
        displayName: profileName,
        shopName: profileShopName,
        category: profileCategory,
        currency: profileCurrency,
        language: profileLanguage
      });
      setSuccessMsg('Settings updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // Password Reset Link Handler
  const handleTriggerPasswordReset = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await onPasswordReset();
      setSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to trigger password reset email.');
    }
  };

  // Delete Account Handler
  const handleDeleteTrigger = async () => {
    if (deleteInputCode !== verificationCode) {
      setErrorMsg('Confirmation code does not match.');
      return;
    }
    
    setErrorMsg('');
    setSuccessMsg('');
    setIsDeleting(true);
    try {
      await onDeleteAccount();
      // App router handles redirect, but navigate to login just in case
      navigate('/login');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete account.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-violet-600/30">
      
      {/* Header Capsule Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900/60 border border-slate-800/80 p-1 flex items-center justify-center overflow-hidden">
            <img src={logoWithoutText} alt="Vocalize Logo" className="w-8 h-8 object-contain filter drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-300">
              Vocalize
            </h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">
              Merchant Settings Panel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-violet-500/30 rounded-xl transition duration-200 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </button>
          
          <button 
            onClick={onSignOut}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-900/40 hover:bg-rose-950/20 border border-slate-800/80 hover:border-rose-900/30 rounded-xl transition duration-200 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Settings Page Container */}
      <main className="flex-1 p-6 max-w-[1200px] w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
        
        {/* Left Sidebar Pane: Category Tabs */}
        <section className="md:col-span-4 flex flex-col gap-2">
          <div className="glass-card p-4 rounded-2xl border border-slate-850 flex flex-col gap-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 px-2">Settings Category</p>
            
            <button
              onClick={() => {
                setActiveTab('personal');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-semibold transition cursor-pointer ${
                activeTab === 'personal'
                  ? 'bg-violet-600/10 text-violet-400 border border-violet-500/25 shadow-[0_0_15px_rgba(139,92,246,0.05)]'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-900/50'
              }`}
            >
              <User className="w-4.5 h-4.5" />
              Personal Information
            </button>

            <button
              onClick={() => {
                setActiveTab('security');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-semibold transition cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-violet-600/10 text-violet-400 border border-violet-500/25 shadow-[0_0_15px_rgba(139,92,246,0.05)]'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-900/50'
              }`}
            >
              <Lock className="w-4.5 h-4.5" />
              Security
            </button>

            <button
              onClick={() => {
                setActiveTab('delete');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-semibold transition cursor-pointer ${
                activeTab === 'delete'
                  ? 'bg-rose-950/10 text-rose-450 border border-rose-900/20 shadow-[0_0_15px_rgba(239,68,68,0.02)]'
                  : 'text-slate-400 hover:text-rose-400 border border-transparent hover:bg-rose-950/5'
              }`}
            >
              <Trash2 className="w-4.5 h-4.5" />
              Delete Account
            </button>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-slate-850/80 text-xs text-slate-500 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-400 uppercase tracking-wide">
              <Store className="w-3.5 h-3.5" />
              Store Summary
            </div>
            <div className="space-y-1 mt-1 pl-0.5">
              <p>Merchant: <span className="text-slate-350 font-semibold">{user.displayName || 'Guest Store Owner'}</span></p>
              <p>Store: <span className="text-slate-350 font-semibold">{user.shopName || 'Demo Store'}</span></p>
              <p>Email: <span className="text-slate-350 font-semibold">{user.email || 'demo@vocalize.com'}</span></p>
              <p>Status: <span className="text-violet-400 font-bold uppercase">{user.isDemo ? 'Demo Mode' : 'Production'}</span></p>
            </div>
          </div>
        </section>

        {/* Right Content Pane: Tab Form */}
        <section className="md:col-span-8">
          <div className="glass-card p-6 rounded-2xl border border-slate-850 shadow-xl flex flex-col gap-5 min-h-[400px]">
            
            {/* Title / Description */}
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white tracking-wide">
                {activeTab === 'personal' && 'Personal Information'}
                {activeTab === 'security' && 'Security & Password Credentials'}
                {activeTab === 'delete' && 'Danger Zone: Account Deletion'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {activeTab === 'personal' && 'Manage your merchant profile details, store branding type, and localized region options.'}
                {activeTab === 'security' && 'Trigger security operations such as sending a password credentials reset request email.'}
                {activeTab === 'delete' && 'Permanently delete your entire merchant presence, catalog inventory, and audit logs. This cannot be undone.'}
              </p>
            </div>

            {/* Error/Success Status Alerts */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 font-semibold text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 font-semibold text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                {successMsg}
              </div>
            )}

            {/* Content Switcher */}
            <div className="flex-1">
              
              {/* TAB 1: PERSONAL INFORMATION */}
              {activeTab === 'personal' && (
                <form onSubmit={handleSaveProfile} className="space-y-4 text-sm max-w-lg">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-200 border border-slate-800 focus:border-violet-500 outline-none transition bg-[#090d16]"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-1">Shop Name</label>
                    <input
                      type="text"
                      required
                      value={profileShopName}
                      onChange={(e) => setProfileShopName(e.target.value)}
                      placeholder="e.g. Grocery Supermarket"
                      className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-200 border border-slate-800 focus:border-violet-500 outline-none transition bg-[#090d16]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-1">Store Category</label>
                      <select
                        value={profileCategory}
                        onChange={(e) => setProfileCategory(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl glass-input text-slate-200 border border-slate-800 focus:border-violet-500 outline-none transition bg-[#090d16]"
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

                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-1">Region Currency</label>
                      <select
                        value={profileCurrency}
                        onChange={(e) => setProfileCurrency(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl glass-input text-slate-200 border border-slate-800 focus:border-violet-500 outline-none transition bg-[#090d16]"
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left pb-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-1">Spoken Language Dialect</label>
                    <select
                      value={profileLanguage}
                      onChange={(e) => setProfileLanguage(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl glass-input text-slate-200 border border-slate-800 focus:border-violet-500 outline-none transition bg-[#090d16]"
                    >
                      <option value="English (Standard)">English (Standard)</option>
                      <option value="English (Indian Dialect)">English (Indian Dialect)</option>
                      <option value="Hindi (हिंदी)">Hindi (हिंदी)</option>
                      <option value="Spanish (Español)">Spanish (Español)</option>
                      <option value="French (Français)">French (Français)</option>
                      <option value="German (Deutsch)">German (Deutsch)</option>
                    </select>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-800">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-800 text-white rounded-xl transition cursor-pointer font-bold flex items-center justify-center gap-1.5 border border-violet-500/30 text-xs shadow-md shadow-violet-600/10"
                    >
                      {isSaving ? 'Saving Updates...' : 'Save Settings'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: SECURITY */}
              {activeTab === 'security' && (
                <div className="space-y-5 max-w-lg text-left">
                  <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-slate-200">Reset Account Password</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs">
                        This sends a password reset link to your registered email address <strong>{user.email || 'your registered account'}</strong>. Clicking it redirects you to reset your password safely.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleTriggerPasswordReset}
                      className="px-4 py-2.5 text-xs font-bold text-slate-200 hover:text-white bg-violet-600 hover:bg-violet-700 border border-violet-500/25 rounded-xl transition cursor-pointer shrink-0 shadow-md shadow-violet-600/10"
                    >
                      Reset Password
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-violet-600/5 border border-violet-500/10 text-xs text-slate-400 leading-relaxed flex gap-2">
                    <Sparkles className="w-4.5 h-4.5 text-violet-400 shrink-0 mt-0.5" />
                    <p>
                      Vocalize uses secure industry-standard credential encryption protocols. When in sandbox mode, password links are simulated instantly. Production instances dispatch actual verification messages.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: DANGER ZONE (DELETE) */}
              {activeTab === 'delete' && (
                <div className="space-y-5 max-w-lg text-left">
                  <div className="p-4.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex gap-3 text-xs leading-relaxed">
                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-455">Irreversible Action: Wiping Inventory Database</p>
                      <p className="text-slate-400 mt-1">
                        Deleting this account wipes out all product entries, stock details, quantities, unit prices, and speech-to-text audit logs from our databases completely. This action cannot be undone.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-1 block">
                        To confirm deletion, type: <span className="text-rose-400 font-mono font-bold select-all bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10">{verificationCode}</span>
                      </label>
                      <input
                        type="text"
                        value={deleteInputCode}
                        onChange={(e) => setDeleteInputCode(e.target.value)}
                        placeholder="Type verification code here"
                        className="w-full px-4 py-2.5 rounded-xl glass-input text-slate-200 border border-rose-900/35 focus:border-rose-550 outline-none transition bg-[#090d16] font-mono text-xs"
                      />
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-800">
                      <button
                        type="button"
                        disabled={deleteInputCode !== verificationCode || isDeleting}
                        onClick={handleDeleteTrigger}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-950/40 disabled:text-slate-500 disabled:border-slate-900 text-white rounded-xl transition cursor-pointer font-bold flex items-center justify-center gap-1.5 border border-rose-500/30 text-xs"
                      >
                        {isDeleting ? 'Deleting Merchant...' : 'Yes, Delete Account Permanently'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
