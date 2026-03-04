/**
 * ApiContext – État global de l'application RIPA
 * Gère : utilisateur connecté, token JWT, déverrouillage par PIN, chargement initial, erreurs.
 *
 * - On garde toujours le token de l'utilisateur qui a déjà un compte pour les futures utilisations :
 *   au démarrage on le restaure → écran PIN (UnlockScreen) → l'utilisateur met juste son PIN → accès Home.
 * - Si le token expire (verify-token échoue au démarrage) : on supprime le token et on ramène à WelcomeScreen.
 */
import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import * as storage from '../services/storage';
import * as api from '../services/api';

const ApiContext = createContext(null);

export function ApiProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [needsPinUnlock, setNeedsPinUnlock] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /** Déconnexion : supprime token et user, nettoie le stockage */
  const logout = useCallback(async () => {
    await storage.removeToken();
    setToken(null);
    setUser(null);
    setNeedsPinUnlock(false);
    setError(null);
  }, []);

  /** Enregistre le token et l'utilisateur (après login ou verify OTP) */
  const setAuth = useCallback(async (newToken, newUser) => {
    await storage.setToken(newToken);
    setToken(newToken);
    setUser(newUser);
    setNeedsPinUnlock(false);
    setError(null);
  }, []);

  /** Déverrouiller avec le PIN (token déjà stocké). Backend décode le token, charge l'utilisateur, vérifie le PIN. */
  const unlockWithPin = useCallback(async (pin) => {
    const currentToken = await storage.getToken();
    if (!currentToken) {
      setError('Session expirée. Reconnectez-vous.');
      return false;
    }
    setError(null);
    try {
      const res = await api.verifyPin(currentToken, pin);
      if (res.success) {
        setNeedsPinUnlock(false);
        if (res.data?.user) setUser(res.data.user);
        return true;
      }
      setError(res.message || 'PIN incorrect.');
      return false;
    } catch (e) {
      setError(e.message || 'PIN incorrect.');
      return false;
    }
  }, []);

  /** Au démarrage : restaurer le token, le vérifier. Si valide → token + user + needsPinUnlock (écran PIN). Si 401/404 → supprimer token → WelcomeScreen. Sinon (réseau, etc.) → garder le token et afficher UnlockScreen. */
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const savedToken = await storage.getToken();
        console.log('[RIPA JWT] Init démarrage — token présent:', !!savedToken, savedToken ? `longueur ${savedToken.length}` : '');
        if (!savedToken) {
          if (!cancelled) {
            setToken(null);
            setUser(null);
            setNeedsPinUnlock(false);
          }
          return;
        }
        console.log('[RIPA JWT] Appel verifyToken...');
        const res = await api.verifyToken(savedToken);
        if (cancelled) return;
        if (res.success && res.data?.user) {
          console.log('[RIPA JWT] verifyToken OK → UnlockScreen (PIN requis)');
          setToken(savedToken);
          setUser(res.data.user);
          setNeedsPinUnlock(true);
        } else {
          console.log('[RIPA JWT] verifyToken réponse invalide (pas de user) → suppression token → Welcome');
          await storage.removeToken();
          setToken(null);
          setUser(null);
          setNeedsPinUnlock(false);
        }
      } catch (e) {
        if (cancelled) return;
        const status = e.status;
        const isAuthError = status === 401 || status === 404;
        console.log('[RIPA JWT] verifyToken erreur:', e?.message, 'status:', status, '→', isAuthError ? 'suppression token' : 'garder token, UnlockScreen');
        if (isAuthError) {
          await storage.removeToken();
          setToken(null);
          setUser(null);
          setNeedsPinUnlock(false);
        } else {
          const kept = await storage.getToken();
          if (kept) {
            setToken(kept);
            setUser(null);
            setNeedsPinUnlock(true);
          } else {
            setToken(null);
            setUser(null);
            setNeedsPinUnlock(false);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  const value = {
    user,
    setUser,
    token,
    setToken,
    setAuth,
    logout,
    unlockWithPin,
    needsPinUnlock,
    isLoading,
    setIsLoading,
    error,
    setError,
    isAuthenticated: !!token && !!user && !needsPinUnlock,
  };

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApi() {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApi doit être utilisé à l\'intérieur de ApiProvider');
  return ctx;
}
