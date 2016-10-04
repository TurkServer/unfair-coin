// Create set up an experiment given the treatment 
TurkServer.initialize(function() {
  // TODO set these values better
  const n_p = 5;
  const n_v = 5;
  
  const treatment = TurkServer.treatment();
  
  console.log(treatment);
  
  const incentive = treatment.incentive;
  const delphi = treatment.delphi || false;
  
  Meteor.call("newGame", n_p, n_v, incentive, delphi);
});
