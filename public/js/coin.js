
function showNextFlip(index) {
  try{
    var result=document.getElementById("flip-" + index).innerText;

    var spin = (result === 'Head' ? 'animation1440':'animation1620');
    //console.log('spin = ', spin);
    
    //1000ms start to play sound
     setTimeout(function() {
       document.getElementById("link-coin-audio").play();
     },100);
     
    //100ms start to spin
    $('#coin').removeClass();
      setTimeout(function() {
        $('#coin').addClass(spin);
    }, 100);
    

    //3000ms start to show result
    setTimeout(function() {
      document.getElementById("flip-" + index).style.display = "inline-block";
    },3500);
    
    if(index === 9){
       document.getElementById("submit").className = "btn btn-info btn-lg active";
    }
   }catch(e){
     alert('Sorry: Your reach the 10 times flip limit.');
   }
  
}

// jQuery(document).ready(function($) {

//   var spinArray = ['animation900', 'animation1080', 'animation1260', 'animation1440', 'animation1620', 'animation1800', 'animation1980', 'animation2160'];

//   function getSpin() {
//     var spin = 'animation1440'; //spinArray[Math.floor(Math.random() * spinArray.length)]; HTHT get from BE.
//     return spin;
//   }
 
//  $('#flip').on('click', function() {
   
//     $('#coin').removeClass();

//     setTimeout(function() {
//       $('#coin').addClass(getSpin());
//     }, 100);

//   });

// });
