/**
 * File Description:
 * This file defines the function for getting the access token.
 */

// Token promise
let tokenPromise = null;

/**
 * Function to get the access token from Chrome storage.
 * @example
 * getToken().then(token => console.log(token));
 *
 * @returns {Promise<string>} A promise that resolves to the access token.
 *                            If the token is not yet set, the promise will resolve
 *                            when the token is eventually set.
 */
export const getToken = () => {
    if (!tokenPromise) {
        tokenPromise = new Promise((resolve) => {
            chrome.storage.sync.get("token", (response) => {
                if (response.value) {
                    // If token is already set, return it
                    resolve(response.value);
                } else {
                    // Else, listen for token getting set
                    chrome.storage.sync.onChanged.addListener((changes) => {
                        if (changes.token) {
                            resolve(changes.token.newValue);
                        }
                    });
                }
            });
        });
    }

    return tokenPromise;
}
