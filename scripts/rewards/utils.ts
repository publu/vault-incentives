const { previousSunday } = require("date-fns/fp");

// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'sleep'.
function sleep(ms: any) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'splitToChu... Remove this comment to see the full error message
const splitToChunks = (array: any, parts: any) => {
  let result = [];
  for (let i = parts; i > 0; i--) {
    result.push(array.splice(0, Math.ceil(array.length / i)));
  }
  return result;
};

// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'chunkArray... Remove this comment to see the full error message
const chunkArray = (array: any, itemsPerChunk: any) => {
  let chunked = [];
  for (let i = 0; i < array.length; i += itemsPerChunk) {
    chunked.push(array.slice(i, i + itemsPerChunk));
  }
  return chunked;
};

function setTo5PMUTC(date: any) {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 17, 0, 0, 0)
  );
}

// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'generateSt... Remove this comment to see the full error message
function generateStartTime(date: any) {
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
