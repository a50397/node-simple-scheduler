/**
  Scheduler tests
**/

const assert = require('assert')
const Scheduler = require('../lib/index')
var schd

describe('scheduler tests', function () {
  it('scheduler constructor', function () {
    assert.throws(() => {
      new Scheduler()
    })
    assert.throws(() => {
      new Scheduler('')
    })
    assert.throws(() => {
      new Scheduler(null)
    })
    assert.doesNotThrow(() => {
      new Scheduler('scheduler')
    })
    assert.throws(() => {
      new Scheduler(true)
    })
    assert.throws(() => {
      new Scheduler({ 'name': 'test' })
    })
  })
  it('connect to local mongo', async function () {
    schd = new Scheduler('scheduler')
    await schd.connect()
  })
  // expects a local mongo instance at port 27017
  it('add new job', async function () {
    await schd.addJob(34, 5000, () => { console.log() })
    var job = await schd.getJob(34)
    assert.equal(job.id, 34)
    assert.notEqual(typeof schd.scheduler.jobs[34], 'undefined')
  })
  it('remove job', async function () {
    await schd.removeJob(34)
    var job = await schd.getJob(34)
    assert.equal(job, null)
    assert.equal(typeof schd.scheduler.jobs[34], 'undefined')
  })
  it('get jobs', async function () {
    await schd.addJob(37, 5000, () => { console.log() })
    await schd.addJob(35, 5000, () => { console.log() })
    await schd.addJob(36, 5000, () => { console.log() })
    var jobs = await schd.getJobs()

    assert(Array.isArray(jobs))
    assert.equal(jobs.length, 3)
  })
  it('clean jobs', async function () {
    await schd.clean()

    var job = await schd.getJob(37)

    assert.equal(job, null)
    await schd.disconnect()
  })
})
