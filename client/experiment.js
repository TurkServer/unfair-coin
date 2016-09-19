import * as d3 from 'd3';

function delphiGame() {
  const game = Games.findOne();
  return game && game.delphi;
}

Template.registerHelper('delphiGame', delphiGame);

/**
 * Whether the current game is a delphi game and in the delphi phase.
 * if the game is delphi and some guesses are incomplete, then we are in
 * the delphi phase
 * @returns {boolean}
 */
function delphiPhase() {
  if ( !delphiGame() ) return false;
  const guesses = Guesses.find({delphi: {$exists: false}}).fetch();
  return guesses.length > 0;
}

Template.registerHelper('delphiPhase', delphiPhase);

Template.controller.helpers({
  iGuessedDelphi: function() {
    const g = Guesses.findOne({userId: Meteor.userId()});
    return g && g.delphi != null;
  },
  myDelphi: function() {
    const g = Guesses.findOne({userId: Meteor.userId()});
    return g && g.delphi;
  },
  iGuessed: function() {
    const g = Guesses.findOne({userId: Meteor.userId()});
    return g && g.answer != null;
  },
  myAnswer: function() {
    const g = Guesses.findOne({userId: Meteor.userId()});
    return g && (g.answer * 100).toFixed(0);
  }
});

// Scaling values calculated from SVG display
Template.delphiDisplay.helpers({
  x: function() {
    return this.delphi && mapX(this.delphi);
  },
  y: function(index) {
    return (index != null) && (index * 15 + 10);
  },
  displayValue: function() {
    return this.delphi && (this.delphi * 100);
  }
});

const dispConf = {
  // SVG size
  width: 800,
  height: 200,
  // How wide the number line is, left to right
  left: -300,
  right: 300,
  lineY: 50, // vert pos of the number line
  nodeY: 150, // vert pos of text
};

Template.resultDisplay.helpers({
  c: function(str) { return dispConf[str]; },
  middle: function() { return dispConf.width / 2; }
});

function isMe(g) {
  return g.userId && g.userId === Meteor.userId();
}

// Draw number line for feedback using d3
Template.resultDisplay.onRendered(function() {
  // Config parameters
  
  // Later, this can support delphi as well
  const field = "answer";
  
  const svg = d3.select(this.find('svg'));
  const height = this.$('svg').height();
  const width = this.$('svg').width();
  
  // Sort by field so arrows don't cross
  const gs = Guesses.find({}, {sort: {[field]: 1}}).fetch();
  
  const x = d3.scaleLinear()
    .domain([0, 1])
    .range([ dispConf.left, dispConf.right ]);
  
  // Ordinal point scale
  // https://github.com/d3/d3-scale/blob/master/README.md#scalePoint 
  const ord = d3.scalePoint()
    .domain(gs.map(g => g._id))
    .range([ dispConf.left/2, dispConf.right/2 ]);

  function linPos(g) { return g[field] && x(g[field]) }
  function ordPos(g) { return ord(g._id) }

  const lineGroup = svg.select('.line-group');

  // Draw guesses on number line
  lineGroup.selectAll('.value')
    .data(gs)
  .enter().append('circle')
    .attr('class', 'value')
    .attr('cx', linPos)
    .attr('cy', 0)
    .attr('r', 8);

  // TODO: draw mean value in collaborative treatment
  
  const nodeGroup = svg.select('.node-group');

  const f = d3.format('.0f');
  
  // Draw text values
  nodeGroup.selectAll('rect')
    .data(gs)
  .enter().append('text')
    .attr('class', g => isMe(g) ? "me" : "")
    .attr('text-anchor', 'middle')
    .attr('font-size', 30)
    .attr('x', ordPos)
    .attr('y', 0)
    .text(g => g[field] && f(g[field] * 100))

  // Draw arrows to number line values
  nodeGroup.selectAll('line')
    .data(gs)
  .enter().append('line')
    .attr('class', g => isMe(g) ? "me" : "")
    .attr('stroke', '#000')
    .attr('stroke-width', 2)
    .attr('marker-end', 'url(#arrow)')
    .attr('x1', ordPos)
    .attr('y1', -25)
    .attr('x2', linPos)
    .attr('y2', 15 + dispConf.lineY - dispConf.nodeY)
});

Template.guessForm.onCreated(function() {
  // Set guess value to 50 unless there was a previous delphi round
  const existing = Guesses.findOne({userId: Meteor.userId()});

  // Best to use integers for this RV to avoid FP math errors
  if ( existing && existing.delphi ) {
    this.guessValue = new ReactiveVar(existing.delphi * 100);
  }
  else {
    this.guessValue = new ReactiveVar(50);
  }
});

Template.guessForm.onRendered(function() {
  // Set initial value on render
  this.$("input[type=range]").val(this.guessValue.get());
});

Template.guessForm.helpers({
  guessValue: function() {
    return Template.instance().guessValue.get();
  }
});

Template.guessForm.events({
  'input input[type=range]': function(e, t){
    const sliderValue = e.currentTarget.value;
    t.guessValue.set(sliderValue);
  },
  'submit form.guess': function(e, t) {
    e.preventDefault();
    const game = Games.findOne();
    const existing = Guesses.findOne({ userId: Meteor.userId() });
    const guess = t.guessValue.get() / 100;

    // Is this a Delphi round or the final round?
    if( game.delphi && existing.delphi == null ) {
      Meteor.call("updateDelphi", game._id, guess);
    }
    else {
      Meteor.call("updateAnswer", game._id, guess);
    }
  }
});

Template.coinTable.helpers({
  // Hash this userId to one of three images
  imageHash: function() {
    return parseInt(this._id, 36) % 3 + 1;
  },
  numPrivate: function() {
    return this.privateData.length;
  },
  oppName: function() {
    const user = Meteor.users.findOne(this.userId);
    return user && user.username;
  },
  oppoGuessed: function() {
    const oppoGuess = Guesses.findOne({userId: this.userId});
    if ( delphiGame() ) {
      return oppoGuess && (oppoGuess.delphi != null);
    } else {
      return oppoGuess && (oppoGuess.answer != null);  
    }
    
  }
});

Template.userTable.helpers({
  myAnswer: function() {
    const myGuess = Guesses.findOne({userId: Meteor.userId()});
    return myGuess && (myGuess.answer * 100).toFixed(0);
  },
  myWinStatus: function() {
    const myGuess = Guesses.findOne({userId: Meteor.userId()});
    return myGuess.payoff > 0;
  },
  myPayoff: function() {
    const myGuess = Guesses.findOne({userId: Meteor.userId()});
    return (myGuess && myGuess.payoff || 0.00).toFixed(2);
  },
  prob: function() {
    const g = Games.findOne();
    return g && (g.prob * 100).toFixed(0); 
  },
  username: function() {
    const user = Meteor.users.findOne(this.userId);
    return user && user.username;
  },
  payoff: function() {
    return this.payoff && this.payoff.toFixed(2);
  },
  total: function() {
    const user = Meteor.users.findOne(this.userId);
    return (user && user.profit || 0.0).toFixed(2);
  }
});
