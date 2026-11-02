module.exports = class DefaultScheduler {
    /**
     * Schedules a function to be run one time after a dely.
     *
     * @param {function} callbackFn The function to run
     * @param {number} delayMS      The number of milliseconds to wait
     * @returns  {function}         A cancellation function that prevents fn from being run.
     */
    runOnceAfter(callbackFn, delayMS) {
        const timeoutID = setTimeout(callbackFn, delayMS);
        return () => clearTimeout(timeoutID);
    }
};
