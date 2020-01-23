const ChartXkcd =
  window.ChartXkcd ||
  (function() {
    let allCharts = new Map();

    toArray = o => Array.prototype.slice.call(o);

    // we'll look at the display style of a <section> to determine if we have a real size or not
    getSectionParent = el => {
      if (!el) {
        console.error('No <section> found as parent');
        return undefined;
      }
      if (el.tagName === 'SECTION') {
        return el;
      }
      return getSectionParent(el.parentNode);
    };

    // different css classes for different chart types
    // (expand this as needed)
    chartClass = classList => {
      const chartClasses = {
        'line-chart': chartXkcd.Line,
        'xy-chart': chartXkcd.XY,
        'bar-chart': chartXkcd.Bar
      };
      for (const key in chartClasses) {
        if (classList.includes(key)) {
          return chartClasses[key];
        }
      }
      console.error('No suitable chart class defined');
    };

    // async read a file and create a chart with the data
    // (this could use -a lot- of error handling)
    parseJsonDataFile = svgEl => {
      if (allCharts.get(svgEl)) {
        return;
      }
      const jsonFile = svgEl.getAttribute('data-chart-json');
      const chartObject = chartClass(toArray(svgEl.classList));
      fetch(jsonFile).then(response =>
        response.json().then(jsonData => {
          const myChart = new chartObject(svgEl, {
            title: jsonData['title'],
            xLabel: jsonData['xLabel'],
            yLabel: jsonData['yLabel'],
            data: jsonData['data'],
            options: {
              xTickCount: 6,
              yTickCount: 3,
              legendPosition: chartXkcd.config.positionType.upLeft,
              ...jsonData['options']
            }
          });
          allCharts.set(svgEl, myChart);
        })
      );
    };

    createCharts = () => {
      const chartDiv = toArray(document.querySelectorAll('.xkcd-chart'));
      chartDiv.forEach(el => {
        // only calculate chart when we get our "display: block" applied
        // (otherwhise size is still zero)
        const sectionEl = getSectionParent(el);
        if (sectionEl && sectionEl.style['display'] === 'block') {
          toArray(el.childNodes)
            .filter(child => child.nodeName === 'svg')
            .filter(el => el.hasAttribute('data-chart-json'))
            .forEach(svg => parseJsonDataFile(svg));
        }
      });
    };

    Reveal.addEventListener('ready', createCharts);
    Reveal.addEventListener('slidechanged', createCharts);
  })();
