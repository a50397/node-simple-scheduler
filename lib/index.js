/**
    Main scheduler class
**/

'use strict'

const mongo = require('./db/mongo')
const jobs = require('./db/scheduler.schema')
const JSOFF = require('./jsoff')

class _scheduler {
  constructor (name, config = {}) {
    const { connection, debug } = config

    this.scheduler = {
      name: null,
      ready: false,
      mongo: null,
      jobs: {},
      restore: this._restoreJobs,
      self: this
    }

    this.debug = debug

    if (!name || typeof name !== 'string') {
      throw new Error('SchedulerNameError')
    }
    this.scheduler.name = name.trim()

    try {
      // get mongo connection
      this.scheduler.mongo = new mongo(connection || { host: 'localhost', port: 27017 }, this.scheduler, debug)
    } catch (error) {
      throw error
    }
  }

  async _restoreJobs (self) {
    var items = await jobs.find({ scheduler: self.scheduler.name }, {}, { lean: true })
    var offset
    var now = new Date().valueOf()
    var fn, args

    for (let ind = 0; ind < items.length; ind++) {
      offset = new Date(items[ind].shouldRun).valueOf() - now
      try {
        fn = JSOFF.parse(items[ind].action)
        args = JSOFF.parse(items[ind].arguments)
      } catch (error) {
        await this.removeJob(items[ind].id)
        return Promise.reject(error)
      }

      if (offset > 0) {
        self._scheduleJob(items[ind].id, offset, fn.fn.bind(self, args))
      } else {
        var fun = fn.fn.bind(self, args)
        await fun()
        self.removeJob(items[ind].id)
      }
    }
    return Promise.resolve()
  }

  _scheduleJob (id, offset, callback) {
    var self = this
    id = String(id)
    if (this.scheduler.jobs[id]) {
      this._deleteJob(id)
    }
    this.scheduler.jobs[id] = setTimeout(async function () {
      try {
        await callback()
      } catch (error) {
        console.error(error)
      }
      await self.removeJob(id)
    }, offset)
  }

  _deleteJob (id) {
    id = String(id)
    if (this.scheduler.jobs[id]) {
      clearTimeout(this.scheduler.jobs[id])
      delete this.scheduler.jobs[id]
    } else {
      if (this.debug) {
        console.log('deschedule: no job id ', id)
      }
    }
  }

  _deleteAllJobs () {
    for (var job in this.scheduler.jobs) {
      clearTimeout(this.scheduler.jobs[job])
    }
    this.scheduler.jobs.length = 0
  }

  restore () {
    return this._restoreJobs(this)
  }

  connect () {
    var self = this
    return new Promise(async function (resolve, reject) {
      try {
        await self.scheduler.mongo.connect()
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  disconnect () {
    this._deleteAllJobs()
    return this.scheduler.mongo.disconnect()
  }

  async addJob (id, offset, callback, arg) {
    id = String(id)
    if (!this.scheduler.ready) {
      return Promise.reject(new Error('Mongo not ready'))
    }
    if (this.scheduler.jobs[id]) {
      return Promise.reject(new Error('Job already exists'))
    }
    const now = new Date()
    const job = new jobs({
      id: id,
      created: now,
      shouldRun: new Date(now.valueOf() + offset),
      action: JSOFF.stringify({ fn: callback }),
      arguments: JSOFF.stringify(arg),
      scheduler: this.scheduler.name
    })
    try {
      await job.save()
      this._scheduleJob(id, offset, callback.bind(this, arg))
      return Promise.resolve(job)
    } catch (error) {
      return Promise.reject(error)
    }
  }

  async getJob (id) {
    id = String(id)
    if (!this.scheduler.ready) {
      return Promise.reject(new Error('Mongo not ready'))
    }
    try {
      const job = await jobs.findOne({ id: id }, { id: 1, scheduler: 1, shouldRun: 1 }, { lean: true })
      return job
    } catch (error) {
      return null
    }
  }

  async getJobs () {
    const items = await jobs.find({ scheduler: this.scheduler.name }, { id: 1, scheduler: 1, shouldRun: 1 }, { lean: true })
    return items
  }

  async removeJob (id) {
    id = String(id)
    if (!this.scheduler.ready) {
      return Promise.reject(new Error('Mongo not ready'))
    }
    try {
      this._deleteJob(id)
      await jobs.remove({ scheduler: this.scheduler.name, id: id })
      return Promise.resolve()
    } catch (error) {
      return Promise.reject(error)
    }
  }

  async clean () {
    if (!this.scheduler.ready) {
      return Promise.reject(new Error('Mongo not ready'))
    }
    try {
      await jobs.remove({ scheduler: this.scheduler.name })
      this._deleteAllJobs()
      return Promise.resolve()
    } catch (error) {
      return Promise.reject(error)
    }
  }
}

module.exports = _scheduler
