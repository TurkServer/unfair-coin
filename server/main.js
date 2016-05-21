import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {
  // code to run on server at startup
  Games = new Mongo.Collection('games');
  Players = new Mongo.Collection('players');
  
  //Generate data from server side.
  // n game with x random coins flip in public ,  y random coins flip in private with z (Hits) users.
  // TODO: Add x, y, z into setting.json 
  let x = 10;
  let y = 10;
  let p = 0.50; //fair
  
  var userList = Meteor.users.find().fetch();
  var gid =  Random.id(); // Meteor way, or custom: Meteor.call('makeid');

  Meteor.call('Generator', gid, x, y, p, userList);

  Meteor.publish("Games", function() {
    return Games.find({ gid: gid });
  });

  Meteor.publish("Users", function() {
    return Meteor.users.find();
  });
  
  Meteor.publish("Players", function() {
    return Players.find({ gid: gid });
  });
  
});


Meteor.methods({
     Generator: function (gid, x, y, p, userList) {
      var publicData = Meteor.call('random', x, p);
      var privateDataList = [];
      for(var i=0;i<userList.length;i++){
        let privateData = Meteor.call('random', y,p);
        privateDataList.push(privateData);
      }
      Games.insert({
          gid: gid,
          createdAt: new Date(),
          publicData: publicData,
          privateDataList: privateDataList,
          answer: p
      });
     
     Meteor.call('AssignUsers', gid, userList, privateDataList);
    },
    AssignUsers: function (gid, userList, privateDataList) {
      userList.forEach(function(item, index){
        Players.upsert(
        {'uid': item._id, 'gid':gid},
        {
          $set: {
            createdAt: new Date(),     
            gid:gid,
            order:index,
            privateData: privateDataList[index], //de-normalized
            answer: null
        }
        });
      });  
    },
    UpdateAnswer: function (uid, gid, guess) {
      Players.update(
        {'uid': uid, 'gid':gid},
        {
          $set: {
            createdAt: new Date(),     
            answer: guess}
        });
    },
    random: function (number, p) {
        var result = [];
        for(var i=0;i<number;i++){
            var x = (Math.floor(Math.random() * 2) == 0); //fair   //TODO: unfair by p affect
            if(x){
              result.push("Head");
            }else{
              result.push("Tail");
            }
        }
        return result;
    },
    makeid: function(){
          var text = "flip_a_coin_game_id_";
          var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

          for( var i=0; i < 5; i++ )
              text += possible.charAt(Math.floor(Math.random() * possible.length));
          return text;
   }
});
