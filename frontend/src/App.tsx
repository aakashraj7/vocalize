import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  deleteUser
} from 'firebase/auth';

import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import SettingsPage from './components/SettingsPage';

interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  shopName?: string;
  isDemo?: boolean;
  category?: string;
  currency?: string;
  language?: string;
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
        
        // Load custom settings
        const customSettingsStr = localStorage.getItem('vocalize_settings_' + firebaseUser.uid);
        const customSettings = customSettingsStr ? JSON.parse(customSettingsStr) : {};

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || customSettings.merchantName || null,
          shopName: customSettings.shopName || 'My Store',
          category: customSettings.category || 'General Retail',
          currency: customSettings.currency || 'INR',
          language: customSettings.language || 'English (Standard)'
        });
      } else {
        localStorage.removeItem('vocalize_token');
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleEmailAuth = async (
    emailInput: string,
    passwordInput: string,
    mode: 'signin' | 'signup',
    extra: { merchantName: string; shopName: string; category: string; currency: string; language: string }
  ) => {
    setError(null);

    if (!emailInput || !passwordInput) {
      setError('Please fill in all fields.');
      return;
    }

    if (passwordInput.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    // Local Sandbox auth simulation when Firebase is not configured
    if (!isConfigured) {
      try {
        const storedUsersStr = localStorage.getItem('vocalize_mock_users');
        const mockUsers = storedUsersStr ? JSON.parse(storedUsersStr) : [];

        if (mode === 'signup') {
          if (!extra.merchantName.trim()) {
            setError('Please fill in your Full Name.');
            return;
          }
          if (!extra.shopName.trim()) {
            setError('Please fill in the Shop Name.');
            return;
          }

          const userExists = mockUsers.some((u: any) => u.email.toLowerCase() === emailInput.toLowerCase());
          if (userExists) {
            setError('Account already exists in local sandbox database. Please sign in instead.');
            return;
          }

          const newUser = {
            uid: 'mock_u_' + Math.random().toString(36).substring(2, 11),
            email: emailInput.toLowerCase().trim(),
            password: passwordInput,
            displayName: extra.merchantName,
            shopName: extra.shopName,
            category: extra.category,
            currency: extra.currency,
            language: extra.language
          };
          mockUsers.push(newUser);
          localStorage.setItem('vocalize_mock_users', JSON.stringify(mockUsers));

          const token = encodeMockJwt(newUser.uid, newUser.email);
          localStorage.setItem('vocalize_token', token);

          const appUser: AppUser = {
            uid: newUser.uid,
            email: newUser.email,
            displayName: newUser.displayName,
            shopName: newUser.shopName,
            category: newUser.category,
            currency: newUser.currency,
            language: newUser.language
          };
          localStorage.setItem('vocalize_mock_user', JSON.stringify(appUser));
          setUser(appUser);
        } else {
          const foundUser = mockUsers.find(
            (u: any) => u.email.toLowerCase() === emailInput.toLowerCase() && u.password === passwordInput
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
            displayName: foundUser.displayName || foundUser.email.split('@')[0],
            shopName: foundUser.shopName || 'My Store',
            category: foundUser.category || 'General Retail',
            currency: foundUser.currency || 'INR',
            language: foundUser.language || 'English (Standard)'
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
      if (mode === 'signin') {
        const credentials = await signInWithEmailAndPassword(auth, emailInput, passwordInput);
        const token = await credentials.user.getIdToken();
        localStorage.setItem('vocalize_token', token);
        
        // Load custom settings
        const customSettingsStr = localStorage.getItem('vocalize_settings_' + credentials.user.uid);
        const customSettings = customSettingsStr ? JSON.parse(customSettingsStr) : {};

        setUser({
          uid: credentials.user.uid,
          email: credentials.user.email,
          displayName: credentials.user.displayName || customSettings.merchantName || null,
          shopName: customSettings.shopName || 'My Store',
          category: customSettings.category || 'General Retail',
          currency: customSettings.currency || 'INR',
          language: customSettings.language || 'English (Standard)'
        });
      } else {
        if (!extra.merchantName.trim()) {
          setError('Please fill in your Full Name.');
          return;
        }
        if (!extra.shopName.trim()) {
          setError('Please fill in the Shop Name.');
          return;
        }

        const credentials = await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
        const token = await credentials.user.getIdToken();
        localStorage.setItem('vocalize_token', token);
        
        // Update display name
        try {
          await updateProfile(credentials.user, { displayName: extra.merchantName });
        } catch (err) {
          console.error('Error updating Firebase display name:', err);
        }

        // Save settings locally
        const settings = { 
          merchantName: extra.merchantName,
          shopName: extra.shopName, 
          category: extra.category, 
          currency: extra.currency, 
          language: extra.language 
        };
        localStorage.setItem('vocalize_settings_' + credentials.user.uid, JSON.stringify(settings));

        setUser({
          uid: credentials.user.uid,
          email: credentials.user.email,
          displayName: extra.merchantName,
          shopName: extra.shopName,
          category: extra.category,
          currency: extra.currency,
          language: extra.language
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
      
      const customSettingsStr = localStorage.getItem('vocalize_settings_' + result.user.uid);
      const customSettings = customSettingsStr ? JSON.parse(customSettingsStr) : {};

      setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || customSettings.merchantName || null,
        shopName: customSettings.shopName || 'My Store',
        category: customSettings.category || 'General Retail',
        currency: customSettings.currency || 'INR',
        language: customSettings.language || 'English (Standard)'
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
      shopName: 'Demo Store',
      isDemo: true,
      category: 'General Retail',
      currency: 'INR',
      language: 'English (Standard)'
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

  const handleUpdateProfile = async (updatedData: {
    displayName: string;
    shopName: string;
    category: string;
    currency: string;
    language: string;
  }) => {
    if (!user) return;

    if (user.isDemo) {
      const updatedUser = {
        ...user,
        ...updatedData
      };
      localStorage.setItem('vocalize_mock_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return;
    }

    if (!isConfigured) {
      try {
        const storedUsersStr = localStorage.getItem('vocalize_mock_users');
        const mockUsers = storedUsersStr ? JSON.parse(storedUsersStr) : [];
        const userIndex = mockUsers.findIndex((u: any) => u.uid === user.uid);
        
        if (userIndex !== -1) {
          mockUsers[userIndex] = {
            ...mockUsers[userIndex],
            displayName: updatedData.displayName,
            shopName: updatedData.shopName,
            category: updatedData.category,
            currency: updatedData.currency,
            language: updatedData.language
          };
          localStorage.setItem('vocalize_mock_users', JSON.stringify(mockUsers));
        }

        const updatedUser = {
          ...user,
          ...updatedData
        };
        localStorage.setItem('vocalize_mock_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      } catch (err) {
        console.error('Error updating mock profile:', err);
        throw new Error('Failed to update mock profile');
      }
      return;
    }

    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: updatedData.displayName });
        
        const settings = {
          merchantName: updatedData.displayName,
          shopName: updatedData.shopName,
          category: updatedData.category,
          currency: updatedData.currency,
          language: updatedData.language
        };
        localStorage.setItem('vocalize_settings_' + user.uid, JSON.stringify(settings));

        setUser({
          ...user,
          ...updatedData
        });
      }
    } catch (err: any) {
      console.error('Error updating Firebase profile:', err);
      throw new Error(err.message.replace('Firebase: ', ''));
    }
  };

  const handlePasswordReset = async () => {
    if (!user || !user.email) {
      throw new Error('No user is currently signed in.');
    }

    if (user.isDemo || !isConfigured) {
      return { success: true, message: `[Sandbox Simulator] Password reset email sent to ${user.email}.` };
    }

    try {
      await sendPasswordResetEmail(auth, user.email);
      return { success: true, message: `Password reset email sent to ${user.email}.` };
    } catch (err: any) {
      console.error('Error sending reset email:', err);
      throw new Error(err.message.replace('Firebase: ', ''));
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return { success: false };
    const uid = user.uid;

    try {
      const token = user.isDemo ? 'mock-token-123' : localStorage.getItem('vocalize_token');
      const response = await fetch('/api/clear-all', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to wipe data from backend database.');
      }

      localStorage.removeItem('vocalize_settings_' + uid);

      if (user.isDemo) {
        localStorage.removeItem('vocalize_mock_user');
        localStorage.removeItem('vocalize_token');
        setUser(null);
        return { success: true };
      }

      if (!isConfigured) {
        const storedUsersStr = localStorage.getItem('vocalize_mock_users');
        if (storedUsersStr) {
          const mockUsers = JSON.parse(storedUsersStr);
          const updatedMockUsers = mockUsers.filter((u: any) => u.uid !== uid);
          localStorage.setItem('vocalize_mock_users', JSON.stringify(updatedMockUsers));
        }
        localStorage.removeItem('vocalize_mock_user');
        localStorage.removeItem('vocalize_token');
        setUser(null);
        return { success: true };
      }

      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }
      localStorage.removeItem('vocalize_token');
      setUser(null);
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting account:', err);
      if (err.code === 'auth/requires-recent-login' || err.message?.includes('requires-recent-login')) {
        throw new Error('This operation is sensitive and requires recent authentication. Please sign out, sign in again, and then try deleting your account.');
      }
      throw new Error(err.message || 'Error occurred while deleting account.');
    }
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

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            <LandingPage 
              onLaunchDemo={launchDemoMode} 
              user={user} 
              onSignOut={handleSignOut} 
            />
          } 
        />
        <Route 
          path="/login" 
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <AuthPage 
                authMode="signin"
                onEmailAuth={handleEmailAuth}
                onGoogleSignIn={handleGoogleSignIn}
                onLaunchDemo={launchDemoMode}
                isConfigured={isConfigured}
                error={error}
                setError={setError}
              />
            )
          } 
        />
        <Route 
          path="/signup" 
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <AuthPage 
                authMode="signup"
                onEmailAuth={handleEmailAuth}
                onGoogleSignIn={handleGoogleSignIn}
                onLaunchDemo={launchDemoMode}
                isConfigured={isConfigured}
                error={error}
                setError={setError}
              />
            )
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            user ? (
              <Dashboard 
                user={user} 
                onSignOut={handleSignOut} 
              />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/settings" 
          element={
            user ? (
              <SettingsPage 
                user={user} 
                onSignOut={handleSignOut} 
                onUpdateUser={handleUpdateProfile}
                onPasswordReset={handlePasswordReset}
                onDeleteAccount={handleDeleteAccount}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="*" 
          element={<Navigate to="/" replace />} 
        />
      </Routes>
    </BrowserRouter>
  );
}
