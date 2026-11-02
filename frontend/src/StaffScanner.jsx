import { useLanguage } from './Language.jsx';
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from './membership-api.js';
export default function StaffScanner({
  signedIn
}) {
  const {
    t,
    errorText
  } = useLanguage();
  const [bars, setBars] = useState([]),
    [barId, setBarId] = useState(''),
    [qr, setQr] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [camera, setCamera] = useState(false);
  const [scanResult,setScanResult]=useState(null);
  const [idChecked, setIdChecked] = useState(false);
  const video = useRef(null),
    stream = useRef(null),
    timer = useRef(null),
    scanning = useRef(false),
    selectedBar = useRef(''),
    checkedId = useRef(false);
  selectedBar.current = barId;
  checkedId.current = idChecked;
  function stop() {
    clearTimeout(timer.current);
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    setCamera(false);
  }
  useEffect(() => () => {
    clearTimeout(timer.current);
    stream.current?.getTracks().forEach(track => track.stop());
  }, []);
  useEffect(() => {
    let alive = true;
    setBars([]);
    setBarId('');
    setMessage('');setScanResult(null);
    stop();
    if (signedIn) apiFetch('staff/bars').then(data => {
      if (alive) {
        setBars(data.bars);
        setBarId(data.bars[0]?.id || '');
      }
    }).catch(e => {
      if (alive) setMessage(e.message);
    });
    return () => {
      alive = false;
    };
  }, [signedIn]);
  async function scan(value) {
    if (scanning.current) return;
    scanning.current = true;
    setBusy(true);
    setMessage('');setScanResult(null);
    stop();
    try {
      const result = await apiFetch('staff/scan', {
        method: 'POST',
        body: JSON.stringify({
          barId: selectedBar.current,
          qrText: value.trim(),
          idChecked: checkedId.current
        })
      });
      setScanResult(result);
      setQr('');
      setIdChecked(false);
    } catch (e) {
      setMessage(e.message);
    } finally {
      scanning.current = false;
      setBusy(false);
    }
  }
  async function start() {
    setMessage('');setScanResult(null);
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
      setMessage('Camera scanning is not supported in this browser. Paste the member’s temporary code below.');
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment'
        },
        audio: false
      });
      video.current.srcObject = stream.current;
      await video.current.play();
      setCamera(true);
      const detector = new window.BarcodeDetector({
        formats: ['qr_code']
      });
      async function tick() {
        if (!stream.current) return;
        try {
          const codes = await detector.detect(video.current);
          if (codes[0]) {
            await scan(codes[0].rawValue);
            return;
          }
        } catch {
          stop();
          setMessage('Unable to scan with this browser. Paste the temporary code instead.');
          return;
        }
        timer.current = setTimeout(tick, 350);
      }
      tick();
    } catch {
      stop();
      setMessage('Camera access unavailable. Paste the member’s temporary code below.');
    }
  }
  if (!signedIn) return null;
  return <details className="membership-panel"><summary>{t("Participating bar staff — verify a membership")}</summary>
    {!bars.length ? <p>{message ? errorText(message) : t('No approved staff assignment on this account. Bar onboarding and staff approval are managed by BARIO.')}</p> : <>
      <label>{t("Bar")}<select value={barId} onChange={e => {
          stop();
          setBarId(e.target.value);
        }}>{bars.map(bar => <option key={bar.id} value={bar.id}>{bar.name}</option>)}</select></label>
      <p>{t("Confirm the customer’s identity under your venue policy. Scans check current membership and recorded age approval; they do not replace ID checks or redeem rewards.")}</p>
      <label><input type="checkbox" checked={idChecked} onChange={e => setIdChecked(e.target.checked)} />{t(" I personally inspected government-issued ID, matched it to this customer, and confirmed they are 21+. Record age approval if pending.")}</label>
      <video ref={video} playsInline muted className={camera ? 'scanner-video' : 'scanner-video camera-off'} />
      <button onClick={camera ? stop : start} disabled={busy}>{t(camera ? 'Stop camera' : 'Scan membership QR')}</button>
      <form className="ride-form" onSubmit={e => {
        e.preventDefault();
        scan(qr);
      }}><label>{t("Or paste a temporary BARIO code")}<input value={qr} onChange={e => setQr(e.target.value)} autoComplete="off" maxLength={55} required placeholder="bario:check:…" /></label><button disabled={busy}>{t("Verify and record visit")}</button></form>
      <p role="status">{errorText(message)}{scanResult && <>{scanResult.memberName}{' — '}{t(scanResult.message)}{' '}{t('No points awarded.')}</>}</p><p>{t("One visit per member per bar per UTC day. Refresh the QR for each scan. No points are awarded automatically.")}</p>
    </>}
  </details>;
}
