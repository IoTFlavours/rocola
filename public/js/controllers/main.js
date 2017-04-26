angular.module('todoController', [])

	// inject the Todo service factory into our controller
	.controller('mainController', ['$scope','$http','Todos', function($scope, $http, Todos) {
		$scope.formData = {};
		$scope.loading = true;

		// GET =====================================================================
		// when landing on the page, get all todos and show them
		// use the service to get all the todos
		Todos.get(12175507942)
			.then(function(data) {
				console.log(data);
				console.log(data.data[0].playlist_name);
				$scope.playlists = data;
				$scope.loading = false;
			});
		
	}]);
