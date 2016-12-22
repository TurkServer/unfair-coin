import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check'

import { drawProb } from '/server/imports/math.js';
import { generateScenario, setupGame } from '/server/imports/scenario.js';

Meteor.publish("GameInfo", function() {
  // These are all partitioned by game.
  return [
    Games.find(),
    Meteor.users.find(),
    Guesses.find()
  ];
});

// One-way mirror publication
Meteor.publish("AdminInfo", function(_groupId) {
  if ( !TurkServer.isAdmin(this.userId) ) return [];
  const users = Experiments.findOne({_id: _groupId}).users;

  return [
    Meteor.users.find({_id: {$in: users}}),
    Games.direct.find({_groupId}),
    Guesses.direct.find({_groupId})
  ];
});

// XXX a quick hack to configure rounds while testing
let n_pub = 5, n_priv = 5;

Meteor.methods({
  newGame: function (n_p, n_v, incentive, delphi){
    check(n_p, Number);
    check(n_v, Number);

    n_pub = n_p;
    n_priv = n_v;

    startGameRound(true);
  },

  updateDelphi: function (guess) {
    const userId = Meteor.userId();
    check(userId, String);

    // Note that this is partitioned and will only update for this game
    const update = Guesses.update({
        userId: userId,
        delphi: {$exists: false}
      },
      {
        $set: {
          delphiAt: new Date(),
          delphi: guess
        }
      });

    if (update === 0) throw new Meteor.Error(400, "Already updated");

    // Once everyone's guessed, update game phase for clients to display
    if ( Guesses.find({ delphi: null }).count() === 0 ) {
      // This ensures the operation only happens once
      Games.update({phase: "delphi"}, {$set: {phase: "final"}});
    }
  },

  updateAnswer: function (guess) {
    const userId = Meteor.userId();
    check(userId, String);

    const update = Guesses.update({
      userId: userId,
      answer: null
    },
    {

      $set: {
        createdAt: new Date(),
        answer: guess
      }
    });

    if (update === 0) throw new Meteor.Error(400, "Already updated");

    // If all users in this game have updated, compute payoffs
    if ( Guesses.find({ answer: null}).count() === 0 ) {

      if ( Games.update({phase: "final"}, {$set: {phase: "completed"}}) === 0) {
        // This ensures that the end round code only runs once,
        // even if the last two users submit their guesses simultaneously
        return;
      }

      // End current round manually.
      // Payoffs will be computed, and any new round started if necessary.
      TurkServer.Timers.endCurrentRound();
    }
  },

  computePayoffs: function() {
    const game = Games.findOne();
    if (game == null) throw new Meteor.Error(400, "No such game");

    const actualProb = game.prob;

    // Grab guesses that were submitted
    const gs = Guesses.find({answer: {$ne: null}}).fetch();

    if (gs.length !== game.privateDataList.length) {
      Meteor._debug(`Game ${game._id} had ${game.privateDataList.length} players but only ${gs.length} guesses`)
    }

    // Store average guess for this game, both for data purposes and since
    // we might use it to compute a payoff later
    const sum = gs.reduce( (acc, cur) => acc + cur.answer, 0);
    const mean = sum / gs.length;
    Games.update(game._id, {$set: { mean }});

    if ( game.incentive === "ind" ) {
      // Everyone gets paid according to a scoring rule
      for( let guess of gs ) {
        const payoff = Scoring.linearPayoff(actualProb, guess.answer);
        addPayoff(game._id, guess.userId, payoff);
      }
    }

    else if ( game.incentive === "comp" ) {
      // Only the person who is closest gets paid. Ties split equally.
      for( let guess of gs ) {
        guess.diff = Math.abs(guess.answer - actualProb);
      }

      // Grab the set of people with minimum diffs
      let lowest = 1.1, lgs;

      for( let guess of gs ) {
        if (guess.diff < lowest) {
          lowest = guess.diff;
          lgs = [ ];
        }

        if (guess.diff <= lowest) {
          lgs.push(guess);
        }
      }

      const payoff = gs.length / lgs.length;

      for( let guess of lgs ) {
        addPayoff(game._id, guess.userId, payoff)
      }
    }

    else if ( game.incentive === "coll" ) {
      // Everyone gets paid by average, according to a scoring rule
      const payoff = Scoring.linearPayoff(actualProb, mean);

      for( let guess of gs ) {
        addPayoff(game._id, guess.userId, payoff);
      }

    }

    else {
      throw new Meteor.Error(400, "Unknown incentive");
    }
  },

  goToLobby: function() {
    const userId = Meteor.userId();
    const inst = TurkServer.Instance.currentInstance();

    if( inst == null ) {
      console.log("No instance for " + userId, "; ignoring goToLobby");
      return;
    }

    inst.sendUserToLobby(userId);
  }
});

function startGameRound(immediate = true) {
  const delay = immediate ? 0 : Config.round.between;

  // XXX this is a bit of a hack at the moment.
  // It's also not robust to the server getting restarted
  Meteor.setTimeout(function() {
    const p = drawProb();
    // Set up game with number of online users
    const userIds = TurkServer.Instance.currentInstance().users();

    const scenarioId = generateScenario(n_pub, n_priv, p, userIds.length);

    setupGame(scenarioId, userIds, incentive, delphi);
  }, delay);

  const now = Date.now();
  const start = now + delay;
  const end = start + Config.round.timelimit;
  TurkServer.Timers.startNewRound(new Date(start), new Date(end));
}

function endGameRound(reason) {
  // reason ==
  // TurkServer.Timers.ROUND_END_TIMEOUT
  // TurkServer.Timers.ROUND_END_MANUAL
  // TurkServer.Timers.ROUND_END_NEWROUND
  if ( reason === TurkServer.Timers.ROUND_END_NEWROUND ) {
    throw new Error("newRound shouldn't have been called to end a current round.")
  }

  // Do cleanup if the round timed out
  if ( reason === TurkServer.Timers.ROUND_END_TIMEOUT ) {
    // Set timeout for players who had no guess
    Guesses.update({ answer: null }, { $set: {timeout: true} }, { multi: true });

    // Patch up actions for players who submitted a delphi guess but no final guess
    // These guesses will also have the 'timeout' flag on them so we can identify them later
    Guesses.find({ delphi: {$ne: null}, answer: null}).forEach(function(guess) {
      Guesses.update(guess._id, {
        $set: { answer: guess.delphi }
      });
    });
  }

  // Compute payoffs
  Meteor.call("computePayoffs");

  const currentRound = RoundTimers.findOne({}, {sort: {index: -1}});
  // Last round - end the game
  if ( currentRound.index === Config.round.count ) {
    // Set the end time on the instance, but users go back to lobby themselves
    TurkServer.Instance.currentInstance().teardown(false);
    return;
  }

  // Not the last round - start a new round
  startGameRound(false);
}

TurkServer.Timers.onRoundEnd(endGameRound);

function addPayoff(gameId, userId, payoff) {
  Guesses.update({gameId, userId}, {$set: {payoff} });

  // TODO record payoffs elsewhere

  // unless game is a tutorial
  if (TurkServer.treatment().tutorial) return;

  // or the player's guess timed out

}
