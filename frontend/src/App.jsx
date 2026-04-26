import { BrowserRouter, Routes, Route, Link, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HomePage, PostDetailPage, AuthPage, NotFoundPage } from './pages/Pages';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/"                       element={<HomePage />} />
          <Route path="/giris"                  element={<AuthPage />} />
          <Route path="/gonderiler/:id"         element={<PostDetailPage />} />
          <Route path="/gonderiler/:id/duzenle" element={<ProtectedEditPage />} />
          <Route path="*"                       element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function Navbar() {
  const { user, logout, loading } = useAuth();

  return (
    <nav className="navbar" aria-label="Ana navigasyon">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand">
          <span className="navbar__brand-logo">W</span>
          <span className="navbar__brand-name">Read</span>
        </Link>

        <div className="navbar__links">
          <NavLink to="/" className={({ isActive }) => `navbar__link${isActive ? ' navbar__link--active' : ''}`} end>
            Ana Sayfa
          </NavLink>
        </div>

        <div className="navbar__auth">
          {loading ? null : user ? (
            <>
              <span className="navbar__username">@{user.username}</span>
              <button className="btn btn--ghost btn--sm" onClick={logout}>Çıkış Yap</button>
            </>
          ) : (
            <>
              <Link to="/giris" className="btn btn--ghost btn--sm">Giriş Yap</Link>
              <Link to="/giris" className="btn btn--primary btn--sm">Kayıt Ol</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function ProtectedEditPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/giris" replace />;
  return (
    <main className="page page--center">
      <p className="state-message">Düzenleme formu yükleniyor…</p>
    </main>
  );
}