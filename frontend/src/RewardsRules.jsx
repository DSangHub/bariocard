const rules = [
  ['Bar registration', 'Verified business profile and authorized owner or manager required.', 'Business profile, location, and contact details', 'Planned'],
  ['Member eligibility', 'Approved, age-verified BARIO membership required.', 'Additional lawful participation terms', 'Required'],
  ['Visit points', 'Verify each visit; prevent duplicate points for the same visit.', 'Points per visit and daily cap', 'Planned'],
  ['Time spent', 'Verify check-in and checkout; cap the earning period.', 'Minimum stay, milestones, and maximum points', 'Planned'],
  ['Food purchases', 'Use eligible paid purchases; reverse points on refunds.', 'Points per dollar and eligible food items', 'Planned'],
  ['Visit frequency', 'Count separate verified visits within a defined period.', 'Visit target, bonus, and qualifying period', 'Planned'],
  ['Rewards', 'Publish descriptions, point costs, exclusions, and availability.', 'Food discounts, merchandise, and other eligible benefits', 'Planned'],
  ['Point balances', 'Keep a separate balance for each bar and record every adjustment.', 'Earning rates and published expiration terms', 'Planned'],
  ['Redemption', 'Require sufficient points, a single-use redemption, and staff confirmation.', 'Reward quantities and redemption limits', 'Planned'],
  ['Rule changes', 'Apply changes prospectively and disclose terms before participation.', 'Future earning rates and reward offers', 'Required'],
  ['Alcohol points', 'Disabled. A copy of the applicable alcohol license must be uploaded before activation review.', 'Proposed earning rules after approval', 'Later — disabled'],
  ['Gaming points', 'Disabled. A copy of the applicable gaming license and required activity approvals must be uploaded before activation review.', 'Proposed terminal and game rules after approval', 'Later — disabled'],
  ['License review', 'Upload alone does not activate points. Verify license holder, premises, scope, and expiration.', 'Submit license documents and renewals', 'Required before activation'],
  ['Document privacy', 'License files must remain private and accessible only to authorized reviewers.', 'Public business profile information', 'Required'],
];

export default function RewardsRules() {
  return <section className="rewards" aria-labelledby="rewards-heading">
    <p className="rewards-eyebrow">FOR PARTICIPATING BARS</p>
    <h2 id="rewards-heading">Choose Your Rewards System</h2>
    <p>Your Bar. Your Points. Your Rewards. Choose how customers earn points through verified visits, time spent, food purchases, and repeat visits.</p>
    <p>These are BARIO platform requirements, not universal laws. Local laws and license conditions still apply. Rewards configuration, tracking, and redemption are planned features.</p>
    <div className="rewards-scroll" role="region" aria-label="BARIO rewards rules" tabIndex={0}>
      <table className="rewards-table">
        <caption>Standard rules for every participating bar</caption>
        <thead><tr>{['Category','Standard BARIO rule','Bar chooses','Availability'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{rules.map(([category,rule,choice,status]) => <tr key={category}>
          <th scope="row">{category}</th><td>{rule}</td><td>{choice}</td><td>{status}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <aside className="rewards-license">
      <h3>Alcohol and gaming rewards — coming later</h3>
      <p>Upload a copy of the applicable license when license submissions open. Gaming also requires any applicable activity approvals. Points remain disabled until review and approval.</p>
      <p>License uploads are not open yet. Do not submit license documents through public profiles.</p>
      <button disabled>License uploads — coming later</button>
    </aside>
  </section>;
}
