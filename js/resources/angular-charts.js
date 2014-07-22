/**
* Main module
*/
angular.module('angularCharts', ['angularChartsTemplates']);
/**
* Main directive handling drawing of all charts
*/
angular.module('angularCharts').directive('acChart', [
  '$templateCache',
  '$compile',
  '$window',
  '$timeout',
  function ($templateCache, $compile, $window, $timeout) {
    /**
   * Initialize some constants
   * @type Array
   */
    var tooltip = [
        'display:none;',
        'position:absolute;',
        'border:1px solid #333;',
        'background-color:#161616;',
        'border-radius:5px;',
        'padding:5px;',
        'color:#fff;'
      ].join('');

    /**
    * 
    **/
    var color = d3.scale.category20();
    /**
   * Utility function to call when we run out of colors!
   * @return {[type]} [description]
   */
    function getRandomColor() {
      var letters = '0123456789ABCDEF'.split('');
      var color = '#';
      for (var i = 0; i < 6; i++) {
        color += letters[Math.round(Math.random() * 15)];
      }
      return color;
    }
    /**
   * Main link function
   * @param  {[type]} scope   [description]
   * @param  {[type]} element [description]
   * @param  {[type]} attrs   [description]
   * @return {[type]}         [description]
   */
    function link(scope, element, attrs) {
      var config = {
          title: '',
          tooltips: true,
          labels: false,
          mouseover: function () {
          },
          mouseout: function () {
          },
          click: function () {
          },
          legend: {
            display: true,
            position: 'left'
          },
          colors: [
            'steelBlue',
            'rgb(255,153,0)',
            'rgb(220,57,18)',
            'rgb(70,132,238)',
            'rgb(73,66,204)',
            'rgb(0,128,0)'
          ],
          innerRadius: 165,
          lineLegend: 'lineEnd'
        };
      var totalWidth = element.width(), totalHeight = element.height();
      var data, series, points, height, width, chartContainer, legendContainer, chartType, isAnimate = true, defaultColors = config.colors;
      if (totalHeight === 0 || totalWidth === 0) {
        throw new Error('Please set height and width for the chart element');
      }
      /**
     * All the magic happens here
     * handles extracting chart type
     * getting data
     * validating data
     * drawing the chart
     * @return {[type]} [description]
     */
      function init() {
        prepareData();
        setHeightWidth();
        setContainers();
        var chartFunc = getChartFunction(chartType);
        chartFunc();
        drawLegend();
      }
      /**
     * Sets height and width of chart area based on legend
     * used for setting radius, bar width of chart
     */
      function setHeightWidth() {
        if (!config.legend.display) {
          height = totalHeight;
          width = totalWidth;
          return;
        }
        switch (config.legend.position) {
        case 'top':
        case 'bottom':
          height = totalHeight * 0.75;
          width = totalWidth;
          break;
        case 'left':
        case 'right':
          height = totalHeight;
          width = totalWidth * 0.75;
          break;
        }
      }
      /**
     * Creates appropriate DOM structure for legend + chart
     */
      function setContainers() {
        var container = $templateCache.get(config.legend.position);
        element.html($compile(container)(scope));
        chartContainer = element.find('.ac-chart');
        legendContainer = element.find('.ac-legend');
        height -= element.find('.ac-title').height();
      }
      /**
     * Parses data from attributes 
     * @return {[type]} [description]
     */
      function prepareData() {
        data = scope.acData;
        chartType = scope.acChart;
        series = data ? data.series || [] : [];
        points = data ? data.data || [] : [];
        if (scope.acConfig) {
          angular.extend(config, scope.acConfig);

          // config.colors = config.colors.concat(defaultColors);
        }
      }
      /**
     * Returns appropriate chart function to call
     * @param  {[type]} type [description]
     * @return {[type]}      [description]
     */
      function getChartFunction(type) {
        var charts = {
            'pie': pieChart,
            'bar': barChart,
            'line': lineChart,
            'area': areaChart,
            'point': pointChart,
            'hBar': hBarChart,
            'sBar': sBarChart
          };
        return charts[type];
      }
      /**
     * Filters down the x axis labels if a limit is specified
     */
      function filterXAxis(xAxis, x) {
        var allTicks = x.domain();
        if (config.xAxisMaxTicks && allTicks.length > config.xAxisMaxTicks) {
          var mod = Math.ceil(allTicks.length / config.xAxisMaxTicks);
          xAxis.tickValues(allTicks.filter(function (e, i) {
            return i % mod == 0;
          }));
        }
      }
      /**
     * Draws a bar chart, grouped with negative value handling
     * @return {[type]} [description]
     */
      function barChart() {
        /**
       * Setup date attributes
       * @type {Object}
       */
        var margin = {
            top: 0,
            right: 20,
            bottom: 30,
            left: 40
          };
        width -= margin.left + margin.right;
        height -= margin.top + margin.bottom;
        var x = d3.scale.ordinal().rangeRoundBands([
            0,
            width
          ], 0.1);
        var y = d3.scale.linear().range([
            height,
            10
          ]);
        var x0 = d3.scale.ordinal().rangeRoundBands([
            0,
            width
          ], 0.1);
        var yData = [0];
        points.forEach(function (d) {
          d.nicedata = d.y.map(function (e, i) {
            yData.push(e);
            return {
              x: d.x,
              y: e,
              s: i,
              tooltip: angular.isArray(d.tooltip) ? d.tooltip[i] : d.tooltip
            };
          });
        });
        var yMaxPoints = d3.max(points.map(function (d) {
            return d.y.length;
          }));
        scope.yMaxData = yMaxPoints;
        x.domain(points.map(function (d) {
          return d.x;
        }));
        var padding = d3.max(yData) * 0.2;
        y.domain([
          d3.min(yData),
          d3.max(yData) + padding
        ]);
        x0.domain(d3.range(yMaxPoints)).rangeRoundBands([
          0,
          x.rangeBand()
        ]);
        /**
       * Create scales using d3
       * @type {[type]}
       */
        var xAxis = d3.svg.axis().scale(x).orient('bottom');
        filterXAxis(xAxis, x);
        var yAxis = d3.svg.axis().scale(y).orient('left').ticks(10).tickFormat(d3.format('s'));
        /**
       * Start drawing the chart!
       * @type {[type]}
       */
        var svg = d3.select(chartContainer[0]).append('svg').attr('width', width + margin.left + margin.right).attr('height', height + margin.top + margin.bottom).append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        svg.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + height + ')').call(xAxis);
        svg.append('g').attr('class', 'y axis').call(yAxis);
        /**
      * Add bars
      * @type {[type]}
      */
        var barGroups = svg.selectAll('.state').data(points).enter().append('g').attr('class', 'g').attr('transform', function (d) {
            return 'translate(' + x(d.x) + ',0)';
          });
        var bars = barGroups.selectAll('rect').data(function (d) {
            return d.nicedata;
          }).enter().append('rect');
        bars.attr('width', x0.rangeBand());
        bars.attr('x', function (d, i) {
          return x0(i);
        }).attr('y', height).style('fill', function (d) {
          return getColor(d.s);
        }).attr('height', 0).transition().ease('cubic-in-out').duration(1000).attr('y', function (d) {
          return y(Math.max(0, d.y));
        }).attr('height', function (d) {
          return Math.abs(y(d.y) - y(0));
        });
        /**
       * Add events for tooltip
       * @param  {[type]} d [description]
       * @return {[type]}   [description]
       */
        bars.on('mouseover', function (d) {
          makeToolTip({
            value: d.y,
            series: series[d.s],
            index: d.x
          }, d3.event);
          config.mouseover(d, d3.event);
          scope.$apply();
        }).on('mouseleave', function (d) {
          removeToolTip();
          config.mouseout(d, d3.event);
          scope.$apply();
        }).on('mousemove', function (d) {
          updateToolTip(d3.event);
        }).on('click', function (d) {
          config.click.call(d, d3.event);
          scope.$apply();
        });
        /**
       * Create labels
       */
        if (config.labels) {
          barGroups.selectAll('not-a-class').data(function (d) {
            return d.nicedata;
          }).enter().append('text').attr('x', function (d, i) {
            return x0(i);
          }).attr('y', function (d) {
            return height - Math.abs(y(d.y) - y(0));
          }).text(function (d) {
            return d.y;
          });
        }
        /**
       * Draw one zero line in case negative values exist
       */
        svg.append('line').attr('x1', width).attr('y1', y(0)).attr('y2', y(0)).style('stroke', 'silver');
      }
      /**
     * Draws a horizontal bar chart
     * @return {[type]} [description]
     */
      function hBarChart() {
        /**
       * Setup date attributes
       * @type {Object}
       */
        var margin = {
            top: 0,
            right: 20,
            bottom: 0,
            left: 40
          };
        width -= margin.left + margin.right;
        height -= margin.top + margin.bottom;
        var y = d3.scale.ordinal().rangeRoundBands([
            0,
            height
          ], 0.1);
        var x = d3.scale.linear().range([
            width,
            10
          ]);
        var y0 = d3.scale.ordinal().rangeRoundBands([
            0,
            height
          ], 0.1);
        var xData = [0];
        points.forEach(function (d) {
          d.nicedata = d.x.map(function (e, i) {
            xData.push(e);
            return {
              x: e,
              y: d.y,
              s: i
            };
          });
        });
        var xMaxPoints = d3.max(points.map(function (d) {
            return d.x.length;
          }));
        scope.xMaxData = xMaxPoints;
        y.domain(points.map(function (d) {
          return d.y;
        }));
        var padding = d3.max(xData) * 0.2;
        x.domain([
          d3.min(xData),
          d3.max(xData) + padding
        ]);
        y0.domain(d3.range(xMaxPoints)).rangeRoundBands([
          0,
          y.rangeBand()
        ]);
        /**
       * Create scales using d3
       * @type {[type]}
       */
        var yAxis = d3.svg.axis().scale(y).orient('left');
        /**
       * Start drawing the chart!
       * @type {[type]}
       */
        var svg = d3.select(chartContainer[0]).append('svg').attr('width', width + margin.left + margin.right).attr('height', height + margin.top + margin.bottom).append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        svg.append('g').attr('class', 'y axis').call(yAxis);
        /**
      * Add bars
      * @type {[type]}
      */
        var barGroups = svg.selectAll('.state').data(points).enter().append('g').attr('class', 'g').attr('transform', function (d) {
            return 'translate(0, ' + y(d.y) + ')';
          });
        var bars = barGroups.selectAll('rect').data(function (d) {
            return d.nicedata;
          }).enter().append('rect');
        bars.attr('height', y0.rangeBand());
        bars.attr('y', function (d, i) {
          return y0(i);
        }).attr('x', 0).style('fill', function (d) {
          return getColor(d.s);
        }).attr('width', 0).transition().ease('cubic-in-out').duration(1000).attr('width', function (d) {
          return Math.abs(x(d.x) - x(0));
        });
        var barsText = barGroups.selectAll('text').data(function (d) {
            return d.nicedata;
          }).enter().append('text');
        barsText.attr('y', function (d) {
          return y0.rangeBand() / 2;
        }).attr('dy', '.36em').attr('x', 0).transition().ease('cubic-in-out').duration(1000).attr('x', function (d) {
          return Math.abs(x(0) - x(d.x));
        }).attr('dx', function (d) {
          return '0.32em';
        }).text(function (d) {
          return d.x;
        });
        /**
       * Add events for tooltip
       * @param  {[type]} d [description]
       * @return {[type]}   [description]
       */
        bars.on('mouseover', function (d) {
          // makeToolTip({ value: d.y, series: series[d.s], index: d.x}, d3.event);
          config.mouseover(d, d3.event);
          scope.$apply();
        }).on('mouseleave', function (d) {
          // removeToolTip();
          config.mouseout(d, d3.event);
          scope.$apply();
        }).on('mousemove', function (d) {
          updateToolTip(d3.event);
        }).on('click', function (d) {
          config.click.call(d, d3.event);
          scope.$apply();
        });
      }
      /**
     * Draws a stacked bar chart
     * @return {[type]} [description]
     */
      function sBarChart() {
        /**
       * Setup date attributes
       * @type {Object}
       */
        var margin = {
            top: 0,
            right: 20,
            bottom: 30,
            left: 40
          };
        width -= margin.left + margin.right;
        height -= margin.top + margin.bottom;
        var x = d3.scale.ordinal().rangeRoundBands([
            0,
            width
          ], 0.1);
        var y = d3.scale.linear().range([
            height,
            10
          ]);
        var yData = [0];
        points.forEach(function (d) {
          var ySum = 0;
          d.nicedata = d.y.map(function (e, i) {
            var data = {
                x: d.x,
                y: e,
                y0: ySum,
                s: i,
                tooltip: angular.isArray(d.tooltip) ? d.tooltip[i] : d.tooltip
              };
            ySum += e;
            return data;
          });
          yData.push(ySum);
        });
        var yMaxPoints = d3.max(points.map(function (d) {
            return d.y.length;
          }));
        scope.yMaxData = yMaxPoints;
        x.domain(points.map(function (d) {
          return d.x;
        }));
        var padding = d3.max(yData) * 0.2;
        y.domain([
          d3.min(yData),
          d3.max(yData) + padding
        ]);
        /**
       * Create scales using d3
       * @type {[type]}
       */
        var xAxis = d3.svg.axis().scale(x).orient('bottom');
        filterXAxis(xAxis, x);
        var yAxis = d3.svg.axis().scale(y).orient('left').ticks(10).tickFormat(d3.format('s'));
        /**
       * Start drawing the chart!
       * @type {[type]}
       */
        var svg = d3.select(chartContainer[0]).append('svg').attr('width', width + margin.left + margin.right).attr('height', height + margin.top + margin.bottom).append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        svg.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + height + ')').call(xAxis);
        svg.append('g').attr('class', 'y axis').call(yAxis);
        /**
      * Add bars
      * @type {[type]}
      */
        var barGroups = svg.selectAll('.state').data(points).enter().append('g').attr('class', 'g').attr('transform', function (d) {
            return 'translate(' + x(d.x) + ',0)';
          });
        var bars = barGroups.selectAll('rect').data(function (d) {
            return d.nicedata;
          }).enter().append('rect');
        bars.attr('width', x.rangeBand());
        bars.attr('x', function (d, i) {
          return x(i);
        }).attr('y', height).style('fill', function (d) {
          return getColor(d.s);
        }).attr('height', 0).transition().ease('cubic-in-out').duration(1000).attr('y', function (d) {
          return y(Math.max(0, d.y + d.y0));
        }).attr('height', function (d) {
          return Math.abs(y(d.y) - y(0));
        });
        /**
       * Add events for tooltip
       * @param  {[type]} d [description]
       * @return {[type]}   [description]
       */
        bars.on('mouseover', function (d) {
          makeToolTip({
            value: d.y,
            series: series[d.s],
            index: d.x
          }, d3.event);
          config.mouseover(d, d3.event);
          scope.$apply();
        }).on('mouseleave', function (d) {
          removeToolTip();
          config.mouseout(d, d3.event);
          scope.$apply();
        }).on('mousemove', function (d) {
          updateToolTip(d3.event);
        }).on('click', function (d) {
          config.click.call(d, d3.event);
          scope.$apply();
        });
        /**
       * Create labels
       */
        if (config.labels) {
          barGroups.selectAll('not-a-class').data(function (d) {
            return d.nicedata;
          }).enter().append('text').attr('x', function (d, i) {
            return x(i);
          }).attr('y', function (d) {
            return height - Math.abs(y(d.y) - y(0));
          }).text(function (d) {
            return d.y;
          });
        }
        /**
       * Draw one zero line in case negative values exist
       */
        svg.append('line').attr('x1', width).attr('y1', y(0)).attr('y2', y(0)).style('stroke', 'silver');
      }
      /**
     * Draws a line chart
     * @return {[type]} [description]
     */
      function lineChart() {
        var margin = {
            top: 0,
            right: 40,
            bottom: 20,
            left: 40
          };
        width -= margin.left + margin.right;
        height -= margin.top + margin.bottom;
        var x = d3.scale.ordinal().domain(points.map(function (d) {
            return d.x;
          })).rangeRoundBands([
            0,
            width
          ]);
        var y = d3.scale.linear().range([
            height,
            10
          ]);
        var xAxis = d3.svg.axis().scale(x).orient('bottom');
        filterXAxis(xAxis, x);
        var yAxis = d3.svg.axis().scale(y).orient('left').ticks(5).tickFormat(d3.format('s'));
        var line = d3.svg.line().interpolate('cardinal').x(function (d) {
            return getX(d.x);
          }).y(function (d) {
            return y(d.y);
          });
        var yData = [0];
        var linedata = [];
        points.forEach(function (d) {
          d.y.map(function (e, i) {
            yData.push(e);
          });
        });
        var yMaxPoints = d3.max(points.map(function (d) {
            return d.y.length;
          }));
        scope.yMaxData = yMaxPoints;
        series.slice(0, yMaxPoints).forEach(function (value, index) {
          var d = {};
          d.series = value;
          d.values = points.map(function (point) {
            return point.y.map(function (e) {
              return {
                x: point.x,
                y: e
              };
            })[index] || {
              x: points[index].x,
              y: 0
            };
          });
          linedata.push(d);
        });
        var svg = d3.select(chartContainer[0]).append('svg').attr('width', width + margin.left + margin.right).attr('height', height + margin.top + margin.bottom).append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        var padding = d3.max(yData) * 0.2;
        y.domain([
          d3.min(yData),
          d3.max(yData) + padding
        ]);
        svg.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + height + ')').call(xAxis);
        svg.append('g').attr('class', 'y axis').call(yAxis);
        var point = svg.selectAll('.points').data(linedata).enter().append('g');
        path = point.attr('points', 'points').append('path').attr('class', 'ac-line').style('stroke', function (d, i) {
          return getColor(i);
        }).attr('d', function (d) {
          return line(d.values);
        }).attr('stroke-width', '2').attr('fill', 'none');
        /** Animation function
       * [last description]
       * @type {[type]}
       */
        var last = linedata[linedata.length - 1].values;
        var totalLength = path.node().getTotalLength() + getX(last[last.length - 1].x);
        path.attr('stroke-dasharray', totalLength + ' ' + totalLength).attr('stroke-dashoffset', totalLength).transition().duration(1500).ease('linear').attr('stroke-dashoffset', 0).attr('d', function (d) {
          return line(d.values);
        });
        /**
       * Add points
       * @param  {[type]} value [description]
       * @param  {[type]} key   [description]
       * @return {[type]}       [description]
       */
        angular.forEach(linedata, function (value, key) {
          var points = svg.selectAll('.circle').data(value.values).enter();
          points.append('circle').attr('cx', function (d) {
            return getX(d.x);
          }).attr('cy', function (d) {
            return y(d.y);
          }).attr('r', 3).style('fill', getColor(linedata.indexOf(value))).style('stroke', getColor(linedata.indexOf(value))).on('mouseover', function (series) {
            return function (d) {
              makeToolTip({
                index: d.x,
                value: d.y,
                series: series
              }, d3.event);
              config.mouseover(d, d3.event);
              scope.$apply();
            };
          }(value.series)).on('mouseleave', function (d) {
            removeToolTip();
            config.mouseout(d, d3.event);
            scope.$apply();
          }).on('mousemove', function (d) {
            updateToolTip(d3.event);
          }).on('click', function (d) {
            config.click(d, d3.event);
            scope.$apply();
          });
          if (config.labels) {
            points.append('text').attr('x', function (d) {
              return getX(d.x);
            }).attr('y', function (d) {
              return y(d.y);
            }).text(function (d) {
              return d.y;
            });
          }
        });
        /**
      * Labels at the end of line
      */
        if (config.lineLegend === 'lineEnd') {
          point.append('text').datum(function (d) {
            return {
              name: d.series,
              value: d.values[d.values.length - 1]
            };
          }).attr('transform', function (d) {
            return 'translate(' + getX(d.value.x) + ',' + y(d.value.y) + ')';
          }).attr('x', 3).text(function (d) {
            return d.name;
          });
        }
        /**
       * Returns x point of line point
       * @param  {[type]} d [description]
       * @return {[type]}   [description]
       */
        function getX(d) {
          return Math.round(x(d)) + x.rangeBand() / 2;
        }
        ;
        return linedata;
      }
      /**
     * Creates a nice area chart
     * @return {[type]} [description]
     */
      function areaChart() {
        var margin = {
            top: 0,
            right: 40,
            bottom: 20,
            left: 40
          };
        width -= margin.left + margin.right;
        height -= margin.top + margin.bottom;
        var x = d3.scale.ordinal().domain(points.map(function (d) {
            return d.x;
          })).rangeRoundBands([
            0,
            width
          ]);
        var y = d3.scale.linear().range([
            height,
            10
          ]);
        var xAxis = d3.svg.axis().scale(x).orient('bottom');
        filterXAxis(xAxis, x);
        var yAxis = d3.svg.axis().scale(y).orient('left').ticks(5).tickFormat(d3.format('s'));
        var line = d3.svg.line().interpolate('cardinal').x(function (d) {
            return getX(d.x);
          }).y(function (d) {
            return y(d.y);
          });
        var yData = [0];
        var linedata = [];
        points.forEach(function (d) {
          d.y.map(function (e, i) {
            yData.push(e);
          });
        });
        var yMaxPoints = d3.max(points.map(function (d) {
            return d.y.length;
          }));
        /**
       * Important to set for legend
       * @type {[type]}
       */
        scope.yMaxData = yMaxPoints;
        series.slice(0, yMaxPoints).forEach(function (value, index) {
          var d = {};
          d.series = value;
          d.values = points.map(function (point) {
            return point.y.map(function (e) {
              return {
                x: point.x,
                y: e
              };
            })[index] || {
              x: points[index].x,
              y: 0
            };
          });
          linedata.push(d);
        });
        var svg = d3.select(chartContainer[0]).append('svg').attr('width', width + margin.left + margin.right).attr('height', height + margin.top + margin.bottom).append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        var padding = d3.max(yData) * 0.2;
        y.domain([
          d3.min(yData),
          d3.max(yData) + padding
        ]);
        svg.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + height + ')').call(xAxis);
        svg.append('g').attr('class', 'y axis').call(yAxis);
        var point = svg.selectAll('.points').data(linedata).enter().append('g');
        var area = d3.svg.area().interpolate('basis').x(function (d) {
            return getX(d.x);
          }).y0(function (d) {
            return y(0);
          }).y1(function (d) {
            return y(0 + d.y);
          });
        point.append('path').attr('class', 'area').attr('d', function (d) {
          return area(d.values);
        }).style('fill', function (d, i) {
          return getColor(i);
        }).style('opacity', '0.7');
        function getX(d) {
          return Math.round(x(d)) + x.rangeBand() / 2;
        }
        ;
      }
      /**
     * Draws a beautiful pie chart
     * @return {[type]} [description]
     */
      function pieChart() {
        var radius = Math.min(width, height) / 2;
        var svg = d3.select(chartContainer[0]).append('svg').attr('width', width).attr('height', height).append('g').attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');
        var innerRadius = 0;
        if (config.innerRadius) {
          var configRadius = config.innerRadius;
          if (typeof configRadius === 'string' && configRadius.indexOf('%') > 0) {
            configRadius = radius * (1 - parseFloat(configRadius) * 0.01);
          }
          if (configRadius) {
            innerRadius = radius - Number(configRadius);
          }
        }
        scope.yMaxData = points.length;
        var arc = d3.svg.arc().outerRadius(radius - 10).innerRadius(innerRadius);
        var arcOver = d3.svg.arc().outerRadius(radius + 5).innerRadius(0);
        var pie = d3.layout.pie().sort(null).value(function (d) {
            return d.y[0];
          });
        var path = svg.selectAll('.arc').data(pie(points)).enter().append('g');
        var arcs = path.append('path').style('fill', function (d, i) {
            return getColor(i);
          }).transition().ease('linear').duration(500).attrTween('d', tweenPie).attr('class', 'arc');
        ///**********************
        path.on('mouseover', function (d) {
          makeToolTip({ 
            index: d.data.x,
            value: d.data.y[0]
           }, d3.event);
          d3.select(this).select('path').transition().duration(200).style('stroke', 'white').style('stroke-width', '2px');
          config.mouseover(d, d3.event);
          scope.$apply();
        }).on('mouseleave', function (d) {
          d3.select(this).select('path').transition().duration(200).style('stroke', '').style('stroke-width', '');
          removeToolTip();
          config.mouseout(d, d3.event);
          scope.$apply();
        }).on('mousemove', function (d) {
          updateToolTip(d3.event);
        }).on('click', function (d) {
          config.click(d, d3.event);
          scope.$apply();
        });
        if (!!config.labels) {
          path.append('text').attr('transform', function (d) {
            return 'translate(' + arc.centroid(d) + ')';
          }).attr('dy', '.35em').style('text-anchor', 'middle').text(function (d) {
            return d.data.y[0];
          });
        }
        function tweenPie(b) {
          b.innerRadius = 0;
          var i = d3.interpolate({
              startAngle: 0,
              endAngle: 0
            }, b);
          return function (t) {
            return arc(i(t));
          };
        }
      }
      function pointChart() {
        var margin = {
            top: 0,
            right: 40,
            bottom: 20,
            left: 40
          };
        width -= margin.left - margin.right;
        height -= margin.top - margin.bottom;
        var x = d3.scale.ordinal().domain(points.map(function (d) {
            return d.x;
          })).rangeRoundBands([
            0,
            width
          ]);
        var y = d3.scale.linear().range([
            height,
            10
          ]);
        var xAxis = d3.svg.axis().scale(x).orient('bottom');
        filterXAxis(xAxis, x);
        var yAxis = d3.svg.axis().scale(y).orient('left').ticks(5).tickFormat(d3.format('s'));
        var yData = [0];
        var linedata = [];
        points.forEach(function (d) {
          d.y.map(function (e, i) {
            yData.push(e);
          });
        });
        var yMaxPoints = d3.max(points.map(function (d) {
            return d.y.length;
          }));
        scope.yMaxPoints = yMaxPoints;
        series.slice(0, yMaxPoints).forEach(function (value, index) {
          var d = {};
          d.series = value;
          d.values = points.map(function (point) {
            return point.y.map(function (e) {
              return {
                x: point.x,
                y: e
              };
            })[index] || {
              x: points[index].x,
              y: 0
            };
          });
          linedata.push(d);
        });
        var svg = d3.select(chartContainer[0]).append('svg').attr('width', width + margin.left + margin.right).attr('height', height + margin.top + margin.bottom).append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        var padding = d3.max(yData) * 0.2;
        y.domain([
          d3.min(yData),
          d3.max(yData) + padding
        ]);
        svg.append('g').attr('class', 'x axis').attr('transform', 'translate(0,' + height + ')').call(xAxis);
        svg.append('g').attr('class', 'y axis').call(yAxis);
        var point = svg.selectAll('.points').data(linedata).enter().append('g');
        /**
       * Add points
       * @param  {[type]} value [description]
       * @param  {[type]} key   [description]
       * @return {[type]}       [description]
       */
        angular.forEach(linedata, function (value, key) {
          var points = svg.selectAll('.circle').data(value.values).enter();
          points.append('circle').attr('cx', function (d) {
            return getX(d.x);
          }).attr('cy', function (d) {
            return y(d.y);
          }).attr('r', 3).style('fill', getColor(linedata.indexOf(value))).style('stroke', getColor(linedata.indexOf(value))).on('mouseover', function (series) {
            return function (d) {
              makeToolTip({
                index: d.x,
                value: d.y,
                series: series
              }, d3.event);
              config.mouseover(d, d3.event);
              scope.$apply();
            };
          }(value.series)).on('mouseleave', function (d) {
            removeToolTip();
            config.mouseout(d, d3.event);
            scope.$apply();
          }).on('mousemove', function (d) {
            updateToolTip(d3.event);
          }).on('click', function (d) {
            config.click(d, d3.event);
            scope.$apply();
          });
          if (config.labels) {
            points.append('text').attr('x', function (d) {
              return getX(d.x);
            }).attr('y', function (d) {
              return y(d.y);
            }).text(function (d) {
              return d.y;
            });
          }
        });
        /**
       * Returns x point of line point
       * @param  {[type]} d [description]
       * @return {[type]}   [description]
       */
        function getX(d) {
          return Math.round(x(d)) + x.rangeBand() / 2;
        }
        ;
      }
      /**
     * Creates and displays tooltip
     * @return {[type]} [description]
     */
      function makeToolTip(data, event) {
        if (!config.tooltips) {
          return;
        }
        if (Object.prototype.toString.call(config.tooltips) == '[object Function]') {
          data = config.tooltips(data);
        } else {
          data = "Input: " + data.index + "<br> Weight: " + data.value;

        }
        angular.element('<p class="ac-tooltip" style="' + tooltip + '"></p>').html(data).appendTo('body').fadeIn('slow').css({
          left: event.pageX + 20,
          top: event.pageY - 30
        });
      }
      /**
     * Clears the tooltip from body
     * @return {[type]} [description]
     */
      function removeToolTip() {
        angular.element('.ac-tooltip').remove();
      }
      function updateToolTip(event) {
        angular.element('.ac-tooltip').css({
          left: event.pageX + 20,
          top: event.pageY - 30
        });
      }
      /**
     * Adds data to legend
     * @return {[type]} [description]
     */
      function drawLegend() {
        scope.legends = [];
        if (chartType == 'pie') {
          angular.forEach(points, function (value, key) {
            scope.legends.push({
              color: color(key),
              title: value.x
            });
          });
        }
        if(chartType== 'sBar'){
          angular.forEach(series, function (value, key) {
            scope.legends.push({
              // color: config.colors[key],
              // title: value
            });
          });
        }
        if (chartType == 'bar' || chartType == 'area' || chartType == 'point' || chartType == 'hBar' || chartType == 'line' && config.lineLegend === 'traditional') {
          angular.forEach(series, function (value, key) {
            scope.legends.push({
              color: config.colors[key],
              title: value
            });
          });
        }
      }
      /**
     * Checks if index is available in color 
     * else returns a random color
     * @param  {[type]} i [description]
     * @return {[type]}   [description]
     */
      function getColor(i) {
        return color(i);
        // if (i < config.colors.length) {
        //   console.log(config.colors.length);
        //   console.log("This is the color: ", config.colors[i])
        //   return config.colors[i];
        // } else {
        //   var color = getRandomColor();
        //   config.colors.push(color);
        //   console.log("Adding this color: ", color);
        //   return color;
        // }
      }
      var w = angular.element($window);
      var resizePromise = null;
      w.bind('resize', function (ev) {
        resizePromise && $timeout.cancel(resizePromise);
        resizePromise = $timeout(function () {
          totalWidth = element.width();
          totalHeight = element.height();
          init();
        }, 100);
      });
      scope.getWindowDimensions = function () {
        return {
          'h': w.height(),
          'w': w.width()
        };
      };
      //let the party begin!
      //add some watchers
      scope.$watch('acChart', function () {
        init();
      }, true);
      scope.$watch('acData', function () {
        init();
      }, true);
      scope.$watch('acConfig', function () {
        init();
      }, true);
    }
    return {
      restrict: 'EA',
      link: link,
      transclude: 'true',
      scope: {
        acChart: '=',
        acData: '=',
        acConfig: '='
      }
    };
  }
]);
angular.module('angularChartsTemplates', ['left', 'right']);

