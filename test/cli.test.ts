import childProcess, { ExecOptions } from 'child_process';
import fs from 'fs';
import http, { Server } from 'http';
import path from 'path';
import { mkdirp } from 'mkdirp'
import { describe, afterEach, it, expect } from 'vitest';
const temp = require('temp');

temp.track(); // cleanup files on exit

const CLI_PATH = path.resolve(__dirname, '../bin/wait-on');
function execCLI(args: ExecOptions, options?: any) {
  const fullArgs = [CLI_PATH].concat(args as string[]);
  return childProcess.spawn(process.execPath, fullArgs, options);
}


const FAST_OPTS = '-t 1000 -i 100 -w 100'.split(' '); 
const FAST_OPTS_TIMEOUT_UNIT = '-t 1s -i 100 -w 100'.split(' ');


describe('cli', function () {
  let httpServer: Server|null = null;

  afterEach(function () {
    if (httpServer) {
      httpServer.close();
      httpServer = null;
    }
  });

  it('should succeed when file resources are available', function () {
    temp.mkdir({}, function (err: unknown, dirPath: string) {
      if (err) {
        console.error(err);
        throw Error(`Failed to create folder ${dirPath}`);
      }
      const opts = {
        resources: [path.resolve(dirPath, 'foo'), path.resolve(dirPath, 'bar/deeper/deep/yet')]
      };
      fs.writeFileSync(opts.resources[0], 'data1');
      mkdirp.sync(path.dirname(opts.resources[1]));
      fs.writeFileSync(opts.resources[1], 'data2');

      execCLI(opts.resources.concat(FAST_OPTS) as any, {}).on('exit', function (code) {
        expect(code).toBe(0);
      });
    });
  });

  it('should succeed when file resources are become available later', function () {
    temp.mkdir({}, function (err: unknown, dirPath: string) {
      if (err) {
        console.error(err);
        throw Error(`Failed to create folder ${dirPath}`);
      }
      const opts = {
        resources: [path.resolve(dirPath, 'foo'), path.resolve(dirPath, 'bar/deeper/deep/yet')]
      };

      setTimeout(function () {
        fs.writeFile(opts.resources[0], 'data1', function () {});
        mkdirp.sync(path.dirname(opts.resources[1]));
        fs.writeFile(opts.resources[1], 'data2', function () {});
      }, 300);

      execCLI(opts.resources.concat(FAST_OPTS) as any, {}).on('exit', function (code) {
        expect(code).toBe(0);
      });
    });
  });

  it('should succeed when http resources become available later', function () {
    const opts = {
      resources: ['http://localhost:8000', 'http://localhost:8000/foo']
    };

    setTimeout(function () {
      httpServer = http.createServer().on('request', function (req, res) {
        res.end('data');
      });
      httpServer.listen(8000, 'localhost');
    }, 300);

    execCLI(opts.resources.concat(FAST_OPTS) as any, {}).on('exit', function (code) {
      expect(code).toBe(0)
    });
  });

  it('should succeed when http resources become available later via redirect', function () {
    const opts = {
      resources: ['http://localhost:8001']
    };

    setTimeout(function () {
      httpServer = http.createServer().on('request', function (req, res) {
        const pathname = req.url;
        if (pathname === '/') {
          res.writeHead(302, { Location: 'http://localhost:8001/foo' });
        }
        res.end('data');
      });
      httpServer.listen(8001, 'localhost');
    }, 300);

    execCLI(opts.resources.concat(FAST_OPTS) as any, {}).on('exit', function (code) {
      expect(code).toBe(0)
    });
  });

  it('should succeed when http GET resources become available later', function () {
    const opts = {
      resources: ['http-get://localhost:8002', 'http-get://localhost:8002/foo']
    };

    setTimeout(function () {
      httpServer = http.createServer().on('request', function (req, res) {
        res.end('data');
      });
      httpServer.listen(8002, 'localhost');
    }, 300);

    execCLI(opts.resources.concat(FAST_OPTS) as any, {}).on('exit', function (code) {
      expect(code).toBe(0)
    });
  });

  it('should succeed when http GET resources become available later via redirect', function () {
    const opts = {
      resources: ['http-get://localhost:8003']
    };

    setTimeout(function () {
      httpServer = http.createServer().on('request', function (req, res) {
        const pathname = req.url;
        if (pathname === '/') {
          res.writeHead(302, { Location: 'http://localhost:8003/foo' });
        }
        res.end('data');
      });
      httpServer.listen(8003, 'localhost');
    }, 300);

    execCLI(opts.resources.concat(FAST_OPTS) as any, {}).on('exit', function (code) {
      expect(code).toBe(0)
    });
  });

  /*
  it('should succeed when an https resource is available', function () {
    const opts = {
      resources: [
        'https://www.google.com'
      ]
    };

    execCLI(opts.resources.concat(FAST_OPTS) as any, {})
      .on('exit', function (code) {
        expect(code).toBe(0);
      });
  });
  */

  it('should succeed when a service is listening to tcp port', function () {
    const opts = {
      resources: ['tcp:localhost:3030', 'tcp:3030']
    };

    setTimeout(function () {
      httpServer = http.createServer().on('request', function (req, res) {
        res.end('data');
      });
      httpServer.listen(3030, 'localhost');
    }, 300);

    execCLI(opts.resources.concat(FAST_OPTS) as any, {}).on('exit', function (code) {
      expect(code).toBe(0)
    });
  });

  it('should succeed when a service is listening to a socket', function () {
    let socketPath: string;
    temp.mkdir({}, function (err: unknown, dirPath: string) {
      if (err) {
        console.error(err);
        throw Error(`Failed to create folder ${dirPath}`);
      }
      socketPath = path.resolve(dirPath, 'sock');
      const opts = {
        resources: ['socket:' + socketPath]
      };

      setTimeout(function () {
        httpServer = http.createServer();
        httpServer.listen(socketPath);
      }, 300);

      execCLI(opts.resources.concat(FAST_OPTS) as any, {}).on('exit', function (code) {
        expect(code).toBe(0);
      });
    });
  });

  it('should succeed when a http service is listening to a socket', function () {
    let socketPath: string;
    temp.mkdir({}, function (err: unknown, dirPath: string) {
      if (err) {
        console.error(err);
        throw Error(`Failed to create folder ${dirPath}`);
      }
      socketPath = path.resolve(dirPath, 'sock');
      const opts = {
        resources: ['http://unix:' + socketPath + ':/', 'http://unix:' + socketPath + ':/foo']
      };

      setTimeout(function () {
        httpServer = http.createServer().on('request', function (req, res) {
          res.end('data');
        });
        httpServer.listen(socketPath);
      }, 300);

      execCLI(opts.resources.concat(FAST_OPTS) as any, {}).on('exit', function (code) {
        expect(code).toBe(0);
      });
    });
  });

  it('should succeed when a http GET service is listening to a socket', function () {
    let socketPath: string;
    temp.mkdir({}, function (err: unknown, dirPath: string) {
      if (err) {
        console.error(err);
        throw Error(`Failed to create folder ${dirPath}`);
      }
      socketPath = path.resolve(dirPath, 'sock');
      const opts = {
        resources: ['http-get://unix:' + socketPath + ':/', 'http-get://unix:' + socketPath + ':/foo']
      };

      setTimeout(function () {
        httpServer = http.createServer().on('request', function (req, res) {
          res.end('data');
        });
        httpServer.listen(socketPath);
      }, 300);

      execCLI(opts.resources.concat(FAST_OPTS) as any, {}).on('exit', function (code) {
        expect(code).toBe(0);
      });
    });
  });

  // Error situations

  it('should timeout when all resources are not available and timout option is specified', function () {
    temp.mkdir({}, function (err: unknown, dirPath: string) {
      if (err) {
        console.error(err);
        throw Error(`Failed to create folder ${dirPath}`);
      }
      const opts = {
        resources: [path.resolve(dirPath, 'foo')],
        timeout: 1000
      };
      // timeout is in FAST_OPTS
      execCLI(opts.resources.concat(FAST_OPTS) as any, {}).on('exit', function (code) {
        expect(code).not.toBe(0);
      });
    });
  });

  it('should timeout when all resources are not available and timout option is specified with unit', function () {
    temp.mkdir({}, function (err: unknown, dirPath: string) {
      if (err) {
        console.error(err);
        throw Error(`Failed to create folder ${dirPath}`);
      }
      const opts = {
        resources: [path.resolve(dirPath, 'foo')],
        timeout: '1s'
      };
      // timeout is in FAST_OPTS
      const options = opts.resources.concat(FAST_OPTS_TIMEOUT_UNIT);
      execCLI(options as ExecOptions, {}).on('exit', function (code) {
        expect(code).not.toBe(0);
      });
    });
  });


  it('should timeout when some resources are not available and timeout option is specified', function () {
    temp.mkdir({}, function (err: unknown, dirPath: string) {
      if (err) {
        console.error(err);
        throw Error(`Failed to create folder ${dirPath}`);
      }
      const opts = {
        resources: [path.resolve(dirPath, 'foo'), path.resolve(dirPath, 'bar')],
        timeout: 1000
      };
      fs.writeFile(opts.resources[0], 'data', function () {});
      // timeout is in FAST_OPTS
      execCLI(opts.resources.concat(FAST_OPTS) as any, {}).on('exit', function (code) {
        expect(code).not.toBe(0);
      });
    });
  });

  it('should timeout when an http resource returns 404', function () {
    const opts = {
      resources: ['http://localhost:3998'],
      timeout: 1000,
      interval: 100,
      window: 100
    };

    setTimeout(function () {
      httpServer = http.createServer().on('request', function (req, res) {
        res.statusCode = 404;
        res.end('data');
      });
      httpServer.listen(3998, 'localhost');
    }, 300);
    // timeout, interval, window are in FAST_OPTS
    execCLI(opts.resources.concat(FAST_OPTS) as any, {}).on('exit', function (code) {
      expect(code).not.toBe(0)
    });
  });

  it('should timeout when an http resource is not available', function () {
    const opts = {
      resources: ['http://localhost:3999'],
      timeout: 1000,
      interval: 100,
      window: 100
    };

    // timeout is in FAST_OPTS
    execCLI(opts.resources.concat(FAST_OPTS) as any, {}).on('exit', function (code) {
      expect(code).not.toBe(0)
    });
  });

  it('should timeout when an http resource does not respond before httpTimeout', function () {
    const opts = {
      resources: ['http://localhost:8125'],
      timeout: 1000,
      interval: 100,
      window: 100,
      httpTimeout: 70
    };

    httpServer = http.createServer().on('request', function (req, res) {
      // make it a slow response, longer than the httpTimeout
      setTimeout(function () {
        res.end('data');
      }, 90);
    });
    httpServer.listen(8125, 'localhost');

    const addOpts = '--httpTimeout 70'.split(' ');
    // timeout, interval, and window are in FAST_OPTS
    const options = opts.resources.concat(FAST_OPTS).concat(addOpts);
    execCLI(options as ExecOptions, {}).on('exit', function (code) {
      expect(code).not.toBe(0)
    });
  });

  it('should timeout when an http resource does not respond before httpTimeout specified with unit', function () {
    const opts = {
      resources: ['http://localhost:8126'],
      timeout: 1000,
      interval: 100,
      window: 100,
      httpTimeout: '70ms'
    };

    httpServer = http.createServer().on('request', function (req, res) {
      // make it a slow response, longer than the httpTimeout
      setTimeout(function () {
        res.end('data');
      }, 90);
    });
    httpServer.listen(8126, 'localhost');

    const addOpts = '--httpTimeout 70ms'.split(' ');
    // timeout, interval, and window are in FAST_OPTS
    const options = opts.resources.concat(FAST_OPTS).concat(addOpts);
    execCLI(options as ExecOptions, {}).on('exit', function (code) {
      expect(code).not.toBe(0)
    });
  });

  it('should timeout when an http GET resource is not available', function () {
    const opts = {
      resources: ['http-get://localhost:3999'],
      timeout: 1000,
      interval: 100,
      window: 100
    };

    // timeout, interval, window are in FAST_OPTS
    execCLI(opts.resources.concat(FAST_OPTS) as any, {}).on('exit', function (code) {
      expect(code).not.toBe(0)
    });
  });

  it('should timeout when an https resource is not available', function () {
    const opts = {
      resources: ['https://localhost:3010/foo/bar'],
      timeout: 1000,
      interval: 100,
      window: 100
    };

    // timeout, interval, window are in FAST_OPTS
    execCLI(opts.resources.concat(FAST_OPTS) as any, {}).on('exit', function (code) {
      expect(code).not.toBe(0)
    });
  });

  it('should timeout when an https GET resource is not available', function () {
    const opts = {
      resources: ['https-get://localhost:3010/foo/bar'],
      timeout: 1000,
      interval: 100,
      window: 100
    };

    // timeout, interval, window are in FAST_OPTS
    execCLI(opts.resources.concat(FAST_OPTS) as any, {}).on('exit', function (code) {
      expect(code).not.toBe(0)
    });
  });

  it('should timeout when a service is not listening to tcp port', function () {
    const opts = {
      resources: ['tcp:localhost:3010'],
      timeout: 1000
    };

    // timeout is in FAST_OPTS
    execCLI(opts.resources.concat(FAST_OPTS) as any, {}).on('exit', function (code) {
      expect(code).not.toBe(0)
    });
  });

  it('should timeout when a service host is unreachable', function () {
    const opts = {
      resources: ['tcp:256.0.0.1:1234'],
      timeout: 1000,
      tcpTimeout: 1000
    };

    const addOpts = '--tcpTimeout 1000'.split(' ');
    // timeout is in FAST_OPTS
    const options = opts.resources.concat(FAST_OPTS).concat(addOpts);
    execCLI(options as ExecOptions, {}).on('exit', function (code) {
      expect(code).not.toBe(0)
    });
  });

  it('should timeout when a service host is unreachable, tcpTimeout specified with unit', function () {
    const opts = {
      resources: ['tcp:256.0.0.1:1234'],
      timeout: 1000,
      tcpTimeout: '1s'
    };

    const addOpts = '--tcpTimeout 1s'.split(' ');
    // timeout is in FAST_OPTS
    const options = opts.resources.concat(FAST_OPTS).concat(addOpts);
    execCLI(options as ExecOptions, {}).on('exit', function (code) {
      expect(code).not.toBe(0)
    });
  });

  it('should timeout when a service is not listening to a socket', function () {
    let socketPath: string;
    temp.mkdir({}, function (err: unknown, dirPath: string) {
      if (err) {
        console.error(err);
        throw Error(`Failed to create folder ${dirPath}`);
      }
      socketPath = path.resolve(dirPath, 'sock');
      const opts = {
        resources: ['socket:' + socketPath],
        timeout: 1000,
        interval: 100,
        window: 100
      };

      // timeout, interval, window are in FAST_OPTS
      execCLI(opts.resources.concat(FAST_OPTS) as ExecOptions, {}).on('exit', function (code) {
        expect(code).not.toBe(0);
      });
    });
  });

  it('should timeout when an http service listening to a socket returns 404', function () {
    let socketPath: string;
    temp.mkdir({}, function (err: unknown, dirPath: string) {
      if (err) {
        console.error(err);
        throw Error(`Failed to create folder ${dirPath}`);
      }
      socketPath = path.resolve(dirPath, 'sock');
      const opts = {
        resources: ['http://unix:' + socketPath + ':/', 'http://unix:' + socketPath + ':/foo'],
        timeout: 1000,
        interval: 100,
        window: 100
      };

      setTimeout(function () {
        httpServer = http.createServer().on('request', function (req, res) {
          res.statusCode = 404;
          res.end('data');
        });
        httpServer.listen(socketPath);
      }, 300);

      // timeout, interval, window are in FAST_OPTS
      execCLI(opts.resources.concat(FAST_OPTS) as ExecOptions, {}).on('exit', function (code) {
        expect(code).not.toBe(0);
      });
    });
  });

  it('should succeed when file resources are not available in reverse mode', function () {
    temp.mkdir({}, function (err: unknown, dirPath: string) {
      if (err) {
        console.error(err);
        throw Error(`Failed to create folder ${dirPath}`);
      }
      const opts = {
        resources: [path.resolve(dirPath, 'foo'), path.resolve(dirPath, 'bar')]
      };
      const OPTS = FAST_OPTS.concat(['-r']);
      execCLI(opts.resources.concat(OPTS) as ExecOptions, {}).on('exit', function (code) {
        expect(code).toBe(0);
      });
    });
  });

  it('should succeed when file resources are not available later in reverse mode', function () {
    temp.mkdir({}, function (err: unknown, dirPath: string) {
      if (err) {
        console.error(err);
        throw Error(`Failed to create folder ${dirPath}`);
      }
      const opts = {
        resources: [path.resolve(dirPath, 'foo'), path.resolve(dirPath, 'bar')]
      };
      fs.writeFileSync(opts.resources[0], 'data1');
      fs.writeFileSync(opts.resources[1], 'data2');
      setTimeout(function () {
        fs.unlinkSync(opts.resources[0]);
        fs.unlinkSync(opts.resources[1]);
      }, 300);
      const OPTS = FAST_OPTS.concat(['-r']);
      execCLI(opts.resources.concat(OPTS) as ExecOptions, {}).on('exit', function (code) {
        expect(code).toBe(0);
      });
    });
  });

  it('should timeout when file resources are available in reverse mode', function () {
    temp.mkdir({}, function (err: unknown, dirPath: string) {
      if (err) {
        console.error(err);
        throw Error(`Failed to create folder ${dirPath}`);
      }
      const opts = {
        resources: [path.resolve(dirPath, 'foo'), path.resolve(dirPath, 'bar')]
      };
      fs.writeFileSync(opts.resources[0], 'data1');
      fs.writeFileSync(opts.resources[1], 'data2');
      const OPTS = FAST_OPTS.concat(['-r']);
      execCLI(opts.resources.concat(OPTS) as ExecOptions, {}).on('exit', function (code) {
        expect(code).not.toBe(0);
      });
    });
  });

  it('should succeed when a service host is unreachable in reverse mode', function () {
    const opts = {
      resources: ['tcp:256.0.0.1:1234'],
      timeout: 1000,
      tcpTimeout: 1000
    };
    // timeout is in FAST_OPTS
    const OPTS = FAST_OPTS.concat(['-r', '--tcpTimeout', '1000']);
    const options = opts.resources.concat(OPTS) as ExecOptions;
    execCLI(options as ExecOptions, {}).on('exit', function (code) {
      expect(code).toBe(0);
    });
  });

  describe('resources are specified in config', () => {
    it('should succeed when http resources become available later', function () {
      setTimeout(function () {
        httpServer = http.createServer().on('request', function (req, res) {
          res.end('data');
        });
        httpServer.listen(8123, 'localhost');
      }, 300);

      const options = ['--config', path.join(__dirname, 'config-http-resources.js')].concat(FAST_OPTS);
      execCLI(options as ExecOptions, {}).on(
        'exit',
        function (code) {
          expect(code).toBe(0);
        }
      );
    });

    it('should succeed when http resources from command line become available later (ignores config resources)', function () {
      setTimeout(function () {
        httpServer = http.createServer().on('request', function (req, res) {
          res.end('data');
        });
        httpServer.listen(3031, 'localhost');
      }, 300);

      const options = ['--config', path.join(__dirname, 'config-http-resources.js'), 'http://localhost:3031/'].concat(FAST_OPTS);
      execCLI(options as ExecOptions, {}).on('exit', function (code) {
        expect(code).toBe(0);
      });
    });
  });
});
