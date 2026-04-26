import { createContext, useContext, useEffect, useReducer } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

const initialState = {
  user:    null,
  token:   localStorage.getItem('wread_token') || null,
  loading: true,
  error:   null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null };
    case 'AUTH_SUCCESS':
      return { ...state, loading: false, user: action.user, token: action.token, error: null };
    case 'LOGOUT':
      return { ...state, loading: false, user: null, token: null, error: null };
    case 'ERROR':
      return { ...state, loading: false, error: action.error };
    case 'INIT_DONE':
      return { ...state, loading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!state.token) {
      dispatch({ type: 'INIT_DONE' });
      return;
    }

    authApi.me()
      .then(res => dispatch({ type: 'AUTH_SUCCESS', user: res.data.user, token: state.token }))
      .catch(() => {
        localStorage.removeItem('wread_token');
        dispatch({ type: 'LOGOUT' });
      });
  }, []);

  async function login(email, password) {
    dispatch({ type: 'LOADING' });
    const res = await authApi.login({ email, password });
    localStorage.setItem('wread_token', res.data.token);
    dispatch({ type: 'AUTH_SUCCESS', user: res.data.user, token: res.data.token });
    return res;
  }

  async function register(payload) {
    dispatch({ type: 'LOADING' });
    const res = await authApi.register(payload);
    localStorage.setItem('wread_token', res.data.token);
    dispatch({ type: 'AUTH_SUCCESS', user: res.data.user, token: res.data.token });
    return res;
  }

  async function logout() {
    try { await authApi.logout(); } catch (_) {}
    localStorage.removeItem('wread_token');
    dispatch({ type: 'LOGOUT' });
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalıdır.');
  return ctx;
}