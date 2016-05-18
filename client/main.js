import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import './main.html';

Template.experiment.onCreated(function bodyOnCreated() {
  // counter starts at 0
  this.counter = new ReactiveVar(0);
  this.result = new ReactiveVar("");

  Meteor.subscribe("Games");
  MongoGames = new Mongo.Collection('games'); 

  Meteor.subscribe("Users");
});

Template.experiment.helpers({
  counter() {
    return Template.instance().counter.get();
  },
  games: function() {
    return MongoGames.find({}, { sort: { createdAt: -1 } });
  }
});

Template.userTable.helpers({
  userList: function() {
    //Tracker.nonreactive(function() { console.log(Meteor.users.find().fetch()); });
    return Meteor.users.find({}, { fields: { username: 1 } });
  }
});

Template.experiment.events({
  'click button'(event, instance) {
    // increment the counter when button is clicked
    instance.counter.set(instance.counter.get() + 1);
    //Meteor.call("flip");
  }
});

Template.guessForm.events({
  'change input[type=range]': function(event){
     var sliderValue = event.currentTarget.value;
     Session.set('guessSliderValue', sliderValue/100);
     //then you can get this session and return it in a helper to display on your page
  },
   'submit #guess'(event) {   //#guess .guess
      console.log('Submitting user guess from form! - ', event); //Retrive value from Event obj
      console.log('value =', Session.get('guessSliderValue')); //Meteor way: To persist it.
      event.preventDefault();
      event.stopPropagation();
      return false; 
   }
 });
    
Meteor.methods({
  flip: function(){
    //Animate: flip a coin and show H / T
  }
});

