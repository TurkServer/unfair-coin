var tutorialStepsIntro = [
  {
    template: Template.tut_player,
    spot: ".game_title"
  },
  {
    template: Template.tut_biased_coin
  },
  {
    template: Template.tut_goal,
    spot: ".game_goal"
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
  }
];

var tutorialStepsGameNoComm = [
  {
    template: Template.instNoComm_make_guess,
    spot: ".flip-guesser"
  },
    {
    template: Template.instNoComm_confirm_guess,
    spot: ".flip-guesser"
  },
  {
    template: Template.instNoComm_wait_other_guesses,
    spot: ".flip-guesser"
  },
  {
    template: Template.instNoComm_game_end,
    spot: ".flip-guesser"
  }
];

var tutorialStepsGameDelphi = [
  {
    template: Template.instDelphi_make_initial_guess
  },
  {
    template: Template.instDelphi_confirm_initial_guess
  },
  {
    template: Template.instDelphi_wait_other_initial_guesses
  },
  {
    template: Template.instDelphi_reveal_guess
  },
  {
    template: Template.instDelphi_revise_guess
  },
  {
    template: Template.instDelphi_confirm_final_guess
  },
  {
    template: Template.instDelphi_wait_other_final_guesses
  },
  {
    template: Template.instDelphi_game_end
  }
]

var tutorialStepsBonus = [
  {
    template: Template.tut_payment
  }
];

function getNoCommSteps() {
  return tutorialStepsIntro.concat(tutorialStepsGameNoComm, tutorialStepsBonus);
}

function getDelphiSteps() {
  return tutorialStepsIntro.concat(tutorialStepsGameDelphi, tutorialStepsBonus);
}

Template.registerHelper("tutorialOptions", function() {
  const steps = TurkServer.treatment().delphi ?
    getDelphiSteps() : getNoCommSteps();

  return {
    steps: steps,
    onFinish: function() {
      Session.set("tutorialEnabled", false);
    }
  };
});

Template.registerHelper("tutorialEnabled", function() {
  return Session.equals("tutorialEnabled", true);
});


Template.registerHelper("isDelphi", function() {
  return TurkServer.treatment().delphi;
});

Template.registerHelper("isInd", function() {
  return TurkServer.treatment().incentive == "ind";
});

Template.registerHelper("isComp", function() {
  return TurkServer.treatment().incentive == "comp";
});

Template.registerHelper("isColl", function() {
  return TurkServer.treatment().incentive == "coll";
});

Session.setDefault("tutorialEnabled", false);



// Start tutorial whenever we get a treatment for it.
Tracker.autorun(function() {
  if( TurkServer.treatment().tutorial ) {
    Session.set("tutorialEnabled", true);
  }
});
