import {useState} from 'react';
import RewardsRules from './RewardsRules.jsx';
import RideCompare from './RideCompare.jsx';
import Membership from './Membership.jsx';
import StaffScanner from './StaffScanner.jsx';

export default function App(){
  const [member,setMember]=useState(null);
  const [signedIn,setSignedIn]=useState(false);
  return <main className="bario-app">
    <header className="bario-header">
      <img src="/bario-logo.png" alt="BARIO gold bell and cocktail logo" />
      <h1>BARIO — Bar is Open</h1>
      <p>Your night out. Your membership. Free to start.</p>
      <a className="membership-cta" href="#membership">Get your free digital card</a>
    </header>
    <Membership onMemberChange={setMember} onSessionChange={setSignedIn} />
    <StaffScanner signedIn={signedIn} />
    <RideCompare memberId={member?.member_number || ''} />
    <RewardsRules />
    <footer>Voluntary 21+ program. No alcohol purchase required. Alcohol and gaming points are disabled. Ride discounts require confirmed offers; free membership does not guarantee a ride discount.</footer>
  </main>;
}
