Template.gameInstructions.helpers({
  treatmentInst: function() {
    const game = Games.findOne();
    if (game == null) return null;

    if (game.incentive === "ind") {
      return "instIndiv";
    }
    else if (game.incentive === "comp") {
      return "instComp";
    }
    else if (game.incentive === "coll") {
      return "instColl";
    }
    else {
      console.log("Unknown incentive");
      return null;
    }
  }
});
