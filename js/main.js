var other = {};

var timeframeModule = angular.module('timeframe',['angularCharts'])
	.value('attArrays', {
		'main': ['Name', 'Tel', 'Address', 'Locality', 'Region'], //, 'Geocode'
		'other': ['Postcode', 'Country', 'Website'] //, 'Category ID'
	})
	.filter('splitCap', function(){
		return function(input){
			input = input || '';
			var out = "";
			var temp = input.split("_");
			for(var index = 0; index<temp.length; index++){
				var other = temp[index].charAt(0).toUpperCase() + temp[index].slice(1) + " ";
				out = out + other;
			}
			return out;
		};
	})
	.service('commitIDapiService', function(inputReportCleaner, $http){
		//This is where I'm making the JSON call to DSAPIs

		//These vars are used to make the commit ID ds api calls. 
		var baseURL = 'http://localhost:8888/resources/';
		var _commitID= 'peets_input_report.json'; //****This will be an input later
		var _finalURL = '';
		/** Method combines the final URL from user input
			and the base URL. Then sets the final URL variable.
		**/
		var makeURL= function(){
			_finalURL = baseURL + _commitID;
			console.log("Looking at this URL: ", _finalURL);
			return _finalURL;
		}
		/** Setter for the commit ID variable
		**/
		this.setCommitID = function(ID){
			if(ID == ''){
				_commitID= 'peets_input_report.json';
			}
			else{
				_commitID = ID;
			}
		}
		/** Getter for the commit ID variable
		**/
		this.getCommitID = function(){
			return _commitID;
		}
		/** Function to make http call to the the server.
		**/
		this.callDSApi = function(url, callback){
			this.setCommitID(url);
			makeURL();
			$http({
				method: 'GET',
				url: _finalURL
			}, { cache: true }) //turn caching on
			.success(function(data, status){
				console.log("This worked!");
				inputReportCleaner.storeJSON(data);
				callback(status, data);
			})
			.error(function(data, status){
				console.log("This crap didnt work");
				alert("Wasn't able to find this commit ID");
			})	
		}
	})
	.service('inputReportCleaner', function(){
		//vars used.
		var inputReport = {};
		var chartInfo = {};

		//Method takes in a data instance, which is the JSON returned from the http
		//call and assigns it to the inputReport variable of this service.
		this.storeJSON = function(data){
			inputReport = data; 
		}
		//Method uses the stored commit JSON and formats 
		//it so that the Angular driven table can be generated. 
		this.generateTableInfo = function(){
			//Create object
			var info = {};
			var finalSummary = inputReport.summary_report.summary.payload;
			var raw = inputReport.input.payloadRaw;
			var clean = inputReport.input.payload;

			for(var key in finalSummary){
				if(finalSummary.hasOwnProperty(key)){
					info[key] = [finalSummary[key]];
				}
			}
			for(var key in info){
				//special case that we have a rawaddress
				if(key==='address'){
					info[key].unshift(raw[key], clean['rawaddress']);
					continue;
				}
				//case that both have this field
				if(clean.hasOwnProperty(key) && raw.hasOwnProperty(key)){
					info[key].unshift(raw[key], clean[key]);
					continue;
				}
				else if(clean.hasOwnProperty(key)){
					info[key].unshift(' ', clean[key]);
					continue;
				}
				else if(raw.hasOwnProperty(key)){
					info[key].unshift(raw[key], ' ');
					continue;
				}
				else{
					info[key].unshift(' ', ' ');
				}				
			}
			return info;
		}
		//Method generates pie chart formatted JSON from the stored
		//http call JSON. Method takes in str 'type' and returns a formatted 
		//JSON object for Angular-charts
		this.generateChartInfo = function(type){
			var pInfo = {};
			var bInfo = {};
			var attrib = type.toLowerCase();

			//this is the summary object; key= name, value=weight
			var summaryStats = inputReport.summary_report.field_summarizer_stats[attrib];
			//data is an array of objects
			var dataArr = [];

			for(var key in summaryStats){
				var temp = {
					x: key, 
					y: [summaryStats[key]]
				}
				dataArr.push(temp);
			}
			pInfo = {
				// series: ['thing', 'thing2', 'thing3'],
				//sort in order from greatest to least then reverse the order
				data: _.sortBy(dataArr, function(num){return Math.min(num.y[0])}).reverse()
			}
			return pInfo;
		}

		//Method takes in a type var, which is the attribute that is 
		//being displayed. It gets information from the JSON and then
		//gathers the info needed for the midpane. It also formats it into 
		//an object with 'userInput', 'explain', highestW', 'totalW' & 'confidence'
		//as the keys.
		this.generateContentText = function(type){
			var attrib = type.toLowerCase();
			var text = {
				userInput: '',
				explain: '',
				highestW: 0,
				totalW: 0,
				confidence: 0
			};

			var stats = inputReport.latest_summary.fieldMetas[attrib];
			text['totalW'] = stats.scores['total_weight'];
			text['highestW'] = stats.scores['highest_weight'];
			text['confidence'] = stats['confidence'];
			//get user input if its there
			if(inputReport.input.payloadRaw[attrib] !== undefined){
				text['userInput'] = inputReport.input.payloadRaw[attrib];
			}
			
			//try and get explanation if its there.
			
			var temp = inputReport.summary_report.input_contributions_explained
			for(var key in temp){
				//since I dont know the key, iterate.
				for(var entry in temp[key]){//check if this field has an explination
					if(attrib == entry){
						text['explain'] = temp[key][entry];
					}
				}
			}
			return text;
		}
	})
	.service('UUIDapiService', function(UUIDCleaner, $http, $q){		
		//These vars are used to make the commit ID ds api calls. 
		var baseURL = 'http://localhost:8888/store/';
		var _UUID = 'test'; //****This will be an input later
		var inputsReadURL = '';
		var sumReportURL = '';
		
		/** 
		* Method combines the final URL from user input
		* and the base URL. 
		* Returns: array of URLs 
		**/
		var makeURLs= function(){
			inputsReadURL = baseURL + 'inputReads/' + _UUID;
			sumReportURL = baseURL + 'summaryReports/' + _UUID + '.json';
			console.log("These are the two URLs: ", inputsReadURL, " and ", sumReportURL);
		}

		/** 
		* Setter for the UUID variable
		* Input: String ID 
		**/
		this.setUUID = function(ID){
			if(ID == ''){
				_UUID= 'test';
			}
			else{
				_UUID = ID;
			}
		}

		/** 
		* Function to make http call to the the server.
		* inputs: url = string of desired UUID
		*		  callback = function that will be called when call returns
		* Returns:
		**/
		this.callDSApi = function(url, callback){
			// this.setUUID(url);
			makeURLs();
			var deferred = $q.defer();
			var calls = [
				$http({
					method: 'GET',
					url: inputsReadURL,
					transformResponse: function(data){
						var splitArr = data.split("\n");
						splitArr.pop(); //remove extra value
						splitArr = _.map(splitArr, function(obj){
							return JSON.parse(obj);
						});
						return splitArr;
					}
					}),
				$http.get(sumReportURL)
			];
			$q.all(calls)
			  .then(
			  	function(results){
			  		//Here make the callback function

			  		UUIDCleaner.storeReads(results);
			  		callback(results);
			  		deferred.resolve(results);
			  	},
			  	function(errors){
			  		alert("Errors while making the AJAX calls");
			  		deferred.reject(errors);
			  	},
			  	function(updates){
			  		deferred.update(updates);
			  	});
			  return deferred.promise	
		}
	})
	.service('UUIDCleaner', function(){
		//initialize storage variables
		var inputReads = {};
		var summReport = {};

		/*
		* Method takes in an array of results and saves them
		* to local variables of the service. From here, other
		* methods will use the stored values.
		*/
		this.storeReads = function(results){
			other = results;
			inputReads = results[0].data;
			summReport = results[1].data;
		}


		/*
		* This method performs black magic and should never be read.
		*/
		this.generateTimelineInfo = function(field){
			field = field.toLowerCase();
			//final values
			var series = [],
				sources = [],
				values = [];

			//iterate through all the inputs to find contributions
			var allInputs = summReport.inputs;
			for(var key in allInputs){
				//Check if the input has the field that we want
				if(_.has(allInputs[key], field)){//Know the object has the field
					//want to get the md5 begin making the entry
					var source = '',
						weight = 0,
						timeStamp = 0,
						userPayload = '';
					//temps variables
					var md5 = '',
						filter = {},
						inputJSON = {};
					//Use the key to find the source, md5 value & timestamp
					var keyParts = key.split(",");
					//pull time stamp; get ts string, split on ':', pull second half
					timeStamp = parseInt(_.last(keyParts).split(':')[1]);
					keyParts.pop();//remove time stamp
					//repeat for the md5value
					md5 = _.last(keyParts).split(':')[1];
					keyParts.pop(); //remove md5 string
					//repeat for source
					source = _.last(keyParts).split(':')[1];//done; could repeat for user or origin
					//now have source, ts & md5.

					//use md5 to get input
					//create criteria for the JSON input
					filter = {md5: md5, inputDate: timeStamp};
					//find the entry
					inputJSON = _.findWhere(inputReads, filter); //should only return 1 JSON
					if(_.isUndefined(inputJSON)){//something went wrong
						alert("Entry with this criteria was not found: ", filter)
						break;
					}
					//case that we got the JSON
					userPayload = inputJSON.payload[field];
					weight = allInputs[key][field].total_field_weight;
					weight = weight==0 ? 1 : weight;//make all the 0 fields into 1s

					//now have all the values; need to put together & push onto array
					series.push(userPayload);
					sources.push(source);
					values.push({
						source: source,
						input: userPayload,
						weight: weight,
						time: timeStamp
					});
				}
				//Does not have the input field
				else{
					continue;
				}
			}
			series = _.uniq(series);
			sources = _.uniq(sources);
			return {
				series: series,
				sources: sources,
				values: values
			};
		}
	})
	.controller('pageCtrl', function($scope, attArrays, commitIDapiService, UUIDapiService, inputReportCleaner, UUIDCleaner){
		//vars
		$scope.inputID = '';
		$scope.tableInfo = {};
		//info for the content pane
		$scope.explain = '';
		$scope.userInput = '';
		$scope.highestW = '';
		$scope.totalW = '';
		$scope.confidence = '';
		//Info for the menu bar
		$scope.mainAttribs = attArrays.main;
		$scope.otherAttribs = attArrays.other;
		//Logic for choosing active tabs
		$scope.activeTab = 'Name';			
		//type of chart
		$scope.chartType = 'pie';
		//scope.data information that is set.
		$scope.data = {}; //Data for the pie

		//*************************
		//All the information used for the timeline
		//temp variable
		$scope.timelineInfo = NaN;

		//temp function
		$scope.makeQcall = function(){
			UUIDapiService.callDSApi($scope.inputID, function(returnJSON){
				//set timeline info
				$scope.timelineInfo = UUIDCleaner.generateTimelineInfo($scope.activeTab);
			});

		}

		//*************************

		//Method is called when the attribute toggle on the html page
		//is clicked. This updates the page to the attribute and calls 
		//methods to reset and assign the view for the correct attribute.
		//This method is also called when the page is first loaded.
		$scope.selectAttrib = function(event){
			//onclick set the active 
			$scope.activeTab = event.target.attributes[2].nodeValue;
			try{
				$scope.data = inputReportCleaner.generateChartInfo($scope.activeTab);
				$scope.assignContentText(inputReportCleaner.generateContentText($scope.activeTab));
				$scope.timelineInfo = UUIDCleaner.generateTimelineInfo($scope.activeTab);
			}
			catch(err){
				//probably happening because the info used in the method has not been populated
			}
		};

		//Method assigns the content pane's text. Gets information from
		//JSON object as assigns it to each scope.variable
		$scope.assignContentText = function(arr){
			$scope.explain = arr['explain'];
			$scope.userInput = arr['userInput'];
			$scope.highestW = arr['highestW'];
			$scope.totalW = arr['totalW'];
			$scope.confidence = arr['confidence'];
		}

		//function needed to get the JSON file from the server
		//Also calls methods to set variables used in html
		$scope.getJSON = function(){
			//commitIDapiService.callDSApi($scope.inputID);
			commitIDapiService.callDSApi($scope.inputID, function(error, returnJSON){
				//set table info
				other = returnJSON;
				$scope.tableInfo = inputReportCleaner.generateTableInfo();
				//set chart info
				$scope.data = inputReportCleaner.generateChartInfo($scope.activeTab);
				//set content
				$scope.assignContentText(inputReportCleaner.generateContentText($scope.activeTab));
			});
		};
	})
