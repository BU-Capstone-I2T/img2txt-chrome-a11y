/**
 * File Description:
 * This file contains the constants used by the extension.
 * Declaring constants in a separate file makes it easier to manage and update them.
 * You can import this file into the background script, content script, and other files.
 */

export const ACTION_DESCRIBE_IMAGE = 'DESCRIBE_IMAGE';
export const ACTION_LOGIN = 'LOGIN';
export const ACTION_LOG = 'LOG';
export const SERVER_URL = 'https://i2tcapstone.azurewebsites.net';
export const SERVER_LOGIN_PATH = "/users/login"
export const SERVER_LOG = "/logs"
export const IMAGE_SIZE = 224; // Image size expected by the i2t model
export const DEFAULT_LOGGING_ENABLED = true;
