'use strict';

// Load modules

const Lab = require('lab');
const Code = require('code');
const LabbableServer = require('../server');

// Test shortcuts

const lab = exports.lab = Lab.script();
const before = lab.before;
const describe = lab.describe;
const expect = Code.expect;
const it = lab.it;

let jwt = '';

describe('User Boilerplate API server', () => {

    let server;

    before((done) => {

        LabbableServer.ready((err, srv) => {

            if (err) {
                return done(err);
            }

            server = srv;

            return done();
        });
    });

    describe('Users route', () => {

        it('Can create a User', (done) => {

            const options = {
                method: 'POST',
                url: '/users',
                payload: {
                    email: 'test@test.com',
                    password: 'password',
                    firstName: 'Test',
                    lastName: 'Test'
                }
            };

            server.inject(options, (response) => {

                const result = response.result;

                expect(response.statusCode).to.equal(200);
                expect(result).to.be.an.object();
                expect(result.email).to.equal('test@test.com');
                done();
            });
        });

        it('Can Log In', (done) => {

            const options = {
                method: 'POST',
                url: '/login',
                payload: {
                    email: 'test@test.com',
                    password: 'password'
                }
            };

            server.inject(options, (response) => {

                const result = response.result;

                expect(response.statusCode).to.equal(200);
                expect(result).to.be.an.string();
                jwt = result;
                done();
            });
        });

        it('Can fetch all users', (done) => {

            const options = {
                method: 'GET',
                url: '/users'
            };

            server.inject(options, (response) => {

                const result = response.result;

                expect(response.statusCode).to.equal(200);
                expect(result).to.be.an.array();

                done();
            });
        });

        it('Can fetch a user', (done) => {

            const options = {
                method: 'GET',
                url: '/user',
                headers : {
                    'Authorization' : jwt,
                    'Content-Type' : 'application/json; charset=utf-8'
                }
            };

            server.inject(options, (response) => {

                const result = response.result;

                expect(response.statusCode).to.equal(200);
                expect(result).to.be.an.object();
                expect(result.email).to.equal('test@test.com');

                done();
            });
        });

        it('Can delete a user', (done) => {

            const options = {
                method: 'GET',
                url: '/users'
            };

            server.inject(options, (response) => {

                const userId = response.result[0].id;
                const delOptions = {
                    method: 'DELETE',
                    url: '/users/' + userId
                };

                server.inject(delOptions, (delResponse) => {

                    expect(delResponse.statusCode).to.equal(204);
                    done();
                });
            });
        });

    });
});
