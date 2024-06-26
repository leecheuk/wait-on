import fs from 'fs';
import path from 'path';
import waitOn from './wait-on';
const minimist = require('minimist');

const interval = ['timeout', 'httpTimeout', 'tcpTimeout'];
const minimistOpts = {
  string: ['c', 'd', 'i', 's', 't', 'w'].concat(interval),
  boolean: ['h', 'l', 'r', 'v'],
  alias: {
    c: 'config',
    d: 'delay',
    i: 'interval',
    l: 'log',
    r: 'reverse',
    s: 'simultaneous',
    t: 'timeout',
    v: 'verbose',
    w: 'window',
    h: 'help'
  }
};

const argv = minimist(process.argv.slice(2), minimistOpts);
// if a js/json configuration file is provided require it
const configOpts = argv.config ? require(path.resolve(argv.config)) : {};
const hasResources = argv._.length || (configOpts.resources && configOpts.resources.length);

if (argv.help || !hasResources) {
  // help
  fs.createReadStream(path.join(__dirname, '/usage.txt'))
    .pipe(process.stdout)
    .on('close', function () {
      process.exit(1);
    });
} else {
  // if resources are present in the command line then they take
  // precedence over those in the config file.
  if (argv._.length) {
    configOpts.resources = argv._;
  }

  // now check for specific options and set those
  const opts = [
    'delay',
    'httpTimeout',
    'interval',
    'log',
    'reverse',
    'simultaneous',
    'timeout',
    'tcpTimeout',
    'verbose',
    'window'
  ].reduce(function (accum, x) {
    if (argv[x]) {
      let value = argv[x];
      if (interval.includes(x)) {
        value = parseInterval(value);
      }
      accum[x] = value;
    }
    return accum;
  }, configOpts);

  waitOn(opts, function (err: unknown) {
    if (err) {
      return errorExit(err);
    }
    // success, could just let it exit on its own, however since
    // rxjs window waits an extra loop before heeding the unsubscribe
    // we can exit to speed things up
    process.exit(0);
  });
}

function errorExit(err: unknown) {
  if ((err as Error).stack) {
    console.error((err as Error).stack);
  } else {
    console.error(String(err));
  }
  process.exit(1);
}

function parseInterval(arg: string) {
  const res = /^([\d.]+)(|ms|s|m|h)$/i.exec(arg);
  if (!res) {
    return arg;
  }
  const value = parseFloat(res[1]);
  switch (res[2]) {
    case '':
    case 'ms': return Math.floor(value);
    case 's': return Math.floor(value * 1000);
    case 'm': return Math.floor(value * 1000 * 60);
    case 'h': return Math.floor(value * 1000 * 60 * 60);
  }
}
