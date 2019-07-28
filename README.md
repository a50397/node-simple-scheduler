# README #

A very simple tasks scheduler for node.js backed by mongo. I wrote this small utility as I needed only a small subset of the functionality other packages provide.

The scheduler saves jobs to mongodb database called SimpleScheduler and tries to restore the jobs in case it gets reconnected.

v. 0.1.3

### Installation ###

* clone the repository 

### Usage ###

```javascript
const Scheduler = require('./simple-scheduler/lib')

const sch = new Scheduler("sname")

try {
  sch.connect()
} catch (error) {
  process.exit()
}


const callback = function(name) {
  console.log(`Called with argument ${name}`)
} 

try {
  sch.addJob("id1", 60000, callback, "simple-scheduler")
} catch (error) {
  console.error(`Add job finished with error: ${error}`)
}


```
   
### Reference ###
* constructor Scheduler(id, (optional) config )
    * id - String - scheduler id, must be unique
    * config - mongodb connection settings, debugging info to console
    ```javascript
      config = {
        connection: {
          host: 'localhost',
          port: 27017,
          login: '',
          password: ''
        },
        debug: false
      }
    ``` 
* connect() - connects to mongo and restores jobs for the scheduler if any, returns Promise
* disconnect() - disconnects from mongo and removes all pending timers, returns Promise
* addJob(id, offset, callback, arg) - adds new job to mongo and sets up timer, returns Promise
    * id - must be unique,
    * offset - milliseconds from now,
    * callback - callback function,
    * arg - argument to callback
* getJob(id) - gets job information, returns Promise
* getJobs() - gets list of jobs, returns Promise
* removeJob(id) - removes job, returns Promise
* clean() - removes all jobs from mongo and all timers, returns Promise
* restore() - restores timers from mongo, returns Promise
 
### License ###

MIT
