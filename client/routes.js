Router.configure({
  layoutTemplate: 'defaultLayout'
});

Router.route('/', function() {
  this.render('home');
});

Router.route('/experiment', {
  action: function() {
    this.render('experiment');
  }
});

Router.route('/survey', function() {
    this.render('survey');
});
