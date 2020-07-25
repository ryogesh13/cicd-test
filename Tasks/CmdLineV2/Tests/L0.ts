import assert = require('assert');
import path = require('path');
import * as ttm from 'azure-pipelines-task-lib/mock-test';

describe('Cmd Suite', function () {
    this.timeout(60000);

    function runValidations(validator: () => void, tr, done) {
        try {
            validator();
            done();
        }
        catch (error) {
            console.log("STDERR", tr.stderr);
            console.log("STDOUT", tr.stdout);
            done(error);
        }
    }

    // Just need inline case since external scripts not allowed.
    it('Runs an inline script correctly', (done: MochaDone) => {
        this.timeout(5000);

        let tp: string = path.join(__dirname, 'L0Inline.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();

        runValidations(() => {
            assert(tr.succeeded, 'Cmd should have succeeded.');
            assert(tr.stderr.length === 0, 'Cmd should not have written to stderr');
            assert(tr.stdout.indexOf('my script output') > 0,'Cmd should have correctly run the script');
        }, tr, done);
    });

    it('Reports stderr correctly', (done: MochaDone) => {
        this.timeout(5000);

        let tp: string = path.join(__dirname, 'L0StdErr.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();

        runValidations(() => {
            assert(tr.failed, 'Bash should have failed');
            assert(tr.stdout.indexOf('##vso[task.issue type=error;]myErrorTest') > 0, 'Bash should have correctly written myErrorTest');
        }, tr, done);
    });
});