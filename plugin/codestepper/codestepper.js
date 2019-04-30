const CodeStepper =
  window.CodeStepper ||
  (function() {
    function toArray(o) {
      return Array.prototype.slice.call(o);
    }

    class Range {
      // will parse a string of the form "1,2,3-7,9-12,14"
      // and create an object with a 'range' key with [1,2,3,4,5,6,7,9,10,11,12,14] as an array of integers
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
        if (this.range.length === 0) return 0;
        return Math.max(...this.range);
      }

      firstIndex() {
        if (this.range.length === 0) return -1;
        return this.range[0];
      }

      lastIndex() {
        if (this.forever || this.range.length === 0) return -1;
        return this.range[this.range.length - 1];
      }

      includes(index) {
        return (
          this.range.includes(index) || (this.forever && index > this.max())
        );
      }

      // returns true if the 'range' contains more than one number
      // (to clone less nodes if only used once)
      isUsedMoreThanOnce() {
        return this.range.length > 1;
      }
    }

    // if a <section> contains a <div> with the attribute 'codesteps'
    // expand the section in many sections, one for each step, with
    // appropriate span's to highlight / hide stuff in each step
    class CodeSection {
      constructor(sectionEl) {
        this.highlightFirstShown = true;
        this.codeExplanations = new Map(); // map key is a Range object, value the explanation itself
        this.maxIndex = 0;
        this.cssId = undefined; // remember id and add it to first slide when splitting
        [this.header, this.code, this.footer] = this.splitSection(sectionEl);
        this._convertedSections = null;
      }

      splitSection(sectionEl) {
        // there should be a 'codesteps' div here, that's the code part with explanations
        // everything before: header
        // everything after: footer
        let header = [];
        let code = null;
        let footer = [];
        sectionEl.childNodes.forEach(child => {
          if (child.nodeType === 1 && child.hasAttribute('codesteps')) {
            this.cssId = sectionEl['id'];
            if (child.hasAttribute('no-highlight-first')) {
              this.highlightFirstShown = false;
            }
            // we should have a <pre> part with the code, and a <div explanation> with all the explanations
            // (and nothing else)
            code = child.querySelector('pre');
            const explanationDiv = child.querySelector('div[explanation]');
            let explanationNodes = explanationDiv.querySelectorAll(
              'span[step]'
            );
            explanationNodes.forEach(explanationNode => {
              const explanationRange = new Range(
                explanationNode.getAttribute('step')
              );
              let explanation = document.createElement('div');
              explanation.classList.add('code-explanation');
              // copy style, so we can override default behaviour in our slides
              // (e.g. greater width or whatever)
              if (explanationNode.hasAttribute('style')) {
                explanation.setAttribute(
                  'style',
                  explanationNode.getAttribute('style')
                );
              }
              if (
                explanationNode.childNodes.length > 1 ||
                (explanationNode.childNodes[0] &&
                  explanationNode.childNodes[0].nodeType === 1)
              ) {
                // explanation = new DocumentFragment();
                explanationNode.childNodes.forEach(n =>
                  explanation.appendChild(n.cloneNode(true))
                );
              } else if (explanationNode.childNodes[0]) {
                explanation.appendChild(
                  explanationNode.childNodes[0].cloneNode(true)
                );
              }
              this.codeExplanations.set(explanationRange, explanation);
              this.maxIndex = Math.max(this.maxIndex, explanationRange.max());
            });
          } else {
            if (!code) {
              header.push(child);
            } else {
              footer.push(child);
            }
          }
        });
        if (this.maxIndex <= 0) {
          console.log(
            "ERROR in codestepper, maxIndex <= 0. Did you use span's with step='1' inside the <div explanation> ? (and not e.g. <p> or <div>)"
          );
        }
        return [header, code, footer];
      }

      processForIndex(node, idx) {
        // if (node.nodeType !== 1) {
        //   return node;
        // }
        // console.log(`process for index ${idx}`);
        let hstepDivs = node.querySelectorAll('span[hstep]');
        hstepDivs.forEach(hstepDiv => {
          const highlightRange = new Range(hstepDiv.getAttribute('hstep'));
          if (highlightRange.includes(idx)) {
            const clonedDiv = hstepDiv.cloneNode(true);
            clonedDiv.classList.add('code-highlight');
            hstepDiv.parentNode.replaceChild(clonedDiv, hstepDiv);
            // hstepDiv.classList.add("code-highlight");
          } else {
            hstepDiv.classList.remove('code-highlight');
          }
        });
        let sstepDivs = node.querySelectorAll('span[sstep]');
        sstepDivs.forEach(sstepDiv => {
          const showRange = new Range(sstepDiv.getAttribute('sstep'));
          if (showRange.firstIndex() == idx) {
            sstepDiv.removeAttribute('hidden');

            if (
              (idx != 1 && this.highlightFirstShown) ||
              sstepDiv.hasAttribute('hf')
            ) {
              sstepDiv.classList.add('code-firstshown');
            }
          } else if (showRange.includes(idx)) {
            sstepDiv.removeAttribute('hidden');
            if (
              (idx != 1 && this.highlightFirstShown) ||
              sstepDiv.hasAttribute('nhf')
            ) {
              sstepDiv.classList.remove('code-firstshown');
            }

            if (idx == showRange.lastIndex() && sstepDiv.hasAttribute('sl')) {
              sstepDiv.classList.add('code-strikethrough');
            } else {
              sstepDiv.classList.remove('code-strikethrough');
            }
          } else {
            sstepDiv.setAttribute('hidden', true);
          }
        });
        return node;
      }

      createExplanationDivForIndex(idx) {
        let gotExplanation = false;
        let explDiv = document.createElement('div');
        explDiv.classList.add('explanations');
        this.codeExplanations.forEach((explanations, range) => {
          if (range.includes(idx)) {
            if (range.isUsedMoreThanOnce()) {
              explDiv.appendChild(explanations.cloneNode(true));
            } else {
              explDiv.appendChild(explanations);
            }
            gotExplanation = true;
          }
        });
        return gotExplanation ? explDiv : null;
      }

      createSectionForIndex(idx) {
        let newSection = document.createElement('section');
        if (idx === 1 && this.cssId) {
          // add idd only to first slide
          newSection['id'] = this.cssId;
        }
        const transition =
          idx == 1 ? 'slide-in none' : idx == this.maxIndex ? 'none' : 'none'; // "none slide-out" for last slide flickers, something with revealjs...
        newSection.setAttribute('data-transition', transition);
        this.header.forEach(el => {
          newSection.appendChild(el.cloneNode(true));
        });

        const codeExplDiv = document.createElement('div');
        codeExplDiv.classList.add('code-with-explanation');
        let addCodeExplDiv = false;

        if (this.code) {
          const newNode = this.processForIndex(this.code, idx);
          codeExplDiv.appendChild(newNode.cloneNode(true));
          addCodeExplDiv = true;
        }
        this.footer.forEach(el => newSection.appendChild(el.cloneNode(true)));
        let explDiv = this.createExplanationDivForIndex(idx);
        if (explDiv) {
          codeExplDiv.appendChild(explDiv);
          addCodeExplDiv = true;
        }
        if (addCodeExplDiv) {
          newSection.appendChild(codeExplDiv);
        }
        return newSection;
      }

      get convertedSections() {
        if (!this._convertedSections) {
          this._convertedSections = new Array();
          for (let i = 1; i <= this.maxIndex; ++i) {
            this._convertedSections.push(this.createSectionForIndex(i));
          }
        }
        return this._convertedSections;
      }

      // put all converted sections into one big section
      // (using the vertical layout of revealjs)
      get verticalLayoutSection() {
        let [firstNewSection, ...otherNewSections] = this.convertedSections;
        if (otherNewSections.length === 0) {
          // if there's only one slide with explanation, don't add it as a 'vertical' section in section
          // (it will show as e.g. 8.1 in pagenumber, while there is no 8.2)
          return firstNewSection;
        } else {
          let newSection = document.createElement('section');
          newSection.appendChild(firstNewSection);
          let lastAdded = firstNewSection;
          otherNewSections.forEach(otherNew => {
            firstNewSection.parentNode.insertBefore(
              otherNew,
              lastAdded.nextSibling
            );
            lastAdded = otherNew;
          });
          return newSection;
        }
      }
    }

    function sectionMustExpand(section) {
      // check if we have a div with the 'codesteps' attribute
      return toArray(section.getElementsByTagName('div')).filter(el =>
        el.hasAttribute('codesteps')
      ).length;
    }

    return {
      initialize: function() {
        let sections = toArray(document.getElementsByTagName('section'));
        sections.forEach(sec => {
          if (sectionMustExpand(sec)) {
            let newSection = new CodeSection(sec);
            // sec.parentNode.replaceChild(newSection.verticalLayoutSection, sec);
            [
              firstNewSection,
              ...otherNewSections
            ] = newSection.convertedSections;

            sec.parentNode.replaceChild(firstNewSection, sec);
            let lastAdded = firstNewSection;
            otherNewSections.forEach(otherNew => {
              firstNewSection.parentNode.insertBefore(
                otherNew,
                lastAdded.nextSibling
              );
              lastAdded = otherNew;
            });
          }
        });
      }
    };
  })();
