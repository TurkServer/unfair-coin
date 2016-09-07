// Set up recruiting and experiment batches
Meteor.startup(function () {

  TurkServer.ensureTreatmentExists({name: 'ind'});
  TurkServer.ensureTreatmentExists({name: 'coll'});
  TurkServer.ensureTreatmentExists({name: 'comp'});

  TurkServer.ensureTreatmentExists({name: 'delphi'});

  TurkServer.ensureBatchExists({name: 'recruiting',
    active: true,
    allowReturns: true });

  TurkServer.ensureBatchExists({name: 'main', active: true});

  const recBatchId = Batches.findOne({name: 'recruiting'})._id;
  TurkServer.Batch.getBatch(recBatchId).setAssigner(
    new TurkServer.Assigners.SimpleAssigner);

  Batches.update({name: 'recruiting'}, {$addToSet: {treatments: 'recruiting'}});

});
