import {useEffect, useRef, useState} from 'react';

export default function RideCompare({memberId}) {
  const [minutes,setMinutes]=useState(25);
  const [result,setResult]=useState(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [now,setNow]=useState(Date.now());
  const controller=useRef(null);
  useEffect(()=>()=>controller.current?.abort(),[]);
  useEffect(()=>{ setResult(null); setError(''); controller.current?.abort(); },[memberId]);
  useEffect(()=>{
    if (!result) return;
    const timer=setInterval(()=>setNow(Date.now()),1000);
    return ()=>clearInterval(timer);
  },[result]);
  const remaining=result ? Math.max(0,Math.ceil((Date.parse(result.departureAt)-now)/60000)) : null;
  async function compare(event) {
    event.preventDefault(); setError(''); setBusy(true); setResult(null);
    const fields=new FormData(event.currentTarget);
    controller.current?.abort(); controller.current=new AbortController();
    try {
      const token=localStorage.getItem('bario_token');
      if (!memberId || !token) throw new Error('Join BARIO and complete age approval before using Ride Compare. Existing members without a credential need membership support.');
      const response=await fetch((import.meta.env.VITE_API_URL||'http://localhost:3001')+'/api/v1/partners/rideshare/compare',{
        method:'POST',signal:controller.current.signal,
        headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
        body:JSON.stringify({memberId,pickup:fields.get('pickup'),destination:fields.get('destination'),
          departureAt:new Date(Date.now()+minutes*60000).toISOString()})
      });
      const data=await response.json();
      if (!response.ok) throw new Error(data.error||'Unable to check ride options.');
      setNow(Date.now()); setResult(data);
    } catch (e) { if(e.name!=='AbortError') setError(e.message); }
    finally { setBusy(false); }
  }
  return <section className="rewards" aria-labelledby="ride-heading">
    <p className="rewards-eyebrow">PLAN YOUR RIDE HOME</p>
    <h2 id="ride-heading">BARIO Ride Compare</h2>
    <p>Leaving in 25 minutes? Plan ahead and check your ride options.</p>
    <p>Live provider quotes and bidding are not connected yet. No ride is booked here; confirm price, destination, and pickup in your chosen provider.</p>
    <form onSubmit={compare} className="ride-form">
      <label>Pickup — bar name and full address<input name="pickup" autoComplete="off" minLength={5} maxLength={300} required placeholder="Bar, street, city, state, ZIP" /></label>
      <label>Destination — full address<input name="destination" autoComplete="off" minLength={5} maxLength={300} required placeholder="Street, city, state, ZIP" /></label>
      <fieldset><legend>When are you leaving?</legend>
        {[25,30,45,60].map(value=><label key={value}><input type="radio" name="minutes" checked={minutes===value} onChange={()=>{setMinutes(value);setResult(null);}} /> {value} minutes </label>)}
      </fieldset>
      <button disabled={busy||!memberId}>{busy?'Checking…':`Leaving in ${minutes} minutes — check ride options`}</button>
      {!memberId&&<p>Join above and complete age approval to use this feature.</p>}
    </form>
    {error&&<p role="alert">{error}</p>}
    {result&&<div>
      <p role="status">{remaining>0?`Planned departure in ${remaining} minutes`:'Your planned departure time has arrived.'} — {new Date(result.departureAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</p>
      <p>From: {result.pickup}<br/>To: {result.destination}</p>
      <p>Keep this page open for the countdown. This is not a pickup reservation or background notification.</p>
      <div className="ride-options">{result.providers.map(provider=><article className="rewards-license" key={provider.id}>
        <h3>{provider.name}</h3><p>{provider.message}</p>
        <p>Fare: unavailable · Pickup estimate: unavailable</p>
        <a href={provider.bookingUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Check in {provider.name}</a>
        <p>Enter your pickup and destination there. No booking has been made.</p>
      </article>)}</div>
      <p>{result.discount.message} Membership pricing and redemption limits are not finalized.</p>
      <button onClick={()=>setResult(null)}>Change trip</button>
    </div>}
  </section>;
}
