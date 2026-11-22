import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Restaurant, Role } from '../types';
import { backend } from '../db/backendService';

interface AuthContextType {
  currentUser: User | null;
  currentRestaurant: Restaurant | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  register: (data: {
    restaurantName: string;
    ownerName: string;
    email: string;
    phone: string;
    password: string;
    address: string;
    restaurantType: any;
  }) => Promise<void>;
  refreshSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateSession = () => {
    try {
      const storedUserId = localStorage.getItem('dineflow_auth_user_id');
      if (storedUserId) {
        // Find user across system
        const raw = localStorage.getItem('dineflow_storage_v2');
        if (raw) {
          const db = JSON.parse(raw);
          const user: User | undefined = db.users?.find((u: User) => u.id === storedUserId && u.isActive);
          if (user) {
            setCurrentUser(user);
            if (user.role === 'superadmin') {
              setCurrentRestaurant(null);
            } else {
              const rest: Restaurant | undefined = db.restaurants?.find((r: Restaurant) => r.id === user.restaurantId);
              setCurrentRestaurant(rest || null);
            }
            return;
          }
        }
      }

      // No active session: leave currentUser as null so Registration page displays first
      setCurrentUser(null);
      setCurrentRestaurant(null);
    } catch (e) {
      console.error('Session hydration error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    hydrateSession();
    return backend.subscribe(() => {
      hydrateSession();
    });
  }, []);

  const login = async (email: string, pass: string) => {
    const user = await backend.login(email, pass);
    localStorage.setItem('dineflow_auth_user_id', user.id);
    setCurrentUser(user);

    if (user.role === 'superadmin') {
      setCurrentRestaurant(null);
    } else {
      const rest = backend.getRestaurant({ restaurantId: user.restaurantId, role: user.role }, user.restaurantId);
      setCurrentRestaurant(rest);
    }
  };

  const logout = () => {
    localStorage.removeItem('dineflow_auth_user_id');
    setCurrentUser(null);
    setCurrentRestaurant(null);
  };

  const register = async (data: any) => {
    const res = await backend.registerRestaurant(data);
    localStorage.setItem('dineflow_auth_user_id', res.user.id);
    setCurrentUser(res.user);
    setCurrentRestaurant(res.restaurant);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRestaurant,
        isLoading,
        login,
        logout,
        register,
        refreshSession: hydrateSession
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
