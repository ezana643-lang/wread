import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink, useLocation } from 'react-router-dom';
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
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="brand" aria-label="WRead ana sayfa">
          <span className="brand__logo">W</span>
          <span className="brand__name">Read</span>
        </Link>

        <nav className="header__nav" aria-label="Ana gezinme">
          <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}>
            Akis
          </NavLink>
          {user && (
            <NavLink to="/gonderi-olustur" className={({ isActive }) => `nav-link nav-link--compose${isActive ? ' nav-link--active' : ''}`}>
              + Not
            </NavLink>
          )}
        </nav>

        <div className="header__account">
          {user ? (
            <>
              <span className="header__user">@{user.username}</span>
              <div className="menu-wrapper">
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setMenuOpen(open => !open)}
                  aria-expanded={menuOpen}
                  aria-label="Kullanici menusu"
                >
                  ⋯
                </button>
                {menuOpen && (
                  <div className="dropdown-menu">
                    <Link to="/gonderi-olustur" className="dropdown-menu__item">Gonderi olustur</Link>
                    <button className="dropdown-menu__item" type="button" onClick={logout}>Cikis yap</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/giris" className="btn btn--ghost">Giris yap</Link>
              <Link to="/kayit" className="btn btn--primary">Kayit ol</Link>
            </>
          )}
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Pages.HomePage />} />
        <Route path="/gonderiler/:id" element={<Pages.PostDetailPage />} />
        <Route path="/gonderiler/:id/duzenle" element={<Pages.EditPostPage />} />
        <Route path="/gonderi-olustur" element={<Pages.CreatePostPage />} />
        <Route path="/giris" element={<Pages.AuthPage />} />
        <Route path="/kayit" element={<Pages.AuthPage />} />
        <Route path="*" element={<Pages.NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default App;

