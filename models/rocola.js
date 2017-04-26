var mongoose = require('mongoose');

module.exports = mongoose.model('Rocola', {
    rocola_id: {
        type: String,
        default: ''
    },
    rocola_email: {
        type: String,
        default: ''
    },
    rocola_image: {
        type: String,
        default: ''
    },
    rocola_name: {
        type: String,
        default: ''
    },
    rocola_accessToken: {
        type: String,
        default: ''
    },
    rocola_playlist_id: {
        type: String,
        default: ''
    },
    rocola_playlist_on_the_go_id: {
        type: String,
        default: ''
    },
});
