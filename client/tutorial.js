var tutorialSteps = [
{
  template: Template.tut_player
},
{ 
  template: Template.tut_biased_coin
},
{
  template: Template.tut_goal
},
{
  template: Template.tut_info
},
{
  template: Template.tut_communication
},
{
  template: Template.tut_payment
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