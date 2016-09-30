var tutorialSteps = [
  {
    template: Template.tut_overview
  },
  {
    template: Template.tut_player,
    spot: ".table-player"
  },
  {
    template: Template.tut_biased_coin
  },
  {
    template: Template.tut_goal,
    spot: ".flip-guesser"
  },
  {
    template: Template.tut_info,
    spot: ".coin-flips"
  },
  {
    template: Template.tut_public_flips,
    spot: ".public-flips"
  },
  {
    template: Template.tut_private_flips,
    spot: ".div_private_flips"
  },
  {
    template: Template.tut_communication
  },
  {
    template: Template.tut_payment
  }
];

Session.setDefault("tutorialEnabled", true);

Template.registerHelper("tutorialOptions", {
  steps: tutorialSteps,
  onFinish: function() {
    Session.set("tutorialEnabled", false);
  }
});

Template.registerHelper("tutorialEnabled", function() {
  return Session.equals("tutorialEnabled", true);
});
