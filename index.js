const express = require('express'),
      bodyParser = require('body-parser'),
      compression = require('compression'),
      redis = require('redis').createClient(process.env.REDIS_URL),
      webhook = require('./routes/webhook'),
      webview = require('./routes/webview')

/**
 * Configure redis
 **/
redis.on('error', (err) => {
  console.error("Error " + err)
})


/**
 * Configure the web server
 **/
const app = express()
app.engine('hbs', require('exphbs'))
app.set('view engine', 'hbs')
app.use(compression())

app.use(bodyParser.json())
app.use('/', express.static('public'))

/**
 * Handle webhook calls
 **/
app.post('/', webhook(redis))

/**
 * Render a webview
 **/
app.get('/location/:id', webview(redis))

/**
 * Start the web server
 **/
app.listen(process.env.PORT, () => {
  console.info('Listening at %s', process.env.PORT)
})
