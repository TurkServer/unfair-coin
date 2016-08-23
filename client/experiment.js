Template.coinTable.helpers({
  // Hash this userId to one of three images
  imageHash: function() {
    return parseInt(this._id, 36) % 3 + 1;
  },
  numPrivate: function() {
    return this.privateData.length;
  },
  oppName: function() {
    const user = Meteor.users.findOne(this.userId);
    return user && user.username;
  }
});

Template.userTable.helpers({
  prob: function() {
    const g = Games.findOne();
    return g && g.prob.toFixed(3);
  },
  username: function() {
    const user = Meteor.users.findOne(this.userId);
    return user && user.username;
  },
  guesses: function() {
    return Guesses.find();
  },
  payoff: function() {
    return this.payoff.toFixed(3);
  },
  total: function() {
    const user = Meteor.users.findOne(this.userId);
    return (user && user.profit || 0.0).toFixed(3);
  }
});
