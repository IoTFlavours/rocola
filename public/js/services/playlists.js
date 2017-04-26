angular.module('playlistService', [])

    // super simple service
    // each function returns a promise object
    .factory('Playlist', function($http) {
        return {
            get_playlists: function(rocola_id) {                
                return $http.post('http://54.233.117.78:8080/api/getRocolaPlaylists', rocola_id);
            },
            create: function(playlist_id) {
                return $http.post('/api/addActivePlaylist', playlist_id);
            }
        }
    });
