import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { commentsApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export function CommentSection({ postId }) {
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const { user } = useAuth();

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await commentsApi.list(postId);
      setComments(res.data.comments || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  return (
    <section className="comment-section" aria-label="Yorumlar">
      <h3 className="comment-section__heading">
        Yorumlar{!loading && <span className="comment-section__count"> ({total})</span>}
      </h3>

      {user ? (
        <CommentForm
          postId={postId}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onPosted={() => {
            setReplyTo(null);
            loadComments();
          }}
        />
      ) : (
        <p className="comment-section__auth-notice">
          Yorum yapmak icin <Link to="/giris" className="link">giris yapin</Link>.
        </p>
      )}

      {loading && <p className="state-message">Yorumlar yukleniyor...</p>}

      {error && (
        <div className="state-error" role="alert">
          <p>{error}</p>
          <button className="btn btn--secondary btn--sm" onClick={loadComments}>Tekrar dene</button>
        </div>
      )}

      {!loading && !error && comments.length === 0 && (
        <div className="empty-state empty-state--sm">
          <p className="empty-state__message">Henuz yorum yapilmamis.</p>
        </div>
      )}

      {!loading && comments.length > 0 && (
        <ul className="comment-list" role="list">
          {comments.map(comment => (
            <li key={comment.id}>
              <CommentItem comment={comment} postId={postId} onDelete={loadComments} onReply={setReplyTo} />
              {comment.replies?.length > 0 && (
                <ul className="comment-list comment-list--replies" role="list">
                  {comment.replies.map(reply => (
                    <li key={reply.id}>
                      <CommentItem comment={reply} postId={postId} onDelete={loadComments} onReply={setReplyTo} isReply />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CommentItem({ comment, postId, onDelete, onReply, isReply = false }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(comment.content);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isOwner = user && user.id === comment.author_id;
  const isMod = user && ['moderator', 'admin'].includes(user.role);

  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true);

    try {
      await commentsApi.update(postId, comment.id, { content: content.trim() });
      setEditing(false);
      onDelete?.();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Bu yorumu silmek istediginizden emin misiniz?')) return;
    setDeleting(true);

    try {
      await commentsApi.remove(postId, comment.id);
      onDelete?.();
    } catch (err) {
      window.alert(err.message);
      setDeleting(false);
    }
  }

  return (
    <article className={`comment${isReply ? ' comment--reply' : ''}`}>
      <div className="comment__author">
        <div className="avatar avatar--xs" aria-hidden="true">
          {comment.author_display_name?.[0] || comment.author_username?.[0] || '?'}
        </div>
        <span className="comment__author-name">{comment.author_display_name || comment.author_username}</span>
        <time className="comment__date" dateTime={comment.created_at}>
          {new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(comment.created_at))}
        </time>
      </div>

      {editing ? (
        <div className="comment__edit">
          <textarea className="form-group__textarea form-group__textarea--sm" value={content} onChange={event => setContent(event.target.value)} rows={3} maxLength={2000} />
          <div className="comment__edit-actions">
            <button className="btn btn--primary btn--sm" onClick={handleSave} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
            <button className="btn btn--ghost btn--sm" onClick={() => { setEditing(false); setContent(comment.content); }}>Iptal</button>
          </div>
        </div>
      ) : (
        <p className="comment__content">{comment.content}</p>
      )}

      <div className="comment__actions">
        {user && !isReply && (
          <button className="btn btn--ghost btn--xs" onClick={() => onReply?.({ id: comment.id, username: comment.author_username })}>Yanitla</button>
        )}
        {isOwner && !editing && (
          <button className="btn btn--ghost btn--xs" onClick={() => setEditing(true)}>Duzenle</button>
        )}
        {(isOwner || isMod) && (
          <button className="btn btn--ghost btn--xs btn--danger-ghost" onClick={handleDelete} disabled={deleting}>{deleting ? '...' : 'Sil'}</button>
        )}
      </div>
    </article>
  );
}

function CommentForm({ postId, replyTo, onCancelReply, onPosted }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setError('');

    try {
      await commentsApi.create(postId, { content: content.trim(), parent_id: replyTo?.id || null });
      setContent('');
      onPosted?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="comment-form" onSubmit={submit} noValidate>
      {replyTo && (
        <div className="comment-form__reply-banner">
          <span>@{replyTo.username} kullanicisina yanit veriliyor</span>
          <button type="button" className="btn btn--ghost btn--xs" onClick={onCancelReply}>Kapat</button>
        </div>
      )}
      {error && <p className="comment-form__error" role="alert">{error}</p>}
      <textarea
        className="form-group__textarea"
        rows={3}
        value={content}
        onChange={event => setContent(event.target.value)}
        placeholder="Yorumunuzu yazin"
        aria-label="Yorum icerigi"
        maxLength={2000}
      />
      <button type="submit" className="btn btn--primary btn--sm" disabled={loading || !content.trim()}>
        {loading ? 'Gonderiliyor...' : replyTo ? 'Yanitla' : 'Yorum yap'}
      </button>
    </form>
  );
}