angular.module("left", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("left",
    "\n" +
    "<style>\n" +
    "	.axis path,\n" +
    "	.axis line {\n" +
    "	  fill: none;\n" +
    "	  stroke: #333;\n" +
    "	}\n" +
    "	.ac-line {\n" +
    "		fill:none;\n" +
    "		stroke-width:2px;\n" +
    "	}\n" +
    "</style>\n" +
    "\n" +
    "<div class='ac-title' style='font-weight: bold;font-size: 1.2em;'>{{acConfig.title}}</div>\n" +
    "<div class='ac-legend' style='float:left; max-width:25%;'>\n" +
    "	<table style='list-style:none;margin:0px;padding:0px;'>\n" +
    "	<tr ng-repeat=\"l in legends\">\n" +
    "		<td><div ng-attr-style='background:{{l.color}}; height:15px;width:15px;'></div></td>\n" +
    "		<td style=' display: inline-block;' ng-bind='l.title'></td>\n" +
    "	</tr>\n" +
    "	</table>\n" +
    "</div>\n" +
    "<div class='ac-chart' style='float:left; width:75%;'>\n" +
    "</div>");
}]);

angular.module("right", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("right",
    "<style>\n" +
    "	.axis path,\n" +
    "	.axis line {\n" +
    "	  fill: none;\n" +
    "	  stroke: #333;\n" +
    "	}\n" +
    "	.ac-line {\n" +
    "		fill:none;\n" +
    "		stroke-width:2px;\n" +
    "	}\n" +
    "</style>\n" +
    "\n" +
    "<div class='ac-title' style='font-weight: bold;font-size: 1.2em;'>{{acConfig.title}}</div>\n" +
    "<div class='ac-chart' style='float:left;width:75%;'>\n" +
    "</div>\n" +
    "<div class='ac-legend' style='float:left; max-width:25%;' ng-show='{{acConfig.legend.display}}'>\n" +
    "	<table style='list-style:none;margin:0px;padding:0px;'>\n" +
    "	<tr ng-repeat=\"l in legends | limitTo:yMaxData\">\n" +
    "		<td><div ng-attr-style='background:{{l.color}}; height:15px;width:15px;'></div></td>\n" +
    "		<td style=' display: inline-block;' ng-bind='l.title'></td>\n" +
    "	</tr>\n" +
    "	</table>\n" +
    "</div>");
}]);