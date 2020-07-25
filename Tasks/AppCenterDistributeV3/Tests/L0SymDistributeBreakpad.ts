
import ma = require('vsts-task-lib/mock-answer');
import tmrm = require('vsts-task-lib/mock-run');
import path = require('path');
import fs = require('fs');
import azureBlobUploadHelper = require('../azure-blob-upload-helper');

const Readable = require('stream').Readable
const Writable = require('stream').Writable
const Stats = require('fs').Stats

const nock = require('nock');

const taskPath = path.join(__dirname, '..', 'appcenterdistribute.js');
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('serverEndpoint', 'MyTestEndpoint');
tmr.setInput('appSlug', 'testuser/testapp');
tmr.setInput('app', '/test/path/to/my.apk');
tmr.setInput('symbolsType', 'Android');
tmr.setInput('releaseNotesSelection', 'releaseNotesInput');
tmr.setInput('releaseNotesInput', 'my release notes');
tmr.setInput('nativeLibrariesPath', '/local/**/*.so')

// prepare upload
nock('https://example.test')
    .post('/v0.1/apps/testuser/testapp/release_uploads')
    .reply(201, {
        upload_id: 1,
        upload_url: 'https://example.upload.test/release_upload'
    });

// upload 
nock('https://example.upload.test')
    .post('/release_upload')
    .reply(201, {
        status: 'success'
    });

// finishing upload, commit the package
nock('https://example.test')
    .patch('/v0.1/apps/testuser/testapp/release_uploads/1', {
        status: 'committed'
    })
    .reply(200, {
        release_id: '1',
        release_url: 'my_release_location'
    });

// make it available
nock('https://example.test')
    .post('/v0.1/apps/testuser/testapp/releases/1/groups', {
        id: "00000000-0000-0000-0000-000000000000",
    })
    .reply(200);

nock('https://example.test')
    .put('/v0.1/apps/testuser/testapp/releases/1', JSON.stringify({
        release_notes: 'my release notes'
    }))
    .reply(200);

// begin symbol upload
nock('https://example.test')
    .post('/v0.1/apps/testuser/testapp/symbol_uploads', {
        symbol_type: 'Breakpad'
    })
    .reply(201, {
        symbol_upload_id: 100,
        upload_url: 'https://example.upload.test/symbol_upload',
        expiration_date: 1234567
    });

// finishing symbol upload, commit the symbol 
nock('https://example.test')
    .patch('/v0.1/apps/testuser/testapp/symbol_uploads/100', {
        status: 'committed'
    })
    .reply(200);

// provide answers for task mock
const a: ma.TaskLibAnswers = <ma.TaskLibAnswers>{
    'checkPath': {
        '/test/path/to/my.apk': true,
        '/test/path/to': true,
        '/test/path/to/f1.txt': true,
        '/test/path/to/f2.txt': true,
        '/test/path/to/folder': true,
        '/test/path/to/folder/f11.txt': true,
        '/test/path/to/folder/f12.txt': true,
        '/local/x64/libSasquatchBreakpad.so': true,
        '/local/x86/libSasquatchBreakpad.so': true
    },
    'findMatch': {
        '/local/**/*.so': [
            '/local/x86/libSasquatchBreakpad.so',
            '/local/x64/libSasquatchBreakpad.so'
        ],
        '/test/path/to/my.apk': [
            '/test/path/to/my.apk'
        ]
    }
};
tmr.setAnswers(a);

fs.createReadStream = (s: string) => {
    const stream = new Readable;
    stream.push(s);
    stream.push(null);

    return stream;
};

fs.createWriteStream = (s: string) => {
    const stream = new Writable;

    stream.write = () => { };

    return stream;
};

fs.readdirSync = (folder: string) => {
    let files: string[] = [];

    if (folder === '/test/path/to') {
        files = [
            'mappings.txt',
            'f1.txt',
            'f2.txt',
            'folder'
        ]
    } else if (folder === '/test/path/to/folder') {
        files = [
            'f11.txt',
            'f12.txt'
        ]
    }

    return files;
};

fs.statSync = (s: string) => {
    const stat = new Stats;
    stat.isFile = () => s.endsWith('.txt');
    stat.isDirectory = () => !s.endsWith('.txt');
    stat.size = 100;
    return stat;
}
fs.lstatSync = fs.statSync;

azureBlobUploadHelper.AzureBlobUploadHelper.prototype.upload = async (uploadUrl, file) => {
    if(file.toLowerCase().endsWith('.zip')) {
        return Promise.resolve();
    }
    throw new Error("Breakpad symbols always should be zipped");
}

tmr.registerMock('azure-blob-upload-helper', azureBlobUploadHelper);
tmr.registerMock('fs', fs);

tmr.run();

