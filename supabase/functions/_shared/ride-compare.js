// Provider quotes and booking require separately approved integrations.
// Never infer fares, road mileage, or eligibility from user-entered estimates.
export function createRidePlan(input, now = Date.now()) {
  const {pickup, destination, departureAt} = input;
  for (const [name, value] of Object.entries({pickup, destination})) {
    if (typeof value !== 'string' || value.trim().length < 5 || value.length > 300)
      throw new Error(`Enter a complete ${name} address (5–300 characters).`);
  }
  if (typeof departureAt !== 'string') throw new Error('Choose a departure time.');
  const departure = Date.parse(departureAt);
  if (!Number.isFinite(departure) || departure < now + 60000 || departure > now + 86400000)
    throw new Error('Departure must be between 1 minute and 24 hours from now.');
  return {
    pickup: pickup.trim(), destination: destination.trim(), departureAt: new Date(departure).toISOString(),
    checkedAt: new Date(now).toISOString(), booked: false,
    discount: {status:'not_active', centsPerMile:50, maximumMiles:10, maximumCents:500,
      message:'Proposed benefit: 50¢ per eligible road mile, up to $5. Not active or applied to these rides.'},
    providers: [
      {id:'uber',name:'Uber',status:'approval_required',fare:null,pickupMinutes:null,bookingUrl:'https://m.uber.com/',
        message:'Live quotes are not connected. Check price and pickup time with Uber.'},
      {id:'lyft',name:'Lyft',status:'approval_required',fare:null,pickupMinutes:null,bookingUrl:'https://www.lyft.com/rider',
        message:'Live quotes are not connected. Check price and pickup time with Lyft.'},
    ],
  };
}
