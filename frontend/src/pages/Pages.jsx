import { useState, useEffect } from 'react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { postsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PostFeed, CreatePostForm } from '../components/Posts/Posts';
import { RichContent } from '../components/Content/RichContent';
import { CommentSection } from '../components/Comments/CommentSection';
import { LoginForm, RegisterForm } from '../components/Auth/AuthForms';

export function HomePage() {
  return (
    <main className="page page--home">
      <section className="page__main">
        <div className="page-heading">
          <p className="eyebrow">WRead akisi</p>
          <h1 className="page__heading">Akademik notlar</h1>
        </div>
        <PostFeed />
      </section>
    </main>
  );
}

export function CreatePostPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate('/giris', { replace: true });
  }, [loading, user, navigate]);

  return (
    <main className="page page--create">
      <div className="compose-layout">
        <Link to="/" className="back-link">Akisa don</Link>
        <CreatePostForm onCreated={(post) => navigate(`/gonderiler/${post.id}`)} />
      </div>
    </main>
  );
}

export function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    postsApi.get(parseInt(id, 10))
      .then(res => {
        if (active) setPost(res.data.post);
      })
      .catch(err => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="page page--center">
        <p className="state-message">Gonderi yukleniyor...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page page--center">
        <div className="state-error" role="alert">
          <p>{error}</p>
          <button className="btn btn--secondary" onClick={() => navigate('/')}>Ana sayfaya don</button>
        </div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="page page--center">
        <div className="empty-state">
          <p className="empty-state__icon">⌕</p>
          <p className="empty-state__message">Gonderi bulunamadi.</p>
          <button className="btn btn--secondary" onClick={() => navigate('/')}>Ana sayfaya don</button>
        </div>
      </main>
    );
  }

  return (
    <main className="page page--detail">
      <div className="detail-layout">
        <aside className="detail-rail" aria-label="Gonderi gezinme">
          <button className="back-link" type="button" onClick={() => navigate(-1)}>Geri don</button>
          <Link className="rail-link" to="/">Akis</Link>
          <Link className="rail-link" to="/gonderi-olustur">Yeni not</Link>
        </aside>

        <div className="detail-stack">
          <article className="post-detail">
            <header className="post-detail__header">
              <div className="post-detail__author">
                <div className="avatar" aria-hidden="true">
                  {post.author_display_name?.[0] || post.author_username?.[0] || '?'}
                </div>
                <div>
                  <p className="post-detail__author-name">{post.author_display_name || post.author_username}</p>
                  <p className="post-detail__author-handle">@{post.author_username}</p>
                </div>
              </div>
              <time className="post-detail__date" dateTime={post.created_at}>
                {new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(post.created_at))}
              </time>
            </header>

            <h1 className="post-detail__title">{post.title}</h1>
            <RichContent content={post.content} />

            {post.media_url && <img src={post.media_url} alt={post.title} className="post-detail__image" loading="lazy" />}

            <footer className="post-detail__meta">
              <span>{post.view_count || 0} goruntuleme</span>
              <span>{post.comment_count || 0} yorum</span>
              <span>{post.like_count || 0} begeni</span>
            </footer>
          </article>

          <CommentSection postId={post.id} />
        </div>
      </div>
    </main>
  );
}

export function EditPostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [fields, setFields] = useState({ title: '', content: '' });
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    postsApi.get(parseInt(id, 10))
      .then(res => {
        if (!active) return;
        const loaded = res.data.post;
        setPost(loaded);
        setFields({ title: loaded.title || '', content: loaded.content || '' });
      })
      .catch(err => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/giris', { replace: true });
  }, [authLoading, user, navigate]);

  function change(event) {
    const { name, value } = event.target;
    setFields(current => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await postsApi.update(parseInt(id, 10), {
        title: fields.title.trim(),
        content: fields.content.trim(),
        media_url: post?.media_url || null,
      });
      navigate(`/gonderiler/${res.data.post.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page page--center">
        <p className="state-message">Gonderi yukleniyor...</p>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="page page--center">
        <div className="state-error" role="alert">
          <p>{error || 'Gonderi bulunamadi.'}</p>
          <button className="btn btn--secondary" onClick={() => navigate('/')}>Ana sayfaya don</button>
        </div>
      </main>
    );
  }

  if (user && post.author_id !== user.id) {
    return (
      <main className="page page--center">
        <div className="state-error" role="alert">
          <p>Bu gonderiyi duzenleme yetkiniz yok.</p>
          <button className="btn btn--secondary" onClick={() => navigate(`/gonderiler/${post.id}`)}>Gonderiye don</button>
        </div>
      </main>
    );
  }

  return (
    <main className="page page--create">
      <form className="post-form" onSubmit={submit}>
        <Link to={`/gonderiler/${post.id}`} className="back-link">Gonderiye don</Link>
        <div className="post-form__header">
          <div>
            <p className="eyebrow">Duzenle</p>
            <h1 className="post-form__title">Akademik notu guncelle</h1>
          </div>
        </div>
        {error && <p className="post-form__error" role="alert">{error}</p>}
        <div className="form-group">
          <label htmlFor="edit-title" className="form-group__label">Baslik</label>
          <input
            id="edit-title"
            name="title"
            className="form-group__input"
            value={fields.title}
            onChange={change}
            minLength={3}
            maxLength={200}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="edit-content" className="form-group__label">Icerik</label>
          <textarea
            id="edit-content"
            name="content"
            className="form-group__textarea post-form__textarea"
            rows={12}
            value={fields.content}
            onChange={change}
            minLength={10}
            maxLength={20000}
            required
          />
        </div>
        {fields.content.trim() && (
          <div className="post-form__preview" aria-label="Onizleme">
            <RichContent content={fields.content} compact />
          </div>
        )}
        <button className="btn btn--primary" type="submit" disabled={saving}>
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </form>
    </main>
  );
}

export function AuthPage() {
  const location = useLocation();
  const [mode, setMode] = useState(location.pathname === '/kayit' ? 'register' : 'login');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setMode(location.pathname === '/kayit' ? 'register' : 'login');
  }, [location.pathname]);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  return (
    <main className="page page--auth">
      <div className="auth-container">
        <div className="auth-brand">
          <span className="auth-brand__logo">W</span>
          <span className="auth-brand__name">Read</span>
        </div>
        {mode === 'login'
          ? <LoginForm onSwitch={() => navigate('/kayit')} />
          : <RegisterForm onSwitch={() => navigate('/giris')} />
        }
      </div>
    </main>
  );
}

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <main className="page page--center">
      <div className="empty-state">
        <p className="empty-state__icon">404</p>
        <p className="empty-state__message">Sayfa bulunamadi.</p>
        <button className="btn btn--primary" onClick={() => navigate('/')}>Ana sayfaya don</button>
      </div>
    </main>
  );
}
