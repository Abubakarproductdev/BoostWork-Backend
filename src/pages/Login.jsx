import React, { useState } from 'react';
import { LockKeyhole, LogIn, UserPlus, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

export default function Login() {
  const { login, loginWithGoogle, register, resetPassword } = useAuth();
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const run = async (action) => {
    setError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      await action();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    run(() => (mode === 'login'
      ? login({ email: formData.email, password: formData.password })
      : register(formData)));
  };

  const handleForgotPassword = () => run(async () => {
    await resetPassword(formData.email);
    setNotice(`If an account exists for ${formData.email.trim()}, a password reset email is on its way.`);
  });

  const inputClass = 'w-full bg-[#1c1917] text-white border border-[#44403c] rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors placeholder:text-stone-500';

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-stone-200 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-900 via-[#0a0f1c] to-[#0a0f1c]" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-yellow-600 to-amber-500 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Upwork AI</h1>
            <p className="text-sm text-stone-400">Private strategist workspace</p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-white/10 p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">
                {mode === 'login' ? 'Sign in' : 'Create your account'}
              </h2>
              <p className="text-sm text-stone-400 mt-1">
                {mode === 'login' ? 'Continue to your dashboard' : 'Your own private workspace and data'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <LockKeyhole className="w-5 h-5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#1c1917] border border-[#292524] mb-5">
            {['login', 'register'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMode(item);
                  setError('');
                  setNotice('');
                }}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  mode === item ? 'bg-[#292524] text-white' : 'text-stone-400 hover:text-white'
                )}
              >
                {item === 'login' ? 'Login' : 'New Account'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => run(loginWithGoogle)}
            disabled={isSubmitting}
            className="w-full bg-white hover:bg-stone-100 disabled:opacity-60 text-stone-900 px-5 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-5 text-xs uppercase tracking-wider text-stone-500">
            <div className="h-px flex-1 bg-[#292524]" />
            or with email
            <div className="h-px flex-1 bg-[#292524]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-stone-400 mb-1.5">Name</label>
                <input
                  required
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={inputClass}
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-400 mb-1.5">Email</label>
              <input
                required
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={inputClass}
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-stone-400">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isSubmitting}
                    className="text-xs font-medium text-amber-400 hover:text-amber-300"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                required
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={inputClass}
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {notice && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {notice}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-stone-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {isSubmitting ? 'Working...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
