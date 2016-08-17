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
      delphi
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

    // TODO: if all users in this game have updated, compute payoffs
  },
});
