var express = require('express'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    methodOverride = require('method-override'),
    session = require('express-session'),
    passport = require('passport'),
    swig = require('swig'),
    SpotifyStrategy = require('passport-spotify').Strategy;

var mongoose = require('mongoose');
var database = require('./config/database');
var Rocolas = require('./models/rocola');
var morgan = require('morgan');
var port = process.env.PORT || 8080; // set the port
var SpotifyWebApi = require('spotify-web-api-node');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');

var consolidate = require('consolidate');

var appKey = '79c1fdf6a43243378e995732c34deb22';
var appSecret = '80da3e5874bf4673913a1475301011d7';

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session. Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing. However, since this example does not
//   have a database of user records, the complete spotify profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});


// Use the SpotifyStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and spotify
//   profile), and invoke a callback with a user object.
passport.use(new SpotifyStrategy({
        clientID: appKey,
        clientSecret: appSecret,
        callbackURL: 'http://54.233.117.78:8080/auth/spotify/callback'
    },
    function(accessToken, refreshToken, profile, done) {
        process.nextTick(function() {
            Rocolas.findOne({
                rocola_id: profile.id
            }, function(err, rocola) {
                if (err) {
                    return done(err);
                }
                //No user was found... so create a new user with values from Facebook (all the profile. stuff)
                if (!rocola) {
                    var rocola_playlist_id = '';
                    var rocola_playlist_on_the_go_id = '';
                    var spotifyApi = new SpotifyWebApi({
                        accessToken: accessToken
                    });
                    spotifyApi.createPlaylist(profile.id, 'Rocola On The Go', {
                            'public': false
                        })
                        .then(function(data) {
                            rocola_playlist_on_the_go_id = data.body.id;
                            Rocolas.create({
                                rocola_id: profile.id,
                                rocola_name: profile.displayName,
                                rocola_accessToken: spotifyApi.getAccessToken(),
                                rocola_email: profile._json.email,
                                rocola_image: profile.photos,
                                rocola_playlist_on_the_go_id: rocola_playlist_on_the_go_id
                            }, function(err, rocola) {
                                if (err) {
                                    return done(err);
                                } else {
                                    return done(null, profile);
                                }
                            });
                        }, function(err) {
                            return done(err);
                        });
                } else {
                    Rocolas.update({
                        rocola_id: profile.id
                    }, {
                        $set: {
                            rocola_accessToken: accessToken
                        }
                    }, function(err, tank) {
                        if (err) {
                            res.status(503).send('Error Updating Rocola');
                        } else {
                            return done(null, profile);
                        }
                    });
                }
            });
        });
    }));

var app = express();

// configure Express
mongoose.connect(database.localUrl);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(cookieParser());
app.use(bodyParser());
app.use(methodOverride());
app.use(session({
    secret: 'keyboard cat'
}));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname + '/public'));
app.use(morgan('dev')); // log every request to the console
app.use(bodyParser.urlencoded({
    'extended': 'true'
})); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json
app.use(bodyParser.json({
    type: 'application/vnd.api+json'
})); // parse application/vnd.api+json as json
app.use(methodOverride('X-HTTP-Method-Override')); // override with the X-HTTP-Method-Override header in the request

app.engine('html', consolidate.swig);

app.get('/', function(req, res) {
    res.render('index.html', {
        user: req.user
    });
});

app.get('/account', ensureAuthenticated, function(req, res) {
    res.render('account.html', {
        user: req.user
    });
});

app.get('/success', ensureAuthenticated, function(req, res) {
    res.render('success.html', {
        user: req.user
    });
});

app.get('/select-playlist', ensureAuthenticated, function(req, res) {
    res.render('playlists.html', {
        user: req.user
    });
});

app.get('/login', function(req, res) {
    res.render('login.html', {
        user: req.user
    });
});

// GET /auth/spotify
//   Use passport.authenticate() as route middleware to authenticate the
//   request. The first step in spotify authentication will involve redirecting
//   the user to spotify.com. After authorization, spotify will redirect the user
//   back to this application at /auth/spotify/callback
app.get('/auth/spotify',
    passport.authenticate('spotify', {
        scope: ['user-read-email', 'user-read-private', 'playlist-modify-private', 'playlist-read-private'],
        showDialog: true
    }),
    function(req, res) {
        // The request will be redirected to spotify for authentication, so this
        // function will not be called.
    });

