/**
 * File Description:
 * This file defines the function for getting the access token.
 */

// Token promise
let tokenPromise = null;

// Gets access token from storage
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
