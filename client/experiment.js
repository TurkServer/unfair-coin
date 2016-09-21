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

Template.experiment.helpers({
  allGuessed: function() {
    const gs = Guesses.find().map(g => g.answer);
    return gs.length > 0 && _.every(gs, (a) => a != null);
  }
});

Template.displayFlips.helpers({
  heads: function() {
    if (!Array.isArray(this)) return;
    return this.filter((h) => h).length;
  },
  total: function() {
    if (!Array.isArray(this)) return;
    return this.length;
  }
});

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
  // Field can be "delphi" to show delphi results
  const field = this.data || "answer";
  console.log(field);
  
  const svg = d3.select(this.find('svg'));
  const height = this.$('svg').height();
  const width = this.$('svg').width();
  
  // Sort by field so arrows don't cross
  const gs = Guesses.find({}, {sort: {[field]: 1}}).fetch();
  const game = Games.findOne();

  console.log(gs);

  const x = d3.scaleLinear()
    .domain([0, 1])
    .range([ dispConf.left, dispConf.right ]);
  
  // Ordinal point scale
  // https://github.com/d3/d3-scale/blob/master/README.md#scalePoint 
  const ord = d3.scalePoint()
    .domain(gs.map(g => g._id))
    .range([ dispConf.left/2, dispConf.right/2 ]);

  const f = d3.format('.0f');

  function linPos(g) { return g[field] && x(g[field]) }
  function ordPos(g) { return ord(g._id) }

  const lineGroup = svg.select('.line-group');
  const nodeGroup = svg.select('.node-group');

  // Draw guesses on number line
  lineGroup.selectAll('.guess')
    .data(gs)
  .enter().append('circle')
    .attr('class', 'guess')
    .attr('cx', linPos)
    .attr('cy', 0)
    .attr('r', 8);

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

  // Draw mean value in collaborative treatment
  if ( CoinFlip.isCollInc() ) {
    lineGroup.append('circle')
      .attr('class', 'mean')
      .attr('cx', x(game.mean))
      .attr('cy', 0)
      .attr('r', 8);

    lineGroup.append('text')
      .attr('class', 'mean')
      .attr('text-anchor', 'middle')
      .attr('font-size', 20)
      .attr('x', x(game.mean))
      .attr('y', -15)
      .text(f(game.mean * 100))
  }
  
  // Draw actual value and text
  if( field === "answer" ) {
    lineGroup.append('circle')
      .attr('class', 'actual')
      .attr('cx', x(game.prob))
      .attr('cy', 0)
      .attr('r', 8);

    lineGroup.append('text')
      .attr('class', 'actual')
      .attr('text-anchor', 'middle')
      .attr('font-size', 20)
      .attr('x', x(game.prob))
      .attr('y', -15)
      .text(f(game.prob * 100))
  }

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
    return '$' + (myGuess && myGuess.payoff || 0.00).toFixed(2);
  },
  prob: function() {
    const g = Games.findOne();
    return g && (g.prob * 100).toFixed(0); 
  },
  avgGuess: function() {
    const g = Games.findOne();
    return g && (g.mean * 100).toFixed(0);
  },
  // XXX currently unused functions
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
