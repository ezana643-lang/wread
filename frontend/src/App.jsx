import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import * as Pages from './pages/Pages';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </AuthProvider>
  );
}

function Layout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          <Link to="/" className="brand">
            <span className="brand__logo">W</span>
            <span className="brand__name">Read</span>
          </Link>
        </div>
        <nav className="header__nav">
          {user ? (
            <>
              <span className="header__user">@{user.username}</span>
              <div className="menu-wrapper">
                <button className="btn btn--ghost" onClick={() => setMenuOpen(!menuOpen)}>⋯</button>
                {menuOpen && (
                  <div className="dropdown-menu">
                    <Link to="/gonderi-olustur" className="dropdown-menu__item" onClick={() => setMenuOpen(false)}>Gönderi At</Link>
                    <button className="dropdown-menu__item" onClick={() => { logout(); setMenuOpen(false); }}>Çıkış Yap</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/giris" className="btn btn--ghost">Giriş Yap</Link>
              <Link to="/kayit" className="btn btn--primary">Kayıt Ol</Link>
            </>
          )}
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Pages.HomePage />} />
        <Route path="/gonderiler/:id" element={<Pages.PostDetailPage />} />
        <Route path="/gonderi-olustur" element={<Pages.CreatePostPage />} />
        <Route path="/giris" element={<Pages.AuthPage />} />
        <Route path="/kayit" element={<Pages.AuthPage />} />
        <Route path="*" element={<Pages.NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default App;