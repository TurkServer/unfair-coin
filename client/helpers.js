Template.registerHelper('opponents', () => {
  const me = Meteor.userId();
  return Guesses.find({userId: {$ne: me}});
});

Template.registerHelper('publicFlips', () => {
  const g = Games.findOne();
  return g && g.publicData;
});

Template.registerHelper('privateFlips', () => {
  const guess = Guesses.findOne({userId: Meteor.userId()});
  return guess && guess.privateData;
});
