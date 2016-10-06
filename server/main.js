import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check'

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

// Returns a random integer between min (included) and max (excluded)
// Using Math.round() will give you a non-uniform distribution!
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

// Draw a random probability from the not-quite-uniform prior:
// 0.01 through 0.99 inclusive
function drawProb() {
  return getRandomInt(1, 100) / 100.0;
}

// Flip a biased coin. Returns true with probability p.
function flipCoin(p) {
  return (Math.random() < p);
}

function binomialFlips(n, p) {
  const result = [];
  for( let i = 0; i < n; i++ ) {
    result.push(flipCoin(p));
  }
  return result;
}

// Generate data for a new game. Used in tutorial and actual games.
function generateGame(prob, publicFlips, privateFlipList,
                      userIds, incentive, delphi) {

  // The reason we might use the gameId here is to reuse scenarios
  const gameId = Games.insert({
    createdAt: new Date(),
    publicData: publicFlips,
    privateDataList: privateFlipList,
    prob,
    incentive,
    delphi,
    phase: delphi ? "delphi" : "final"
  });

  // Assign users to roles in random order
  _.shuffle(userIds).forEach(function(userId, idx) {
    Guesses.insert({
      userId,
      gameId,
      order: idx,
      privateData: privateFlipList[idx], //de-normalized
      answer: null
    });
  });

}

Meteor.methods({
  newGame: function (n_p, n_v, incentive, delphi){
    check(n_p, Number);
    check(n_v, Number);

    const p = drawProb();

    // Set up game with number of online users
    const userIds = TurkServer.Instance.currentInstance().users();     

    // Generate data from server side.
    const publicData = binomialFlips(n_p, p);
    const privateDataList = [];
    for (let i = 0; i < userIds.length; i++) {
      privateDataList.push( binomialFlips(n_v, p) );
    }

    // Store game
    generateGame(p, publicData, privateDataList, userIds, incentive, delphi);
  },

  // Generate a fake game for tutorial purposes.
  tutorialGame: function(incentive, delphi) {
    const p = 0.75;

    // The single user doing the tutorial, plus two fake bots
    const userIds = [
      TurkServer.Instance.currentInstance().users()[0],
      "bot1",
      "bot2"
    ];

    const publicFlips = [ true, true, false, false, true ];

    const privateFlips = [
      [ true, false, true, false, false ],
      [ false, true, true, true, true ],
      [ true, true, true, true, true ]
    ];

    generateGame(p, publicFlips, privateFlips, userIds, incentive, delphi);

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
    var userId = Meteor.userId();
    var inst = TurkServer.Instance.currentInstance();

    if( inst == null ) {
      console.log("No instance for " + userId, "; ignoring goToLobby");
      return;
    }

    inst.sendUserToLobby(userId);
  }
});

function addPayoff(gameId, userId, payoff) {
  Guesses.update({gameId, userId}, {$set: {payoff} });
}
