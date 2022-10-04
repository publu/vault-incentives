const expect = require("chai").expect;

// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'previousSu... Remove this comment to see the full error message
const { previousSunday } = require("date-fns/fp");
const {
  // @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'generateSt... Remove this comment to see the full error message
  generateStartTime,
  // @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'setTo5PMUT... Remove this comment to see the full error message
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
