const CodeStepperPugin =
  window.CodeStepperPugin ||
  (function() {
    function toArray(o) {
      return Array.prototype.slice.call(o);
    }
    const animationTime = 350;
    const displayStyle = 'inline-block';
    // Show an element
    var show = function(elem) {
      console.log(`show`);
      console.log(elem);
      // Get the natural height of the element
      var getHeight = function() {
        elem.style.display = displayStyle; // Make it visible
        var height = elem.scrollHeight + 'px'; // Get it's height
        elem.style.display = ''; //  Hide it again
        console.log(`height ${height}`);
        return height;
      };

      var height = getHeight(); // Get the natural height
      // elem.classList.add('is-visible'); // Make the element visible
      console.log(`offsetheight ${elem.offsetHeight}`);
      elem.style.height = height; // Update the max-height
      elem.style.display = displayStyle;
      elem.style.opacity = 100;
      // Once the transition is complete, remove the inline max-height so the content can scale responsively
      // window.setTimeout(function() {
      //   console.log(`offset after time ${elem.offsetHeight}`);

      //   elem.style.height = '';
      // }, animationTime * 2);
    };

    // Hide an element
    var hide = function(elem) {
      // Give the element a height to change from
      elem.style.height = elem.scrollHeight + 'px';

      // Set the height back to 0
      window.setTimeout(function() {
        elem.style.height = '0';
      }, 1);

      // When the transition is complete, hide it
      window.setTimeout(function() {
        elem.style.display = '';
        // elem.classList.remove('is-visible');
      }, animationTime);
    };

    Reveal.addEventListener('slidechanged', function(event) {
      // event.previousSlide, event.currentSlide, event.indexh, event.indexv
      const previouslyShown = event.previousSlide.querySelectorAll(
        '.code-firstshown'
      );
      previouslyShown.forEach(hide);
      const firstShownDivs = event.currentSlide.querySelectorAll(
        '.code-firstshown'
      );
      firstShownDivs.forEach(show);
      // console.log(firstShownDivs);
      const firstHiddenDivs = event.currentSlide.querySelectorAll(
        '.code-firsthidden'
      );
      firstHiddenDivs.forEach(hide);
    });
  })();
