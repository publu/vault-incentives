const expect = require("chai").expect;

const { previousSunday } = require("date-fns/fp");
const {
  generateStartTime,
  setTo5PMUTC,
} = require("../../scripts/rewards/utils");

describe("Timestamp Generation", function () {
  describe("#generateStartTime()", function () {
    it("should start on the previous Sunday IIF its not Sunday", function () {
      const midweekDate = new Date("2022-07-26T19:09:36Z"); //Tuesday
      expect(generateStartTime(midweekDate).toString()).to.equal(
        previousSunday(setTo5PMUTC(midweekDate)).toString()
      );
    });
    it("should return the previous Sunday even if we are in the new period, but it is on Sunday", function () {
      const startOfPeriod = previousSunday(
        setTo5PMUTC(new Date("2022-07-26T19:09:36Z"))
      ); //Sunday @ 5PM UTC
      expect(generateStartTime(startOfPeriod).toString()).to.equal(
        previousSunday(startOfPeriod).toString()
      );
    });
  });
});