.directive('timelineD3', [
	'$window',
	function ($window) {
		return {
			restrict: 'E', 
			link: function(scope, element, attrs){
				(function () {

				//New data structure with correct formatting.
				var testData = {
					series: ['310-234-1234', '713-555-1234', '505-555-1234'],
					sources: ["yelp.com", "factual.com", "menupix.com", "yext.com", "menu.com"],
					values: [{source: "yelp.com",
						input: '713-555-1234',
						weight: 13,
						time: 1349823989000
					}, {source: "yelp.com",
						input: '713-555-1234',
						weight: 20,
						time: 1320000000000
					}, {source: "factual.com",
						input: '713-555-1234',
						weight: 30,
						time: 1397183604000
					}, {source: "menupix.com",
						input: '310-234-1234',
						weight: 10,
						time: 1371138820000
					},{source: "menu.com",
						input: '310-234-1234',
						weight: 15,
						time: 1381138820000
					},
					{source: "yext.com",
						input: '505-555-1234',
						weight: 25,
						time: 1398138820000
					}]
				};

				var hover = function () {},
			        mouseover = function () {},
			        mouseout = function () {},
			        click = function () {},
			        scroll = function () {},
			        orient = "bottom",
			        width = null,
			        height = null,
			        tickFormat = { format: d3.time.format("%m/%y"), //%m/%d/%y %H:%M
			          tickTime: d3.time.month,
			          tickInterval: 3,
			          tickSize: 6 },
			        colorCycle = d3.scale.category20(),
			        colorPropertyName = null,
			        beginning = 0,
			        ending = 0,
			        margin = {top: 20, right: 40, bottom: 30, left: 50},
			        itemHeight = 20,
			        itemMargin = 5,
			        showTodayLine = false,
			        showTodayFormat = {marginTop: 25, marginBottom: 0, width: 1, color: colorCycle},
					_tickHeights = {},
					scaleFactor = 1,
					largest = 1;
				
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

				    beginning = _.first(data.values).time -10000000000; //get the beginning time
				    ending = _.last(data.values).time + 5000000000;

				    var w = angular.element($window);
				    w.bind('resize', function (ev) {
				    		totalWidth = w.width();
				    		console.log("Total Width: ", totalWidth);
				    		totalHeight = element.height();
				    });

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
	        					beginning: value.time,
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
	        			var firstR = getXPos(prevVal, 0) + getRadius(prevVal);
	        			var secondR = getXPos(value, 0) - getRadius(value);
	        			if( firstR > secondR ){//case that they should be grouped
	        				group.values.push(value);
	        			}
	        			else{//case they the new value doesnt fall in the group
	        				group = {
	        					input: value.input,
	        					beginning: value.time,
	        					values: [value]
	        				}
	        				workingSeries.push(group);
	        			}
	        		}
	        		//collapse all the groups into one.
	        		var collapse = _.flatten(_.values(inputGroups));
	        		collapse = _.sortBy(collapse, function(group){return group.beginning});
	        		return collapse;
	        	}

	        	/*
	        	*/
	        	var render = function(data){
					console.log("render called using data: ", data);

					if(_.isNaN(data)){//check and make sure we have some data
						return;
					}

					initVars(data);
					var groupData = formGroups(data);
					console.log("group Data: ", groupData);

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

					//make the pseudo y-axis
	 				// var yAxis = svg.append("line")
					   //                      .attr("x1", margin.left)
					   //                      .attr("y1", margin.top)
					   //                      .attr("x2", margin.left)
					   //                      .attr("y2", height)
					   //                      .attr("stroke-width", 1)
					   //                      .attr("stroke", "black")
					   //                      .attr("shape-rendering", "crispEdges")
					   //                      .attr("class", "y axis");
			        
			        var ticks = svg.selectAll("tick")
			        			   .data(data.series)
			        			   .enter()
			        			   .append("line")
			                       .attr("x1", margin.left)
			                       .attr("y1", function(d,i){
			                       		return getYPos(d,i);
			                       })
			                       .attr("x2", width - margin.right)
			                       .attr("y2", function(d,i){
			                       		return getYPos(d,i);
			                       })	
			                       .attr("stroke-width", 1)
			                       .attr("stroke", "grey");	   

			        //Add the SVG Text Element to the svgContainer
					var text = svg.selectAll("text")
					                        .data(data.series)
					                        .enter()
					                        .append("text")
							                .attr("x", function(d) { 
							                 	return 0;
							             	})
							                .attr("y", function(d) { 
							                 	return getYPos(d)-5; 
							                 })
							                .text( function (d) { 
							                	return d; 
							                })
							                .attr("font-family", "sans-serif")
							                .attr("font-size", "11px")
				         				    .attr("fill", "black");     			   
					
					//add the data
					var circles = svg.selectAll("circle")
									.data(data.values)
									.enter()
									.append("circle")
									.attr("cx", function(d, i) {
										return getXPos(d,i);
									})
									.attr("cy", function(d,i){
										return getYPos(d.input,i);
									}) //this will change when the different axes are needed.
									.style("fill", function(d, i){
										return getColor(d,i);
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
											return 750 + (i*25);
										})
										.ease('linear')
										.attr("r", function(d) {
											return getRadius(d);
										});

					//Render X axis
					svg.append("g")
					   .attr("class", "x axis")
					   .attr("transform", "translate(0," + height + ")") //controls the height of the timeline
					   .call(xAxis);

					//******Helper functions
		    			/**
					    * Takes index and returns a color value
					    * @return {[type]} [description]
					    */
		    			function getColor(d,i){
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
					        data = "Source: " + data.source + "<br> Date: " + formatDate(date) + "<br> Time: " + data.time + "<br> Weight: " + data.weight;
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
	        	
				// var render = function(data){
				// 	console.log("render called using data: ", data);

				// 	if(_.isNaN(data)){//check and make sure we have some data
				// 		return;
				// 	}

				// 	initVars(data);
				// 	formGroups(data);

				// 	svg.selectAll("*").remove();//empty previous SVG

	   //      		//Create the d3 element and position it based on margins
	   //     			d3.select('svg')
	   //      			.attr('width', width + margin.left + margin.right)
	   //      			.attr('height', height + margin.top + margin.bottom)
	   //      			.append("g")
	   //      				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	   //      		//Need scales for the input
	   //      		var xScale = d3.time.scale()
				// 			       .domain([beginning, ending])
				// 			       .range([margin.left, width - margin.right]);

				// 	var xAxis = d3.svg.axis()
				// 		       	  .scale(xScale)
				// 		          .orient(orient)
				// 		          .tickFormat(tickFormat.format)
				// 		          .ticks(tickFormat.tickTime, tickFormat.tickInterval)
				// 		          .tickSize(tickFormat.tickSize);

				// 	//make the pseudo y-axis
				// 	//Draw the line
	 		// 		// var yAxis = svg.append("line")
				// 	   //                      .attr("x1", margin.left)
				// 	   //                      .attr("y1", margin.top)
				// 	   //                      .attr("x2", margin.left)
				// 	   //                      .attr("y2", height)
				// 	   //                      .attr("stroke-width", 1)
				// 	   //                      .attr("stroke", "black")
				// 	   //                      .attr("shape-rendering", "crispEdges")
				// 	   //                      .attr("class", "y axis");
			        
			 //        var ticks = svg.selectAll("tick")
			 //        			   .data(data.series)
			 //        			   .enter()
			 //        			   .append("line")
			 //                       .attr("x1", margin.left)
			 //                       .attr("y1", function(d,i){
			 //                       		return getYPos(d,i);
			 //                       })
			 //                       .attr("x2", width - margin.right)
			 //                       .attr("y2", function(d,i){
			 //                       		return getYPos(d,i);
			 //                       })	
			 //                       .attr("stroke-width", 1)
			 //                       .attr("stroke", "grey");	   

			 //        //Add the SVG Text Element to the svgContainer
				// 	var text = svg.selectAll("text")
				// 	                        .data(data.series)
				// 	                        .enter()
				// 	                        .append("text")
				// 			                .attr("x", function(d) { 
				// 			                 	return 0;
				// 			             	})
				// 			                .attr("y", function(d) { 
				// 			                 	return getYPos(d)-5; 
				// 			                 })
				// 			                .text( function (d) { 
				// 			                	return d; 
				// 			                })
				// 			                .attr("font-family", "sans-serif")
				// 			                .attr("font-size", "11px")
				//          				    .attr("fill", "black");     			   
					
				// 	//add the data
				// 	var circles = svg.selectAll("circle")
				// 					.data(data.values)
				// 					.enter()
				// 					.append("circle")
				// 					.attr("cx", function(d, i) {
				// 						return getXPos(d,i);
				// 					})
				// 					.attr("cy", function(d,i){
				// 						return getYPos(d.input,i);
				// 					}) //this will change when the different axes are needed.
				// 					.style("fill", function(d, i){
				// 						return getColor(d,i);
				// 					})
				// 					.attr("r", 0)
				// 					.on('mouseover', function (d) {
				// 						makeToolTip(d, d3.event);
				// 						d3.select(this).transition().duration(200).style('stroke', 'red').style('stroke-width', '2px');
				// 						scope.$apply();
				// 					})
				// 					.on('mouseleave', function (d) {
				// 						removeToolTip();
				// 						d3.select(this).transition().duration(200).style('stroke', '').style('stroke-width', '');
				// 						scope.$apply();
				// 					}).on('mousemove', function (d) {
				// 						updateToolTip(d3.event);
				// 					}).on('click', function (d) {
				// 						scope.$apply();
				// 					})
				// 					.transition()
				// 						.duration(function(d,i){
				// 							return 750 + (i*25);
				// 						})
				// 						.ease('linear')
				// 						.attr("r", function(d) {
				// 							return getRadius(d);
				// 						});

				// 	//Render X axis
				// 	svg.append("g")
				// 	   .attr("class", "x axis")
				// 	   .attr("transform", "translate(0," + height + ")") //controls the height of the timeline
				// 	   .call(xAxis);

				// 	//******Helper functions
		  //   			/**
				// 	    * Takes index and returns a color value
				// 	    * @return {[type]} [description]
				// 	    */
		  //   			function getColor(d,i){
		  //   				var colors = d3.scale.category20();
		  //   				colors.domain(_.range(data.sources.length));
		  //   				var index = _.indexOf(data.sources, d.source);
		  //   				return d3.hsl(colors(index)).darker(Math.floor(index/20)*.75);
		  //   			}

		  //   			/**
				// 	    * Formats date object into a string
				// 	    * @return string MM/DD/YYYY HH:MM
				// 	    */
		  //   			function formatDate(date){
		  //   				var year = date.getFullYear().toString().slice(-2);
		  //   				var time = date.toTimeString().slice(0,8);
		  //   				return (date.getMonth()+1) + "/" + date.getDate() + "/" + year + " " +time;
		  //   			}

		  //   			//Tooltip template
				// 		var tooltip = [
				// 			'display:none;',
				// 			'position:absolute;',
				// 			'border:1px solid #333;',
				// 			'background-color:#161616;',
				// 			'border-radius:5px;',
				// 			'padding:5px;',
				// 			'color:#fff;'
				// 			].join('');

		  //   			/**
				// 	    * Creates and displays tooltip
				// 	    * @return {[type]} [description]
				// 	    */
				// 	    function makeToolTip(data, event) {
				// 	    	var date = new Date(data.time)
				// 	        data = "Source: " + data.source + "<br> Date: " + formatDate(date) + "<br> Time: " + data.time + "<br> Weight: " + data.weight;
				// 	        angular.element('<p id="tooltip" style="' + tooltip + '"></p>').html(data).appendTo('body').fadeIn('slow').css({
				// 	        left: event.pageX + 20,
				// 	        top: event.pageY - 30
				// 	        });
				// 	      }

				// 	    /**
				// 	    * Clears the tooltip from body
				// 	    * @return {[type]} [description]
				// 	    */
				// 	    function removeToolTip() {
				// 	    	angular.element('#tooltip').remove();
				// 	    }

				// 	    function updateToolTip(event) {
				// 	    	angular.element('#tooltip').css({
				// 	    		left: event.pageX + 20,
				// 	    		top: event.pageY - 30
				// 	    	});
				// 	    }
				// }
				/** 
				* Take a data object and an index and returns 
				* the value for the x coordinate.
				* @return int xPosition
				*/
				function getXPos(d, i) {
        			return margin.left + (d.time - beginning) * scaleFactor;
      			}

      			/** 
				* Take a data object and an index and returns 
				* the value for the x coordinate.
				* @return int xPosition
				*/
      			function getYPos(d,i){
      				/*This method is going to need to take in 
      				* what its input it is so that the proper
      				* height will be so that it lies on the correct axis
      				*/
      				return _tickHeights[d];
      			}

      			function getRadius(d){
      				return 20*(d.weight/largest)
      			}
			   // watches
			    //Watch 'data' and run scope.render(newVal) whenever it changes
        		scope.$watch('timelineInfo', function(){
        			render(scope.timelineInfo);
        		}, false);  

				})();
			}
		};
	}
]);