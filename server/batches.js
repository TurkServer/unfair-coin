import { Meteor } from 'meteor/meteor';
import { TestingAssigner } from '/server/imports/assigner.js';

// Set up recruiting and experiment batches
Meteor.startup(function () {

  // Incentive treatments
  TurkServer.ensureTreatmentExists({name: 'ind'});
  TurkServer.ensureTreatmentExists({name: 'coll'});
  TurkServer.ensureTreatmentExists({name: 'comp'});

  // Communication treatment
  TurkServer.ensureTreatmentExists({name: 'delphi'});

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
  mainBatch.setAssigner(new TestingAssigner);

});
