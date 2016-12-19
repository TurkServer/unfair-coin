// Server-only collection that maintains common scenarios
Scenarios = new Mongo.Collection('scenarios');

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

/**
 * Generate a new random scenario
 */
function generateScenario(n_p, n_v, p, k) {

  const publicData = binomialFlips(n_p, p);
  const privateDataList = [];
  for (let i = 0; i < k; i++) {
    privateDataList.push( binomialFlips(n_v, p) );
  }

  return Scenarios.insert({
    publicData,
    privateDataList,
    prob: p,
    k
  });
}

// Set up a new game based on an existing scenario.
// Used in tutorial and actual games.
function setupGame(scenarioId, userIds, incentive, delphi) {
  const {
    publicData,
    privateDataList,
    prob,
    k
  } = Scenarios.findOne(scenarioId);

  if (k !== userIds.length) {
    throw new Error("Wrong number of users for scenario");
  }

  // The reason we might use the gameId here is to reuse scenarios
  const gameId = Games.insert({
    createdAt: new Date(),
    publicData,
    privateDataList,
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
      privateData: privateDataList[idx], //de-normalized
      answer: null
    });
  });
}

export { generateScenario, setupGame };
