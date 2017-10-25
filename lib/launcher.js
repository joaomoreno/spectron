#!/usr/bin/env node

var ChildProcess = require('child_process')
var fs = require('fs')

var executablePath = null
var appArgs = []
var chromeArgs = []

process.argv.slice(2).forEach(function (arg) {
  var indexOfEqualSign = arg.indexOf('=')
  if (indexOfEqualSign === -1) {
    chromeArgs.push(arg)
    return
  }

  var name = arg.substring(0, indexOfEqualSign)
  var value = arg.substring(indexOfEqualSign + 1)
  if (name === '--spectron-path') {
    executablePath = value
  } else if (name.indexOf('--spectron-arg') === 0) {
    appArgs.push(value)
  } else if (name.indexOf('--spectron-env') === 0) {
    process.env[name.substring(15)] = value
  } else if (name.indexOf('--spectron-') !== 0) {
    chromeArgs.push(arg)
  }
})

var args = appArgs.concat(chromeArgs)
var appProcess = ChildProcess.spawn(executablePath, args)
appProcess.on('exit', function (code) { process.exit(code) })
appProcess.stderr.pipe(process.stdout)
appProcess.stdout.pipe(process.stdout)
appProcess.stdin.pipe(process.stdin)

var chromedriverPidPath = process.env['CHROMEDRIVER_PID_PATH']

fs.writeFileSync('/Users/joao/Desktop/got.txt', chromedriverPidPath)

if (chromedriverPidPath) {
  function getChromedriverPid(cb) {
    fs.readFile(chromedriverPidPath, 'utf8', function (err, raw) {
      if (err) {
        cb(err)
      } else {
        try {
          cb(null, parseInt(raw))
        } catch (err) {
          cb(err)
        }
      }
    })
  }

  var retryCount = 0;
  function tryGetChromedriverPid(cb) {
    getChromedriverPid(function (err, pid) {
      if (err) {
        retryCount++
        if (retryCount > 10) {
          cb(new Error('Could not get chromedriver pid'))
        } else {
          setTimeout(function () { tryGetChromedriverPid(cb) }, 100)
        }
      } else {
        cb(null, pid)
      }
    })
  }

  tryGetChromedriverPid(function (err, pid) {
    if (err) {
      console.warn(err)
    } else {

      // Kill oneself if one's parent dies. Much drama.
      setInterval(function () {
        try {
          process.kill(pid, 0); // throws an exception if the main process doesn't exist anymore.
        } catch (e) {
          appProcess.kill();
        }
      }, 1000);
    }
  })
}