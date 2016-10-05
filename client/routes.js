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
  waitOn: function() {
    // Group should never change here, but just in case
    const group = TurkServer.group();
    if (group == null) return;
    return Meteor.subscribe("GameInfo", group);
  },
  template: 'experiment'
});

// One-way mirror for experiment
Router.route('/expAdmin', {
  path: 'exp/:groupId',
  waitOn: function() {
    return Meteor.subscribe("AdminInfo", this.params.groupId);
  },
  template: 'experiment'
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
