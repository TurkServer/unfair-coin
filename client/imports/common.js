
function delphiGame() {
  const game = Games.findOne();
  return game && game.delphi;
}
Template.registerHelper('delphiGame', delphiGame);

function gamePhase() {
  const game = Games.findOne({}, {field: {phase: 1}});
  return game && game.phase;
}

function guessSubmitted() {
  if( completedPhase() ) return true;
  const g = myGuess();
  return (delphiPhase() && g.delphi) || (finalPhase() && g.answer);
}

/**
 * Whether the current game is a delphi game and in the delphi phase.
 * @returns {boolean}
 */
function delphiPhase() {
  // Although we can compute this by looking at whether the game is delphi and some guesses are incomplete, it's easier to let the server handle it
  return gamePhase() === "delphi";
}
Template.registerHelper('delphiPhase', delphiPhase);

function finalPhase() {
  return gamePhase() === "final";
}
Template.registerHelper('finalPhase', finalPhase);

function completedPhase() {
  return gamePhase() === "completed";
}
Template.registerHelper('completedPhase', completedPhase);

function myGuess() {
  return Guesses.findOne({userId: Meteor.userId()});
}
Template.registerHelper('myGuess', myGuess);

export {
  delphiGame,
  gamePhase,
  delphiPhase,
  finalPhase,
  completedPhase,
  myGuess,
  guessSubmitted
};
