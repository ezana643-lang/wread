import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { postsApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { EmbedPreview, RichContent } from '../Content/RichContent';
import { extractEmbedsFromText, stripMarkdownForExcerpt } from '../../utils/content';

const LIMIT = 20;

export function PostFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState('newest');
  const [mediaOnly, setMediaOnly] = useState(false);

  const load = useCallback(async ({
    nextOffset = 0,
    replace = true,
    searchTerm = search,
    sortMode = sort,
    onlyMedia = mediaOnly,
  } = {}) => {
    setLoading(true);
    setError('');

    try {
      const params = {
        limit: LIMIT,
        offset: nextOffset,
        sort: sortMode,
      };

      if (searchTerm) params.search = searchTerm;
      if (onlyMedia) params.has_media = '1';

      const res = await postsApi.list(params);
      const nextPosts = res.data.posts || [];
      const pagination = res.data.pagination || {};

      setPosts(prev => (replace ? nextPosts : [...prev, ...nextPosts]));
      setHasMore(Boolean(pagination.hasMore));
      setTotal(Number(pagination.total || 0));
      setOffset(nextOffset);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [mediaOnly, search, sort]);

  useEffect(() => {
    load({ nextOffset: 0, replace: true });
  }, [load]);

  function handleSearch(event) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  function handleClear() {
    setSearch('');
    setSearchInput('');
  }

  function refreshFeed() {
    load({ nextOffset: 0, replace: true });
  }

  if (loading && posts.length === 0) {
    return <p className="state-message">Gonderiler yukleniyor...</p>;
  }

  if (error) {
    return (
      <div className="state-error" role="alert">
        <p>{error}</p>
        <button className="btn btn--secondary" onClick={refreshFeed}>Tekrar dene</button>
      </div>
    );
  }

  return (
    <section className="feed-shell" aria-label="Gonderi akisi">
      <form className="search-panel" onSubmit={handleSearch}>
        <div className="search-panel__field">
          <span className="search-panel__icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            className="form-group__input"
            placeholder="Not, konu veya yazar ara"
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
          />
        </div>
        <div className="search-panel__actions">
          <button className="btn btn--primary" type="submit">Ara</button>
          {(search || searchInput) && (
            <button className="btn btn--ghost" type="button" onClick={handleClear}>Temizle</button>
          )}
        </div>
      </form>

      <div className="feed-toolbar" aria-label="Akis filtreleri">
        <div className="segmented-control" role="group" aria-label="Siralama">
          {[
            ['newest', 'Yeni'],
            ['popular', 'Populer'],
            ['discussed', 'Tartisilan'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={sort === value ? 'is-active' : ''}
              onClick={() => setSort(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="toggle-pill">
          <input
            type="checkbox"
            checked={mediaOnly}
            onChange={event => setMediaOnly(event.target.checked)}
          />
          <span>Medya iceren</span>
        </label>
      </div>

      <p className="feed-summary">
        {total > 0 ? `${total} akademik not listeleniyor` : 'Sonuc yok'}
        {search ? `: "${search}"` : ''}
      </p>

      {!loading && posts.length === 0 && (
        <div className="empty-state">
          <p className="empty-state__icon">⌕</p>
          <p className="empty-state__message">
            {search ? `"${search}" icin sonuc bulunamadi.` : 'Henuz hic gonderi yok.'}
          </p>
          {!search && <p className="empty-state__hint">Ilk akademik notu paylasarak akisi baslatin.</p>}
        </div>
      )}

      <ul className="post-feed" role="list">
        {posts.map(post => (
          <li key={post.id}>
            <PostCard post={post} onDelete={refreshFeed} />
          </li>
        ))}
      </ul>

      {hasMore && (
        <div className="feed-more">
          <button
            className="btn btn--secondary"
            onClick={() => load({ nextOffset: offset + LIMIT, replace: false })}
            disabled={loading}
          >
            {loading ? 'Yukleniyor...' : 'Daha fazla goster'}
          </button>
        </div>
      )}
    </section>
  );
}

export function PostCard({ post, onDelete }) {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const embeds = useMemo(() => extractEmbedsFromText(post.content, 1), [post.content]);
  const excerpt = useMemo(() => stripMarkdownForExcerpt(post.content), [post.content]);

  const isOwner = user && user.id === post.author_id;
  const isMod = user && ['moderator', 'admin'].includes(user.role);

  async function handleLike() {
    if (!user) return;

    try {
      const res = await postsApi.like(post.id);
      setLiked(res.liked);
      setLikeCount(count => Math.max(0, res.liked ? count + 1 : count - 1));
    } catch (err) {
      window.alert(err.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Bu gonderiyi silmek istediginizden emin misiniz?')) return;
    setDeleting(true);

    try {
      await postsApi.remove(post.id);
      onDelete?.();
    } catch (err) {
      window.alert(err.message);
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
        {excerpt && <p className="post-card__excerpt">{excerpt}</p>}
      </Link>

      {post.media_url && (
        <img className="post-card__image" src={post.media_url} alt={post.title} loading="lazy" />
      )}

      {!post.media_url && embeds[0] && <EmbedPreview embed={embeds[0]} />}

      <footer className="post-card__footer">
        <div className="post-card__meta">
          <span>{post.view_count || 0} goruntuleme</span>
          <span>{post.comment_count || 0} yorum</span>
          <button
            onClick={handleLike}
            className={`btn btn--xs ${liked ? 'btn--primary' : 'btn--ghost'}`}
            disabled={!user}
            title={user ? 'Begen' : 'Begenmek icin giris yapin'}
          >
            {likeCount} begeni
          </button>
        </div>
        {(isOwner || isMod) && (
          <div className="post-card__actions">
            {isOwner && (
              <Link to={`/gonderiler/${post.id}/duzenle`} className="btn btn--ghost btn--sm">Duzenle</Link>
            )}
            <button className="btn btn--danger btn--sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Siliniyor...' : 'Sil'}
            </button>
          </div>
        )}
      </footer>
    </article>
  );
}

export function CreatePostForm({ onCreated }) {
  const [fields, setFields] = useState({ title: '', content: '' });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [general, setGeneral] = useState('');
  const embeds = useMemo(() => extractEmbedsFromText(fields.content, 3), [fields.content]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function change(event) {
    const { name, value } = event.target;
    setFields(current => ({ ...current, [name]: value }));
    setErrors(current => ({ ...current, [name]: undefined }));
  }

  function handleImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (preview) URL.revokeObjectURL(preview);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  function validate() {
    const next = {};
    const title = fields.title.trim();
    const content = fields.content.trim();

    if (title.length < 3 || title.length > 200) {
      next.title = 'Baslik 3-200 karakter arasinda olmali.';
    }

    if (content.length < 10 || content.length > 20000) {
      next.content = 'Icerik 10-20000 karakter arasinda olmali.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    setGeneral('');

    if (!validate()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', fields.title.trim());
      formData.append('content', fields.content.trim());
      if (image) formData.append('image', image);

      const data = await postsApi.create(formData);
      setFields({ title: '', content: '' });
      setImage(null);
      if (preview) URL.revokeObjectURL(preview);
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
      <div className="post-form__header">
        <div>
          <p className="eyebrow">Yeni not</p>
          <h2 className="post-form__title">Akademik paylasim olustur</h2>
        </div>
      </div>

      {general && <p className="post-form__error" role="alert">{general}</p>}

      <div className={`form-group${errors.title ? ' form-group--error' : ''}`}>
        <label htmlFor="title" className="form-group__label">Baslik *</label>
        <input
          id="title"
          name="title"
          type="text"
          className="form-group__input"
          value={fields.title}
          onChange={change}
          placeholder="Orn. Mikro iktisat: esneklik notlari"
          maxLength={200}
        />
        {errors.title && <span className="form-group__error">{errors.title}</span>}
      </div>

      <div className={`form-group${errors.content ? ' form-group--error' : ''}`}>
        <label htmlFor="content" className="form-group__label">Icerik *</label>
        <textarea
          id="content"
          name="content"
          className="form-group__textarea post-form__textarea"
          rows={10}
          value={fields.content}
          onChange={change}
          placeholder="Notunuzu yazin; tek satira YouTube, Instagram veya Facebook linki yapistirabilirsiniz."
          maxLength={20000}
        />
        {errors.content && <span className="form-group__error">{errors.content}</span>}
      </div>

      {embeds.length > 0 && (
        <div className="embed-strip" aria-label="Algilanan medya">
          {embeds.map(embed => (
            <span key={embed.embedUrl} className={`embed-strip__item embed-strip__item--${embed.platform}`}>
              {embed.label}
            </span>
          ))}
        </div>
      )}

      {fields.content.trim() && (
        <div className="post-form__preview" aria-label="Onizleme">
          <RichContent content={fields.content} compact />
        </div>
      )}

      <div className="form-group">
        <label htmlFor="image" className="form-group__label">Gorsel</label>
        <input id="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImage} className="form-group__input" />
        {preview && <img src={preview} alt="Onizleme" className="post-form__image-preview" />}
      </div>

      <button type="submit" className="btn btn--primary" disabled={loading}>
        {loading ? 'Paylasiliyor...' : 'Paylas'}
      </button>
    </form>
  );
}

