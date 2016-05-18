import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {
  // code to run on server at startup
  Games = new Mongo.Collection('games');
  
  //Generate data from server side.
  // n game with x random coins flip in public ,  y random coins flip in private with z (Hits) users.
  // TODO: Add x, y, z into setting.json 
  let x = 10;
  let y = 10;
  let p = 0.50; //fair
  
  var userList = Meteor.users.find().fetch();
  var gid = Meteor.call('makeid');

  Meteor.call('Generator', gid, x, y, p, userList);

  Meteor.publish("Games", function() {
    return Games.find({ gid: gid });
  });

  Meteor.publish("Users", function() {
    return Meteor.users.find();
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
        Meteor.users.update({'_id':item._id}, 
        {$set: { 
          game:{
            gid: gid,
            privateData: privateDataList[index],
            answer: null
          }           
        }}, {multi: true});
      });  
    },
    UpdateAnswer: function (gid, uid, guess) {
      Players.update({'_id': uid, 'game.gid': gid},
      {
        $set: { game:{
          answer: guess
        }
      }
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
