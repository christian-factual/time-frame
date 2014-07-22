angular.module('services', [])
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
				_commitID = ID + '.json';
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
				console.log("using ID: ", ID);
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
			this.setUUID(url);
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
					if(keyParts[0].split(":")[0] == 'user'){
						//have a user
						source = keyParts[0].split(":")[1] + ' ' + source; 
					}
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
					if(weight == 0){
						continue;//skip those values
					}
					// weight = weight==0 ? 11 : weight;//make all the 0 fields into 1s

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
	});