function showValue(newValue) {
  document.getElementById("range").innerHTML = newValue / 100;
}


jQuery(document).ready(function($) {

  var spinArray = ['animation900', 'animation1080', 'animation1260', 'animation1440', 'animation1620', 'animation1800', 'animation1980', 'animation2160'];

  function getSpin() {
    var spin = 'animation1980';//spinArray[Math.floor(Math.random() * spinArray.length)];
    return spin;
  }
 
 $('#flip').on('click', function() {
   
    $('#coin').removeClass();

    setTimeout(function() {
      $('#coin').addClass(getSpin());
    }, 100);

  });

});