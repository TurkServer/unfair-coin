Template.lobby.helpers({
  count: function() {
    return LobbyStatus.find().count();
  }
});
