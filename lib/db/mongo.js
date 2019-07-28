/**
    Handle connection to mongoose,
    accepts connection config dictionary
    {
        host:"",
        port: "",
        login: "",
        password: ""
    },
    object with ready property that will get updated according to the mongo connection status
    debug flag
    returns object with connect() function
**/

'use strict'

const mongoose = require('mongoose')

class Connection {
  constructor (config = { host: 'localhost', port: 27017 }, scheduler, debug) {
    const RETRY_TIMEOUT = 3000
    const RETRY_MAX = 10000

    this.connection = null

    var authMongo = !config.login
      ? ''
      : !config.password
        ? ''
        : config.login + ':' + config.password + '@'

    this.URL = 'mongodb://' + authMongo + config.host + ':' + config.port

    var retries = 0
    this.options = {
      autoReconnect: true,
      keepAlive: 30000,
      reconnectInterval: RETRY_TIMEOUT,
      reconnectTries: RETRY_MAX,
      useMongoClient: true
    }

    this.scheduler = scheduler
    this.debug = debug

    var connectedBefore = false

    // handle mongo events
    mongoose.connection.on('error', function () {
      console.error(new Date().toLocaleString(), 'Could not connect to MongoDB')
    })

    mongoose.connection.on('disconnected', function () {
      scheduler.ready = false
      if (debug) {
        console.error(new Date().toLocaleString(), 'Lost MongoDB connection...')
      }
      if (!connectedBefore) {
        if (retries++ >= RETRY_MAX) {
          process.exit(1)
        }
        setTimeout(() => this.connect(), RETRY_TIMEOUT)
      }
    })

    mongoose.connection.on('connected', function () {
      retries = 0
      connectedBefore = true
      scheduler.ready = true
      scheduler.restore(scheduler.self)
      if (debug) {
        console.info(new Date().toLocaleString(), 'Connection established to MongoDB')
      }
    })

    mongoose.connection.on('reconnected', function () {
      if (debug) {
        console.info(new Date().toLocaleString(), 'Reconnected to MongoDB')
      }
    })

    // Close the Mongoose connection, when receiving SIGINT
    process.on('SIGINT', function () {
      mongoose.connection.close(function () {
        if (debug) {
          console.warn(new Date().toLocaleString(), 'Force to close the MongoDB connection after SIGINT')
        }
        process.exit(0)
      })
    })
  }

  connect () {
    var self = this
    return new Promise(async function (resolve, reject) {
      if (self.debug) {
        console.log(new Date().toLocaleString(), 'MONGO: Connecting to mongo...')
      }
      if (!self.connection ||
          !self.connection.states ||
          self.connection.readyState ||
          self.connection.states[self.connection.readyState] !== 'connected') {
        self.connection = await mongoose.connect(self.URL, self.options, function (error) {
          if (error) {
            console.error(new Date().toLocaleString(), 'Mongoose connect(...) failed with err: ', error)
            self.scheduler.ready = false
            return reject(error)
          }
          if (self.debug) {
            console.log(new Date().toLocaleString(), 'MONGO: Connected to mongo...')
          }
          return resolve()
        })
      } else {
        return resolve()
      }
    })
  }

  disconnect () {
    var self = this
    return new Promise(async function (resolve, reject) {
      if (self.debug) {
        console.log(new Date().toLocaleString(), 'MONGO: Closing mongo connection...')
      }
      if (self.connection) {
        await mongoose.disconnect((error) => {
          if (error) {
            console.error(new Date().toLocaleString(), 'Mongoose close(...) failed with err: ', error)
            return reject(error)
          }
          if (self.debug) {
            console.log(new Date().toLocaleString(), 'MONGO: Closed mongo connection...')
          }
          return resolve()
        })
      }
    })
  }
}

module.exports = Connection
