/**
 * File Description:
 * This file contains the large AI model for the Image to Text feature.
 */

import * as tf from '@tensorflow/tfjs';

import { getToken } from './auth';
import Logger from './log';

const log = new Logger('i2t-model-large', getToken);

/**
 * Preprocess the image to be compatible with the model
 * The inputs pixel values are scaled between -1 and 1, sample-wise.
 *
 * @param {ImageData} image Image to preprocess
 * @returns {tf.Tensor} Preprocessed image tensor (shape: [1, 299, 299, 3])
 */
const preprocess_img = (image) => {
    const tensor = tf.browser.fromPixels(image)
        .resizeNearestNeighbor([299, 299])
        .toFloat()
        .sub(127.5)
        .div(127.5)
        .expandDims();

    return tensor;
}

/**
 * Get the encoded vector of the image
 *
 * @param {tf.Tensor} image (shape: [1, 299, 299, 3])
 * @param {*} model Image feature extractor model to use for prediction
 * @returns {tf.Tensor} Encoded vector of the image (shape: [1, 2048])
 */
const encode = (image, model) => {
    image = preprocess_img(image);
    const vec = model.predict(image);
    return vec;
}

/**
 * Greedy search to generate a caption for the image
 *
 * @param {tf.Tensor} img_e Encoded vector-representation of the image
 * @param {*} model Image feature to image caption model to use for prediction
 * @param {Object} wordtoix Mapping of word to index
 * @param {Object} ixtoword Mapping of index to word
 * @param {number} max_length Maximum length of the caption (default: 74)
 * @returns {string} Description of the image
 */
const greedy_search = (img_e, model, wordtoix, ixtoword, max_length = 74) => {
    let start = 'startseq';
    for (let i = 0; i < max_length; i++) {
        const seq = start.split(' ').map(word => wordtoix[word]).filter(word => word !== undefined);
        const paddedSeq = tf.pad(tf.tensor2d(seq, [1, seq.length]), [[0, 0], [0, max_length - seq.length]]);
        const yhat = model.predict([img_e, paddedSeq], { verbose: 0 });
        const yhatArgmax = tf.argMax(yhat, 1).dataSync()[0];
        const word = ixtoword[yhatArgmax];
        start += ' ' + word;
        if (word === 'endseq') {
            break;
        }
    }
    const final = start.split(' ').slice(1, -1).join(' ');
    return final;
}

/**
 * Beam search to generate a caption for the image
 *
 * @param {tf.Tensor} img_e Encoded vector-representation of the image
 * @param {*} model Image feature to image caption model to use for prediction
 * @param {Object} wordtoix Mapping of word to index
 * @param {Object} ixtoword Mapping of index to word
 * @param {number} max_length Maximum length of the caption (default: 74)
 * @param {number} beam_index Beam index (default: 3)
 * @returns {string} Description of the image
 */
const beam_search = (img_e, model, wordtoix, ixtoword, max_length = 74, beam_index = 3) => {
    const start = [wordtoix["startseq"]];
    let start_word = [[start, 0.0]];
    while (start_word[0][0].length < max_length) {
        let temp = [];
        for (let s of start_word) {
            const par_caps = tf.pad(tf.tensor2d(s[0], [1, s[0].length]), [[0, 0], [0, max_length - s[0].length]]);
            const e = img_e;
            const preds = model.predict([e, par_caps], { verbose: 0 });
            const word_preds = tf.topk(preds, beam_index).indices.dataSync();
            for (let w of word_preds) {
                const next_cap = [...s[0]];
                next_cap.push(w);
                const prob = s[1] + preds.dataSync()[w];
                temp.push([next_cap, prob]);
            }
        }
        start_word = temp.sort((a, b) => a[1] - b[1]).slice(-beam_index);
    }
    const start_word_final = start_word.slice(-1)[0][0];
    const intermediate_caption = start_word_final.map(i => ixtoword[i]);
    const final_caption = intermediate_caption.slice(1).join(' ').split('endseq')[0];
    return final_caption;
}

export default class I2TModelL {

    constructor() {
        this.loaded = false;
    }

    /**
     * Loads the image-to-text model.
     */
    async load() {
        log.info('Loading the large I2T model...');
        const startTime = performance.now();

        const wordtoix_url = chrome.runtime.getURL('tfjs/onehotencoding/wordtoix.json');
        const ixtoword_url = chrome.runtime.getURL('tfjs/onehotencoding/ixtoword.json');
        const feature_extractor_url = chrome.runtime.getURL('tfjs/img_to_feature/model.json');
        const nlp_url = chrome.runtime.getURL('tfjs/feature_to_caption/model.json');

        try {
            // Load everything concurrently
            [this.wordtoix, this.ixtoword, this.feature_extractor, this.nlp] = await Promise.all([
                fetch(wordtoix_url).then(response => response.json()),
                fetch(ixtoword_url).then(response => response.json()),
                tf.loadLayersModel(feature_extractor_url),
                tf.loadLayersModel(nlp_url)
            ]);

            const totalTime = Math.floor(performance.now() - startTime);
            log.info(`Model loaded and initialized in ${totalTime} ms...`);
        } catch (e) {
            log.error('Unable to load the model.', e);
        }

        this.loaded = true;
    }

    /**
     * Describes the image using the model.
     *
     * @param {ImageData} imageData The image to describe.
     * @param {string} url The URL of the image.
     *
     * @returns {string} The description of the image.
     */
    async describeImage(imageData, url) {
        if (!this.loaded) {
            log.warn('Waiting for model to load...');
            // wait for the model to load
            await new Promise((resolve) => {
                const interval = setInterval(() => {
                    if (this.loaded) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 1000);
            });
        }

        log.debug(`Describing image: ${url}`);
        const img_e = encode(imageData, this.feature_extractor);
        const result = greedy_search(img_e, this.nlp, this.wordtoix, this.ixtoword);
        log.debug(`Description for ${url}: ${result}`);

        return result;
    }
}
