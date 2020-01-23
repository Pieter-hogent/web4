// initialization for every slide deck
const thisScript = document.currentScript;
CodeStepper.initialize();
Reveal.initialize({
  backgroundTransition: 'slide',
  controls: false,
  slideNumber: true,
  width: '100%',
  height: '100%',
  math: {
    mathjax: 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.0/MathJax.js',
    config: 'TeX-AMS_HTML-full' // See http://docs.mathjax.org/en/latest/config-files.html
    // pass other options into `MathJax.Hub.Config()`
    // TeX: { Macros: macros }
  },

  dependencies: [
    {
      src: 'plugin/highlight/highlight.js',
      async: true,
      callback: function() {
        hljs.initHighlightingOnLoad();

        if (thisScript.getAttribute('data-start-at-last') === 'true') {
          Reveal.slide(Reveal.getTotalSlides());
        }
      }
    },
    { src: 'plugin/codestepper/svgstepper.js' },
    {
      src: 'plugin/hogent-style.js',
      callback: () => hogentStyle.initialize()
    },
    {
      src: 'plugin/chart.xkcd/chart.xkcd.js'
    },
    { src: 'plugin/math/math.js', async: true }
  ]
});
