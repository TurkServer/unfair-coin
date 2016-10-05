import { Meteor } from 'meteor/meteor';
import { TestingAssigner } from '/server/imports/assigner.js';

// TODO: come up with a better way to parametrize these.
let n_p = 5;
let n_v = 5;

// Set up recruiting and experiment batches
Meteor.startup(function () {

  // Incentive treatments
  TurkServer.ensureTreatmentExists({name: 'ind', incentive: 'ind'});
  TurkServer.ensureTreatmentExists({name: 'coll', incentive: 'coll'});
  TurkServer.ensureTreatmentExists({name: 'comp', incentive: 'comp'});

  // Communication treatment
  TurkServer.ensureTreatmentExists({name: 'delphi', delphi: true});

  // Set up recruiting batch
  TurkServer.ensureBatchExists({name: 'recruiting',
    active: true,
    allowReturns: true });

  const recBatch = TurkServer.Batch.getBatchByName('recruiting');
  recBatch.setAssigner(new TurkServer.Assigners.SimpleAssigner);

  Batches.update({name: 'recruiting'}, {$addToSet: {treatments: 'recruiting'}});

  // Set up main batch
  TurkServer.ensureBatchExists({name: 'main', active: true});

  const mainBatch = TurkServer.Batch.getBatchByName("main");
  const assigner = new TestingAssigner();
  mainBatch.setAssigner(assigner);

  // Set up testing method for starting new game
  Meteor.methods({
    testGame: function (n_pub, n_priv, incentive, delphi) {
      // These get grabbed during the initialize function below
      n_p = n_pub;
      n_v = n_priv;

      const treatments = [];
      treatments.push(incentive);
      if (delphi) treatments.push('delphi');

      assigner.newGame(treatments);
    }
  });

});

// Set up an experiment given the treatment
TurkServer.initialize(function() {
  const treatment = TurkServer.treatment();

  console.log(treatment);

  const incentive = treatment.incentive;
  const delphi = treatment.delphi || false;

  Meteor.call("newGame", n_p, n_v, incentive, delphi);
});
