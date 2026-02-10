/**
 * Utility to handle Teachable Machine Pose and Image model loading and prediction.
 * Uses dynamic script injection to load the required libraries from CDN.
 */

const TM_POSE_SCRIPT = "https://cdn.jsdelivr.net/npm/@teachablemachine/pose@0.8/dist/teachablemachine-pose.min.js";
const TM_IMAGE_SCRIPT = "https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js";
const TF_SCRIPT = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js";

let isLibraryLoaded = false;
let isLoadingLibrary = false;
let isImageLibraryLoaded = false;
let isLoadingImageLibrary = false;

/**
 * Loads the Teachable Machine POSE scripts dynamically
 */
export const loadScripts = () => {
    return new Promise((resolve, reject) => {
        if (isLibraryLoaded) {
            resolve();
            return;
        }

        if (isLoadingLibrary) {
            // Check every 100ms if library started or failed loading
            const checkParams = setInterval(() => {
                if (isLibraryLoaded) {
                    clearInterval(checkParams);
                    resolve();
                } else if (!isLoadingLibrary) {
                    clearInterval(checkParams);
                    reject(new Error('Library loading failed in another call'));
                }
            }, 100);
            return;
        }

        isLoadingLibrary = true;

        // Load TensorFlow.js first
        const tfScript = document.createElement('script');
        tfScript.src = TF_SCRIPT;
        tfScript.onload = () => {
            console.log('TensorFlow.js loaded for Teachable Machine');

            // Then load TM Pose
            const tmScript = document.createElement('script');
            tmScript.src = TM_POSE_SCRIPT;
            tmScript.onload = () => {
                console.log('Teachable Machine Pose loaded');
                isLibraryLoaded = true;
                isLoadingLibrary = false;
                resolve();
            };
            tmScript.onerror = (e) => {
                isLoadingLibrary = false;
                reject(new Error('Failed to load Teachable Machine Pose library'));
            };
            document.head.appendChild(tmScript);
        };
        tfScript.onerror = (e) => {
            isLoadingLibrary = false;
            reject(new Error('Failed to load TensorFlow.js library for Teachable Machine'));
        };
        document.head.appendChild(tfScript);
    });
};

/**
 * Loads the Teachable Machine IMAGE scripts dynamically
 */
export const loadImageScripts = () => {
    return new Promise((resolve, reject) => {
        if (isImageLibraryLoaded) {
            resolve();
            return;
        }

        if (isLoadingImageLibrary) {
            const checkParams = setInterval(() => {
                if (isImageLibraryLoaded) {
                    clearInterval(checkParams);
                    resolve();
                } else if (!isLoadingImageLibrary) {
                    clearInterval(checkParams);
                    reject(new Error('Image library loading failed in another call'));
                }
            }, 100);
            return;
        }

        isLoadingImageLibrary = true;

        const loadImageLib = () => {
            const tmScript = document.createElement('script');
            tmScript.src = TM_IMAGE_SCRIPT;
            tmScript.onload = () => {
                console.log('Teachable Machine Image loaded');
                isImageLibraryLoaded = true;
                isLoadingImageLibrary = false;
                resolve();
            };
            tmScript.onerror = (e) => {
                isLoadingImageLibrary = false;
                reject(new Error('Failed to load Teachable Machine Image library'));
            };
            document.head.appendChild(tmScript);
        };

        if (window.tf) {
            loadImageLib();
        } else {
            // Load TensorFlow.js first if not already present
            const tfScript = document.createElement('script');
            tfScript.src = TF_SCRIPT;
            tfScript.onload = () => {
                console.log('TensorFlow.js loaded for TM Image');
                loadImageLib();
            };
            tfScript.onerror = () => {
                isLoadingImageLibrary = false;
                reject(new Error('Failed to load TFJS for Image'));
            };
            document.head.appendChild(tfScript);
        }
    });
};

/**
 * Load a POSE model from a URL (Online)
 * @param {string} url - The URL of the model (should end with /)
 */
