var tutorialSteps = [
  { 
    template: Template.tut_biased_coin
  },
  {
    template: Template.tut_goal
  }
];  

Template.woc_tutorial.helpers({
  options: {
    steps: tutorialSteps,
    onFinish: function() {
      Router.go('experiment');
    }
  }  
});