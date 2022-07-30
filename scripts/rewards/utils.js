const { previousSunday } = require("date-fns/fp");

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const splitToChunks = (array, parts) => {
  let result = [];
  for (let i = parts; i > 0; i--) {
    result.push(array.splice(0, Math.ceil(array.length / i)));
  }
  return result;
};

const chunkArray = (array, itemsPerChunk) => {
  let chunked = [];
  for (let i = 0; i < array.length; i += itemsPerChunk) {
    chunked.push(array.slice(i, i + itemsPerChunk));
  }
  return chunked;
};

function setTo5PMUTC(date) {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0, 0, 0)
  );
}

function generateStartTime(date) {
  // const todayAsStartOfPeriod = setTo5PMUTC(date);

  const startOfPeriod = setTo5PMUTC(previousSunday(previousSunday(date)));

  // if (
  //   isSunday(date) &&
  //   (isEqual(date, todayAsStartOfPeriod) || isAfter(date, todayAsStartOfPeriod))
  // ) {
  //   return todayAsStartOfPeriod;
  // } else {
  return startOfPeriod;
  // }
}

module.exports = {
  sleep,
  splitToChunks,
  chunkArray,
  setTo5PMUTC,
  generateStartTime,
};
