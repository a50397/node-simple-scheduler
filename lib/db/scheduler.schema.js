/*
    Mongoose schema for scheduler jobs
*/

const mongoose = require('mongoose')

const JobSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  created: {
    type: Date,
    required: true
  },
  shouldRun: {
    type: Date,
    required: true
  },
  scheduler: {
    type: String,
    required: true,
    trim: true
  },
  action: {
    type: String
  },
  arguments: {
    type: String
  }
})

module.exports = mongoose.connection.useDb('SimpleScheduler').model('Job', JobSchema)
