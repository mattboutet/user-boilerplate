'use strict';

const Joi = require('joi');
const Boom = require('boom');
const Bcrypt = require('bcrypt');
const JWT = require('jsonwebtoken');

const Config = require('../../server/config');

const internals = {};

module.exports = (server, options) => {

    return [
        {
            method: 'POST',
            path: '/login',
            config: {
                tags: ['api'],
                description: 'Log in',
                validate: {
                    payload: {
                        email: Joi.string().email().required(),
                        password: Joi.string().required()
                    }
                },
                auth: false
            },
            handler: (request, reply) => {

                const Tokens = request.model.tokens;
                const Users = request.model.users;
                const Payload = request.payload;

                Users.findOne({ email: Payload.email }).then((foundUser) => {

                    if (!foundUser) {
                        return reply(Boom.unauthorized('User or Password is invalid'));
                    }

                    Bcrypt.compare(Payload.password, foundUser.password, (err, isValid) => {

                        if (err) {
                            return reply(Boom.wrap(err));
                        }

                        if (isValid){
                            const secret = Config.secrets.jwtSecret;

                            Tokens.create({
                                user: foundUser.id
                            })
                            .then((token) => {

                                const signed = JWT.sign({
                                    jti: token.id,
                                    user: foundUser.id
                                }, secret);//not currently using options param, but it's avail.
                                console.log(signed);//this is so I can use postman more easily
                                reply(null, signed);
                            })
                            .catch((error) => {

                                return reply(Boom.wrap(error));
                            });
                        }
                        else {
                            return reply(Boom.unauthorized('User or Password is invalid'));
                        }
                    });
                });
            }
        },

        // - User CRUD -
        {
            method: 'GET',
            path: '/users/{id}',
            config: {
                description: 'Get a user',
                tags: ['api'],
                validate: {
                    params: {
                        id: Joi.any()
                    }
                },
                auth: false
            },
            handler: {
                bedwetter: {}
            }
        },
        {
            method: 'GET',
            path: '/user',
            config: {
                description: 'Get logged-in user',
                tags: ['api', 'private', 'findone'],
                validate: {
                    /*headers: Joi.object({
                        authorization: Joi.string()
                        .description('JWT')
                    }).unknown()*/
                },
                auth: {
                    strategy: 'api-user-jwt'
                }//*/
            },
            handler: (request, reply) => {

                const Users = request.model.users;
                const user = request.auth.credentials.user;

                if (user){

                    Users.findOne().where({ 'id': user.id }).then((foundUser) => {

                        return reply(foundUser);
                    })
                    .catch((err) => {

                        return reply(Boom.wrap(err));
                    });
                }
                else {
                    reply(Boom.notFound('User not found'));
                }
            }
        },
        {
            method: 'POST',
            path: '/user',
            config: {
                tags: ['api'],
                description: 'Register new user',
                validate: {
                    payload: {
                        email: Joi.string().email().required(),
                        password: Joi.string().required(),
                        firstName: Joi.string().required(),
                        lastName: Joi.string().required()
                    }
                },
                auth: false
            },
            handler: (request, reply) => {

                const Users = request.model.users;
                const Payload = request.payload;

                Bcrypt.hash(Payload.password, 10, (err, hash) => {

                    if (err) {
                        return reply(Boom.internal());
                    }
                    Users.create({
                        email: Payload.email,
                        password: hash,
                        firstName: Payload.firstName,
                        lastName: Payload.lastName
                    },
                    (error, user) => {

                        if (error){
                            return reply(Boom.wrap(error));
                        }

                        return reply(user);
                    });
                });
            }
        }
    ];
};
