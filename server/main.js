import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check'

// Update publications once connected to Turkserver
Meteor.publish("Games", function() {
  return Games.find({}, { sort: {createdAt: -1}, limit: 1});
});

Meteor.publish("Users", function() {
  return Meteor.users.find();
});

Meteor.publish("Guesses", function(gid) {
  return Guesses.find({gameId: gid}); 
});

// Draw a random probability from the uniform prior.
function drawProb() {
  return Math.random();
}

// Flip a biased coin. Returns true with probability p.
function flipCoin(p) {
  if (Math.random() < p) return true;
  return false;
}

function binomialFlips(n, p) {
  const result = [];
  for( let i = 0; i < n; i++ ) {
    result.push(flipCoin(p));
  }
  return result;
}

Meteor.methods({
  newGame: function (n_p, n_v, incentive, delphi){
    // TODO - Connect with Turkserver: Once all users login move to startup.
    check(n_p, Number);
    check(n_v, Number);

    const p = drawProb();

    // Set up game with number of online users
    const userIds =
      Meteor.users.find({"status.online": true}).map((u) => u._id);

    // Generate data from server side.
    const publicData = binomialFlips(n_p, p);
    const privateDataList = [];
    for (let i = 0; i < userIds.length; i++) {
      privateDataList.push( binomialFlips(n_v, p) );
    }

    // Store game
    const gameId = Games.insert({
      createdAt: new Date(),
      publicData: publicData,
      privateDataList: privateDataList,
      prob: p,
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
        privateData: privateDataList[idx], //de-normalized
        answer: null
      });
    });
  },

  // TODO: make this not rely solely on client-side logic
  updateDelphi: function (gameId, guess) {
    const userId = Meteor.userId();
    check(userId, String);

    const update = Guesses.update({
        userId: userId,
        gameId,
        delphi: {$exists: false}
      },
      {
        $set: {
          delphiAt: new Date(),
          delphi: guess
        }
      });

    if (update === 0) throw new Meteor.Error(400, "Already updated");

    if ( Guesses.find({ gameId, delphi: null}).count() === 0 ) {
      // Update game phase for clients to display
      Games.update(gameId, {$set: {phase: "final"}});
    }
  },
  
  updateAnswer: function (gameId, guess) {
    const userId = Meteor.userId();
    check(userId, String);

    const update = Guesses.update({
      userId: userId,
      gameId,
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
    // TODO: fix potential race conditions here
    if ( Guesses.find({ gameId, answer: null}).count() === 0 ) {
      console.log("Computing payoffs");
      Meteor.call("computePayoffs", gameId);

      Games.update(gameId, {$set: {phase: "completed"}});
    }
  },

  computePayoffs: function(gameId) {
    const game = Games.findOne(gameId);
    if (game == null) throw new Meteor.Error(400, "No such game");

    const actualProb = game.prob;

    const gs = Guesses.find({gameId, answer: {$ne: null}}).fetch();
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
        const payoff = Scoring.qsrPayoff(actualProb, guess.answer);
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
      const payoff = Scoring.qsrPayoff(actualProb, mean);

      for( let guess of gs ) {
        addPayoff(game._id, guess.userId, payoff);
      }
             
    }

    else {
      throw new Meteor.Error(400, "Unknown incentive");
    }
  },

  // Prototyping function. Resets payoffs earned so far in the game.
  resetPayoffs: function() {
    Meteor.users.update({}, {
      $unset: {profit: null}
    }, {multi: true});
  }
});

function addPayoff(gameId, userId, payoff) {
  Guesses.update({gameId, userId}, {$set: {payoff} });
  // For testing purposes, record cumulative payoff
  Meteor.users.update(userId, {$inc: {profit: payoff}});
}
