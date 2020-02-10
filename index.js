'use strict';

const argv = process.argv.slice(2);
const log = process.env.NODE_ENV === 'production' || argv.includes('-NODE_ENV=production') || process.env.NODE_ENV === 'prod' || argv.includes('-NODE_ENV=prod') ?
  { warn: console.warn, error: console.error } :
  process.env.NODE_ENV === 'test' || argv.includes('-NODE_ENV=test') ?
  { info: console.info, warn: console.warn, error: console.error } : 
  process.env.NODE_ENV === 'development' || argv.includes('-NODE_ENV=development') || process.env.NODE_ENV === 'dev' || argv.includes('-NODE_ENV=dev') ?
  console : 
  {};
// TODO : ESM comment the following line...
exports.LOGGER = log;
// TODO : ESM uncomment the following lines...
// export const LOGGER = log;


// TODO : ESM uncomment the following line...
// export
class Labrat {

  /**
   * Runs a function from a class using `return Clazz[process.argv[2]](...args)`
   * __or__ runs through all of the `async` functions from `Object.getOwnPropertyNames(Clazz)` via
   * `await Clazz[propertyName](...args)` other than function names that are found in `excludes` or
   * `before`, `beforeEach`, `after`, `afterEach`. If the _static_ method ends with "__Error__", execution
   * will assume that the function will _throw_.
   * @ignore
   * @param {Object} Clazz The class the test running will be running for
   * @param {String[]} [excludes] Function names to exclude from execution (only used when executing all)
   * @param {*[]} [args] Any additional arguments to pass to function(s) that are executed
   * @returns {Object} The return value(s) from the designated function call with each property
   * name set to the name of the function executed and the value as the return value from the call
   */
  static async run(Clazz, excludes, ...args) {
    let prps = [], frx = /^[a-z]/i;
    for (let arg of argv) {
      if (frx.test(arg)) prps.push(arg);
    }
    if (!prps.length) prps = Object.getOwnPropertyNames(Clazz);
    if (log && log.info) log.info(`Preparing execution of ${Clazz.name}.${prps.join(`, ${Clazz.name}.`)}`);

    const excls = ['before', 'beforeEach', 'after', 'afterEach'], execr = {}, rtn = {};
    const prefix1 = '\n\x1b[37m\x1b[44m============>> ', prefix2 = ' <<============\x1b[0m\x1b[40m';
    for (let enm of excls) {
      execr[enm] = typeof Clazz[enm] === 'function' ? Clazz[enm] : null;
    }

    if (execr['before']) {
      if (log.info) log.info(`${prefix1}Executing: ${Clazz.name}.before(${args.join(',')})${prefix2}`);
      rtn['before'] = await execr['before'](...args);
    }
    let error;
    for (let prop of prps) {
      error = null;
      if (typeof Clazz[prop] !== 'function' || (excludes && excludes.includes(prop)) || excls.includes(prop)) continue;
      if (execr['beforeEach']) {
        if (log.info) log.info(`${prefix1}Executing: ${Clazz.name}.beforeEach(${args.join(',')})${prefix2}`);
        rtn['beforeEach'] = await execr['beforeEach'](...args);
      }
      try {
        if (log.info) log.info(`${prefix1}Executing: await ${Clazz.name}.${prop}(${args.join(',')})${prefix2}`);
        rtn[prop] = await Clazz[prop](...args);
        if (log.info) log.info(`\nExecution complete for: await ${Clazz.name}.${prop}(${args.join(',')})`);
      } catch (err) {
        if (prop.endsWith('Error')) {
          rtn[prop] = err;
          if (log.info) log.info(`\nExecution complete for: await ${Clazz.name}.${prop}(${args.join(',')}) -> Expected error: "${err.message}"`);
        } else {
          if (log.error) log.error(err);
          error = err;
          error.cause = `Execution failed for: await ${Clazz.name}.${prop}(${args.join(',')})`;
        }
      }
      if (execr['afterEach']) {
        if (log.info) log.info(`${prefix1}Executing: ${Clazz.name}.afterEach(${args.join(',')})${prefix2}`);
        try {
          rtn['afterEach'] = await execr['afterEach'](...args);
        } catch (err) {
          if (error && log.error) log.error(err);
          if (!error) throw err;
        }
      }
      if (error) break;
    }
    if (execr['after']) {
      if (log.info) log.info(`${prefix1}Executing: ${Clazz.name}.after(${args.join(',')})${prefix2}`);
      try {
        rtn['after'] = await execr['after'](...args);
      } catch (err) {
        if (error && log.error) log.error(err);
        if (!error) throw err;
      }
    }
    if (error) {
      if (error.cause) {
        const nerr = new Error(`\n${error.message}\n${error.cause} ... Execution aborted!`);
        nerr.cause = error;
        throw nerr;
      }
      throw error;
    }
    return rtn;
  }

 /**
  * Logs a message with header formatting
  * @param {String} msg The message to log
  * @param {String} level The log level to execute
  */
  static header(msg, level = 'info') {
    if (log && log[level]) log[level](`\n\x1b[37m\x1b[44m---> ${msg} <---\x1b[0m\x1b[40m`);
  }

  /**
   * Convenience function that will handle expected thrown errors
   * @param {(String | String[])} type The `flags` type/name that will be set on incoming flags (e.g. `onUnhandledRejection`, `onUncaughtException`, etc.)
   * @param {Object} opts The failure options
   * @param {Function} opts.expect The `@hapi/code` expect function
   * @param {String} [opts.label] The label that will be used for `expect`
   * @param {String} [opts.code] The `Error.code` that will be expected
   * @param {Function} func A _test_ function with a signature of `async function(flags)` that `@hapi/lab` accepts
   */
  static expectFailure(type, opts, func) {
    if (!type || (typeof type !== 'string' && !Array.isArray(type))) throw new Error(`A failure "type" is required to be a string or string[] set on "flags[type]". Found: ${type}`);
    if (!opts || typeof opts !== 'object') throw new Error(`Failure options are required. Found: ${opts}`);
    if (!opts.expect || typeof opts.expect !== 'function') throw new Error(`A failure "options.expect" is required to be a @hapi/code function. Found: ${opts.expect}`);
    if (!func || typeof func !== 'function') throw new Error(`A failure "func" is required to be a no-argument function. Found: ${func}`);
    return flags => {
      return new Promise(resolve => {
        const types = Array.isArray(type) ? type : [type];
        for (let typ of types) {
          flags[typ] = err => {
            if (log.info || log.debug) {
              (log.debug || log.info)(`Expected error message received for${opts.code ? ` (code ${err.code})` : ''}: ${err.message}`, log.debug ? err : '');
            }
            opts.expect(err, opts.label).to.be.error();
            if (opts.code) opts.expect(err.code, `${opts.label || ''} error.code`).to.equal(opts.code);
            resolve();
          };
        }
        return func();
      });
    };
  }

  /**
   * Async test that will either `resolve`/`reject` after a given amount of time
   * @async
   * @param {Integer} delay The delay in milliseconds to wait before resolving/rejecting
   * @param {*} [val] The value to return when resolved or error message/Error when rejecting
   * @param {Boolean} [rejectIt] `true` to reject, otherwise resolve
   */
  static wait(delay, val, rejectIt) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (rejectIt) reject(val instanceof Error ? val : new Error(val));
        else resolve(val);
      }, delay);
    });
  }

  /**
   * @returns {Boolean} `true` when the process is being ran from a _test utility_
   */
  static usingTestRunner() {
    return process.mainModule.filename.endsWith('lab');
  }
}

// TODO : ESM remove the following line...
exports.Labrat = Labrat;