import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Restaurant, RestaurantType } from '../types';
import { supabase, isSupabaseConfigured } from '../db/supabaseClient';
import { supabaseService } from '../db/supabaseService';
import { backend } from '../db/backendService';

interface AuthContextType {
  currentUser: User | null;
  currentRestaurant: Restaurant | null;
  isLoading: boolean;
  authError: string | null;
  isSupabaseReady: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: {
    restaurantName: string;
    ownerName: string;
    email: string;
    phone: string;
    password: string;
    address: string;
    restaurantType: RestaurantType | string;
    gstNumber?: string;
    fssaiNumber?: string;
  }) => Promise<{ requiresEmailConfirmation: boolean }>;
  requestPasswordReset: (email: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const failedAttemptsRef = useRef<Map<string, { count: number; lastFailed: number }>>(new Map());

  const hydrateFromSupabaseSession = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setCurrentUser(null);
      setCurrentRestaurant(null);
      setAuthError(
        'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to enable authentication and persistence.'
      );
      setIsLoading(false);
      return;
    }

    try {
      setAuthError(null);
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw new Error(sessionErr.message);

      const session = sessionData.session;
      if (!session?.user) {
        setCurrentUser(null);
        setCurrentRestaurant(null);
        backend.clearSessionCache();
        return;
      }

      const { user, restaurant } = await supabaseService.fetchCurrentUserProfile(session.user.id);
      setCurrentUser(user);
      setCurrentRestaurant(restaurant);

      if (user.role !== 'superadmin' && user.restaurantId) {
        await backend.hydrateRestaurant(user.restaurantId);
      }
    } catch (err: any) {
      console.error('Session hydration error:', err);
      setAuthError(err.message || 'Failed to restore authenticated session.');
      setCurrentUser(null);
      setCurrentRestaurant(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    hydrateFromSupabaseSession();

    if (!isSupabaseConfigured || !supabase) return;

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setCurrentRestaurant(null);
        backend.clearSessionCache();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        hydrateFromSupabaseSession();
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Keep currentRestaurant synced with settings updates
  useEffect(() => {
    return backend.subscribe(() => {
      if (currentUser && currentUser.role !== 'superadmin' && currentUser.restaurantId) {
        const updatedRest = backend.getRestaurant(
          { restaurantId: currentUser.restaurantId, role: currentUser.role },
          currentUser.restaurantId
        );
        if (updatedRest) {
          setCurrentRestaurant(updatedRest);
        }
      }
    });
  }, [currentUser?.id, currentUser?.role, currentUser?.restaurantId]);

  const login = async (email: string, pass: string) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Check your .env file.');
    }

    const key = email.toLowerCase().trim();
    const rateInfo = failedAttemptsRef.current.get(key);
    if (rateInfo && rateInfo.count >= 5 && Date.now() - rateInfo.lastFailed < 60000) {
      const waitSeconds = Math.ceil((60000 - (Date.now() - rateInfo.lastFailed)) / 1000);
      throw new Error(`Too many failed login attempts. Please wait ${waitSeconds} seconds.`);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: key,
      password: pass,
    });

    if (error || !data.user) {
      const current = failedAttemptsRef.current.get(key) || { count: 0, lastFailed: 0 };
      failedAttemptsRef.current.set(key, { count: current.count + 1, lastFailed: Date.now() });
      throw new Error(error?.message || 'Invalid email or password.');
    }

    failedAttemptsRef.current.delete(key);

    try {
      const { user, restaurant } = await supabaseService.fetchCurrentUserProfile(data.user.id);
      setCurrentUser(user);
      setCurrentRestaurant(restaurant);
      if (user.role !== 'superadmin' && user.restaurantId) {
        await backend.hydrateRestaurant(user.restaurantId);
      }
    } catch (profileErr) {
      await supabase.auth.signOut();
      throw profileErr;
    }
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    backend.clearSessionCache();
    setCurrentUser(null);
    setCurrentRestaurant(null);
  };

  const register = async (data: {
    restaurantName: string;
    ownerName: string;
    email: string;
    phone: string;
    password: string;
    address: string;
    restaurantType: RestaurantType | string;
    gstNumber?: string;
    fssaiNumber?: string;
  }) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Check your .env file.');
    }

    const res = await supabaseService.registerRestaurantWorkspace(data);
    if (res.requiresEmailConfirmation) {
      return { requiresEmailConfirmation: true };
    }

    if (res.user && res.restaurant) {
      setCurrentUser(res.user);
      setCurrentRestaurant(res.restaurant);
      await backend.hydrateRestaurant(res.restaurant.id);
    }
    return { requiresEmailConfirmation: false };
  };

  const requestPasswordReset = async (email: string) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured.');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
      redirectTo: window.location.origin,
    });
    if (error) throw new Error(error.message);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRestaurant,
        isLoading,
        authError,
        isSupabaseReady: isSupabaseConfigured,
        login,
        logout,
        register,
        requestPasswordReset,
        refreshSession: hydrateFromSupabaseSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
