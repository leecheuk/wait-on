import waitOn from '../lib/wait-on';
import fs from 'fs';
import http, { Server } from 'http';
import path from 'path';
import { mkdirp } from 'mkdirp'
import { describe, afterEach, it, expect } from 'vitest';

const temp = require('temp');

temp.track(); // cleanup files on exit

describe('api', function () {
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
      waitOn(opts, function (err) {
        expect(err).not.toBeTruthy();
  
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

      waitOn(opts, function (err) {
        expect(err).not.toBeTruthy();
  
      });
    });
  });

  it('should succeed when http resources are become available later', function () {
    const opts = {
      resources: ['http://localhost:3008', 'http://localhost:3008/foo']
    };

    setTimeout(function () {
      httpServer = http.createServer().on('request', function (req, res) {
        res.end('data');
      });
      httpServer.listen(3008, 'localhost');
    }, 300);

    waitOn(opts, function (err) {
      expect(err).not.toBeTruthy();
    });
  });

  it('should succeed when custom validateStatus fn is provided http resource returns 401', function () {
    const opts = {
      resources: ['http://localhost:3003'],
      validateStatus: function (status: number) {
        return status === 401 || (status >= 200 && status < 300);
      }
    };

    setTimeout(function () {
      httpServer = http.createServer().on('request', function (req, res) {
        res.statusCode = 401;
        res.end('Not authorized');
      });
      httpServer.listen(3003, 'localhost');
    }, 300);

    waitOn(opts, function (err) {
      expect(err).not.toBeTruthy();
    });
  });

  it('should succeed when http resource become available later via redirect', function () {
    const opts = {
      // followRedirect: true // default is true
      resources: ['http://localhost:3004']
    };

    setTimeout(function () {
      httpServer = http.createServer().on('request', function (req, res) {
        const pathname = req.url;
        if (pathname === '/') {
          res.writeHead(302, { Location: 'http://localhost:3004/foo' });
        }
        res.end('data');
      });
      httpServer.listen(3004, 'localhost');
    }, 300);

    waitOn(opts, function (err) {
      expect(err).not.toBeTruthy();
    });
  });

  it('should succeed when http GET resources become available later', function () {
    const opts = {
      resources: ['http-get://localhost:3011', 'http-get://localhost:3011/foo']
    };

    setTimeout(function () {
      httpServer = http.createServer().on('request', function (req, res) {
        res.end('data');
      });
      httpServer.listen(3011, 'localhost');
    }, 300);

    waitOn(opts, function (err) {
      expect(err).not.toBeTruthy();
    });
  });

  it('should succeed when http GET resource become available later via redirect', function () {
    const opts = {
      // followRedirect: true, // default is true
      resources: ['http-get://localhost:3005']
    };

    setTimeout(function () {
      httpServer = http.createServer().on('request', function (req, res) {
        const pathname = req.url;
        if (pathname === '/') {
          res.writeHead(302, { Location: 'http://localhost:3005/foo' });
        }
        res.end('data');
      });
      httpServer.listen(3005, 'localhost');
    }, 300);

    waitOn(opts, function (err) {
      expect(err).not.toBeTruthy();
    });
  });

  /*
  it('should succeed when an https resource is available', function () {
    const opts = {
      resources: [
        'https://www.google.com'
      ]
    };

    waitOn(opts, function (err) {
      expect(err).not.toBeTruthy();
    });
  });

  it('should succeed when an https GET resource is available', function () {
    const opts = {
      resources: [
        'https-get://www.google.com'
      ]
    };

    waitOn(opts, function (err) {
      expect(err).not.toBeTruthy();
    });
  });
  */

  it('should succeed when a service is listening to tcp port', function () {
    const opts = {
      resources: ['tcp:localhost:3001', 'tcp:3001']
    };

    setTimeout(function () {
      httpServer = http.createServer().on('request', function (req, res) {
        res.end('data');
      });
      httpServer.listen(3001, 'localhost');
    }, 300);

    waitOn(opts, function (err) {
      expect(err).not.toBeTruthy();
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

      waitOn(opts, function (err) {
        expect(err).not.toBeTruthy();
  
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

      waitOn(opts, function (err) {
        expect(err).not.toBeTruthy();
  
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

      waitOn(opts, function (err) {
        expect(err).not.toBeTruthy();
  
      });
    });
  });

  // Error situations

  it('should timeout when all resources are not available and timeout option is specified', function () {
    temp.mkdir({}, function (err: unknown, dirPath: string) {
      if (err) {
        console.error(err);
        throw Error(`Failed to create folder ${dirPath}`);
      }
      const opts = {
        resources: [path.resolve(dirPath, 'foo')],
        timeout: 1000
      };
      waitOn(opts, function (err) {
        expect(err).toBeTruthy();
  
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
      waitOn(opts, function (err) {
        expect(err).toBeTruthy();
  
      });
    });
  });

  it('should timeout when an http resource returns 404', function () {
    const opts = {
      resources: ['http://localhost:3002'],
      timeout: 1000,
      interval: 100,
      window: 100
    };

    setTimeout(function () {
      httpServer = http.createServer().on('request', function (req, res) {
        res.statusCode = 404;
        res.end('data');
      });
      httpServer.listen(3002, 'localhost');
    }, 300);

    waitOn(opts, function (err) {
      expect(err).toBeTruthy();
    });
  });

  it('should timeout when an http resource is not available', function () {
    const opts = {
      resources: ['http://localhost:3010'],
      timeout: 1000,
      interval: 100,
      window: 100
    };

    waitOn(opts, function (err) {
      expect(err).toBeTruthy();
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

    waitOn(opts, function (err) {
      expect(err).toBeTruthy();
    });
  });

  it('should timeout when followRedirect is false and http resource redirects', function () {
    const opts = {
      timeout: 1000,
      interval: 100,
      window: 100,
      followRedirect: false,
      resources: ['http://localhost:3006']
    };

    httpServer = http.createServer().on('request', function (req, res) {
      const pathname = req.url;
      if (pathname === '/') {
        res.writeHead(302, { Location: 'http://localhost:3006/foo' });
      }
      res.end('data');
    });
    httpServer.listen(3006, 'localhost');

    waitOn(opts, function (err) {
      expect(err).toBeTruthy();
    });
  });

  it('should timeout when an http GET resource is not available', function () {
    const opts = {
      resources: ['http-get://localhost:3010'],
      timeout: 1000,
      interval: 100,
      window: 100
    };

    waitOn(opts, function (err) {
      expect(err).toBeTruthy();
    });
  });

  it('should timeout when an https resource is not available', function () {
    const opts = {
      resources: ['https://localhost:3010/foo/bar'],
      timeout: 1000,
      interval: 100,
      window: 100
    };

    waitOn(opts, function (err) {
      expect(err).toBeTruthy();
    });
  });

  it('should timeout when an https GET resource is not available', function () {
    const opts = {
      resources: ['https-get://localhost:3010/foo/bar'],
      timeout: 1000,
      interval: 100,
      window: 100
    };

    waitOn(opts, function (err) {
      expect(err).toBeTruthy();
    });
  });

  it('should timeout when followRedirect is false and http GET resource redirects', function () {
    const opts = {
      timeout: 1000,
      interval: 100,
      window: 100,
      followRedirect: false,
      resources: ['http-get://localhost:3007']
    };

    httpServer = http.createServer().on('request', function (req, res) {
      const pathname = req.url;
      if (pathname === '/') {
        res.writeHead(302, { Location: 'http://localhost:3007/foo' });
      }
      res.end('data');
    });
    httpServer.listen(3007, 'localhost');

    waitOn(opts, function (err) {
      expect(err).toBeTruthy();
    });
  });

  it('should timeout when a service is not listening to tcp port', function () {
    const opts = {
      resources: ['tcp:localhost:3010'],
      timeout: 1000
    };

    waitOn(opts, function (err) {
      expect(err).toBeTruthy();
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

      waitOn(opts, function (err) {
        expect(err).toBeTruthy();
  
      });
    });
  });

  it('should timeout when a service host is unreachable', function () {
    const opts = {
      resources: ['tcp:256.0.0.1:1234'],
      timeout: 1000,
      tcpTimeout: 1000
    };

    waitOn(opts, function (err) {
      expect(err).toBeTruthy();
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

      waitOn(opts, function (err) {
        expect(err).toBeTruthy();
  
      });
    });
  });

  it('should timeout when an http service listening to a socket is too slow', function () {
    let socketPath: string;
    temp.mkdir({}, function (err: unknown, dirPath: string) {
      if (err) {
        console.error(err);
        throw Error(`Failed to create folder ${dirPath}`);
      }
      socketPath = path.resolve(dirPath, 'sock');
      const opts = {
        resources: ['package.json', 'http://unix:' + socketPath + ':/', 'http://unix:' + socketPath + ':/foo'],
        timeout: 1000,
        interval: 100,
        window: 100
      };

      httpServer = http.createServer().on('request', function (req, res) {
        setTimeout(function () {
          // res.statusCode = 404;
          res.end('data');
        }, 1100);
      });
      httpServer.listen(socketPath);

      waitOn(opts, function (err) {
        expect(err).toBeTruthy();
  
      });
    });
  });

  it('should succeed when a service host is unreachable in reverse mode', function () {
    const opts = {
      resources: ['tcp:256.0.0.1:1234'],
      interval: 100,
      timeout: 1000,
      tcpTimeout: 1000,
      reverse: true,
      window: 100
    };

    waitOn(opts, function (err) {
      if (err) {
        console.error(err);
        throw Error(`An error occurred`);
      }
      expect(err).not.toBeTruthy();
    });
  });

  it('should succeed when file resources are not available in reverse mode', function () {
    temp.mkdir({}, function (err: unknown, dirPath: string) {
      if (err) {
        console.error(err);
        throw Error(`Failed to create folder ${dirPath}`);
      }
      const opts = {
        resources: [path.resolve(dirPath, 'foo'), path.resolve(dirPath, 'bar')],
        reverse: true
      };
      waitOn(opts, function (err) {
        expect(err).not.toBeTruthy();
  
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
        resources: [path.resolve(dirPath, 'foo'), path.resolve(dirPath, 'bar')],
        reverse: true
      };
      fs.writeFileSync(opts.resources[0], 'data1');
      fs.writeFileSync(opts.resources[1], 'data2');
      setTimeout(function () {
        fs.unlinkSync(opts.resources[0]);
        fs.unlinkSync(opts.resources[1]);
      }, 300);
      waitOn(opts, function (err) {
        expect(err).not.toBeTruthy();
  
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
        resources: [path.resolve(dirPath, 'foo'), path.resolve(dirPath, 'bar')],
        reverse: true,
        timeout: 1000
      };
      fs.writeFileSync(opts.resources[0], 'data1');
      fs.writeFileSync(opts.resources[1], 'data2');
      waitOn(opts, function (err) {
        expect(err).toBeTruthy();
      });
    });
  });

  describe('promise support', function () {
    it('should succeed when file resources are available', async function () {
      temp.mkdir({}, async function (err: unknown, dirPath: string) {
        if (err) {
        console.error(err);
        throw Error(`Failed to create folder ${dirPath}`);
      }
        const opts = {
          resources: [path.resolve(dirPath, 'foo'), path.resolve(dirPath, 'bar')]
        };
        fs.writeFileSync(opts.resources[0], 'data1');
        fs.writeFileSync(opts.resources[1], 'data2');

        await expect(waitOn(opts)).resolves.toBeFalsy();
      });
    });

    it('should succeed when file resources are become available later', async function () {
      temp.mkdir({}, async function (err: unknown, dirPath: string) {
        if (err) {
        console.error(err);
        throw Error(`Failed to create folder ${dirPath}`);
      }
        const opts = {
          resources: [path.resolve(dirPath, 'foo'), path.resolve(dirPath, 'bar')]
        };

        setTimeout(function () {
          fs.writeFile(opts.resources[0], 'data1', function () {});
          fs.writeFile(opts.resources[1], 'data2', function () {});
        }, 300);

        await expect(waitOn(opts)).resolves.toBeFalsy();
      });
    });

    it('should timeout when all resources are not available and timeout option is specified', async function () {
      temp.mkdir({}, async function (err: unknown, dirPath: string) {
        if (err) {
          console.error(err);
          throw Error(`Failed to create folder ${dirPath}`);
        }
        const opts = {
          resources: [path.resolve(dirPath, 'foo')],
          timeout: 1000
        };

        await expect(waitOn(opts)).rejects.toBeTruthy();
      });
    });

    it('should timeout when some resources are not available and timeout option is specified', async function () {
      temp.mkdir({}, async function (err: unknown, dirPath: string) {
        if (err) {
          console.error(err);
          throw Error(`Failed to create folder ${dirPath}`);
        }
        const opts = {
          resources: [path.resolve(dirPath, 'foo'), path.resolve(dirPath, 'bar')],
          timeout: 1000
        };
        fs.writeFile(opts.resources[0], 'data', function () {});

        await expect(waitOn(opts)).rejects.toBeTruthy();
      });
    });

    it('should succeed when file resources are not available in reverse mode', async function () {
      temp.mkdir({}, async function (err: unknown, dirPath: string) {
        if (err) {
          console.error(err);
          throw Error(`Failed to create folder ${dirPath}`);
        }
        const opts = {
          resources: [path.resolve(dirPath, 'foo'), path.resolve(dirPath, 'bar')],
          reverse: true
        };

        await expect(waitOn(opts)).resolves.toBeFalsy();
      });
    });

    it('should succeed when file resources are not available later in reverse mode', async function () {
      temp.mkdir({}, async function (err: unknown, dirPath: string) {
        if (err) {
          console.error(err);
          throw Error(`Failed to create folder ${dirPath}`);
        }
        const opts = {
          resources: [path.resolve(dirPath, 'foo'), path.resolve(dirPath, 'bar')],
          reverse: true
        };
        fs.writeFileSync(opts.resources[0], 'data1');
        fs.writeFileSync(opts.resources[1], 'data2');
        setTimeout(function () {
          fs.unlinkSync(opts.resources[0]);
          fs.unlinkSync(opts.resources[1]);
        }, 300);

        await expect(waitOn(opts)).resolves.toBeFalsy();
      });
    });

    it('should timeout when file resources are available in reverse mode', async function () {
      temp.mkdir({}, async function (err: unknown, dirPath: string) {
        if (err) {
          console.error(err);
          throw Error(`Failed to create folder ${dirPath}`);
        }
        const opts = {
          resources: [path.resolve(dirPath, 'foo'), path.resolve(dirPath, 'bar')],
          reverse: true,
          timeout: 1000
        };
        fs.writeFileSync(opts.resources[0], 'data1');
        fs.writeFileSync(opts.resources[1], 'data2');

        await expect(waitOn(opts)).rejects.toBeTruthy();
      });
    });
  });
});
