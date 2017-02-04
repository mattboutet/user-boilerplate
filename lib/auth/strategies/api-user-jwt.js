'use strict';

const Boom = require('boom');

const internals = {};

module.exports = (srv, options) => {

    return {
        name: 'api-user-jwt',
        scheme: 'jwt',
        options: {
            apiUserJwt: true,
            key: options.secrets.jwtSecret,
            /**
             * [validateFunc description]
             * @param    decoded    decoded but unverified JWT token
             * @param    request    original request received from client
             * @param    callback function, must have signature (err,valid,credentials(optional))
             */
            validateFunc: (decoded, request, reply) => {

                const Tokens = request.models().Tokens;
                const Users = request.models().Users;

                Tokens.query().findById(decoded.jti).asCallback((tokenErr, token) => {

                    if (tokenErr) {
                        return reply(Boom.wrap(tokenErr));
                    }

                    if (token) {
                        Users.query().findById(token.user).asCallback((userErr, user) => {

                            if (userErr) {
                                return reply(null,false);
                            }

                            if (typeof (user) !== 'undefined') {
                                return reply(null, true, { user });
                            }

                            return reply(null,false);

                        });
                    }
                    else {
                        return reply(null, false);
                    }
                });
            },
            verifyOptions: { algorithms: ['HS256'] } // pick a strong algorithm
        }
    };
};
