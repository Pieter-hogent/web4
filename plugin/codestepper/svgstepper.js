var SvgStepper =
  window.SvgStepper ||
  (function() {
    // if I'd ever feel the need, these could become options somehow
    const highlightFirstAppearanceInCodeBlocks = true;

    let currentIndex = -1;
    let maxIndex = -1;

    let codeElements = new Set();
    let svgElements = new Set();

    let snap = null; // for now, only one active svg

    // top is readjusted (default Reveal handling of vertically centering falls short if
    // show/hide large portions of the slide)
    let previousTop = -1;
    let currentSection = undefined;

    function toArray(o) {
      return Array.prototype.slice.call(o);
    }

    class Range {
      // will parse a string of the form "1,2,3-7,9-12,14"
      // and return an object with a 'range' key with [1,2,3,4,5,6,7,9,10,11,12,14] as an array of integers
      // and a 'forever' key, either true or false, denoting if all indices greater than the last are included
      // (constructed by +, e.g. "1-4,5,8+")
      constructor(stringRange) {
        stringRange = stringRange.trim();
        this.range = [];
        // if the last char is a +, the range includes all indexes greater than the last one parsed
        this.forever = false;
        if (stringRange.slice(-1) === '+') {
          this.forever = true;
          stringRange = stringRange.slice(0, -1);
        }
        if (stringRange.length) {
          stringRange.split(',').forEach(el => {
            let dashRange = el.split('-');
            if (dashRange.length === 1) {
              this.range.push(parseInt(el));
            } else {
              let from = parseInt(dashRange[0]);
              let to = parseInt(dashRange[1]);
              if (to >= from) {
                for (let i = from; i <= to; ++i) {
                  this.range.push(i);
                }
              } else {
                console.error(`range a-b with a > b "${from}-${to}"`);
              }
            }
          });
        }
      }

      max() {
        if (this.range.length === 0) {
          return 0;
        }
        return Math.max(...this.range);
      }

      firstIndex() {
        if (this.range.length === 0) {
          return -1;
        }
        return this.range[0];
      }

      includes(index) {
        return (
          this.range.includes(index) || (this.forever && index > this.max())
        );
      }
    }

    // slides are centered vertically by once setting the 'top' style based
    // on the scrollHeight / contentHeight, because I dynamically hide/show
    // elements this scrollHeight changes, but the top is not reapplied,
    // so I look for it here and set it correctly
    function readjustTopOfCurrentSection() {
      while (currentSection && currentSection.tagName != 'SECTION') {
        if (currentSection.parentNode) {
          currentSection = currentSection.parentNode;
        } else {
          currentSection = undefined;
          break;
        }
      }
      const newTop =
        (Reveal.getConfig().height - currentSection.scrollHeight) / 2;
      // only set if more than 30px difference (this is enough to not readjust for
      // one extra line of text in explanation)
      if (
        previousTop < 0 ||
        newTop - previousTop > 30 ||
        previousTop - newTop > 30
      ) {
        currentSection.style.top = `${newTop}px`;
        previousTop = newTop;
      } else {
        // console.log(`prev ${previousTop}, new ${newTop}`);
      }
    }

    // class that handles codelines inside <code> tag, and the explanation underneath
    class CodeElement {
      // showRange and highlighRange are objects of the type
      // {
      //    range: [1,2,4,5,9,12],
      //    forever: true  // (meaning everything after 12 too)
      // }
      constructor(el, showRange, highlightRange = new Range('')) {
        this.htmlElement = el;
        this.showRange = showRange;
        this.highlightRange = highlightRange;

        // only do 'highlight first in green' inside code blocks (not text underneath)
        this.insideCodeTag = false;
        let pnode = el.parentNode;
        while (pnode && pnode.nodeName != 'HTML') {
          if (pnode.nodeName === 'CODE') {
            this.insideCodeTag = true;
            break;
          }
          pnode = pnode.parentNode;
        }
      }
      update(index) {
        if (this.showRange.max()) {
          if (this.showRange.includes(index)) {
            this.htmlElement.removeAttribute('hidden');
            // first time something is shown, it's highlighted in green (unless options say otherwhise)
            if (
              index != 1 && // don't do this when something is show from the start (so don't do it when slide appears)
              highlightFirstAppearanceInCodeBlocks &&
              !this.htmlElement.hasAttribute('no-highlight-first') &&
              this.insideCodeTag &&
              this.showRange.firstIndex() === index
            ) {
              this.htmlElement.classList.add('highlight-green');
            } else {
              this.htmlElement.classList.remove('highlight-green');
            }
          } else {
            this.htmlElement.setAttribute('hidden', true);
            this.htmlElement.classList.remove('highlight-green');
          }
        }
        if (this.highlightRange.includes(index)) {
          this.htmlElement.classList.add('highlight-red');
        } else {
          this.htmlElement.classList.remove('highlight-red');
        }
      }
    }

    class SvgElement {
      constructor(el, showRange, highlightRange, highlightColor) {
        this.svgElement = el;
        this.showRange = showRange;
        this.highlightRange = highlightRange;
        this.highlightColor = highlightColor;
      }
      update(index) {
        if (!this.showRange || this.showRange.includes(index)) {
          this.svgElement.animate({ opacity: 1.0 }, 250, mina.easeinout);

          if (this.highlightRange) {
            if (this.highlightRange.includes(index)) {
              this.svgElement.node.setAttribute('fill', this.highlightColor);
            } else {
              this.svgElement.node.removeAttribute('fill');
            }
          }
        } else {
          this.svgElement.animate({ opacity: 0.0 }, 0);
        }
      }
    }

    function showHighlightCurrentIndex() {
      if (currentIndex > maxIndex) {
        // at the end of our inner navigation, remove all keyboard overrides
        // (and hence, give control back to Reveal)
        Reveal.configure({
          keyboard: {},
          touches: {}
        });
        Reveal.navigateNext();
      } else if (currentIndex <= 0) {
        Reveal.configure({
          keyboard: {},
          touches: {}
        });
        Reveal.navigatePrev();
      } else {
        codeElements.forEach(el => el.update(currentIndex));
        svgElements.forEach(el => el.update(currentIndex));
        readjustTopOfCurrentSection();
      }
    }

    // these functions will be bound to all the keys
    // which are used to advance a slide (down, right, etc.)
    function innerNavigateNext() {
      currentIndex++;
      showHighlightCurrentIndex();
    }

    function innerNavigatePrevious() {
      currentIndex--;
      showHighlightCurrentIndex();
    }

    // constructs the lists and sets up inner navigation
    // when a fragment with the correct attribute is encountered
    Reveal.addEventListener('fragmentshown', function(event) {
      console.log(event);
      currentSection = event.fragment; // not correct, but using it the first time will adjust this
      let needsInnerNavigation = false;
      currentIndex = 1;
      maxIndex = -1;

      if (event.fragment.hasAttribute('svg-step')) {
        console.log('found svg-step');
        needsInnerNavigation = true;
        svgElements = new Set();
        maxIndex = 2; // set it to something > 1, will be overriden by either codestep, or the ASYNC loading of svg
        // (if there's nothing but a svg, we try to show index 1, while max is still -1 (loading is async),
        // and we move to the next slide)
        toArray(event.fragment.getElementsByTagName('svg'))
          .filter(el => el.classList.contains('svg-section'))
          .forEach(el => {
            if (false && snap) {
              console.error(
                `I can only cope with one svg element inside a svg-step div (for now)`
              );
            }
            snap = new Snap(`#${el.getAttribute('id')}`);

            // setTimeout(() => {
            Snap.load(`${el.getAttribute('snapfile')}`, data => {
              // the read file gets appended, so if we go back / fwd we would end up
              // with multiple svg's drawn on top of each other, so remove previous one (if any)
              if (snap.children()) {
                snap.children().forEach(x => {
                  x.remove();
                });
              }
              // console.log(data);
              let defs = data.select('defs');
              snap.append(defs);
              let g = data.select('#svgstep');
              if (!g) {
                console.error(
                  "Codestepper needs a 'g' canvas with the id svgstep"
                );
              }
              snap.append(g);
              // set viewBox to the same one it was in the file
              el.setAttribute('viewBox', snap.getBBox().vb);
              console.log(`viewBox set to ${snap.getBBox().vb}`);

              let x = g.selectAll("[id*='svgstep:']");

              // let x = g.selectAll('.svgstep');
              x.forEach(item => {
                let elId = item.attr('id');
                item.node.setAttribute('opacity', 0.0); // start hidden, or the screen 'flashes'
                let showStepRange = new Range('');
                if (elId.includes('svgstep:')) {
                  // console.log(elId.substring(9));
                  showStepRange = new Range(elId.substring(9));
                }

                svgElements.add(new SvgElement(item, showStepRange));
                maxIndex = Math.max(maxIndex, showStepRange.max());
              });

              let h = g.selectAll('.svghighlight');
              h.forEach(item => {
                let highlightRange = new Range('');
                if (item.node.hasAttribute('hstep')) {
                  highlightRange = new Range(item.node.getAttribute('hstep'));
                }
                let highlightColor = '#ff7e79'; // orange
                if (item.node.hasAttribute('hcolor')) {
                  let theColor = item.node.getAttribute('hcolor');
                  switch (theColor) {
                    case 'orange':
                      highlightColor = '#ff7e79';
                      break;
                    case 'green':
                      highlightColor = '#929000';
                      break;
                    case 'blue':
                      highlightColor = '#0096ff';
                      break;
                    case 'purple':
                      highlightColor = '#9437ff';
                      break;
                    default:
                      highlightColor = theColor;
                  }
                }
                svgElements.add(
                  new SvgElement(item, null, highlightRange, highlightColor)
                );
              });

              showHighlightCurrentIndex(); // loading is async, so make sure our svg is loaded according to current index
            });
            //}, 2000);
          });
      }

      if (event.fragment.hasAttribute('code-step')) {
        needsInnerNavigation = true;
        codeElements = new Set();

        // first adapt the 'samespot' childNodes, remove extra added newlines (it's inside a code block)
        // and add css to the inner span's
        toArray(event.fragment.getElementsByTagName('*')).forEach(el => {
          if (el.classList.contains('samespot')) {
            for (let i = 0; i < el.childNodes.length; ) {
              if (el.childNodes[i].nodeType == 3) {
                // TEXT
                // remove all the newlines that were used to add the different <span> childnodes
                // in a readable manner (the <pre><code> preserves them, leading to superfluous whitespace)
                el.removeChild(el.childNodes[i]);
              } else {
                if (
                  el.childNodes[i].nodeName === 'SPAN' ||
                  el.childNodes[i].nodeName === 'P'
                ) {
                  el.childNodes[i].classList.add('samespot-content');
                }
                ++i;
              }
            }
          }
        });
        // loop again over the children (above loop changed the DOM), now simply remember all the
        // show-steps, highlight-steps spans
        toArray(event.fragment.getElementsByTagName('*')).forEach(el => {
          let showStepRange = new Range('');
          if (el.hasAttribute('show-steps')) {
            showStepRange = new Range(el.getAttribute('show-steps'));
          }
          let highlightRange = new Range('');
          if (el.hasAttribute('highlight-steps')) {
            highlightRange = new Range(el.getAttribute('highlight-steps'));
          }
          if (showStepRange.max() || highlightRange.max()) {
            maxIndex = Math.max(
              showStepRange.max(),
              highlightRange.max(),
              maxIndex
            );
            codeElements.add(
              new CodeElement(el, showStepRange, highlightRange)
            );
          }
        });
      }

      if (needsInnerNavigation) {
        showHighlightCurrentIndex();

        // (ab)use the user defined keyboard shortcuts to 'swallow' ->, space etc.
        Reveal.configure({
          keyboard: {
            34: innerNavigateNext,
            78: innerNavigateNext,
            39: innerNavigateNext,
            76: innerNavigateNext,
            40: innerNavigateNext,
            80: innerNavigatePrevious,
            33: innerNavigatePrevious,
            72: innerNavigatePrevious,
            37: innerNavigatePrevious,
            38: innerNavigatePrevious
          },
          touches: {
            swipeLeft: innerNavigatePrevious,
            swipeRight: innerNavigateNext
          }
        });
      }
    });
  })();
