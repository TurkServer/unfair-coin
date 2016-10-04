// Contains information about the overall game
Games = new Mongo.Collection('games');
// Contains information for each player's actions
Guesses = new Mongo.Collection('guesses');

TurkServer.partitionCollection(Games);
TurkServer.partitionCollection(Guesses);
