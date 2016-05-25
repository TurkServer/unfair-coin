import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import './main.html';

Template.experiment.onCreated(function bodyOnCreated() {
  Meteor.subscribe("Games");
  MongoGames = new Mongo.Collection('games'); 

  Meteor.subscribe("Users");
  
  Meteor.subscribe("Players");
  MongoPlayers = new Mongo.Collection('players'); 
});

Template.controller.onCreated(function bodyOnCreated() {
  // counter starts at 0
  this.counter = new ReactiveVar(0);
  
});

Template.experiment.helpers({
  games: function() {
    return MongoGames.find({}, { sort: { createdAt: -1 } });
  },
  players: function(uid) {
    return MongoPlayers.find({uid: uid}, { sort: { createdAt: -1 } });
  }
})

Template.controller.events({
  'click button'(event, instance) {
    // increment the counter when button is clicked
    instance.counter.set(instance.counter.get() + 1);
    //Meteor.call("flip");
  }
});

Template.controller.helpers({
  counter: function() {
    return Template.instance().counter.get();
  }
});

Template.userTable.helpers({
  userList: function() {
    //Tracker.nonreactive(function() { console.log(Meteor.users.find().fetch()); });
    return Meteor.users.find({}, { fields: { username: 1 } });
  },
  playerList: function() {
    return MongoPlayers.find({}, { sort: { createdAt: -1 } });
  }
});

Template.guessForm.events({
  'change input[type=range]': function(e){
     var sliderValue = e.currentTarget.value;
     Session.set('guessSliderValue', sliderValue/100);
     //then you can get this session and return it in a helper to display on your page
  },
   'submit #guess'(e) {   //#guess .guess
      console.log('Submitting user guess from form! - ', event); //Retrive value from Event obj
      console.log('value from session =', Session.get('guessSliderValue')); //Meteor way: To persist it.
      console.log('value from e =', e.target.slider.value/100); //REST way: to persist it.
      event.preventDefault();
      event.stopPropagation();
      return false; 
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
  'click button': function (e) {
    // Start the game from client 
    Meteor.call('Start');
  }
});

Meteor.methods({
  flip: function(){
    //Animate: flip a coin and show H / T
  }
});

