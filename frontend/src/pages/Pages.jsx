import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { postsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PostFeed, CreatePostForm } from '../components/Posts/Posts';
import { CommentSection } from '../components/Comments/CommentSection';
import { LoginForm, RegisterForm } from '../components/Auth/AuthForms';

export function HomePage() {
  return (
    <main className="page page--home">
      <section className="page__main">
        <h1 className="page__heading">Son Gönderiler</h1>
        <PostFeed />
      </section>
    </main>
  );
}

export function CreatePostPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) navigate('/giris', { replace: true });
  }, [user, navigate]);

  return (
    <main className="page page--create">
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem' }}>
        <CreatePostForm onCreated={() => navigate('/')} />
      </div>
    </main>
  );
}

export function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post,    setPost]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    postsApi.get(parseInt(id, 10))
      .then(res => setPost(res.data.post))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="state-message">Gönderi yükleniyor…</p>;
  if (error) return (
    <main className="page page--center">
      <div className="state-error" role="alert">
        <p>{error}</p>
        <button className="btn btn--secondary" onClick={() => navigate('/')}>Ana Sayfaya Dön</button>
      </div>
    </main>
  );
  if (!post) return (
    <main className="page page--center">
      <div className="empty-state">
        <p className="empty-state__icon">🔍</p>
        <p className="empty-state__message">Gönderi bulunamadı.</p>
        <button className="btn btn--secondary" onClick={() => navigate('/')}>Ana Sayfaya Dön</button>
      </div>
    </main>
  );

  return (
    <main className="page page--detail">
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
        <div className="post-detail__content">{post.content}</div>
        {post.media_url && <img src={post.media_url} alt={post.title} style={{ marginTop: 16, borderRadius: 8, width: '100%', maxHeight: 500, objectFit: 'cover' }} />}
        <footer className="post-detail__meta">
          <span>👁 {post.view_count} görüntüleme</span>
          <span>💬 {post.comment_count} yorum</span>
        </footer>
      </article>
      <CommentSection postId={post.id} />
    </main>
  );
}

export function AuthPage() {
  const [mode, setMode] = useState('login');
  const { user } = useAuth();
  const navigate = useNavigate();

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
          ? <LoginForm    onSwitch={() => setMode('register')} />
          : <RegisterForm onSwitch={() => setMode('login')} />
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
        <p className="empty-state__message">Sayfa bulunamadı.</p>
        <button className="btn btn--primary" onClick={() => navigate('/')}>Ana Sayfaya Dön</button>
      </div>
    </main>
  );
}