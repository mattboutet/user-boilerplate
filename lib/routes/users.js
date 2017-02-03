'use strict';

const Joi = require('joi');
const Boom = require('boom');
const Bcrypt = require('bcrypt');
const JWT = require('jsonwebtoken');
const Uuid = require('uuid');

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

                const Tokens = request.models().Tokens;
                const Users = request.models().Users;
                const Payload = request.payload;

                Users.query().where({ email: Payload.email }).asCallback((userErr, foundUser) => {

                    if (userErr) {
                        return reply(Boom.wrap(userErr));
                    }

                    if (foundUser.length === 0) {
                        return reply(Boom.unauthorized('User or Password is invalid'));
                    }
                    foundUser = foundUser[0];

                    Bcrypt.compare(Payload.password, foundUser.password, (bcryptErr, isValid) => {

                        if (bcryptErr) {
                            return reply(Boom.wrap(bcryptErr));
                        }

                        if (isValid) {
                            const secret = options.secrets.jwtSecret;

                            Tokens.query().insertAndFetch({})
                            .asCallback((tokenErr, newToken) => {

                                if (tokenErr) {
                                    return reply(Boom.wrap(tokenErr));
                                }

                                newToken.$relatedQuery('users').relate(foundUser)
                                .asCallback((relatedErr) => {

                                    if (relatedErr) {
                                        return reply(Boom.wrap(relatedErr));
                                    }

                                    const signed = JWT.sign({
                                        jti: newToken.id,
                                        user: foundUser.id
                                    }, secret);

                                    return reply(null, signed);
                                });
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
                        id: Joi.any().required()
                    }
                },
                auth: false
            },
            handler: function (request, reply) {

                const Users = request.models().Users;

                Users.query().findById(request.params.id).asCallback((userErr, foundUser) => {

                    if (userErr) {
                        return reply(Boom.wrap(userErr));
                    }
                    if (!foundUser) {
                        return reply(Boom.notFound('User not found.'));
                    }

                    reply(foundUser);
                });
            }
        },
        {
            method: 'GET',
            path: '/user',
            config: {
                description: 'Get logged-in user',
                tags: ['api', 'private', 'findone'],
                validate: {
                    headers: Joi.object({
                        authorization: Joi.string()
                        .description('JWT')
                    }).unknown()
                },
                auth: {
                    strategy: 'api-user-jwt'
                }
            },
            handler: (request, reply) => {

                const Users = request.models().Users;
                const user = request.auth.credentials.user;

                if (user){
                    Users.query().findById(user.id).asCallback((userErr, foundUser) => {

                        if (userErr) {
                            return reply(Boom.wrap(userErr));
                        }
                        return reply(foundUser);
                    });
                }
                else {
                    reply(Boom.notFound('User not found'));
                }
            }
        },
        {
            method: 'GET',
            path: '/users',
            config: {
                description: 'Get all users',
                tags: ['api'],
                validate: {
                    headers: Joi.object({
                        authorization: Joi.string()
                        .description('JWT')
                    }).unknown()
                },
                auth: {
                    strategy: 'api-user-jwt'
                }
            },
            handler: (request, reply) => {

                const Users = request.models().Users;

                Users.query().asCallback((userErr, foundUser) => {

                    if (userErr){
                        return reply(Boom.wrap(userErr));
                    }

                    if (!foundUser){
                        return reply(Boom.notFound('No users found'));
                    }
                    return reply(foundUser);
                });
            }
        },
        {
            method: 'POST',
            path: '/users/request-reset',
            config: {
                description: 'Request password reset for a user',
                tags: ['api', 'private', 'findone'],
                validate: {
                    payload: {
                        email: Joi.string().email().required()
                    }
                },
                auth: false
            },
            handler: (request, reply) => {

                const Users = request.models().Users;
                const Payload = request.payload;

                const resetToken = Uuid({ rng: Uuid.nodeRNG });
                Users.query()
                .patch(
                    {
                        'password': null,
                        resetToken
                    }
                )
                .where({ 'email': Payload.email })
                .asCallback((userErr, numFound) => {

                    if (userErr){
                        return reply(Boom.wrap(userErr));
                    }
                    return reply(resetToken);
                });
            }
        },
        {
            method: 'POST',
            path: '/users/reset-password',
            config: {
                description: 'Reset password for a user',
                tags: ['api', 'private', 'findone'],
                validate: {
                    payload: {
                        resetToken: Joi.string().required(),
                        newPassword: Joi.string().required()
                    }
                },
                auth: false
            },
            handler: (request, reply) => {

                const Users = request.models().Users;
                const Payload = request.payload;

                Users.query().where({ resetToken: Payload.resetToken }).asCallback((err, foundUser) => {

                    if (err) {
                        return reply(Boom.wrap(err));
                    }

                    //if not using findById, you always get an array.
                    foundUser = foundUser[0];
                    if (foundUser){
                        Bcrypt.hash(Payload.newPassword, 10, (err, hash) => {

                            if (err) {
                                return reply(Boom.internal());
                            }

                            Users.query()
                            .patch(
                                {
                                    'password': hash,
                                    'resetToken': null
                                }
                            )
                            .findById(foundUser.id)
                            .asCallback((userErr, resetUser) => {

                                if (userErr){
                                    return reply(Boom.wrap(userErr));
                                }
                                return reply(resetUser);
                            });
                        });
                    }
                    else {
                        return reply(Boom.notFound('Reset Code not found'));
                    }
                });
            }
        },
        {
            method: 'POST',
            path: '/users',
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

                const Users = request.models().Users;
                const Payload = request.payload;

                Bcrypt.hash(Payload.password, 10, (err, hash) => {

                    if (err) {
                        return reply(Boom.internal());
                    }

                    Users.query().insertAndFetch({
                        email: Payload.email,
                        password: hash,
                        firstName: Payload.firstName,
                        lastName: Payload.lastName
                    })
                    .asCallback((error, user) => {

                        if (error){
                            return reply(error);
                        }

                        return reply(user);
                    });
                });
            }
        },
        {
            method: 'DELETE',
            path: '/users/{id}',
            config: {
                description: 'Delete a user',
                tags: ['api'],
                validate: {
                    headers: Joi.object({
                        authorization: Joi.string()
                        .description('JWT')
                    }).unknown(),
                    params: {
                        id: Joi.number().integer().required()
                    }
                },
                auth: {
                    strategy: 'api-user-jwt'
                }
            },
            handler: (request, reply) => {

                const Users = request.models().Users;
                const id = request.params.id;

                Users.query().deleteById(id)
                .asCallback((error, rowsDeleted) => {

                    if (error){
                        return reply(error);
                    }

                    if (rowsDeleted === 1) {
                        return reply().code(204);
                    }

                    return reply(Boom.notFound('User not found'));
                });
            }
        },
        {
            method: 'POST',
            path: '/users/change-password',
            config: {
                tags: ['api'],
                description: 'Change password of logged-in user',
                validate: {
                    headers: Joi.object({
                        authorization: Joi.string()
                        .description('JWT')
                    }).unknown(),
                    payload: {
                        password: Joi.string().required(),
                        newPassword: Joi.string().required()
                    }
                },
                auth: {
                    strategy: 'api-user-jwt'
                }
            },
            handler: (request, reply) => {

                const Users = request.models().Users;
                const user = request.auth.credentials.user;
                const Payload = request.payload;

                if (Payload.password === Payload.newPassword){
                    return reply(Boom.badRequest('New password can not be the same as old password'));
                }
                Users.query().findById(user.id).asCallback((err, foundUser) => {

                    if (err) {
                        return reply(err);
                    }

                    if (foundUser){

                        Bcrypt.compare(Payload.password, foundUser.password, (err, isValid) => {

                            if (err) {
                                return reply(err);
                            }

                            if (isValid){
                                Bcrypt.hash(Payload.newPassword, 10, (err, hash) => {

                                    if (err) {
                                        return reply(Boom.internal());
                                    }
                                    Users.query()
                                    .patch({ 'password': hash })
                                    .findById(foundUser.id)
                                    .asCallback((userErr, patchedUser) => {

                                        if (userErr){
                                            return reply(Boom.wrap(userErr));
                                        }
                                        return reply(patchedUser);
                                    });
                                });
                            }
                        });
                    }
                    else {
                        return reply(Boom.notFound('User not found'));
                    }
                });
            }
        }
    ];
};
