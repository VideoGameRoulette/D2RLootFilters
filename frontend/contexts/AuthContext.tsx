"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";

interface User {
  id: number;
  username: string;
  email?: string;
}

interface AuthContextValue {
  user: User | null;
  groups: string[];
  permissions: string[];
  loading: boolean;
  csrfToken: string;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<string[]>([]);
  const [permissions, setPerms] = useState<string[]>([]);
  const [csrfToken, setToken] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuthData = async () => {
      setLoading(true);
      try {
        const response = await axios.get("/auth/status");
        if (response.data.user) {
          setUser(response.data.user);
          setGroups(response.data.groups);
          setPerms(response.data.permissions);
          setToken(response.data.csrfToken);
        } else {
          setUser(null);
          setGroups([]);
          setPerms([]);
          setToken(response.data.csrfToken);
        }
      } catch {
        setUser(null);
        setGroups([]);
        setPerms([]);
        setToken("");
      }
      setLoading(false);
    };
    fetchAuthData();
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post("/auth/logout/", {}, {
        headers: { "X-CSRFToken": csrfToken },
      });
    } catch {
      // Logout may redirect, which can cause a network error - that's fine
    }
    window.location.reload();
  }, [csrfToken]);

  const value = useMemo(
    () => ({ user, groups, permissions, loading, csrfToken, logout }),
    [user, groups, permissions, loading, csrfToken, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
