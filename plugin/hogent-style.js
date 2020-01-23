var hogentStyle =
  window.hogentStyle ||
  (function() {
    const needWhiteTextClasses = ['title-slide', 'contents-slide'];
    toArray = o => Array.prototype.slice.call(o);

    adaptBodyClass = currentClassList => {
      const bodyElement = document.getElementsByTagName('body')[0];
      bodyElement.classList.toggle(
        'hogent-white-text',
        currentClassList.some(x => needWhiteTextClasses.indexOf(x) > -1)
      );
    };

    Reveal.addEventListener('slidechanged', function(event) {
      adaptBodyClass(toArray(event.currentSlide.classList));
    });
    return {
      initialize: function() {
        adaptBodyClass(['title-slide']);
      }
    };
  })();
