var other = {};

var timeframeModule = angular.module('timeframe',['angularCharts', 'filters', 'services', 'directives'])
	.value('attArrays', {
		'main': ['Name', 'Tel', 'Address', 'Locality', 'Region'], //, 'Geocode'
		'other': ['Postcode', 'Country', 'Website'] //, 'Category ID'
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
				//set chart info
				$scope.data = inputReportCleaner.generateChartInfo($scope.activeTab);
			});
			UUIDapiService.callDSApi($scope.inputID, function(returnJSON){
				//set timeline info
				$scope.timelineInfo = UUIDCleaner.generateTimelineInfo($scope.activeTab);
			});

		};
	});
