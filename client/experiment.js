// https://forums.meteor.com/t/immutable-bindings-of-es6-modules/25118/5
// Otherwise d3.event is not usable.
const d3 = require('d3');

function delphiGame() {
  const game = Games.findOne();
  return game && game.delphi;
}
Template.registerHelper('delphiGame', delphiGame);

function gamePhase() {
  const game = Games.findOne({}, {field: {phase: 1}});
  return game && game.phase;
}

/**
 * Whether the current game is a delphi game and in the delphi phase.
 * @returns {boolean}
 */
function delphiPhase() {
  // Although we can compute this by looking at whether the game is delphi and some guesses are incomplete, it's easier to let the server handle it
  return gamePhase() === "delphi";
}
Template.registerHelper('delphiPhase', delphiPhase);

function finalPhase() {
  return gamePhase() === "final";
}
Template.registerHelper('finalPhase', finalPhase);

function completedPhase() {
  return gamePhase() === "completed";
}
Template.registerHelper('completedPhase', completedPhase);

function myGuess() {
  return Guesses.findOne({userId: Meteor.userId()});
}
Template.registerHelper('myGuess', myGuess);

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

const dispConf = {
  // SVG size
  width: 800,
  height: 160,
  // How wide the number line is, left to right
  left: -300,
  right: 300,
  lineY: 50, // vert pos of the number line
  nodeY: 150, // vert pos of text
};

Template.numberLine.onCreated(function() {
  // Set guess value to 50 unless there was a previous delphi round
  const existing = Guesses.findOne({userId: Meteor.userId()});
  const exField = this.data.existing;

  // Best to use integers for this RV to avoid FP math errors
  if ( existing && existing[exField] ) {
    this.guessValue = new ReactiveVar(Math.round(existing[exField] * 100));
  }
  else {
    // Start with no value, which doesn't show a button
    this.guessValue = new ReactiveVar();
  }
});

function guessSubmitted() {
  if( completedPhase() ) return true;
  const g = myGuess();
  return (delphiPhase() && g.delphi) || (finalPhase() && g.answer);
}

Template.numberLine.helpers({
  c: function(str) { return dispConf[str]; },
  middle: function() { return dispConf.width / 2; },
  guessSubmitted,
  guessValue: function() {
    return Template.instance().guessValue.get();
  }
});

function isMe(g) {
  return g.userId && g.userId === Meteor.userId();
}

const f0 = d3.format('.0f');
const f1 = d3.format('.1f');

