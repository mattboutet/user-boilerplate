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

                const Model = request.collections();
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
};
