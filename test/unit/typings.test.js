/**
 * this checks if typings work as expected
 */
import assert from 'assert';
import * as schemas from './../helper/schemas';

describe('typings.test.js', () => {
    const codeBase = `
        import {
            create,
            RxDatabase,
            RxDatabaseCreator,
            RxCollection,
            RxDocument,
            RxJsonSchema,
            RxError,
            RxAttachment,
            RxPlugin,
            plugin
        } from '../';
        import * as PouchMemAdapter from 'pouchdb-adapter-memory';
        plugin(PouchMemAdapter);
    `;
    const transpileCode = async (code) => {
        const spawn = require('child-process-promise').spawn;
        const stdout = [];
        const stderr = [];
        const promise = spawn('ts-node', [
            '--no-cache',
            '--compilerOptions', '{"target":"es6", "strict": true}',
            '--type-check',
            '-p', code
        ]);
        const childProcess = promise.childProcess;
        childProcess.stdout.on('data', data => stdout.push(data.toString()));
        childProcess.stderr.on('data', data => stderr.push(data.toString()));
        try {
            await promise;
        } catch (err) {
            throw new Error(`could not run
                # Error: ${err}
                # Output: ${stdout}
                # ErrOut: ${stderr}
                `);
        }
    };

    describe('basic', () => {
        it('should sucess on basic test', async () => {
            await transpileCode('console.log("Hello, world!")');
        });
        it('should fail on broken code', async () => {
            const brokenCode = `
                let x: string = 'foo';
                x = 1337;
            `;
            let thrown = false;
            try {
                await transpileCode(brokenCode);
            } catch (err) {
                thrown = true;
            }
            assert.ok(thrown);
        });
    });
    describe('import', () => {
        it('import default with strict:true', async () => {
            const code = `
                import rxdb from '../';
                import * as PouchMemAdapter from 'pouchdb-adapter-memory';
                rxdb.plugin(PouchMemAdapter);
            `;
            await transpileCode(code);
        });
    });
    describe('database', () => {
        describe('positive', () => {
            it('should create the database', async () => {
                const code = codeBase + `
                    (async() => {
                        const databaseCreator: RxDatabaseCreator = {
                            name: 'mydb',
                            adapter: 'memory',
                            multiInstance: false,
                            ignoreDuplicate: false
                        };
                        const myDb: RxDatabase = await create(databaseCreator);
                    })();
                `;
                await transpileCode(code);
            });
        });
        describe('negative', () => {
            it('should not allow additional parameters', async () => {
                const brokenCode = `
                    const databaseCreator: RxDatabaseCreator = {
                        name: 'mydb',
                        adapter: 'memory',
                        multiInstance: false,
                        ignoreDuplicate: false,
                        foo: 'bar'
                    };
                `;
                let thrown = false;
                try {
                    await transpileCode(brokenCode);
                } catch (err) {
                    thrown = true;
                }
                assert.ok(thrown);
            });
        });
    });
    describe('collection', () => {
        describe('positive', () => {
            it('collection-creation', async () => {
                const code = codeBase + `
                    (async() => {
                        const myDb: RxDatabase = await create({
                            name: 'mydb',
                            adapter: 'memory',
                            multiInstance: false,
                            ignoreDuplicate: false
                        });
                        const mySchema: RxJsonSchema = ${JSON.stringify(schemas.human)};
                        const myCollection: RxCollection<any> = await myDb.collection({
                            name: 'humans',                            schema: mySchema,
                            autoMigrate: false,
                        });
                    })();
                `;
                await transpileCode(code);
            });
            it('use options', async () => {
                const code = codeBase + `
                    (async() => {
                        const myDb: RxDatabase = await create({
                            name: 'mydb',
                            adapter: 'memory',
                            multiInstance: false,
                            ignoreDuplicate: false,
                            options: {
                                foo1: 'bar1'
                            }
                        });
                        const mySchema: RxJsonSchema = ${JSON.stringify(schemas.human)};
                        const myCollection: RxCollection<any> = await myDb.collection({
                            name: 'humans',                            schema: mySchema,
                            autoMigrate: false,
                            options: {
                                foo2: 'bar2'
                            }
                        });
                        const x: string = myDb.options.foo1;
                        const y: string = myCollection.options.foo2;
                    })();
                `;
                await transpileCode(code);
            });
        });
        describe('negative', () => {
            it('should not allow wrong collection-settings', async () => {
                const brokenCode = codeBase + `
                    (async() => {
                        const myDb: RxDatabase = await create({
                            name: 'mydb',
                            adapter: 'memory',
                            multiInstance: false,
                            ignoreDuplicate: false
                        });
                        const mySchema: RxJsonSchema = ${JSON.stringify(schemas.human)};
                        const myCollection: RxCollection<any> = await myDb.collection({
                            name: 'humans',
                            schema: {}, // wrong schema format
                            autoMigrate: false,
                        });
                    })();
                `;
                let thrown = false;
                try {
                    await transpileCode(brokenCode);
                } catch (err) {
                    thrown = true;
                }
                assert.ok(thrown);
            });
        });
    });
    describe('document', () => {
        it('should know the fields of the document', async () => {
            const code = codeBase + `
                (async() => {
                    const myDb: any = {};

                    type DocType = {
                        age: number,
                        firstName: string,
                        lastName: string,
                        passportId: string
                    };

                    const myCollection: RxCollection<DocType> = await myDb.collection({
                        name: 'humans',
                        schema: {},
                        autoMigrate: false,
                    });

                    const result = await myCollection.findOne().exec();
                    if(result === null) throw new Error('got no document');
                    const oneDoc: RxDocument<DocType> = result;
                    const id: string = oneDoc.passportId;
                    const prim: string = oneDoc.primary;

                    const otherResult = await myCollection.findOne().exec();
                    if(otherResult === null) throw new Error('got no other document');
                    const otherDoc: RxDocument<DocType> = otherResult;
                    const id2 = otherDoc.passportId;
                });
            `;
            await transpileCode(code);
        });
        it('.putAttachment()', async () => {
            const code = codeBase + `
                (async() => {
                    const myDb: any = {};

                    type DocType = {
                        age: number,
                        firstName: string,
                        lastName: string,
                        passportId: string
                    };

                    const myCollection: RxCollection<DocType> = await myDb.collection({
                        name: 'humans',
                        schema: {},
                        autoMigrate: false,
                    });

                    const result = await myCollection.findOne().exec();
                    if(!result) throw new Error('got no doc');
                    const oneDoc: RxDocument<DocType> = result;
                    const attachment: RxAttachment<DocType> = await oneDoc.putAttachment({
                        id: 'cat.txt',
                        data: 'foo bar',
                        type: 'text/plain'
                    });
                });
            `;
            await transpileCode(code);
        });
    });
    describe('query', () => {
        it('should know the where-fields', async () => {
            const code = codeBase + `
                (async() => {
                    const myDb: any = {};

                    type DocType = {
                        age: number,
                        firstName: string,
                        lastName: string,
                        passportId: string,
                        nestedObject: {
                            foo: string,
                            bar: number
                        }
                    };

                    const myCollection: RxCollection<DocType> = await myDb.collection({
                        name: 'humans',
                        schema: {},
                        autoMigrate: false,
                    });

                    const query = myCollection.findOne().where('nestedObject.foo').eq('foobar');
                });
            `;
            await transpileCode(code);
        });
    });
    describe('rx-error', () => {
        it('should know the parameters of the error', async () => {
            const code = codeBase + `
                (async() => {
                    const myDb: any = {};
                    const myCollection: RxCollection<any> = await myDb.collection({
                        name: 'humans',
                        schema: {},
                        autoMigrate: false,
                    });

                    try{
                        await myCollection.insert({ age: 4});
                    } catch(err) {
                        if (err.rxdb) {
                            (err as RxError).parameters.errors;
                        } else {
                            // handle regular Error class
                        }
                    }
                });
            `;
            await transpileCode(code);
        });
    });
    describe('plugin', () => {
        it('should be a valid RxPlugin', async () => {
            const code = codeBase + `
                (async() => {
                    const myPlugin: RxPlugin = {
                        rxdb: true,
                        prototypes: {
                            RxDocument: () => {}
                        }
                    }
                    plugin(myPlugin);
                });
            `;
            await transpileCode(code);
        });
    });
    describe('issues', () => {
        it('#448 strict:true not working', async () => {
            /*
             * TODO we currently have to set "skipLibCheck": true
             * because of a rxjs-typings problem
             * @link https://github.com/ReactiveX/rxjs/issues/3031
             */
            const exec = require('child_process').exec;
            await new Promise((res, rej) => {
                exec('tsc --p "../test/helper/issue-448/tsconfig.json"', (err, stdout, stderr) => {
                    if (err || stderr !== '') {
                        // console.log('sterr:'); console.dir(stderr);
                        // console.log('err:'); console.dir(err);
                        rej(err);
                    } else {
                        // console.log('out:'); console.log(stdout);
                        res(stdout);
                    }
                });
            });
        });
    });
});
