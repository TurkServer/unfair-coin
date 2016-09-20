import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import './main.html';

Template.experiment.onCreated(function () {
  Meteor.subscribe("Games");
  Meteor.subscribe("Users");

  // Subscribe to guesses, but stop when template is destroyed 
  this.autorun( function() {
    const game = Games.findOne();
    const gameId = game && game._id;
    if (!gameId) return;
    Meteor.subscribe("Guesses", gameId);
  });
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

Template.testForm.events({
  'submit form': function(e) {   //#guess .guess
    e.preventDefault();
    const n_p = parseInt(e.target.public.value);
    const n_v = parseInt(e.target.private.value);
    const incentive = e.target.incentive.value;
    const delphi = e.target.delphi.checked;

    Meteor.call("newGame", n_p, n_v, incentive, delphi);
  },
  'click .reset-payoffs': function() {
    Meteor.call("resetPayoffs");
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

