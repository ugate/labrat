# @ugate/labrat
Run [@hapi/lab](https://github.com/hapijs/lab) tests on vanilla test suites

`npm install -D @ugate/labrat`

__test/lib/tester.js__:
```js
// vanilla test suite (all tests should be static)

const { Labrat, LOGGER } = require('@ugate/labrat');

class Tester {

  static myTest1() {
    if (LOGGER.info) LOGGER.info('Show this when info level enabled');
    // test here
  }

  async static myTest2() {
    // test here
  }
}

// when not ran in a test runner execute static Tester functions (excluding what's passed into Labrat.run) 
if (!Labrat.usingTestRunner()) {
  (async () => await Labrat.run(Tester))();
}
```

__test/tester.js__:
```js
const Lab = require('@hapi/lab');
const Tester = require('./lib/tester');
const lab = Lab.script();
exports.lab = lab;

const plan = `Demo`;

lab.experiment(plan, () => {
  lab.test(`${plan}: Test #1`, { timeout: 1000 }, Tester.myTest1);
  lab.test(`${plan}: Test #2`, { timeout: 1000 }, Tester.myTest2);
});
```

#### Log Levels
- `-NODE_ENV=dev` - All levels/functions included in _console_
- `-NODE_ENV=test` - Includes _console.info_, _console.warn_, _console.error_
- Omit or set to another environment to disable logging

#### Running Tests
Tests can be ran in a `Node.js` command or in [@hapi/lab](https://github.com/hapijs/lab).

Run in node:

`node test/lib/tester.js -NODE_ENV=test`

Run _myTest1_ in node:

`node test/lib/tester.js -NODE_ENV=test myTest1`

Run in [@hapi/lab](https://github.com/hapijs/lab):

`"node_modules/.bin/lab" test/tester.js -v`

Run _myTest1_ in [@hapi/lab](https://github.com/hapijs/lab):

`"node_modules/.bin/lab" test/tester.js -vi 1`

Run _myTest2_ in [@hapi/lab](https://github.com/hapijs/lab):
`"node_modules/.bin/lab" test/tester.js -vi 2`
