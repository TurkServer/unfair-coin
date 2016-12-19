import { getRandomInt } from '/server/imports/math.js';
import { setupGame } from '/server/imports/scenario.js';

// Ensure that tutorial scenario always exists
Scenarios.upsert("tutorial", {
  publicData: [ true, true, false, false, true ],
  privateDataList: [
    [ true, false, true, false, false ],
    [ false, true, true, true, true ],
    [ true, true, true, true, true ]
  ],
  prob: 0.75,
  k: 3
});

Meteor.methods({
  // Generate a fake game for tutorial purposes.
  tutorialGame: function(incentive, delphi) {
    // The single user doing the tutorial, plus two fake bots
    const userIds = [
      TurkServer.Instance.currentInstance().users()[0],
      "bot1",
      "bot2"
    ];

    setupGame("tutorial", userIds, incentive, delphi);
  },
  // Submit fake guesses for the bots
  tutBotsDelphi: function () {
    const userId = Meteor.userId();
    check(userId, String);

    const game = Games.findOne();
    if( game.phase !== "delphi" ) return;

    Guesses.find({
      userId: {$ne: userId},
      delphi: null
    }).forEach(function(g) {
      const total = _.countBy(game.publicData).true
        + _.countBy(g.privateData).true;

      Guesses.update(g._id, {
        $set: {
          delphi: (total + getRandomInt(0, 11)) / 20.0
        }
      });
    });

    Games.update({}, {$set: {phase: "final"}});
  },
  tutBotsAnswer: function () {
    const userId = Meteor.userId();
    check(userId, String);

    const game = Games.findOne();
    if( game.phase !== "final" ) return;

    Guesses.find({
      userId: {$ne: userId},
      answer: null
    }).forEach(function(g) {
      const total = _.countBy(game.publicData).true
        + _.countBy(g.privateData).true;

      Guesses.update(g._id, {
        $set: {
          answer: (total * 8 + getRandomInt(0, 21)) / 100.0
        }
      });
    });

    // TODO potential race conditions here too, or at least ensure client is debounced
    Meteor.call("computePayoffs");
    Games.update({}, {$set: {phase: "completed"}});
    TurkServer.Instance.currentInstance().teardown(false);
  },
});
