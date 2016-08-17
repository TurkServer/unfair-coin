import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import './main.html';

Template.experiment.onCreated(function () {
  Meteor.subscribe("Games");
  Meteor.subscribe("Users");
  
  // Subscribe to guesses, but stop when template is destroyed 
  this.autorun(function() {
    const game = Games.findOne();
    const gameId = game && game._id;
    if (!gameId) return;
    Meteor.subscribe("Guesses", gameId);
  });
});

Template.controller.onCreated(function () {
  // counter starts at 0
  this.counter = new ReactiveVar(0);
});

Template.experiment.helpers({
  allGuessed: function() {
    const gs = Guesses.find().map(g => g.answer);
    return gs.length > 0 && _.every(gs, (a) => a != null);
  },
  game: function() {
    return Games.find({}, { sort: { createdAt: -1 } });
  },
  players: function(uid) {
    return Guesses.find({uid: uid}, { sort: { createdAt: -1 } });
  }
});

Template.displayFlips.helpers({
  flipSeq: function() {
    if (!Array.isArray(this)) return;
    return this.map((h) => h ? "H" : "T").join("");
  },
  heads: function() {
    if (!Array.isArray(this)) return;
    return this.filter((h) => h).length;
  },
  total: function() {
    if (!Array.isArray(this)) return;
    return this.length;
  }
});

Template.controller.events({
  'click button'(event, instance) {
    // increment the counter when button is clicked
    if( instance.counter.get() < 10 ){
      instance.counter.set(instance.counter.get() + 1);
    }
    //Meteor.call("flip");
  }
});

Template.controller.helpers({
  counter: function() {
    return Template.instance().counter.get();
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
  winner: function() {
    if ( this.answer == null ) return "";
    const p = Games.findOne().prob;
    const myDiff = Math.abs(this.answer - p);
    const allDiffs = Guesses.find().map((g) => Math.abs(g.answer - p));

    if (_.every(allDiffs, (d) => d >= myDiff) ) return "WINNER";
  }
});

Template.guessForm.onCreated(function() {
  this.guessValue = new ReactiveVar(0.5);
});

Template.guessForm.helpers({
  iGuessed: function() {
    const g = Guesses.findOne({userId: Meteor.userId()});
    return g && g.answer != null;
  },
  myAnswer: function() {
    const g = Guesses.findOne({userId: Meteor.userId()});
    return g && g.answer;
  },
   "guessValue": function() {
     return Template.instance().guessValue.get().toFixed(2);
   }
});

Template.guessForm.events({
  'input input[type=range]': function(e, t){
     const sliderValue = e.currentTarget.value;
     t.guessValue.set(sliderValue / 100);
  },
  'submit #guess': function(e, t) {   //#guess .guess
    e.preventDefault();
    const gameId = Games.findOne()._id;
    const guess = t.guessValue.get();
    Meteor.call("updateAnswer", gameId, guess);
  }
});

Template.testForm.events({
  'submit form': function(e) {   //#guess .guess
    e.preventDefault();
    const n_p = parseInt(e.target.public.value);
    const n_v = parseInt(e.target.private.value);
    const incentive = e.target.incentive.value;
    const delphi = e.target.delphi.checked;

    Meteor.call("newGame", n_p, n_v, incentive, delphi);
  }
});

 Template.survey.events({
   'submit .survey': function (e) {
     e.preventDefault();
     var results = {
       confusing: e.target.confusing.value,
       feedback: e.target.feedback.value};
       TurkServer.submitExitSurvey(results);
   }
 });

Template.home.events({
  // 'click button': function (e) {
  //   // Start the game from client
  //   Meteor.call('Start');
  // }
});

Meteor.methods({
  flip: function(){
    //Animate: flip a coin and show H / T
  }
});