export const loadModelFromURL = async (url) => {
    await loadScripts();
    if (!window.tmPose) throw new Error('Teachable Machine library not loaded');

    // Sanitize URL
    let baseUrl = url.trim();
    if (baseUrl.endsWith('model.json')) {
        baseUrl = baseUrl.replace('model.json', '');
    }
    if (!baseUrl.endsWith('/')) baseUrl = baseUrl + '/';

    const modelURL = baseUrl + "model.json";
    const metadataURL = baseUrl + "metadata.json";

    try {
        const model = await window.tmPose.load(modelURL, metadataURL);
        return model;
    } catch (error) {
        console.error("Error loading TM model from URL:", error);
        throw new Error("Failed to load model from URL. Please check if the URL is correct (e.g., https://teachablemachine.withgoogle.com/models/...)");
    }
};

/**
 * Load an IMAGE model from a URL (Online)
 * @param {string} url - The URL of the model (should end with /)
 */
export const loadImageModelFromURL = async (url) => {
    await loadImageScripts();
    if (!window.tmImage) throw new Error('Teachable Machine Image library not loaded');

    // Sanitize URL
    let baseUrl = url.trim();
    if (baseUrl.endsWith('model.json')) {
        baseUrl = baseUrl.replace('model.json', '');
    }
    if (!baseUrl.endsWith('/')) baseUrl = baseUrl + '/';

    const modelURL = baseUrl + "model.json";
    const metadataURL = baseUrl + "metadata.json";

    try {
        const model = await window.tmImage.load(modelURL, metadataURL);
        return model;
    } catch (error) {
        console.error("Error loading TM Image model from URL:", error);
        throw new Error("Failed to load image model. Check URL.");
    }
};

/**
 * Load a model from uploaded files (Offline)
 * @param {File} modelFile - model.json
 * @param {File} weightsFile - weights.bin
 * @param {File} metadataFile - metadata.json
 * @param {string} type - 'pose' or 'image'
 */
export const loadModelFromFiles = async (modelFile, weightsFile, metadataFile, type = 'pose') => {
    if (type === 'image') {
        await loadImageScripts();
        if (!window.tmImage) throw new Error('TM Image lib not loaded');
        try {
            return await window.tmImage.loadFromFiles(modelFile, weightsFile, metadataFile);
        } catch (e) {
            console.error(e);
            throw new Error("Failed to load offline image model.");
        }
    } else {
        await loadScripts();
        if (!window.tmPose) throw new Error('TM Pose lib not loaded');
        try {
            return await window.tmPose.loadFromFiles(modelFile, weightsFile, metadataFile);
        } catch (error) {
            console.error("Error loading TM model from files:", error);
            throw new Error("Failed to load model from files. Ensure you have model.json, weights.bin, and metadata.json");
        }
    }
};

/**
 * Predict pose using the loaded model
 * @param {Object} model - The loaded TM model
 * @param {HTMLVideoElement | HTMLCanvasElement} input - The image source
 */
export const predict = async (model, input) => {
    if (!model) return null;

    // Check if it's a Pose model (has estimatePose) or Image model
    if (model.estimatePose) {
        // POSE MODEL
        const { pose, posenetOutput } = await model.estimatePose(input);
        const prediction = await model.predict(posenetOutput);

        // Find best class
        let highestProb = 0;
        let bestClass = "";
        prediction.forEach(p => {
            if (p.probability > highestProb) {
                highestProb = p.probability;
                bestClass = p.className;
            }
        });

        return {
            type: 'pose',
            pose,
            prediction,
            bestClass,
            accuracy: highestProb
        };
    } else {
        // IMAGE MODEL
        const prediction = await model.predict(input);

        let highestProb = 0;
        let bestClass = "";
        prediction.forEach(p => {
            if (p.probability > highestProb) {
                highestProb = p.probability;
                bestClass = p.className;
            }
        });

        return {
            type: 'image',
            prediction,
            bestClass,
            accuracy: highestProb
        };
    }
};
