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

Meteor.methods({
  newGame: function (n_p, n_v, incentive, delphi){
    check(n_p, Number);
    check(n_v, Number);

    const p = drawProb();
    // Set up game with number of online users
    const userIds = TurkServer.Instance.currentInstance().users();

    const scenarioId = generateScenario(n_p, n_v, p, userIds.length);

    setupGame(scenarioId, userIds, incentive, delphi);
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
    
    if ( Guesses.find({ delphi: null }).count() === 0 ) {
      // TODO: compute mean
      
      // Update game phase for clients to display
      Games.update({}, {$set: {phase: "final"}});
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
    // TODO: fix potential race conditions here; don't run this function twice
    if ( Guesses.find({ answer: null}).count() === 0 ) {
      console.log("Computing payoffs");
      Meteor.call("computePayoffs");

      Games.update({}, {$set: {phase: "completed"}});
      
      // Set the end time on the instance, but users go back to lobby themselves
      TurkServer.Instance.currentInstance().teardown(false);
    }
  },

  computePayoffs: function() {
    const game = Games.findOne();
    if (game == null) throw new Meteor.Error(400, "No such game");

    const actualProb = game.prob;

    const gs = Guesses.find({answer: {$ne: null}}).fetch();
    if (gs.length !== game.privateDataList.length) {
      throw new Meteor.Error(400, "Wrong number of players");
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

function addPayoff(gameId, userId, payoff) {
  Guesses.update({gameId, userId}, {$set: {payoff} });
  
  // TODO record payoffs elsewhere, unless game is a tutorial
}
