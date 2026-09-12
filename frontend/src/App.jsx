
import {useState} from 'react';
export default function App(){
  const [memberId,setMemberId]=useState(localStorage.getItem('bario_id')||'');
  const [points,setPoints]=useState(250);
  const join = async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const dob = fd.get('dob');
    const age = (Date.now()-new Date(dob).getTime())/(365.25*24*3600*1000);
    if(age<21){alert('Must be 21+');return;}
    const res = await fetch((import.meta.env.VITE_API_URL||'http://localhost:3001')+'/api/v1/members/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dob,name:fd.get('name'),email:fd.get('email')})});
    const data = await res.json();
    if(data.memberId){localStorage.setItem('bario_id',data.memberId); setMemberId(data.memberId);}
  };
  return (
    <div style={{background:'#0f0f0f',color:'#fff',minHeight:'100vh',padding:20,fontFamily:'sans-serif'}}>
      <header style={{textAlign:'center',maxWidth:760,margin:'0 auto 24px'}}>
        <img
          src="/bario-logo.png"
          alt="The Bar Is Open"
          style={{display:'block',width:'min(100%, 420px)',height:'auto',margin:'0 auto'}}
        />
        <h1 style={{color:'#f5b316',marginTop:12}}>BARIO Voluntary 21+ Membership</h1>
      </header>
      <p>Voluntary. Not required to drink. BPC 25600 Compliant - No free alcohol rewards.</p>
      {!memberId ? (
        <form onSubmit={join} style={{display:'grid',gap:8,maxWidth:400}}>
          <input name="name" placeholder="Name" required style={{padding:8}}/>
          <input name="email" type="email" placeholder="Email" required style={{padding:8}}/>
          <input name="dob" type="date" required style={{padding:8}}/>
          <label><input type="checkbox" required/> I am 21+ and understand membership is voluntary, not required to purchase alcohol. CCPA Notice acknowledged.</label>
          <button style={{background:'#f5b316',color:'#000',padding:10}}>Join Free - Get BARIO ID</button>
        </form>
      ):(
        <div>
          <p>Member: {memberId} | Points: {points}</p>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <button onClick={async()=>{const r=await fetch((import.meta.env.VITE_API_URL||'http://localhost:3001')+'/api/v1/partners/rideshare/lyft/discount',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({memberId})}); alert(JSON.stringify(await r.json()))}}>Get Lyft $5 Off</button>
            <button onClick={async()=>{const r=await fetch((import.meta.env.VITE_API_URL||'http://localhost:3001')+'/api/v1/partners/rideshare/uber/voucher',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({memberId})}); alert(JSON.stringify(await r.json()))}}>Get Uber Voucher</button>
            <button onClick={async()=>{const r=await fetch((import.meta.env.VITE_API_URL||'http://localhost:3001')+'/api/v1/partners/wagering/draftkings/promo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({memberId,state:'CA'})}); alert(JSON.stringify(await r.json()))}}>Get DraftKings Promo (CA safe)</button>
            <button onClick={async()=>{const r=await fetch((import.meta.env.VITE_API_URL||'http://localhost:3001')+'/api/v1/merch/discount',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({memberId})}); alert(JSON.stringify(await r.json()))}}>Get 20% Merch Code</button>
            <button onClick={async()=>{const r=await fetch((import.meta.env.VITE_API_URL||'http://localhost:3001')+'/api/v1/merch/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({memberId,email:'test@bario.com',items:[{name:'BARIO Tee',price:35}]})}); const d=await r.json(); window.open(d.url,'_blank')}}>Buy Tee via Stripe</button>
          </div>
        </div>
      )}
      <hr style={{margin:'20px 0'}}/>
      <p style={{fontSize:12,opacity:0.6}}>BPC 25600: No free alcohol. Discounts retailer-funded. Voluntary program. 21+ Drink responsibly. Ride-share encouraged. Wagering geo-fenced, free-to-play in CA. Gamble responsibly 1-800-GAMBLER.</p>
    </div>
  )
}
