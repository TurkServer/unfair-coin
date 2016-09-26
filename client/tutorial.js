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
  template: Template.tut_guess
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
  },
  treatmentInst: function() {
    const game = Games.findOne();
    if (game == null) {
      console.log("Null game");
      return null;
    }

    if (game.incentive === "ind") {
      return "instIndiv";
    }
    else if (game.incentive === "comp") {
      return "instComp";
    }
    else if (game.incentive === "coll") {
      return "instColl";
    }
    else {
      console.log("Unknown incentive");
      return null;
    }
  }  
});