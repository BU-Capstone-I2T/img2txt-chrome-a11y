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
import { SERVER_URL, SERVER_LOG_PATH, DEFAULT_LOGGING_ENABLED } from './constants';

let loggingEnabled = DEFAULT_LOGGING_ENABLED;

/**
 * Load whether logging is enabled from the extension settings
 *
 * @returns {Promise} a promise that resolves when the logging state is loaded
 */
export const loadLoggingState = () => {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['logging'], (result) => {
            if (result.logging === undefined) {
                result.logging = DEFAULT_LOGGING_ENABLED;
            }
            loggingEnabled = result.logging;
            resolve();
        });
    });
};

// Listen for changes to extension settings
chrome.storage.sync.onChanged.addListener((changes) => {
    if (changes.logging) {
        loggingEnabled = changes.logging.newValue;
    }
});

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
     * @param {Object} level        the level of the log
     * @param {string} sta          the stack trace
     */
    sendLog(msg, level, sta = '') {
        if (!loggingEnabled) {
            return;
        }
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

            fetch(`${SERVER_URL}${SERVER_LOG_PATH}`, options)
                .catch(err => console.error(err));
        });
    }

    debug(msg) {
        if (!loggingEnabled) {
            return;
        }
        console.debug(msg);
        this.sendLog(msg, LogLevels.DEBUG);
    }

    info(msg) {
        if (!loggingEnabled) {
            return;
        }
        console.log(msg);
        this.sendLog(msg, LogLevels.INFO);
    }

    warn(msg) {
        if (!loggingEnabled) {
            return;
        }
        console.warn(msg);
        this.sendLog(msg, LogLevels.WARN);
    }

    error(msg, sta) {
        if (!loggingEnabled) {
            return;
        }
        const stack = sta ?? new Error().stack;
        console.error(msg, stack);
        this.sendLog(msg, LogLevels.ERROR, stack);
    }

    benchmark(msg) {
        if (!loggingEnabled) {
            return;
        }
        if (this.benchmarkEnabled) {
            console.log(msg);
            this.sendLog(msg, LogLevels.BENCHMARK);
        }
    }
}
