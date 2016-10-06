import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import './main.html';

Template.testForm.events({
  'submit form#tutorial': function(e) {
    e.preventDefault();
    const incentive = e.target.incentive.value;
    const delphi = e.target.delphi.checked;

    TurkServer.callWithModal("testTutorial", incentive, delphi);
  },
  'submit form#startGame': function(e) {
    e.preventDefault();
    const n_p = parseInt(e.target.public.value);
    const n_v = parseInt(e.target.private.value);
    const incentive = e.target.incentive.value;
    const delphi = e.target.delphi.checked;

    TurkServer.callWithModal("testGame", n_p, n_v, incentive, delphi);
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

