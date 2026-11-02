import { useLanguage } from './Language.jsx';
import { useEffect, useState } from 'react';
import { auth, apiFetch, RECOVERY_MODE } from './membership-api.js';
export default function Membership({
  onMemberChange,
  onSessionChange
}) {
  const {
    t,
    errorText,
    locale
  } = useLanguage();
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState(RECOVERY_MODE ? 'newpassword' : 'signup');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [cardError, setCardError] = useState('');
  useEffect(() => {
    try {
      localStorage.removeItem('bario_token');
      localStorage.removeItem('bario_id');
    } catch { /* Membership does not depend on legacy browser storage. */ }
    let alive = true;
    const {
      data: {
        subscription
      }
    } = auth.auth.onAuthStateChange((event, current) => {
      if (!alive) return;
      setSession(current);
      setReady(true);
      onSessionChange(Boolean(current));
      if (event === 'PASSWORD_RECOVERY') setMode('newpassword');
      if (!current) {
        setProfile(null);
        setCard(null);
        onMemberChange(null);
      }
    });
    auth.auth.getSession().then(({
      data,
      error: sessionError
    }) => {
      if (alive) {
        if (sessionError) setError(sessionError.message);
        setSession(data.session);
        setReady(true);
        onSessionChange(Boolean(data.session));
      }
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [onMemberChange, onSessionChange]);
  async function loadProfile() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('members/me');
      setProfile(data);
      setNeedsProfile(false);
      onMemberChange(data.member);
    } catch (e) {
      setProfile(null);
      onMemberChange(null);
      if (e.status === 404) setNeedsProfile(true);else setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let alive = true;
    if (!session?.user?.id) return;
    setLoading(true);
    setCard(null);
    setError('');
    setNeedsProfile(false);
    apiFetch('members/me').then(data => {
      if (alive) {
        setProfile(data);
        onMemberChange(data.member);
      }
    }).catch(e => {
      if (alive) {
        setProfile(null);
        onMemberChange(null);
        if (e.status === 404) setNeedsProfile(true);else setError(e.message);
      }
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [session?.user?.id, onMemberChange]);
  useEffect(() => {
    if (!card) return;
    const tick = () => setSeconds(Math.max(0, Math.ceil((Date.parse(card.expiresAt) - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [card]);
  async function showCard() {
    setBusy(true);
    setCardError('');
    setCard(null);
    try {
      setCard(await apiFetch('members/me/card', {
        method: 'POST',
        body: '{}'
      }));
    } catch (e) {
      setCardError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submitAuth(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const fields = new FormData(event.currentTarget),
      email = fields.get('email'),
      password = fields.get('password');
    try {
      let response;
      const redirect = window.location.origin + '/';
      if (mode === 'signup') response = await auth.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirect
        }
      });else if (mode === 'signin') response = await auth.auth.signInWithPassword({
        email,
        password
      });else if (mode === 'reset') response = await auth.auth.resetPasswordForEmail(email, {
        redirectTo: redirect
      });else response = await auth.auth.updateUser({
        password
      });
      if (response.error) throw response.error;
      if (mode === 'signup' && !response.data.session) setMessage('Check your email to confirm your account, then sign in here to finish your free membership.');
      if (mode === 'reset') setMessage('If an account exists, password reset instructions will be sent. Check your inbox and spam folder.');
      if (mode === 'newpassword') {
        setMode('signin');
        setMessage('Password updated.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function resend(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const email = new FormData(event.currentTarget).get('email');
      const {
        error
      } = await auth.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: window.location.origin + '/'
        }
      });
      if (error) throw error;
      setMessage('If confirmation is needed, a new email has been sent.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function enroll(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const fields = new FormData(event.currentTarget);
    try {
      await apiFetch('members/enroll', {
        method: 'POST',
        body: JSON.stringify({
          name: fields.get('name'),
          dob: fields.get('dob'),
          phone: fields.get('phone'),
          consent: fields.get('consent') === 'on'
        })
      });
      await loadProfile();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    setError('');
    try {
      const {
        error
      } = await auth.auth.signOut();
      if (error) throw error;
      setMode('signin');
      setNeedsProfile(false);
      setMessage('Signed out.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const recovering = mode === 'newpassword';
  return <section id="membership" className="membership-panel" aria-labelledby="membership-heading">
    <p className="rewards-eyebrow">{t("CUSTOMER MEMBERSHIP")}</p>
    <h2 id="membership-heading">{t("Your BARIO card. Free to start.")}</h2>
    <p>{t("No payment card required. No automatic charges. Any future paid plan will require your agreement.")}</p>
    {!ready ? <p role="status">{t("Loading your account…")}</p> : <>
      {(!session || recovering) && <>
        {!recovering && <div className="membership-tabs">{[['signup', 'Create account'], ['signin', 'Sign in'], ['reset', 'Forgot password']].map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => {
            setMode(value);
            setError('');
            setMessage('');
          }}>{t(label)}</button>)}</div>}
        <form className="ride-form" onSubmit={submitAuth}>
          {!recovering && <label>{t("Email")}<input name="email" type="email" autoComplete="email" required /></label>}
          {mode !== 'reset' && <label>{t(recovering ? 'New password' : 'Password')}<input name="password" type={showPassword ? 'text' : 'password'} minLength={mode === 'signin' ? 1 : 10} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required />
          <button type="button" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{t(showPassword ? 'Hide password' : 'Show password')}</button></label>}
          <button disabled={busy}>{t(busy ? 'Please wait…' : {
              signup: 'Create free account',
              signin: 'Sign in',
              reset: 'Send password reset',
              newpassword: 'Save new password'
            }[mode])}</button>
        </form>
        {mode === 'signup' && <details><summary>{t("Need another confirmation email?")}</summary><form className="ride-form" onSubmit={resend}><label>{t("Email")}<input name="email" type="email" required autoComplete="email" /></label><button disabled={busy}>{t("Resend confirmation")}</button></form></details>}
      </>}
      {session && !recovering && <>
        <div className="membership-account"><span>{t("Signed in as ")}{session.user.email}</span><button onClick={signOut} disabled={busy}>{t("Sign out")}</button></div>
        {loading && <p role="status">{t("Loading your membership…")}</p>}
        {needsProfile && !loading && <form className="ride-form" onSubmit={enroll}>
          <h3>{t("Complete your free membership")}</h3>
          <label>{t("Full name")}<input name="name" minLength={2} maxLength={120} autoComplete="name" required /></label>
          <label>{t("Date of birth — 21+")}<input name="dob" type="date" autoComplete="bday" required /></label>
          <label>{t("Phone (optional)")}<input name="phone" type="tel" maxLength={40} autoComplete="tel" /></label>
          <label><input name="consent" type="checkbox" required />{t(" I am 21 or older and agree to voluntary, free launch membership. Age approval is separate; no alcohol purchase is required.")}</label>
          <button disabled={busy}>{t(busy ? 'Creating membership…' : 'Get my free digital membership')}</button>
        </form>}
        {profile && !loading && <>
          <div className="digital-card">
            <div><p className="rewards-eyebrow">{t("BARIO · BAR IS OPEN")}</p><h3>{profile.member.full_name}</h3><p>{profile.member.member_number}</p><strong>{t("FREE LAUNCH MEMBER · $0")}</strong>
            <p>{t("Status: ")}{t(profile.member.status.replaceAll('_', ' '))}</p><p>{t("Welcome / account points: ")}{profile.member.points}</p>
            <p>{t("Bar rewards and ride credits are separate and subject to availability.")}</p></div>
            <div className="digital-card-qr">
              {card && seconds > 0 ? <><img src={card.qrImage} width="280" height="280" alt={t("Short-lived BARIO membership verification QR")} /><p>{t('Code expires in {seconds} seconds.',{seconds})}</p></> : <p>{t(card ? 'Code expired. Refresh before scanning.' : 'Show your QR to authorized bar staff.')}</p>}
              <button disabled={busy} onClick={showCard}>{t(busy ? 'Loading…' : card ? 'Refresh QR' : 'Show membership QR')}</button>
              {cardError && <p role="alert">{errorText(cardError)}</p>}
              {card && seconds > 0 && <details><summary>{t("Scanner unavailable?")}</summary><p>{t("Staff can paste this temporary code. Do not share publicly.")}</p><code className="scan-code">{card.qrText}</code></details>}
            </div>
          </div>
          {profile.member.status === 'age_pending' && <p className="membership-notice">{t("Your membership is free. Age approval is pending. Present government-issued ID to an approved participating bar or contact BARIO. This QR is not proof of age or a government ID.")}</p>}
          <button disabled={loading} onClick={loadProfile}>{t("Refresh membership status")}</button>
          <h3>{t("Membership activity")}</h3>
          {profile.activity?.length ? <ul className="activity-list">{profile.activity.map(item => <li key={item.id}><strong>{t(item.kind === 'welcome' ? 'Welcome' : 'Verified visit')}</strong> {item.partner_bars?.name && ' · ' + item.partner_bars.name}<br />{t(item.description)}<br /><small>{new Date(item.created_at).toLocaleString(locale)}{t(" · ")}{item.points_delta}{t(" points")}</small></li>)}</ul> : <p>{t("No recorded activity yet.")}</p>}
        </>}
        {error && !needsProfile && <button onClick={loadProfile}>{t("Retry loading membership")}</button>}
      </>}
    </>}
    {message && <p role="status">{t(message)}</p>}{error && <p role="alert">{errorText(error)}</p>}
  </section>;
}
