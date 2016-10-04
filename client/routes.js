Router.configure({
  layoutTemplate: 'defaultLayout'
});

Router.route('/', function() {
  this.render('home');
});

Router.route('/lobby', function() {
  this.render('lobby');
});

Router.route('/experiment', {
  action: function() {
    this.render('experiment');
  }
});

Router.route('/survey', function() {
  this.render('survey');
});

Tracker.autorun(function() {
  if (TurkServer.inLobby()) {
    var batch = TurkServer.batch();
    Meteor.subscribe('lobby', batch && batch._id);
    Router.go('/lobby');
  } else if (TurkServer.inExperiment()) {
    Router.go('/experiment');
  } else if (TurkServer.inExitSurvey()) {

  }
});
