'use strict';

const Boom = require('boom');
const Config = require('../../../server/config');

const internals = {};

module.exports = {
    name: 'api-user-jwt',
    scheme: 'jwt',
    options: {
        apiUserJwt: true,
        key: Config.secrets.jwtSecret,
        /**
         * [validateFunc description]
         * @param    decoded    decoded but unverified JWT token
         * @param    request    original request received from client
         * @param    callback function, must have signature (err,valid,credentials(optional))
         */
        validateFunc: (decoded, request, reply) => {

            //this feels kinda janky - is there a better way to get at dogwater?
            const Model = request.connection.server.plugins.dogwater;
            const Tokens = Model.tokens;
            const Users = Model.users;

            Tokens.findOneById(decoded.jti)
            .then((token) => {

                if (token) {
                    Users.findOne().where({ 'id': token.user }).then((user) => {

                        if (typeof (user) !== 'undefined') {

                            reply(null, true, { user: user });

                        }
                        else {

                            reply(null,false);

                        }
                    })
                    .catch((error) => {

                        console.log(error);
                        reply(null,false);
                    });
                }
                else {
                    return reply(null, false);
                }
            })
            .catch((error) => {

                return reply(Boom.wrap(error));
            });
        },
        verifyOptions: { algorithms: ['HS256'] } // pick a strong algorithm
    }
};
