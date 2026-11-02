const assert = require('assert').strict;
const { promisify } = require('util');
const DefaultScheduler = require('./defaultScheduler');
const sleep = promisify(setTimeout);

suite('DefaultScheduler', function () {
    test('Schedule', async function () {
        const scheduler = new DefaultScheduler();

        var iterations = 0;
        var run = () => {
            iterations++;
        };

        // If we schedule something, we should only see that happen after the duration

        scheduler.runOnceAfter(run, 20);
        const cancelFn = scheduler.runOnceAfter(run, 40);
        scheduler.runOnceAfter(run, 50);
        assert.equal(iterations, 0);

        // After that duration, we should see our code ran

        await sleep(30);
        assert.equal(iterations, 1);

        // Cancel the second task.

        cancelFn();

        // Wait a long enough time for the third task to run.

        await sleep(30);
        assert.equal(iterations, 2);
    });
});
