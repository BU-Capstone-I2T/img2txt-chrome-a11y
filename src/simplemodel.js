const LOW_CONFIDENCE_THRESHOLD = 0.1;
const HIGH_CONFIDENCE_THRESHOLD = 0.5;


function texter(predictions){
  // no predictions
  if (!predictions || predictions.length < 1) {
    return `Image unclear`;
  }
  // seperate predictions based on confidence
  let highpred = [];
  let midpred= [];
  let lowpred = [];
  // grab confident predictions
  const high = predictions.filter(prediction => prediction.probability >= HIGH_CONFIDENCE_THRESHOLD);
  if (high.length > 0){
    highpred = high.map(prediction => prediction.className);
  }
  // grab mid predictions 
  const mid = predictions.filter(prediction => prediction.probability >= LOW_CONFIDENCE_THRESHOLD && prediction.probability < HIGH_CONFIDENCE_THRESHOLD);
  if (mid.length > 0){
    midpred = mid.map(prediction => prediction.className);
  }
  // grab low predictions 
  const low = predictions.filter(prediction => prediction.probability < LOW_CONFIDENCE_THRESHOLD);
  if (low.length > 0){
    lowpred = low.map(prediction => prediction.className);
  }
  // result statement 
  let result = "Image that ";
  if (highpred.length > 0) {
    result += "contains ";
    if (highpred.length > 1) {
      result += `${highpred.slice(0, -1).join(', ')} and ${highpred[highpred.length - 1]}`;
    } else {
      result += `${highpred[0]}`;
    }
  }
  if (midpred.length > 0) {
    if (highpred.length > 0) {
      result += " and maybe has ";
    } else {
      result += "may contain ";
    }
    if (midpred.length > 1) {
      result += `${midpred.slice(0, -1).join(', ')} and ${midpred[midpred.length - 1]}`;
    } else {
      result += `${midpred[0]}`;
    }
  }
  if (lowpred.length > 0) {
    if (highpred.length === 0 && midpred.length === 0) {
      result += "possibly contains ";
    } else {
      result += " and could possibly have ";
    }
    if (lowpred.length > 1) {
      result += `${lowpred.slice(0, -1).join(', ')} and ${lowpred[lowpred.length - 1]}`;
    } else {
      result += `${lowpred[0]}`;
    }
    result += ".";
  }
  return result;
}

// testing 

const test1= [
  { className: "Cat", probability: 0.9 },
  { className: "Wolf", probability: 0.4 },
  { className: "Bird", probability: 0.01 },
  { className: "Dog", probability: 0.8 },
  { className: "Fish", probability: 0.4 },
  { className: "Shark", probability: 0.01 }
];

const test2 = [
  { className: "Cat", probability: 0.9 },
  { className: "Wolf", probability: 0.4 },
  { className: "Bird", probability: 0.1 }
];

const test3 = [
  { className: "Dog", probability: 0.7 },
  { className: "Cat", probability: 0.9 },
  { className: "Wolf", probability: 0.9 },
  { className: "Bird", probability: 0.4 },
  { className: "Cow", probability: 0.3 },
  { className: "Horse", probability: 0.2 },
  { className: "Fish", probability: 0.01 },
  { className: "Shark", probability: 0.02 },
  { className: "Whale", probability: 0.04 }
];

const test4 = [
  { className: "Bird", probability: 0.4 },
  { className: "Horse", probability: 0.2 },
  { className: "Wolf", probability: 0.2 },
  { className: "Fish", probability: 0.01 },
  { className: "Shark", probability: 0.01 }
];

const test5 = [
  { className: "Horse", probability: 0.02 },
  { className: "Fish", probability: 0.01 },
];

console.log(texter(test1));
console.log(texter(test2));
console.log(texter(test3));
console.log(texter(test4));
console.log(texter(test5));

// input-based testing 

const readline = require('readline');

function getUserInput() {
  const predictions = [];
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question("Enter the number of instances:", (numInstances) => {
    numInstances = parseInt(numInstances);
    getPredictions(numInstances);
  });

  function getPredictions(numInstances) {
    if (numInstances <= 0) {
      rl.close();
      return;
    }

    rl.question(`Enter the className for instance ${predictions.length + 1}:`, (className) => {
      rl.question(`Enter the probability for instance ${predictions.length + 1}:`, (probability) => {
        predictions.push({ className, probability: parseFloat(probability) });
        getPredictions(numInstances - 1);
      });
    });
  }

  return new Promise((resolve) => {
    rl.on('close', () => resolve(predictions));
  });
}

getUserInput().then((userPredictions) => {
  console.log(texter(userPredictions));
});
