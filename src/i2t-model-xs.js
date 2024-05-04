/**
 * File Description:
 * This file contains the extra small AI model for the Image to Text feature.
 *
 * It uses a mobilenet image classifier to generate a list of predictions,
 * and then uses a simple NLP model (no ML, only if/else statements) to convert
 * the predictions into a text description.
 */
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as tf from '@tensorflow/tfjs';

import { getToken } from './auth';
import Logger from './log';
import { IMAGE_SIZE } from './constants';
import { SIMPLE_IMAGENET_LABELS, FULL_IMAGENET_LABELS } from './imagenet-labels';

const log = new Logger('i2t-model-xs', getToken);

// How many predictions to take.
const TOPK_PREDICTIONS = 2;

/**
 * Asynchronously loads a mobilenet on construction.  Subsequently handles
 * requests to classify images through the .analyzeImage API.
 */
export class ImageClassifier {
    constructor() {
        this.loadModel();
    }

    /**
     * Loads mobilenet from URL and keeps a reference to it in the object.
     */
    async loadModel() {
        log.info('Loading model...');
        const startTime = performance.now();
        try {
            this.model = await mobilenet.load({ version: 2, alpha: 1.00 });
            // Warms up the model by causing intermediate tensor values
            // to be built and pushed to GPU.
            tf.tidy(() => {
                this.model.classify(tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3]));
            });
            const totalTime = Math.floor(performance.now() - startTime);
            log.info(`Model loaded and initialized in ${totalTime} ms...`);
        } catch (e) {
            log.error('Unable to load model', e);
        }
    }

    /**
     * Triggers the model to make a prediction on the image referenced by the
     * image data.
     *
     * @param {ImageData} imageData ImageData of the image to analyze.
     * @param {string} url url of image to analyze.
     *
     * @return {Array} Array of predictions.
     */
    async analyzeImage(imageData, url) {
        if (!this.model) {
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
        log.debug(`Predicting... ${url}`);
        const startTime = performance.now();
        const predictions = await this.model.classify(imageData, TOPK_PREDICTIONS);
        const totalTime = performance.now() - startTime;
        log.benchmark(`Predicted image class in ${totalTime.toFixed(1)} ms `);
        return predictions;
    }
}

const FULL_TO_SIMPLE_LABELS = new Map(FULL_IMAGENET_LABELS.map((label, index) => [label, SIMPLE_IMAGENET_LABELS[index]]));

// Thresholds for LOW_CONFIDENCE_THRESHOLD and HIGH_CONFIDENCE_THRESHOLD,
// controlling which messages are printed.
const HIGH_CONFIDENCE_THRESHOLD = 0.5;
const LOW_CONFIDENCE_THRESHOLD = 0.1;

export class NLPModel {

    /**
     * Produces a short text string summarizing the prediction
     * Input prediction should be a list of {className: string, prediction: float}
     * objects.
     */
    textContentFromPrediction(predictions) {
        if (!predictions || predictions.length < 1) {
            return `Image unclear`;
        }

        const getLabel = (prediction) => {
            return FULL_TO_SIMPLE_LABELS.get(prediction.className);
        }

        // Seperate predictions based on confidence
        let highpred = [];
        let midpred = [];
        let lowpred = [];
        // Grab confident predictions
        const high = predictions.filter(prediction => prediction.probability >= HIGH_CONFIDENCE_THRESHOLD);
        if (high.length > 0) {
            highpred = high.map(getLabel);
        }
        // Grab mid predictions
        const mid = predictions.filter(prediction => prediction.probability >= LOW_CONFIDENCE_THRESHOLD && prediction.probability < HIGH_CONFIDENCE_THRESHOLD);
        if (mid.length > 0) {
            midpred = mid.map(getLabel);
        }
        // Grab low predictions
        const low = predictions.filter(prediction => prediction.probability < LOW_CONFIDENCE_THRESHOLD);
        if (low.length > 0) {
            lowpred = low.map(getLabel);
        }

        let result = "";
        // Confident
        if (highpred.length > 0) {
            result += "likely contains ";
            if (highpred.length > 1) {
                result += `${highpred.slice(0, -1).join(', ')} and/or ${highpred[highpred.length - 1]}`;
            } else {
                result += `${highpred[0]}`;
            }
        }

        // Not confident
        if (midpred.length > 0) {
            if (highpred.length > 0) {
                result += ", and/or may contain ";
            } else {
                result += "may contain ";
            }
            if (midpred.length > 1) {
                result += `${midpred.slice(0, -1).join(', ')} and/or ${midpred[midpred.length - 1]}`;
            } else {
                result += `${midpred[0]}`;
            }
        }

        // Very much not confident
        if (lowpred.length > 0) {
            if (highpred.length === 0 && midpred.length === 0) {
                result += "as a stretch, could contain ";
            } else {
                result += ", and/or, as a stretch, could contain ";
            }
            if (lowpred.length > 1) {
                result += `${lowpred.slice(0, -1).join(', ')} and/or ${lowpred[lowpred.length - 1]}`;
            } else {
                result += `${lowpred[0]}`;
            }
        }
        result += ".";
        return result;
    }
}

export default class I2TModelXS {
    /**
     * Loads the image-to-text model.
     */
    load() {
        this.imageClassifier = new ImageClassifier();
        this.nlpModel = new NLPModel();
    }

    /**
     * Analyzes the image and returns a text description.
     *
     * @param {ImageData} imageData The image data to analyze.
     * @param {string} url The URL of the image to analyze.
     */
    async describeImage(imageData, url) {
        return this.imageClassifier.analyzeImage(imageData, url).then((predictions) =>
            this.nlpModel.textContentFromPrediction(predictions)
        );
    }

}
