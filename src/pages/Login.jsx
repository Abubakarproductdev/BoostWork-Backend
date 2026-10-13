import React, { useState } from 'react';
import { ArrowRight, Compass, Globe2, PenLine, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Button, IconTile, Logo, ThemeToggle } from '../components/ui';

const GoogleIcon = () => (
  <svg className="w-[1.1rem] h-[1.1rem]" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

const FEATURES = [
  { icon: PenLine, tone: 'flamingo', title: 'Proposals that sound like you', text: 'Analyzed, drafted, critiqued and fact-checked against your own portfolio.' },
  { icon: Compass, tone: 'ultraviolet', title: 'Strategy you can act on', text: 'Profile audits and performance reports with evidence and honest confidence.' },
  { icon: Globe2, tone: 'lagoon', title: 'Research with receipts', text: 'Current public sources, cited and dated, never made up.' },
];

export default function Login() {
  const { login, loginWithGoogle, register, resetPassword } = useAuth();
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
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

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      {/* Fixed brand colours (same in both themes): teal panel, paper text, sun accents */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 xl:p-16 bg-[#069594] text-[#fbf7ee]">
        <div className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-2xl bg-[#ffce1b] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#000000" aria-hidden="true"><path d="M13.3 2 5.6 13.2h5.2L9.9 22l8.5-11.6h-5.3z" /></svg>
          </span>
          <span className="font-display text-2xl font-bold">BoostWork</span>
        </div>

        <div className="max-w-xl">
          <h1 className="font-display text-5xl xl:text-6xl font-extrabold leading-[1.02]">
            Win more of the work you <span className="text-[#ffce1b]">actually want.</span>
          </h1>
          <p className="mt-5 text-lg text-[#fbf7ee] max-w-md">
            Your AI strategist for freelancing: sharper proposals, clearer positioning, real evidence.
          </p>
        </div>

        <ul className="grid gap-3 max-w-lg">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="flex items-start gap-3.5 rounded-2xl bg-[#000000] p-4">
              <span className="w-9 h-9 rounded-xl bg-[#ffce1b] text-[#000000] flex items-center justify-center shrink-0"><feature.icon className="w-[1.1rem] h-[1.1rem]" /></span>
              <span>
                <span className="block font-semibold">{feature.title}</span>
                <span className="block text-sm text-[#fbf7ee]">{feature.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </aside>

      {/* Form */}
      <main className="relative flex flex-col px-5 sm:px-10 py-8">
        <div className="flex items-center justify-between">
          <Logo className="lg:invisible" />
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-[26rem] animate-rise">
            <p className="eyebrow mb-2">{mode === 'login' ? 'Welcome back' : 'Get started free'}</p>
            <h2 className="text-4xl font-bold text-ink">
              {mode === 'login' ? <>Sign in to <span className="text-brand">BoostWork</span></> : <>Create your <span className="text-brand">workspace</span></>}
            </h2>
            <p className="text-ink-2 mt-2">
              {mode === 'login' ? 'Your proposals, reports and research are waiting.' : 'Private to you. Your data is never shared with other accounts.'}
            </p>

            <div className="grid grid-cols-2 p-1 rounded-2xl bg-surface-2 border border-line mt-7">
              {['login', 'register'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => { setMode(item); setError(''); setNotice(''); }}
                  className={cn('h-10 rounded-xl text-sm font-semibold transition-all', mode === item ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-ink-2 hover:text-ink')}
                >
                  {item === 'login' ? 'Sign in' : 'New account'}
                </button>
              ))}
            </div>

            <Button variant="secondary" size="lg" className="w-full mt-5" onClick={() => run(loginWithGoogle)} disabled={isSubmitting}>
              <GoogleIcon /> Continue with Google
            </Button>

            <div className="flex items-center gap-3 my-6">
              <div className="h-px flex-1 bg-line" />
              <span className="eyebrow">or with email</span>
              <div className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="animate-pop">
                  <label className="label" htmlFor="name">Your name</label>
                  <input id="name" required type="text" name="name" value={formData.name} onChange={handleChange} className="field h-12" autoComplete="name" />
                </div>
              )}

              <div>
                <label className="label" htmlFor="email">Email</label>
                <input id="email" required type="email" name="email" value={formData.email} onChange={handleChange} className="field h-12" autoComplete="email" placeholder="you@example.com" />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="label" htmlFor="password">Password</label>
                  {mode === 'login' && (
                    <button type="button" onClick={handleForgotPassword} disabled={isSubmitting} className="text-xs font-semibold text-sunbeam-ink hover:underline mb-1.5">
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  id="password" required type="password" name="password" value={formData.password} onChange={handleChange}
                  className="field h-12" minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'register' ? 'At least 6 characters' : ''}
                />
              </div>

              {error && <p className="rounded-xl border border-danger bg-danger-soft px-4 py-3 text-sm text-danger animate-pop">{error}</p>}
              {notice && <p className="rounded-xl border border-lagoon bg-lagoon-soft px-4 py-3 text-sm text-lagoon animate-pop">{notice}</p>}

              <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
                {mode === 'login' ? 'Sign in' : 'Create account'} {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </Button>
            </form>

            <p className="text-xs text-ink-3 mt-6 flex items-center gap-1.5">
              <IconTile icon={ShieldCheck} tone="lagoon" className="w-6 h-6 rounded-md [&>svg]:w-3.5 [&>svg]:h-3.5" />
              Secured by Firebase Authentication.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
