const express = require("express");
const logger = require("morgan");
const mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
const axios = require("axios");
const cheerio = require("cheerio");

// Require all models
const db = require("./models");

const PORT = process.env.PORT || 3000;

// Initialize Express
const app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI);


// GET HEADLINES ROUTE
app.get('/scrape', (req, res) => {
  axios.get('https://medium.com/topic/technology').then((response) => {
    // empty database to remove chance of duplicates
    db.Article.remove({}, (err => {
      if (err) throw err;
      else (console.log("Documents cleared out"))
    }));
    let $ = cheerio.load(response.data);
    // this is the smallest div that contains all the data we want to scrape
    $('section.ex').each(function(i, element) {
      var result = {};
      // the headline is the text value of an <a> tag inside of an <h3> inside of div.dp
      result.headline = $(this)
        .find('div.dr')
        // .find('h3')
        .find('a')
        .text();
      // the summary is the text value of an <a> tag inside of the div.dv inside of div.dp
      result.summary = $(this)
        .find('div.dw')
        .find('p')
        .find('a')
        .text();
      // the url is the href of an <a> tag inside of the <h3> inside of div.dp
      result.url = $(this)
        .find('div.dr')
        .find('h3.ai')
        .find('a')
        .attr('href');
      // add each to the Article database
      db.Article.create(result)
        .then(dbArticle => {
        console.log(dbArticle);
        })
        .catch(err => {
        console.log(err)
      });
    });
    res.send(`<link href="https://fonts.googleapis.com/css?family=Permanent+Marker" rel="stylesheet">
    <style>
      body { 
        background-color: rgb(70, 11, 117);
        font-family: 'Permanent Marker', cursive; 
        color: white;
      }
      a:link {
        color: #b71ebc;
        text-decoration: none;
      }
      a:visited {
        color: #bc1e30;
      }
      a:hover {
        color: #8a158e;
      }
      a:active {
        color: #bc1e30;
      }
    </style>
    <body>
    <h2>Scrape Complete</h2>
    <a href="/" id="goHome"><h3>Let's see our results</h3></a></body>`);
  });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});




// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});
