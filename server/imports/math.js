// Returns a random integer between min (included) and max (excluded)
// Using Math.round() will give you a non-uniform distribution!
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

// Draw a random probability from the not-quite-uniform prior:
// 0.01 through 0.99 inclusive
function drawProb() {
  return getRandomInt(1, 100) / 100.0;
}

export { getRandomInt, drawProb };
