const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiError extends Error {
  constructor(message, status, errors = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('wread_token');
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    body: isFormData ? options.body : options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      data.message || 'Beklenmeyen bir hata olustu.',
      res.status,
      data.errors || []
    );
  }

  return data;
}

export const authApi = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
};

export const postsApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    ).toString();
    return request(`/posts${qs ? `?${qs}` : ''}`);
  },
  get: (id) => request(`/posts/${id}`),
  create: (payload) => request('/posts', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/posts/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => request(`/posts/${id}`, { method: 'DELETE' }),
  like: (id) => request(`/posts/${id}/like`, { method: 'POST' }),
};

export const commentsApi = {
  list: (postId) => request(`/posts/${postId}/comments`),
  create: (postId, payload) => request(`/posts/${postId}/comments`, { method: 'POST', body: payload }),
  update: (postId, id, payload) => request(`/posts/${postId}/comments/${id}`, { method: 'PUT', body: payload }),
  remove: (postId, id) => request(`/posts/${postId}/comments/${id}`, { method: 'DELETE' }),
};

export { ApiError };