// GET /auth/spotify/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request. If authentication fails, the user will be redirected back to the
//   login page. Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/spotify/callback',
    passport.authenticate('spotify', {
        failureRedirect: '/login'
    }),
    function(req, res) {
        res.redirect('/select-playlist');
    });

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});


// ---------------------------------------------- APIS FOR SPOTIFY CONTROL ------------------------------------

app.post('/api/getRocolaPlaylists', function(req, res) {
    console.log(req.body);
    var rocola_id = req.body.rocola_id;
    Rocolas.findOne({
        rocola_id: rocola_id
    }, function(err, rocola) {
        if (err) {
            res.status(503).send('Error Finding Rocola');
        } else {
            if (!rocola) {
                res.status(404).send('Rocola Not Found');
            } else {
                var accessToken = rocola.rocola_accessToken;
                var spotifyApi = new SpotifyWebApi({
                    accessToken: accessToken
                });
                spotifyApi.getUserPlaylists(rocola_id)
                    .then(function(data) {
                            Rocolas.update({
                                rocola_id: rocola_id
                            }, {
                                $set: {
                                    rocola_accessToken: spotifyApi.getAccessToken()
                                }
                            }, function(err, tank) {
                                if (err) {
                                    res.status(503).send('Error Updating Rocola');
                                } else {
                                    var playlists = [];
                                    for (var i = 0; i < data.body.items.length; i++) {
                                        var playlist_total = data.body.items[i];
                                        var image = playlist_total.images[0];
                                        var playlist = {
                                            'playlist_name': playlist_total.name,
                                            'playlist_id': playlist_total.id
                                        };
                                        playlists[i] = playlist;
                                    }
                                    res.json(playlists);
                                }
                            });
                        },
                        function(err) {
                            res.status(503).send(err);
                        });

            }
        }
    });
});

app.post('/api/addTrackToOnTheGo', function(req, res) {
    var playlist_id = req.body.playlist_id;
    var rocola_id = req.body.rocola_id;
    var track = "spotify:track:" + req.body.track_id;
    Rocolas.findOne({
        rocola_id: rocola_id
    }, function(err, rocola) {
        if (err) {
            res.status(503).send('Error Finding Rocola');
        } else {
            if (!rocola) {
                res.status(404).send('Rocola Not Found');
            } else {
                var accessToken = rocola.rocola_accessToken;
                var spotifyApi = new SpotifyWebApi({
                    accessToken: accessToken
                });
                spotifyApi.addTracksToPlaylist(rocola_id, playlist_id, [track])
                    .then(function(data) {
                            Rocolas.update({
                                rocola_id: rocola_id
                            }, {
                                $set: {
                                    rocola_accessToken: spotifyApi.getAccessToken()
                                }
                            }, function(err, tank) {
                                if (err) {
                                    res.status(503).send('Error Updating Rocola');
                                } else {
                                    res.status(200).send('Track Added Correctly');
                                }
                            });
                        },
                        function(err) {
                            res.status(503).send('Error Adding Track');
                        });

            }
        }
    });
});

app.post('/api/getPlaylist', function(req, res) {
    var playlist_id = req.body.playlist_id;
    var rocola_id = req.body.rocola_id;
    var rocolas_songs;
    Rocolas.findOne({
        rocola_id: rocola_id
    }, function(err, rocola) {
        if (err) {
            res.status(503).send('Error Finding Rocola');
        } else {
            if (!rocola) {
                res.status(404).send('Rocola Not Found');
            } else {
                var accessToken = rocola.rocola_accessToken;
                var spotifyApi = new SpotifyWebApi({
                    accessToken: accessToken
                });
                spotifyApi.getPlaylist(rocola_id, playlist_id)
                    .then(function(data) {
                            rocolas_songs = data;
                            Rocolas.update({
                                rocola_id: rocola_id
                            }, {
                                $set: {
                                    rocola_accessToken: spotifyApi.getAccessToken()
                                }
                            }, function(err, tank) {
                                if (err) {
                                    res.status(503).send('Error Updating Rocola');
                                } else {
                                    res.json(data.body.tracks);
                                }
                            });
                        },
                        function(err) {
                            res.status(503).send('Error Getting Playlist');
                        });

            }
        }
    });
});


// ------------------------------------------------------------------------------------------------------------

app.listen(port);
console.log("App listening on port " + port);


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed. Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}
