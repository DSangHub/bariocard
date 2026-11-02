import { useLanguage } from './Language.jsx';
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from './membership-api.js';
export default function RideCompare({
  memberId
}) {
  const {
    t,
    errorText,
    locale
  } = useLanguage();
  const [minutes, setMinutes] = useState(25);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const controller = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    setResult(null);
    setError('');
    controller.current?.abort();
  }, [memberId]);
  useEffect(() => {
    if (!result) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [result]);
  const remaining = result ? Math.max(0, Math.ceil((Date.parse(result.departureAt) - now) / 60000)) : null;
  async function compare(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    setResult(null);
    const fields = new FormData(event.currentTarget);
    controller.current?.abort();
    controller.current = new AbortController();
    try {
      if (!memberId) throw new Error('Complete your free BARIO membership above.');
      const data = await apiFetch('partners/rideshare/compare', {
        method: 'POST',
        signal: controller.current.signal,
        body: JSON.stringify({
          memberId,
          pickup: fields.get('pickup'),
          destination: fields.get('destination'),
          departureAt: new Date(Date.now() + minutes * 60000).toISOString()
        })
      });
      setNow(Date.now());
      setResult(data);
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <section className="rewards" aria-labelledby="ride-heading">
    <p className="rewards-eyebrow">{t("PLAN YOUR RIDE HOME")}</p>
    <h2 id="ride-heading">{t("BARIO Ride Compare")}</h2>
    <p>{t("Leaving in 25 minutes? Plan ahead and check your ride options.")}</p>
    <p>{t("Live provider quotes and bidding are not connected yet. No ride is booked here; confirm price, destination, and pickup in your chosen provider.")}</p>
    <form onSubmit={compare} className="ride-form">
      <label>{t("Pickup — bar name and full address")}<input name="pickup" autoComplete="off" minLength={5} maxLength={300} required placeholder={t("Bar, street, city, state, ZIP")} /></label>
      <label>{t("Destination — full address")}<input name="destination" autoComplete="off" minLength={5} maxLength={300} required placeholder={t("Street, city, state, ZIP")} /></label>
      <fieldset><legend>{t("When are you leaving?")}</legend>
        {[25, 30, 45, 60].map(value => <label key={value}><input type="radio" name="minutes" checked={minutes === value} onChange={() => {
            setMinutes(value);
            setResult(null);
          }} /> {value}{t(" minutes ")}</label>)}
      </fieldset>
      <button disabled={busy || !memberId}>{busy ? t('Checking…') : t('Leaving in {minutes} minutes — check ride options',{minutes})}</button>
      {!memberId && <p>{t("Join above and complete age approval to use this feature.")}</p>}
    </form>
    {error && <p role="alert">{errorText(error)}</p>}
    {result && <div>
      <p role="status">{remaining > 0 ? t('Planned departure in {minutes} minutes',{minutes:remaining}) : t('Your planned departure time has arrived.')}{t(" — ")}{new Date(result.departureAt).toLocaleTimeString(locale, {
          hour: 'numeric',
          minute: '2-digit'
        })}</p>
      <p>{t("From: ")}{result.pickup}<br />{t("To: ")}{result.destination}</p>
      <p>{t("Keep this page open for the countdown. This is not a pickup reservation or background notification.")}</p>
      <div className="ride-options">{result.providers.map(provider => <article className="rewards-license" key={provider.id}>
        <h3>{provider.name}</h3><p>{t(provider.message)}</p>
        <p>{t("Fare: unavailable · Pickup estimate: unavailable")}</p>
        <a href={provider.bookingUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{t("Check in ")}{provider.name}</a>
        <p>{t("Enter your pickup and destination there. No booking has been made.")}</p>
      </article>)}</div>
      <p>{t(result.discount.message)}{t(" Customer membership is free to start. Ride redemption limits are not finalized.")}</p>
      <button onClick={() => setResult(null)}>{t("Change trip")}</button>
    </div>}
  </section>;
}
