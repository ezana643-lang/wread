const BASE_URL = 'https://wread-csw7.onrender.com/api';

class ApiError extends Error {
  constructor(message, status, errors = []) {
    super(message);
    this.name   = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('wread_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      data.message || 'Beklenmeyen bir hata oluştu.',
      res.status,
      data.errors || []
    );
  }

  return data;
}

export const authApi = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login:    (payload) => request('/auth/login',    { method: 'POST', body: payload }),
  logout:   ()        => request('/auth/logout',   { method: 'POST' }),
  me:       ()        => request('/auth/me'),
};

export const postsApi = {
  list:   (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/posts${qs ? `?${qs}` : ''}`);
  },
  get:    (id)      => request(`/posts/${id}`),
  create: (payload) => request('/posts',       { method: 'POST',   body: payload }),
  update: (id, pl)  => request(`/posts/${id}`, { method: 'PUT',    body: pl }),
  remove: (id)      => request(`/posts/${id}`, { method: 'DELETE' }),
};

export const commentsApi = {
  list:   (postId)          => request(`/posts/${postId}/comments`),
  create: (postId, payload) => request(`/posts/${postId}/comments`,      { method: 'POST',   body: payload }),
  update: (postId, id, pl)  => request(`/posts/${postId}/comments/${id}`, { method: 'PUT',   body: pl }),
  remove: (postId, id)      => request(`/posts/${postId}/comments/${id}`, { method: 'DELETE' }),
};

export { ApiError };