// Draw number line for feedback using d3
Template.numberLine.onRendered(function() {
  const field = this.data && this.data.field;
  const guessValue = this.guessValue;
  
  // Config parameters
  const svg = d3.select(this.find('svg'));
  const height = this.$('svg').height();
  const width = this.$('svg').width();

  const x = d3.scaleLinear()
    .domain([0.01, 0.99]) // Don't allow guesses of 0 or 1
    .range([ dispConf.left, dispConf.right ])
    .clamp(true);

  const lineGroup = svg.select('.line-group');
  const nodeGroup = svg.select('.node-group');

  // Set up draggable handle for guessing phases
  if( field == null ) {
    // Position guess for delphi phase
    let existing;

    if ( (existing = guessValue.get()) != null ) {
      redraw( existing );
      // Don't set up dragging if this is just a reload
      if( guessSubmitted() ) return;
    }

    function onDrag() {
      const [loc, y] = d3.mouse(lineGroup.node());

      // Pass through clamped scale to get value
      const val = x.invert(loc);
      const rounded = Math.round(val * 100);

      guessValue.set(rounded);
      redraw(rounded);
    }

    function redraw(value) {
      svg.select("g.draggable").attr("transform", `translate(${x(value / 100)},0)`);
      svg.select("g.draggable text").text(value);
    }

    // Update value on any click or drag
    // Note: this has to be cancelled upon submit
    const drag = d3.drag()
      .on('start', onDrag) 
      .on('drag', onDrag);

    svg.call(drag);

    this.drag = drag;

    return;
  }

  /*
   * All following code only runs if field was specified: feedback mode
   */

  // Given a sorted array, push values away from the median, ensuring they
  // are at least min away from each other.
  // TODO: with even number of elements, push center away from each other.
  function spaceOut(arr, min) {
    const mid = Math.floor(arr.length / 2);

    for( let i = mid + 1; i < arr.length; i++ ) {
      const diff = arr[i] - arr[i-1];
      if( diff > min ) continue;
      for( let j = i; j < arr.length; j++ ) {
        arr[j] += (min - diff);
      }
    }

    for( let i = mid - 1; i >= 0; i-- ) {
      const diff = arr[i+1] - arr[i];
      if( diff > min ) continue;
      for( let j = i; j >= 0; j-- ) {
        arr[j] -= (min - diff);
      }
    }

    return arr;
  }

  // Draw guesses on number line, if a field was provided
  {
    // Grab guesses, sorting by field so arrows don't cross
    const gs = Guesses.find({}, {sort: {[field]: 1}}).fetch();

    // Ordinal point scale
    // https://github.com/d3/d3-scale/blob/master/README.md#scalePoint
    const ord = d3.scaleOrdinal()
      .domain( gs.map(g => g._id) )
      .range( spaceOut(gs.map(linPos), 37) );
    // Old way: space out evenly in some interval

    function linPos(g) { return g[field] && x(g[field]) }
    function ordPos(g) { return ord(g._id) }

    lineGroup.selectAll('.guess')
      .data(gs, g => g._id)
      .enter().append('circle')
      .attr('class', 'guess')
      .attr('cx', linPos)
      .attr('cy', 0)
      .attr('r', 8);

    // Draw text values
    nodeGroup.selectAll('rect')
      .data(gs, g => g._id)
      .enter().append('text')
      .attr('class', g => isMe(g) ? "me" : "")
      .attr('text-anchor', 'middle')
      .attr('font-size', 30)
      .attr('x', ordPos)
      .attr('y', 0)
      .text(g => g[field] && f0(g[field] * 100))

    // Draw arrows to number line values
    nodeGroup.selectAll('line')
      .data(gs, g => g._id)
      .enter().append('line')
      .attr('class', g => isMe(g) ? "me" : "")
      .attr('stroke', '#000')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrow)')
      .attr('x1', ordPos)
      .attr('y1', -25)
      .attr('x2', linPos)
      .attr('y2', 15 + dispConf.lineY - dispConf.nodeY)
  }

  const game = Games.findOne();

  // Draw mean value in collaborative treatment
  if ( CoinFlip.isCollInc() && completedPhase() ) {
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
      .text(f1(game.mean * 100))
  }

  if ( completedPhase() ) {
    // Draw actual value and text
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
      .text(f0(game.prob * 100));
  }

});

Template.numberLine.events({
  // TODO debounce this to avoid double events on server
  'click .confirm-guess': function(e, t) {
    e.preventDefault();
    const game = Games.findOne();
    const guess = t.guessValue.get() / 100;

    // Is this a Delphi round or the final round?
    if( gamePhase() === "delphi" ) {
      Meteor.call("updateDelphi", game._id, guess);
    }
    else {
      Meteor.call("updateAnswer", game._id, guess);
    }

    // Cancel drag updates
    t.drag.on("start", null).on("drag", null);
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

Template.gameResults.helpers({
  myAnswer: function() {
    const myGuess = Guesses.findOne({userId: Meteor.userId()});
    return myGuess && Math.round(myGuess.answer * 100);
  },
  myWinStatus: function() {
    const myGuess = Guesses.findOne({userId: Meteor.userId()});
    return myGuess && myGuess.payoff > 0;
  },
  myPayoff: function() {
    const myGuess = Guesses.findOne({userId: Meteor.userId()});
    return '$' + (myGuess && myGuess.payoff || 0.00).toFixed(2);
  },
  prob: function() {
    const g = Games.findOne();
    return g && Math.round(g.prob * 100);
  },
  avgGuess: function() {
    const g = Games.findOne();
    // It's OK to show a decimal here
    return g && f1(g.mean * 100);
  }
});
