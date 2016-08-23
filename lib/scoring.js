Scoring = class Scoring {
  // This is a standard QSR payoff between 0 and 1
  static qsrPayoff(p, q) {
    const diff = p - q;
    return 1.0 - diff * diff;
  }
};
