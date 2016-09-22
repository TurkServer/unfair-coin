Scoring = class Scoring {
  // This is a standard QSR payoff between 0 and 1
  static qsrPayoff(p, q) {
    const diff = p - q;
    return 1.0 - diff * diff;
  }
  
  // Max of 1, goes down to 0 if more than 20 units away
  static linearPayoff(p, q) {
    const x = 1.0 - 5 * Math.abs(p - q); 
    return Math.max(x, 0) 
  }
};
