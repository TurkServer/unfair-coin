import { myGuess } from '/client/imports/common.js'

var tutorialStepsIntro = [
  {
    template: Template.tut_player
  },
  {
    template: Template.tut_biased_coin
  },
  {
    template: Template.tut_goal,
    spot: ".game_goal"
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
    spot: ".flip-guesser",
    require: answerSubmitted
  }
];

var tutorialStepsGameDelphi = [
  {
    template: Template.instDelphi_make_initial_guess,
    spot: ".flip-guesser",
    require: delphiSubmitted
  },
  {
    template: Template.instDelphi_reveal_guess,
    spot: ".flip-guesser",
    onLoad: ensureBotsDelphi
  },
  {
    template: Template.instDelphi_revise_guess,
    spot: ".flip-guesser",
    require: answerSubmitted
  }
];

var tutorialStepsEnd = [
  {
    template: Template.tut_payment,
    spot: ".flip-guesser",
    onLoad: ensureBotsAnswer 
  }
];

function getNoCommSteps() {
  var steps = tutorialStepsIntro.concat(tutorialStepsGameNoComm);
  steps = steps.concat(tutorialStepsEnd);
  return steps;
}

function getDelphiSteps() {
  var steps = tutorialStepsIntro.concat(tutorialStepsGameDelphi);
  steps = steps.concat(tutorialStepsEnd);
  return steps;
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
