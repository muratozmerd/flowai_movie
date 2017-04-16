var express = require('express');
var router = express.Router();
var request = require('request');


/* GET home page. */

/* This method is triggred first when our webhooks routes is hit 
we call a movie recoomendation function and pass the function request and response parameter */
router.post("/", function(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    movieRecommendationByGener(req, res);
});

function movieRecommendationByGener(req, mainResponse) {

    //Creating the URL header parameter which we require to hit the themoviedb.ord api.
    var options = {
        /* 
        generateMovieGenerReq(getGenreID(request)) returns you the a url with appropriate genreID as per the request from 
        Api.ai agent
        */
        "uri": generateMovieGenerReq(getGenreId(req)), 
        "method": "GET"
    };

    var resFromMovieDb = ''; .// initializing the response variable 
    var movie; 
    request(options, function(error, response, body) {

        // Now We are hitting the url we defined in options variable, if there is no error and response is success the we go 
        // ahead in the if loop
        if (!error && response.statusCode == 200) {
            // here we parse the Result from TheMovieDb.org after we query it for movie and store the JSON in res
            resFromMovieDb = JSON.parse(body);

            //Getting the movie object form the results of TheMoviedb.org api
            movie = resFromMovieDb["results"][0];

            //Creating The Facebook generic template
            var facebookTemplate = {
                facebook: {
                    attachment: {
                        type: "template",
                        payload: {
                            template_type: "generic",
                            elements: [{
                                title: movie["title"],
                                item_url: "https://petersfancybrownhats.com",
                                image_url: "https://image.tmdb.org/t/p/w500" + movie["poster_path"],
                                subtitle: "rating:" + movie["vote_average"],
                                buttons: [{
                                    type: "web_url",
                                    url: "https://petersfancybrownhats.com",
                                    title: "View Website"
                                }]
                            }]
                        }
                    }
                }
            }

            //Creating the final response object we need to send back to API.ai 
            var resonse = {
                speech: "Here are some movies from api that I think you might like",
                displayText: "Here are some movies from api that I think you might like",
                data: facebookTemplate, // adding Facebook genric template
                source: "apiai-weather-webhook-sample"
            };

            // Responding with the final response we generated.
            mainResponse.send(resonse);


        } else {

            // handle If any error occur.
            res = 'Not Found';
        }
    });




function getGenreId(req) {

    // Retrive the Parameters from API.ai agent and return the gener Id according to the request.
    var result = req.body["result"];
    var parameter = result["parameters"];
    var obtainedGener = parameter["movie-gener"];

    switch (obtainedGener) {
        case "Action":
            return 28;

        case "Horror":
            return 27;

        case "Adventure":
            return 12;

        case "Animation":
            return 16;

        case "Comedy":
            return 35;

        case "Crime":
            return 80;

        case "Documentary":
            return 99;

        case "Drama":
            return 18;

        case "Family":
            return 10751;

        case "Fantasy":
            return 14;

        case "History":
            return 36;

        case "Music":
            return 10402;

        case "Mystery":
            return 9648;

        case "Romance":
            return 10749;

        case "Science Fiction":
            return 878;

        case "Thriller":
            return 53;

        case "War":
            return 10752;

        case "Western":
            return 37;

        default:
            return 18;
    }


}

function generateMovieGenerReq(generId) {
    //return the formated url with gener ID and API and 
    return "https://api.themoviedb.org/3/genre/" + generId + "/movies?api_key=a8be2bceeae50ec2b2bb437cc194e849&language=en-US&include_adult=false&sort_by=created_at.asc"
}


}

module.exports = router;