/**
 * File Description:
 * This file contains the Logger class, which is used to log messages and send them to the server.
 *
 * The Logger class sends log messages to the server using the fetch API.
 * The log messages are sent as JSON objects with the following fields:
 *   - message: the log message
 *   - level: the log level
 *   - logger: the name of the logger
 *   - timestamp: the timestamp of the log message
 *   - stacktrace: the stack trace of the log message (optional)
 */
import { SERVER_URL, SERVER_LOG } from './constants';

/**
 * Log levels for the logger
 * Each log level has a label and a value
 */
export const LogLevels = Object.freeze({
    DEBUG: {label: "debug", value: 1},
    INFO: {label: "info", value: 2},
    WARN: {label: "warn", value: 3},
    ERROR: {label: "error", value: 4},
    BENCHMARK: {label: "benchmark", value: 5}
});

/**
 * Logger class for logging messages and sending them to the server
 */
export default class Logger {

    /**
     *
     * @param {string}  name        the name of the logger
     * @param {Function} getToken   function that returns a promise that resolves
     *                              to the access token
     * @param {boolean} benchmarkEnabled whether benchmark logs should be accounted
     *                              for or ignored (defaults to true)
     */
    constructor(name, getToken, benchmarkEnabled = true) {
        this.name = name;
        this.getToken = getToken;
        this.benchmarkEnabled = benchmarkEnabled;
    }

    /**
     * Sends a log to the server
     *
     * @param {string} msg          the message to log
     * @param {object} level        the level of the log
     * @param {string} sta          the stack trace
     */
    sendLog(msg, level, sta = '') {
        this.getToken().then(token => {
            console.log(JSON.stringify(token));
            const logMessage = {
                message: msg,
                level: level,
                logger: this.name,
                timestamp: new Date().toISOString(),
                stacktrace: sta
            }

            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    logs: [logMessage],
                    count: 1
                })
            };

            fetch(`${SERVER_URL}${SERVER_LOG}`, options)
                .catch(err => console.error(err));
        });
    }

    debug(msg) {
        console.debug(msg);
        this.sendLog(msg, LogLevels.DEBUG);
    }

    info(msg) {
        console.log(msg);
        this.sendLog(msg, LogLevels.INFO);
    }

    warn(msg) {
        console.warn(msg);
        this.sendLog(msg, LogLevels.WARN);
    }

    error(msg, sta) {
        const stack = sta ?? new Error().stack;
        console.error(msg, stack);
        this.sendLog(msg, LogLevels.ERROR, stack);
    }

    benchmark(msg) {
        if (this.benchmarkEnabled) {
            console.log(msg);
            this.sendLog(msg, LogLevels.BENCHMARK);
        }
    }
}
