import { myGuess } from '/client/imports/common.js'

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
    // Note that this expands the spotlight to show both elements
    spot: ".own-private-flips, .table-player"
  }
];

function delphiSubmitted() {
  const g = myGuess();
  return g && g.delphi != null;
}

function answerSubmitted() {
  const g = myGuess();
  return g && g.answer != null;
}

function ensureBotsDelphi() {
  // Ensure that delphi guesses are submitted by the bots
  // This check prevents unnecessary hits to the server
  if( Guesses.findOne({delphi: null}) != null ) {
    Meteor.call("tutBotsDelphi");
  }
}

function ensureBotsAnswer() {
  // Ensure that delphi guesses are submitted by the bots
  // This check prevents unnecessary hits to the server
  if( Guesses.findOne({answer: null}) != null ) {
    Meteor.call("tutBotsAnswer");
  }
}

var tutorialStepsGameNoComm = [
  {
    template: Template.instNoComm_make_guess,
    spot: ".flip-guesser"
  },
  {
    template: Template.instNoComm_confirm_guess,
    spot: ".flip-guesser",
    require: answerSubmitted
  },
  {
    template: Template.instNoComm_wait_other_guesses,
    spot: ".flip-guesser"
  },
  {
    template: Template.instNoComm_game_end,
    spot: ".flip-guesser",
    onLoad: ensureBotsAnswer
  }
];

var tutorialStepsGameDelphi = [
  {
    template: Template.instDelphi_make_initial_guess,
    spot: ".flip-guesser"
  },
  {
    template: Template.instDelphi_confirm_initial_guess,
    spot: ".flip-guesser",
    require: delphiSubmitted
  },
  {
    template: Template.instDelphi_wait_other_initial_guesses,
    spot: ".flip-guesser"
  },
  {
    template: Template.instDelphi_reveal_guess,
    spot: ".flip-guesser",
    onLoad: ensureBotsDelphi
  },
  {
    template: Template.instDelphi_revise_guess,
    spot: ".flip-guesser"
  },
  {
    template: Template.instDelphi_confirm_final_guess,
    spot: ".flip-guesser",
    require: answerSubmitted
  },
  {
    template: Template.instDelphi_wait_other_final_guesses,
    spot: ".flip-guesser"
  },
  {
    template: Template.instDelphi_game_end,
    spot: ".flip-guesser",
    onLoad: ensureBotsAnswer
  }
];

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
