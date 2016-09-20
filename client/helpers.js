// Global variable for helpers to reference stuff
CoinFlip = {
  isCollInc: function() {
    const g = Games.findOne();
    return g && g.incentive === "coll";
  },
  isCompInc: function() {
    const g = Games.findOne();
    return g && g.incentive === "comp";
  }
};

Template.registerHelper('guesses', () => {
  return Guesses.find();
});

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

// Whether the current game is using the collaborative incentive
Template.registerHelper('isCollInc', CoinFlip.isCollInc);

// Whether the current game is using the winner-take-all incentive
Template.registerHelper('isCompInc', CoinFlip.isCompInc);
