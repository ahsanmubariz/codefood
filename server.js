const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const auth = require('./router.js');
const recipe = require('./recipeRouter.js');
const history = require('./history.js');
const search = require('./search.js');
const recipelist = require('./createRecipeRouter.js');

const jwt = require('jsonwebtoken');

const app = express();

app.use(express.json());

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(cors());

app.set('secretKey', 'R4h4s1aN3g4r@')

app.use('/auth', auth);
app.use('/recipe-categories', recipe);
app.use('/recipes', recipelist);
app.use('/serve-histories', validateToken, history);
app.use('/search/recipes', search);

// Handling Errors
app.use((err, req, res, next) => {
  // console.log(err);
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";
  res.status(err.statusCode).json({
    message: err.message,
  });
});

function validateToken(req, res, next) {
  if (
    !req.headers.authorization ||
    !req.headers.authorization.startsWith('Bearer') ||
    !req.headers.authorization.split(' ')[1]
  ) {
    return res.status(422).json({
      message: "Please provide the token",
    });
  }
  const theToken = req.headers.authorization.split(' ')[1];
  jwt.verify(theToken, req.app.get('secretKey'), function (err, decoded) {
    if (err) {
      res.status(500).json({ status: "error", message: err.message, data: null })
    } else {
      req.body.userid = decoded.id
      next()
    }
  })
}
app.listen(8090, () => console.log('Server is running on port 8090'));
