function delphiGame() {
  const game = Games.findOne();
  return game && game.delphi;
}

Template.registerHelper('delphiGame', delphiGame);

Template.controller.helpers({
  delphiActive: function() {
    // Delphi is active if the game is delphi and some guesses are incomplete, if we are in round 1.
    if ( !delphiGame() ) return false;
    const guesses = Guesses.find({delphi: {$exists: false}}).fetch();
    return guesses.length > 0;
  },
  iGuessedDelphi: function() {
    const g = Guesses.findOne({userId: Meteor.userId()});
    return g && g.delphi != null;
  },
  myDelphi: function() {
    const g = Guesses.findOne({userId: Meteor.userId()});
    return g && g.delphi;
  },
  iGuessed: function() {
    const g = Guesses.findOne({userId: Meteor.userId()});
    return g && g.answer != null;
  },
  myAnswer: function() {
    const g = Guesses.findOne({userId: Meteor.userId()});
    return g && (g.answer * 100).toFixed(0);
  }
});

Template.delphiDisplay.helpers({
  x: function() {
    return this.delphi && (this.delphi * 400 - 200);
  },
  y: function(index) {
    return (index != null) && (index * 15 + 10);
  },
  displayValue: function() {
    return this.delphi && (this.delphi * 100);
  },
});

Template.guessForm.onCreated(function() {
  // Set guess value to 50 unless there was a previous delphi round
  const existing = Guesses.findOne({userId: Meteor.userId()});

  // Best to use integers for this RV to avoid FP math errors
  if ( existing && existing.delphi ) {
    this.guessValue = new ReactiveVar(existing.delphi * 100);
  }
  else {
    this.guessValue = new ReactiveVar(50);
  }
});

Template.guessForm.onRendered(function() {
  // Set initial value on render
  this.$("input[type=range]").val(this.guessValue.get());
});

Template.guessForm.helpers({
  guessValue: function() {
    return Template.instance().guessValue.get();
  }
});

Template.guessForm.events({
  'input input[type=range]': function(e, t){
    const sliderValue = e.currentTarget.value;
    t.guessValue.set(sliderValue);
  },
  'submit form.guess': function(e, t) {
    e.preventDefault();
    const game = Games.findOne();
    const existing = Guesses.findOne({ userId: Meteor.userId() });
    const guess = t.guessValue.get() / 100;

    // Is this a Delphi round or the final round?
    if( game.delphi && existing.delphi == null ) {
      Meteor.call("updateDelphi", game._id, guess);
    }
    else {
      Meteor.call("updateAnswer", game._id, guess);
    }
  }
});

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
  },
  oppoGuessed: function() {
    const oppoGuess = Guesses.findOne({userId: this.userId});
    if ( delphiGame() ) {
      return oppoGuess && (oppoGuess.delphi != null);
    } else {
      return oppoGuess && (oppoGuess.answer != null);  
    }
    
  }
});

Template.userTable.helpers({
  myAnswer: function() {
    const myGuess = Guesses.findOne({userId: Meteor.userId()});
    return myGuess && (myGuess.answer * 100).toFixed(0);
  },
  myWinStatus: function() {
    const myGuess = Guesses.findOne({userId: Meteor.userId()});
    return myGuess.payoff > 0;
  },
  myPayoff: function() {
    const myGuess = Guesses.findOne({userId: Meteor.userId()});
    return (myGuess && myGuess.payoff || 0.00).toFixed(2);
  },
  isCollInc: function() {
    const g = Games.findOne();
    return g.incentive === "coll";
  },
  isCompInc: function() {
    const g = Games.findOne();
    return g.incentive === "comp";
  },
  avgGuess: function() {
    const gs = Guesses.find({answer: {$ne: null}}).fetch();
    const sum = gs.reduce( (acc, cur) => acc + cur.answer, 0);
    const mean = sum / gs.length; 
    return (mean * 100).toFixed(0);
  },
  prob: function() {
    const g = Games.findOne();
    return g && (g.prob * 100).toFixed(0); 
  },
  username: function() {
    const user = Meteor.users.findOne(this.userId);
    return user && user.username;
  },
  payoff: function() {
    return this.payoff && this.payoff.toFixed(2);
  },
  total: function() {
    const user = Meteor.users.findOne(this.userId);
    return (user && user.profit || 0.0).toFixed(2);
  }
});
