// This class is for testing purposes.
// It allows us to create new worlds with any particular treatment.
class TestingAssigner extends TurkServer.Assigner {

  initialize(batch) {
    super.initialize(batch);

    // Bind commands for starting various games
    this.lobby.events.on("ind", () => this.newGame(['ind']));
    this.lobby.events.on("coll", () => this.newGame(['coll']));
    this.lobby.events.on("comp", () => this.newGame(['comp']));
    this.lobby.events.on("ind-delphi", () => this.newGame(['ind', 'delphi']));
    this.lobby.events.on("coll-delphi", () => this.newGame(['coll', 'delphi']));
    this.lobby.events.on("comp-delphi", () => this.newGame(['comp', 'delphi']));

  }

  /**
   * Start a fake game with just this user
   * @param userId
   * @param treatments
   */
  startTutorialGame(userId, treatments) {
    // Get just this user's assignment
    const assts = this.lobby.getAssignments({_id: userId});

    if ( assts.length !== 1 ) {
      throw new Meteor.Error(500, "Something's wrong.");
    }

    treatments.push('tutorial');

    this.assignToNewInstance(assts, treatments);
  }

  /**
   * Try to start a new game if there are enough people
   * @param treatments
   */
  newGame(treatments) {
    const userAssts = this.lobby.getAssignments();

    if ( userAssts.length < 2 ) {
      throw new Meteor.Error(500,
        "Not enough users to start a game; need at least 2.");
    }

    this.assignToNewInstance(userAssts, treatments);
  }
}

export { TestingAssigner };
