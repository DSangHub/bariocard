import {useEffect,useState} from 'react';
import {useLanguage} from './Language.jsx';
import {apiFetch} from './membership-api.js';

export default function BarOwnerProfile({signedIn}) {
  const {t,errorText}=useLanguage();
  const [profile,setProfile]=useState(null);
  const [missing,setMissing]=useState(false);
  const [editing,setEditing]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');

  async function load() {
    if(!signedIn)return;
    setBusy(true);setError('');
    try {const data=await apiFetch('owners/me');setProfile(data.bar);setMissing(false);}
    catch(e){if(e.status===404){setProfile(null);setMissing(true);}else setError(e.message);}
    finally{setBusy(false);}
  }
  useEffect(()=>{if(signedIn)load();else{setProfile(null);setMissing(false);setEditing(false);}},[signedIn]);

  async function submit(event) {
    event.preventDefault();setBusy(true);setError('');setMessage('');
    const fields=new FormData(event.currentTarget);
    try {
      const data=await apiFetch('owners/apply',{method:'POST',body:JSON.stringify({
        barName:fields.get('barName'),ownerName:fields.get('ownerName'),phone:fields.get('phone'),
        addressLine1:fields.get('addressLine1'),addressLine2:fields.get('addressLine2'),city:fields.get('city'),
        state:fields.get('state'),postalCode:fields.get('postalCode'),abcLicenseNumber:fields.get('abcLicenseNumber'),
        abcJurisdiction:fields.get('abcJurisdiction'),consent:fields.get('consent')==='on'
      })});
      setProfile(data.bar);setMissing(false);setEditing(false);setMessage(data.message);
    } catch(e){setError(e.message);} finally{setBusy(false);}
  }

  const address=profile?.address||{};
  const showForm=signedIn&&(missing||editing);
  return <section id="bar-owner" className="membership-panel" aria-labelledby="bar-owner-heading">
    <p className="rewards-eyebrow">{t('BAR OWNER PROFILE')}</p>
    <h2 id="bar-owner-heading">{t('Register your bar with BARIO')}</h2>
    <p>{t('Submit the business and ABC license details below. Listing, staff access, and bar benefits remain disabled until BARIO verifies the license with the applicable ABC authority.')}</p>
    {!signedIn&&<p className="membership-notice">{t('Create or sign in to an account above before registering a bar.')}</p>}
    {busy&&!profile&&<p role="status">{t('Loading bar profile…')}</p>}
    {profile&&!editing&&<div className="bar-owner-summary">
      <h3>{profile.name}</h3><p>{profile.owner_name} · {profile.phone}</p>
      <p>{address.line1}{address.line2?' · '+address.line2:''}<br/>{address.city}, {address.state} {address.postal_code}</p>
      <p><strong>{t('ABC license:')}</strong> {profile.abc_license_number} ({profile.abc_jurisdiction})</p>
      <p><strong>{t('Verification:')}</strong> {t(profile.abc_verification_status)}</p>
      <p><strong>{t('Bar status:')}</strong> {t(profile.status)}</p>
      <button type="button" onClick={()=>setEditing(true)}>{t('Edit application')}</button>
    </div>}
    {showForm&&<form className="ride-form" onSubmit={submit} key={profile?.updated_at||'new'}>
      <label>{t('Bar name')}<input name="barName" minLength="2" maxLength="160" defaultValue={profile?.name||''} autoComplete="organization" required/></label>
      <label>{t('Owner or authorized manager name')}<input name="ownerName" minLength="2" maxLength="120" defaultValue={profile?.owner_name||''} autoComplete="name" required/></label>
      <label>{t('Business phone')}<input name="phone" type="tel" minLength="7" maxLength="40" defaultValue={profile?.phone||''} autoComplete="tel" required/></label>
      <label>{t('Street address')}<input name="addressLine1" minLength="3" maxLength="160" defaultValue={address.line1||''} autoComplete="address-line1" required/></label>
      <label>{t('Address line 2 (optional)')}<input name="addressLine2" maxLength="160" defaultValue={address.line2||''} autoComplete="address-line2"/></label>
      <label>{t('City')}<input name="city" minLength="2" maxLength="100" defaultValue={address.city||''} autoComplete="address-level2" required/></label>
      <label>{t('State')}<input name="state" minLength="2" maxLength="60" defaultValue={address.state||''} autoComplete="address-level1" required/></label>
      <label>{t('ZIP code')}<input name="postalCode" minLength="3" maxLength="20" defaultValue={address.postal_code||''} autoComplete="postal-code" required/></label>
      <label>{t('ABC license number')}<input name="abcLicenseNumber" minLength="2" maxLength="80" defaultValue={profile?.abc_license_number||''} required/></label>
      <label>{t('ABC jurisdiction or agency')}<input name="abcJurisdiction" minLength="2" maxLength="80" defaultValue={profile?.abc_jurisdiction||address.state||''} placeholder="Example: California ABC" required/></label>
      <label><input name="consent" type="checkbox" required/>{t(' I confirm that I am authorized to register this business and that BARIO may verify the license information with the applicable ABC authority.')}</label>
      <button disabled={busy}>{t(busy?'Submitting…':profile?'Update bar application':'Submit bar application')}</button>
      {editing&&<button type="button" onClick={()=>setEditing(false)}>{t('Cancel')}</button>}
    </form>}
    {message&&<p role="status" className="membership-notice">{t(message)}</p>}
    {error&&<p role="alert">{errorText(error)}</p>}
  </section>;
}
