import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api/client';

export function RegisterForm({ onSwitch }) {
  const { register, loading } = useAuth();
  const [fields, setFields] = useState({ username: '', email: '', password: '', display_name: '' });
  const [errors, setErrors]   = useState({});
  const [general, setGeneral] = useState('');

  function change(e) {
    const { name, value } = e.target;
    setFields(f => ({ ...f, [name]: value }));
    setErrors(e => ({ ...e, [name]: undefined }));
  }

  async function submit(e) {
    e.preventDefault();
    setGeneral('');
    try {
      await register(fields);
    } catch (err) {
      if (err instanceof ApiError && err.errors.length) {
        const mapped = {};
        err.errors.forEach(({ field, message }) => { mapped[field] = message; });
        setErrors(mapped);
      } else {
        setGeneral(err.message);
      }
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <h2 className="auth-form__title">Hesap Oluştur</h2>
      {general && <p className="auth-form__error-general" role="alert">{general}</p>}
      <Field label="Ad Soyad (isteğe bağlı)" name="display_name" type="text" value={fields.display_name} onChange={change} error={errors.display_name} placeholder="{{görünen_ad}}" />
      <Field label="Kullanıcı Adı" name="username" type="text" value={fields.username} onChange={change} error={errors.username} placeholder="{{kullanici_adi}}" required />
      <Field label="E-posta" name="email" type="email" value={fields.email} onChange={change} error={errors.email} placeholder="{{eposta}}" required />
      <Field label="Şifre" name="password" type="password" value={fields.password} onChange={change} error={errors.password} placeholder="••••••••" required />
      <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
        {loading ? 'Kayıt yapılıyor…' : 'Kayıt Ol'}
      </button>
      <p className="auth-form__switch">
        Zaten hesabınız var mı?{' '}
        <button type="button" className="link" onClick={onSwitch}>Giriş Yap</button>
      </p>
    </form>
  );
}

export function LoginForm({ onSwitch }) {
  const { login, loading } = useAuth();
  const [fields, setFields] = useState({ email: '', password: '' });
  const [errors, setErrors]   = useState({});
  const [general, setGeneral] = useState('');

  function change(e) {
    const { name, value } = e.target;
    setFields(f => ({ ...f, [name]: value }));
    setErrors(e => ({ ...e, [name]: undefined }));
  }

  async function submit(e) {
    e.preventDefault();
    setGeneral('');
    try {
      await login(fields.email, fields.password);
    } catch (err) {
      if (err instanceof ApiError && err.errors.length) {
        const mapped = {};
        err.errors.forEach(({ field, message }) => { mapped[field] = message; });
        setErrors(mapped);
      } else {
        setGeneral(err.message);
      }
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <h2 className="auth-form__title">Giriş Yap</h2>
      {general && <p className="auth-form__error-general" role="alert">{general}</p>}
      <Field label="E-posta" name="email" type="email" value={fields.email} onChange={change} error={errors.email} placeholder="{{eposta}}" required />
      <Field label="Şifre" name="password" type="password" value={fields.password} onChange={change} error={errors.password} placeholder="••••••••" required />
      <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
        {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
      </button>
      <p className="auth-form__switch">
        Hesabınız yok mu?{' '}
        <button type="button" className="link" onClick={onSwitch}>Kayıt Ol</button>
      </p>
    </form>
  );
}

function Field({ label, name, type, value, onChange, error, placeholder, required }) {
  return (
    <div className={`form-group${error ? ' form-group--error' : ''}`}>
      <label htmlFor={name} className="form-group__label">
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>
      <input id={name} name={name} type={type} value={value} onChange={onChange}
        placeholder={placeholder} className="form-group__input"
        aria-invalid={!!error} aria-describedby={error ? `${name}-err` : undefined} />
      {error && <span id={`${name}-err`} className="form-group__error" role="alert">{error}</span>}
    </div>
  );
}