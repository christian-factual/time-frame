angular.module('directives', [])
	.directive('timelineD3', [
		'$window',
		function ($window) {
			return {
				restrict: 'E', 
				link: function(scope, element, attrs){
					(function () {
					var orient = "bottom",
				        width = null,
				        height = null,
				        tickFormat = { format: d3.time.format("%m/%y"), //%m/%d/%y %H:%M
				          tickTime: d3.time.month,
				          tickInterval: 3,
				          tickSize: 6 },
				        colorCycle = d3.scale.category20(),
				        beginning = 0,
				        ending = 0,
				        margin = {top: 20, right: 40, bottom: 30, left: 50},
						_tickHeights = {},
						scaleFactor = 1,
						largest = 1,
						viewingGroup = false;
					
					var svg = d3.select('timeline-d3')
		        			.append("svg");

					/**
					* Assign the heights for each input in the data series.
					* Value assigns the _tickheights var for use in getYPos.
					* @return none
					*/
					var assignHeights = function(data){
						var temp = {};
						var totalTicks = data.series.length;
						var totalHeight = height - 50 - margin.bottom; //25 buffer from top & bottom
						var spacing = totalHeight/(totalTicks-1); 

						if(totalTicks==1){
							//case that there is only one tick to append.
							temp[data.series[0]] = totalHeight/2 + margin.bottom;

						}
						else{
							for(var i=0; i<totalTicks; i+=1){
								temp[data.series[i]] = (spacing * i)+(25+margin.top);
							}
						}
						
						//assign
						return temp;
					}	     	

		        	var initVars = function(data){
		        		//have this done in the data generator method
						data.values = _.sortBy(data.values, function(entry){return Math.min(entry.time)});
						largest = _.max(data.values, function(entry){return entry.weight}).weight;

						var bufferTime = (_.last(data.values).time - _.first(data.values).time)/8;

					    beginning = _.first(data.values).time -bufferTime; //get the beginning time
					    ending = _.last(data.values).time + bufferTime;

					    var w = angular.element($window);
					    // w.bind('resize', function (ev) {
					    // 		totalWidth = w.width();
					    // 		console.log("Total Width: ", totalWidth);
					    // 		totalHeight = element.height();
					    // });

						//Set margins, width, and height
						width = angular.element($window).width() - 28 - margin.left - margin.right,
						height = 400 - margin.top - margin.bottom;
						scaleFactor= (1/(ending - beginning)) * (width - margin.left - margin.right);
						//initialize the item heights
						_tickHeights = assignHeights(data);
		        	}

					/**
					* Method for creating the cluster groups from the input data.
					* Returns: array of 'group' objects
					**/   
		        	var formGroups = function(data){
		        		inputGroups = {};
		        		//initialize with the key: inputs && value: empty array
		        		for(var index in data.series){
		        			inputGroups[data.series[index]] = []
		        		}

		        		//iterate through the values & group
		        		for(var index in data.values){
		        			var value = data.values[index];
		        			var workingSeries = inputGroups[value.input];
		        			var group = {};
		        			
		        			//check if this is first value in the first group of the series
		        			if(_.size(workingSeries) == 0){ //no group has been made yet
		        				group = {
		        					input: value.input,
		        					time: value.time,
		        					count: 1,
		        					values: [value]
		        				}
		        				workingSeries.push(group);
		        				//added group && now done w/ this iteration
		        				continue;
		        			}
		        			//there is already a group made
		        			group = _.last(workingSeries);
		        			var prevVal = _.last(group.values);
		        			//check if the value belongs in the group before it
		        			var firstR = getXPos(prevVal) + getRadius(prevVal);
		        			var secondR = getXPos(value) - getRadius(value);

		        			if(_.size(group.values)>10){//if the group is getting large
		        				var times = _.map(group.values, function(val){return val.time;});
		        				times.push(value.time); //add the new value
		        				var dev = calculateStdDev( times ); //calculate the std dev
		        				var avg = _.reduce(times, function(memo, num){return num+memo;}, 0)/_.size(times);
		        				if(value.time - avg > dev ){//make a new group
		        					group = {
			        					input: value.input,
			        					time: value.time,
			        					count: 1,
			        					values: [value]
			        				}
			        				workingSeries.push(group);
		        				}
			        			continue;
			        		}
		        			if( firstR > secondR+25 ){//case that they should be grouped
		        				group.values.push(value);
	        					group.count = group.values.length;
		        			}
		        			else{//case they the new value doesnt fall in the group
		        				group = {
		        					input: value.input,
		        					time: value.time,
		        					count: 1,
		        					values: [value]
		        				}
		        				workingSeries.push(group);
		        			}
		        		}
		        		//collapse all the groups into one.
		        		var collapse = _.flatten(_.values(inputGroups));
		        		collapse = _.sortBy(collapse, function(group){return group.time});
		        		return collapse;
		        	}

		        	/*
		        	*/
		        	var render = function(data){

						if(_.isUndefined(data)){//check and make sure we have some data
							return;
						}

						initVars(data);
						var groupData = formGroups(data);

						svg.selectAll("*").remove();//empty previous SVG

		        		//Create the d3 element and position it based on margins
		       			d3.select('svg')
		        			.attr('width', width + margin.left + margin.right)
		        			.attr('height', height + margin.top + margin.bottom)
		        			.append("g")
		        				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		        		//Need scales for the input
		        		var xScale = d3.time.scale()
								       .domain([beginning, ending])
								       .range([margin.left, width - margin.right]);

						var xAxis = d3.svg.axis()
							       	  .scale(xScale)
							          .orient(orient)
							          .tickFormat(tickFormat.format)
							          .ticks(tickFormat.tickTime, tickFormat.tickInterval)
							          .tickSize(tickFormat.tickSize);
				        
				        var ticks = svg.selectAll("tick")
				        			   .data(data.series)
				        			   .enter()
				        			   .append("line")
				                       .attr("x1", margin.left)
				                       .attr("y1", function(d){
				                       		return getYPos(d);
				                       })
				                       .attr("x2", width - margin.right)
				                       .attr("y2", function(d){
				                       		return getYPos(d);
				                       })	
				                       .attr("stroke-width", "2px")
				                       .attr("stroke", "grey")
				                       .on('mouseover', function (d) {
											d3.select(this)
												.transition()
													.duration(200)
													.style('stroke', colorCycle(_.indexOf(data.series, d)))
													.style('stroke-width', '4px');
											scope.$apply();
										})
				                       .on('mouseleave', function (d) {
				                       	d3.select(this)
				                       		.transition()
				                       			.duration(200)
				                       			.style('stroke', '')
				                       			.style('stroke-width', '2px');
										scope.$apply();
									});	   

				        //Add the SVG Text Element to the svgContainer
						var text = svg.selectAll("label")
				                        .data(data.series)
				                        .enter()
				                        .append("text")
						                .attr("x", function(d) { 
						                 	return 0;
						             	})
						                .attr("y", function(d) { 
						                 	return getYPos(d); 
						                 })
						                .text( function (d) { 
						                	return d; 
						                })
						                .attr("font-family", "sans-serif")
						                .attr("font-size", "11px")
			         				    .attr("fill", "black");     			   

			         	for(var index=0; index<groupData.length; index=index+1){
			         		var entry = groupData[index];
			         		
			         		if(entry.count > 1){//case that it is a group
			         			// svg.append("path")
			         			// 	.datum(entry)
			         			// 	.attr("transform", function(d){
			         					
			         			// 		var trans = "translate(" + Math.round(xScale(d.time)) + "," + getYPos(d.input) + ")";
			         			// 		console.log(trans);
			         			// 		return trans;
			         			// 	})
			         			// 	.attr("d", d3.svg.symbol().type("triangle-up"))
			         			// 	;

			         			svg.append("rect")
			         				.datum(entry)
			         				.attr("x", function(d) {

										return xScale(d.time);
									})
									.attr("y", function(d){
										return getYPos(d.input)-5;
									})
									.attr("width", 10)
									.attr("height", 10)
									.style("fill", function(d, i){
										return colorCycle(index);
									})
									.on('mouseover', function (d) {
										d3.select(this).attr("cursor", "pointer");
										scope.$apply();
									})
									.on('mouseleave', function (d) {
										scope.$apply();
									}).on('mousemove', function (d) {
									}).on('click', function (d) {
										// this will cause the expand and animation
										collapseAll(d);
									})
									.transition()
										.duration(function(d,i){
											return 750 + (index*20);
										})
										.ease('linear')
										.attr("width", function(d) {
											return 20;
										})
										.attr("height", function(d){
											return 20;
										});
							
			         		}
			         		else{
			         			svg.append("circle")
			         				.datum(entry.values[0])
									.attr("cx", function(d) {
										return xScale(d.time);
									})
									.attr("cy", function(d){
										return getYPos(d.input);
									}) //this will change when the different axes are needed.
									.style("fill", function(d){
										return getColor(d);
									})
									.attr("r", 0)
									.on('mouseover', function (d) {
										makeToolTip(d, d3.event);
										d3.select(this).transition().duration(200).style('stroke', 'red').style('stroke-width', '2px');
										scope.$apply();
									})
									.on('mouseleave', function (d) {
										removeToolTip();
										d3.select(this).transition().duration(200).style('stroke', '').style('stroke-width', '');
										scope.$apply();
									}).on('mousemove', function (d) {
										updateToolTip(d3.event);
									}).on('click', function (d) {
										scope.$apply();
									})
									.transition()
										.duration(function(d,i){
											return 750 + (index*20);
										})
										.ease('linear')
										.attr("r", function(d) {
											return getRadius(d);
										});
			         		}
			         	}
			         	var circles = svg.selectAll("circle");
			         	var groups = svg.selectAll("rect");
			         	var newCircles = NaN;

						//Render X axis
						svg.append("g")
						   .attr("class", "x axis")
						   .attr("transform", "translate(0," + height + ")") //controls the height of the timeline
						   .call(xAxis);

						//******Helper functions
							/*
							* Will collapse alls the lines, ticks & other content.
							* Takes the object that was clicked
							*/
							function collapseAll(d){
								if(!viewingGroup){//not viewing yet
									svg.selectAll("rect")
										.filter(function(datum){
											return datum != d;
										}).transition()
									.duration(750)
									.style("opacity", 0)
									.attr("y", height);
									//remove extra ticks and texts
									ticks.filter(function(datum){
											return datum != d.input;
										}).transition()
										.duration(750)
										.style("opacity", 0)
										.attr("y1", height)
										.attr("y2", height);
									//remove extra text labels
									text.filter(function(datum){
										return datum != d.input;
									}).transition()
									.duration(750)
									.attr("y", height)
									.style("opacity", 0);

									circles.transition()
										.duration(750)
										.attr("cy", height)
										.style("opacity", 0);

									//center other parts 
									svg.selectAll("rect")
										.filter(function(datum){
											return datum == d;
										}).transition()
										.duration(750)	
										.attr("y", height-30);
									//remove extra ticks and texts
									ticks.filter(function(datum){
											return datum == d.input;
										}).transition()
										.duration(750)
										.attr("y1", height)
										.attr("y2", height);
									//remove extra text labels
									text.filter(function(datum){
										return datum == d.input;
									}).transition()
									.duration(750)
									.attr("y", (margin.top));
									//append other values
									makeSubtimeline(d);
									viewingGroup = true;
								}
								else{
									// restore

								ticks.transition()
									.duration(750)
									.attr("y1", function(d){
										return getYPos(d);	
									})
									.attr("y2", function(d){
										return getYPos(d);
									})
									.style("opacity", 1);
								text.transition()
									.duration(750)
									.attr("y", function(d){
										return getYPos(d)-5;
									})
									.style("opacity", 1);
								circles.transition()
									.duration(750)
									.attr("cy", function(d){
										return getYPos(d.input);
									})
									.style("opacity", 1);
								groups.transition()
									.duration(750)
									.attr("y", function(d){
										return getYPos(d.input)-5;
									})
									.style("opacity", 1);
								removeSubtimeline();
								viewingGroup = false;
								}
							}

						function makeSubtimeline(data){
							var bufferTime = (_.last(data.values).time - _.first(data.values).time)/8;
							var begin = _.first(data.values).time - bufferTime; //get the beginning time
					    	var end = _.last(data.values).time + bufferTime;
					    	// var factor = (1/(end - begin)) * (width - (margin.left+50) - (margin.right-50));
							var xScale2 = d3.time.scale()
								       .domain([begin, end])
								       .range([margin.left + 50, width - margin.right - 50]);

							var xAxis2 = d3.svg.axis()
								       	  .scale(xScale2)
								          .orient(orient);

							svg.append("g")
							   .attr("class", "x axis")
							   .attr("id", "subtimeline")
							   .attr("transform", "translate(0," + (2*height/3+50) + ")") //controls the height of the timeline
							   .call(xAxis2)
							   .style("opacity", 0)
							   .transition()
							   	.delay(100)
								.duration(750)
								.style("opacity", 1);


							svg.selectAll("temps")
								.data(data.values)
								.enter()
								.append("circle")
								.attr("id", "subtimeline")
								.attr("cx", function(datum){
									return xScale2(datum.time);
								} )
								.attr("cy", 2*height/3)
								.attr("r", 0)
								.style("fill", function(d){
										return getColor(d);
									})
								.on('mouseover', function (d) {
										makeToolTip(d, d3.event);
										d3.select(this).transition().duration(200).style('stroke', 'red').style('stroke-width', '2px');
										scope.$apply();
									})
									.on('mouseleave', function (d) {
										removeToolTip();
										d3.select(this).transition().duration(200).style('stroke', '').style('stroke-width', '');
										scope.$apply();
									}).on('mousemove', function (d) {
										updateToolTip(d3.event);
									}).on('click', function (d) {
										scope.$apply();
									})
									.transition()
										.duration(function(d,i){
											return 750 + (i*25);
										})
										.ease('linear')
										.attr("r", function(d) {
											return getRadius(d);
										});
						}

						function removeSubtimeline(){
							svg.selectAll("#subtimeline")
								.transition()
								.duration(300)
								.style("opacity", 0)
							.remove();
						}

		    			/**
					    * Takes index and returns a color value
					    * @return {[type]} [description]
					    */
		    			function getColor(d){
		    				var colors = d3.scale.category20();
		    				colors.domain(_.range(data.sources.length));
		    				var index = _.indexOf(data.sources, d.source);
		    				return d3.hsl(colors(index)).darker(Math.floor(index/20)*.75);
		    			}

		    			/**
					    * Formats date object into a string
					    * @return string MM/DD/YYYY HH:MM
					    */
		    			function formatDate(date){
		    				var year = date.getFullYear().toString().slice(-2);
		    				var time = date.toTimeString().slice(0,8);
		    				return (date.getMonth()+1) + "/" + date.getDate() + "/" + year + " " +time;
		    			}

		    			//Tooltip template
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
					    * Creates and displays tooltip
					    * @return {[type]} [description]
					    */
					    function makeToolTip(data, event) {
					    	var date = new Date(data.time)
					        data = "Source: " + data.source + "<br> Date: " + formatDate(date) + "<br> Weight: " + data.weight;
					        angular.element('<p id="tooltip" style="' + tooltip + '"></p>').html(data).appendTo('body').fadeIn('slow').css({
					        left: event.pageX + 20,
					        top: event.pageY - 30
					        });
					      }

					    /**
					    * Clears the tooltip from body
					    * @return {[type]} [description]
					    */
					    function removeToolTip() {
					    	angular.element('#tooltip').remove();
					    }

					    function updateToolTip(event) {
					    	angular.element('#tooltip').css({
					    		left: event.pageX + 20,
					    		top: event.pageY - 30
					    	});
					    }
					}
		        	
					/** 
					* Take a data object and an index and returns 
					* the value for the x coordinate.
					* @return int xPosition
					*/
					function getXPos(d) {
	        			return margin.left + (d.time - beginning) * scaleFactor;
	      			}

	      			/** 
					* Take a data object and an index and returns 
					* the value for the x coordinate.
					* @return int xPosition
					*/
	      			function getYPos(d){
	      				/*This method is going to need to take in 
	      				* what its input it is so that the proper
	      				* height will be so that it lies on the correct axis
	      				*/
	      				return _tickHeights[d];
	      			}

	      			function getRadius(d){
	      				return 20*(d.weight/largest)
	      			}

	      			function calculateStdDev(arr){
						var avg = _.reduce(arr, function(memo, num){return num+memo;}, 0)/_.size(arr);
	      				var squares = _.map(arr, function(num){
	      					return (num-avg)*(num-avg);
	      				})
	      				var stdDev = Math.sqrt(_.reduce(squares, function(memo, num){return num+memo;}, 0)/_.size(arr));
	      				return stdDev;
	      			}
				   // watches
				    //Watch 'data' and run scope.render(newVal) whenever it changes
	        		scope.$watch('timelineInfo', function(){
	        			render(scope.timelineInfo);
	        		}, true);  

					})();
				}
			};
		}
	]);