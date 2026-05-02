import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { postsApi, ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export function PostFeed() {
  const [posts,       setPosts]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [page,        setPage]        = useState(0);
  const [hasMore,     setHasMore]     = useState(false);
  const [search,      setSearch]      = useState('');
  const [searchInput, setSearchInput] = useState('');
  const LIMIT = 20;

  const load = useCallback(async (offset = 0, replace = true, searchTerm = '') => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: LIMIT, offset };
      if (searchTerm) params.search = searchTerm;
      const res = await postsApi.list(params);
      setPosts(prev => replace ? res.data.posts : [...prev, ...res.data.posts]);
      setHasMore(res.data.pagination.hasMore);
      setPage(offset);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useState(() => { load(0); }, [load]);

  function handleSearch() {
    setSearch(searchInput);
    load(0, true, searchInput);
  }

  function handleClear() {
    setSearch('');
    setSearchInput('');
    load(0, true, '');
  }

  if (loading && posts.length === 0) return <p className="state-message">Gönderiler yükleniyor…</p>;

  if (error) return (
    <div className="state-error" role="alert">
      <p>{error}</p>
      <button className="btn btn--secondary" onClick={() => load(0)}>Tekrar Dene</button>
    </div>
  );

  return (
    <section aria-label="Gönderi akışı">
      <div className="search-bar">
        <input
          type="text"
          className="form-group__input"
          placeholder="Gönderi ara…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
        />
        <button className="btn btn--primary" onClick={handleSearch}>Ara</button>
        {search && (
          <button className="btn btn--ghost" onClick={handleClear}>Temizle</button>
        )}
      </div>

      {!loading && posts.length === 0 && (
        <div className="empty-state">
          <p className="empty-state__icon">📭</p>
          <p className="empty-state__message">
            {search ? `"${search}" için sonuç bulunamadı.` : 'Henüz hiç gönderi yok.'}
          </p>
          {!search && <p className="empty-state__hint">İlk gönderiyi paylaşan siz olun.</p>}
        </div>
      )}

      <ul className="post-feed" role="list">
        {posts.map(post => (
          <li key={post.id}>
            <PostCard post={post} onDelete={() => load(0, true, search)} />
          </li>
        ))}
      </ul>

      {hasMore && (
        <div className="feed-more">
          <button className="btn btn--secondary" onClick={() => load(page + LIMIT, false, search)} disabled={loading}>
            {loading ? 'Yükleniyor…' : 'Daha Fazla Göster'}
          </button>
        </div>
      )}
    </section>
  );
}

export function PostCard({ post, onDelete }) {
  const { user } = useAuth();
  const [deleting,  setDeleting]  = useState(false);
  const [liked,     setLiked]     = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);

  const isOwner = user && user.id === post.author_id;
  const isMod   = user && ['moderator', 'admin'].includes(user.role);

  async function handleLike() {
    if (!user) return;
    try {
      const res = await postsApi.like(post.id);
      setLiked(res.liked);
      setLikeCount(c => res.liked ? c + 1 : c - 1);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Bu gönderiyi silmek istediğinizden emin misiniz?')) return;
    setDeleting(true);
    try {
      await postsApi.remove(post.id);
      onDelete?.();
    } catch (err) {
      alert(err.message);
      setDeleting(false);
    }
  }

  return (
    <article className="post-card">
      <header className="post-card__header">
        <div className="post-card__author">
          <div className="avatar avatar--sm" aria-hidden="true">
            {post.author_display_name?.[0] || post.author_username?.[0] || '?'}
          </div>
          <div>
            <span className="post-card__author-name">{post.author_display_name || post.author_username}</span>
            <span className="post-card__author-handle">@{post.author_username}</span>
          </div>
        </div>
        <time className="post-card__date" dateTime={post.created_at}>
          {new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(post.created_at))}
        </time>
      </header>
      <Link to={`/gonderiler/${post.id}`} className="post-card__link">
        <h2 className="post-card__title">{post.title}</h2>
        <p className="post-card__excerpt">{post.content.length > 200 ? post.content.slice(0, 200) + '…' : post.content}</p>
        {post.media_url && <img src={post.media_url} alt={post.title} style={{ marginTop: 12, borderRadius: 8, width: '100%', maxHeight: 400, objectFit: 'cover' }} />}
      </Link>
      <footer className="post-card__footer">
        <div className="post-card__meta">
          <span>👁 {post.view_count}</span>
          <span>💬 {post.comment_count}</span>
          <button
            onClick={handleLike}
            className={`btn btn--xs ${liked ? 'btn--primary' : 'btn--ghost'}`}
            disabled={!user}
            title={user ? 'Beğen' : 'Beğenmek için giriş yapın'}
          >
            ❤️ {likeCount}
          </button>
        </div>
        {(isOwner || isMod) && (
          <div className="post-card__actions">
            {isOwner && (
              <Link to={`/gonderiler/${post.id}/duzenle`} className="btn btn--ghost btn--sm">Düzenle</Link>
            )}
            <button className="btn btn--danger btn--sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Siliniyor…' : 'Sil'}
            </button>
          </div>
        )}
      </footer>
    </article>
  );
}

export function CreatePostForm({ onCreated }) {
  const [fields,  setFields]  = useState({ title: '', content: '' });
  const [image,   setImage]   = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [general, setGeneral] = useState('');

  function change(e) {
    const { name, value } = e.target;
    setFields(f => ({ ...f, [name]: value }));
    setErrors(e => ({ ...e, [name]: undefined }));
  }

  function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function submit(e) {
    e.preventDefault();
    setGeneral('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', fields.title);
      formData.append('content', fields.content);
      if (image) formData.append('image', image);

      const token = localStorage.getItem('wread_token');
      const res = await fetch('https://wread-csw7.onrender.com/api/posts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Hata oluştu.');
      setFields({ title: '', content: '' });
      setImage(null);
      setPreview(null);
      onCreated?.(data.data.post);
    } catch (err) {
      setGeneral(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="post-form" onSubmit={submit} noValidate>
      <h2 className="post-form__title">Gönderi Paylaş</h2>
      {general && <p className="post-form__error" role="alert">{general}</p>}
      <div className={`form-group${errors.title ? ' form-group--error' : ''}`}>
        <label htmlFor="title" className="form-group__label">Başlık *</label>
        <input id="title" name="title" type="text" className="form-group__input" value={fields.title} onChange={change} placeholder="{{gonderi_basligi}}" />
        {errors.title && <span className="form-group__error">{errors.title}</span>}
      </div>
      <div className={`form-group${errors.content ? ' form-group--error' : ''}`}>
        <label htmlFor="content" className="form-group__label">İçerik *</label>
        <textarea id="content" name="content" className="form-group__textarea" rows={5} value={fields.content} onChange={change} placeholder="{{gonderi_icerigi}}" />
        {errors.content && <span className="form-group__error">{errors.content}</span>}
      </div>
      <div className="form-group">
        <label htmlFor="image" className="form-group__label">Görsel (isteğe bağlı)</label>
        <input id="image" type="file" accept="image/*" onChange={handleImage} className="form-group__input" />
        {preview && <img src={preview} alt="Önizleme" style={{ marginTop: 8, borderRadius: 8, maxHeight: 200, objectFit: 'cover' }} />}
      </div>
      <button type="submit" className="btn btn--primary" disabled={loading}>
        {loading ? 'Paylaşılıyor…' : 'Paylaş'}
      </button>
    </form>
  );
}