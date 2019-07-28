/**
 * Based on the jsoff package by sirrobert. Added support for async functions
 */

'use strict'

// The JavaScript Object-Function Format
class JSOFF {
  static stringify (obj) {
    return JSON.stringify(obj, function (name, value) {
      if (typeof value === 'function') {
        return value.toString()
      } else {
        return value
      }
    })
  }

  static parse (str) {
    return JSON.parse(str, function (name, value) {
      if (value.indexOf('async') === 0) {
        var asnc = true
        value = value.substring('async'.length).trim()
      }

      if (value && typeof value === 'string' &&
        value.indexOf('function') === 0) {
        var info = {
          args: {
            from: value.indexOf('(') + 1,
            to: value.indexOf(')')
          },
          body: {
            from: value.indexOf('{') + 1,
            to: value.lastIndexOf('}')
          }
        }

        return deserializeFunction(
          value.substring(info.args.from, info.args.to),
          value.substring(info.body.from, info.body.to),
          asnc
        )
      } else if (value && typeof value === 'string' && value.match(/=>\s*{/)) {
        // Support arrow functions.
        let [args, body] = value.split(/=>\s*{\s*(.*)\s*}\s*$/)
        args = args.replace('(', '').replace(')', '')
        return deserializeFunction(args, body, asnc)
      } else {
        // Otherwise, return the value as-is.
        return value
      }
    })
  }
}

module.exports = JSOFF

function deserializeFunction (args, body, asnc) {
  if (asnc) {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
    return new AsyncFunction(args, body)
  } else {
    return new Function(args, body)
  }
}
