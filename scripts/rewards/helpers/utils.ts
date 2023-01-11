const { previousSunday } = require("date-fns/fp");

import fs from 'fs'
import path from 'path'

function sleep(ms: any) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const splitToChunks = (array: any, parts: any) => {
  let result = [];
  for (let i = parts; i > 0; i--) {
    result.push(array.splice(0, Math.ceil(array.length / i)));
  }
  return result;
};

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


function getConfigFile(weekNumber: number) {
  return  JSON.parse(fs.readFileSync(getConfigFilePath(weekNumber)).toString());
}

function getConfigFilePath(weekNumber: number) {
  return path.join(__dirname ,"../output/configs/week"+weekNumber.toString()+".json")
}

function getOuputDirPath(weekNumber: number) {
  return path.join(__dirname ,"../output/week"+weekNumber.toString())

}

function getLatestRun() {
  let calculated = fs.readdirSync(path.join(__dirname,"../output/"))
  .filter((calculated: any) => String(calculated).startsWith('week'))
  .map((item: any) => item.replace("week", ""))
  .filter((item: any) => Number(item))
  .map((item: any) => Number(item))

  let latestRun = Math.max(...calculated);
  return latestRun;
}

module.exports =  {
  sleep,
  splitToChunks,
  chunkArray,
  setTo5PMUTC,
  generateStartTime,
  getConfigFile,
  getConfigFilePath,
  getOuputDirPath,
  getLatestRun
};
