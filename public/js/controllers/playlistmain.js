angular.module('playlistController', [])

    // inject the Todo service factory into our controller
    .controller('mainPlaylistController', ['$scope', '$http', 'Playlist', function($scope, $http, Playlist) {

        $scope.loading = true;

        // GET =====================================================================
        // when landing on the page, get all todos and show them
        // use the service to get all the todos

        Playlist.get_playlists('12152402389')
            .then(function(data) {
                console.log('hola');
                $scope.playlists = data.data;
                $scope.loading = false;
            });

        // CREATE ==================================================================
        // when submitting the add form, send the text to the node API
        $scope.addActivePlaylist = function(id) {
            $scope.loading = true;
            // call the create function from our service (returns a promise object)
            Playlist.create(id)
                // if successful creation, call our get function to get all the new todos
                .success(function(data) {
                    $scope.loading = false;
                    $scope.playlists = data; // assign our new list of todos
                });
        };
    }]);
