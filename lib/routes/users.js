'use strict';

const Joi = require('joi');
const Boom = require('boom');
const Bcrypt = require('bcrypt');
const JWT = require('jsonwebtoken');
const Uuid = require('node-uuid');

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

                const Tokens = request.collections().tokens;
                const Users = request.collections().users;
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
                            const secret = options.secrets.jwtSecret;

                            Tokens.create({
                                user: foundUser.id
                            })
                            .then((token) => {

                                const signed = JWT.sign({
                                    jti: token.id,
                                    user: foundUser.id
                                }, secret);//not currently using options param, but it's avail.

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
                        id: Joi.any().required()
                    }
                },
                auth: false
            },
            handler: function (request, reply) {

                const Users = request.collections().users;

                Users.findOne(request.params.id)
                .then((user) => {

                    if (!user) {
                        return reply(Boom.notFound('User not found.'));
                    }

                    reply(user);
                })
                .catch((err) => reply(Boom.wrap(err)));
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

                const Users = request.collections().users;
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
            path: '/user/requestReset',
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

                const Users = request.collections().users;
                const Payload = request.payload;

                Users.update(
                    {
                        'email': Payload.email
                    },
                    {
                        'password': null,
                        'resetToken': Uuid.v4({ rng: Uuid.nodeRNG })
                    }
                )
                .then((foundUser) => {

                    //send email to user with reset token.
                    return reply(foundUser[0].resetToken);
                })
                .catch((err) => {

                    return reply(Boom.wrap(err));
                });
            }
        },
        {
            method: 'POST',
            path: '/user/resetPassword',
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

                const Users = request.collections().users;
                const Payload = request.payload;

                Users.findOne().where({ 'resetToken': Payload.resetToken }).then((foundUser) => {

                    if (foundUser){
                        Bcrypt.hash(Payload.newPassword, 10, (err, hash) => {

                            if (err) {
                                return reply(Boom.internal());
                            }

                            Users.update({ id: foundUser.id }, { password: hash, resetToken: null },
                            (error, updatedUser) => {

                                if (error){
                                    return reply(Boom.wrap(error));
                                }

                                return reply(updatedUser);
                            });
                        });
                    }
                    else {
                        return reply(Boom.notFound('Reset Code not found'));
                    }
                })
                .catch((err) => {

                    return reply(Boom.wrap(err));
                });
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

                const Users = request.collections().users;
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
        },
        {
            method: 'POST',
            path: '/user/changePassword',
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

                const Users = request.collections().users;
                const user = request.auth.credentials.user;
                const Payload = request.payload;
                if (Payload.password === Payload.newPassword){
                    return reply(Boom.badRequest('New password can not be the same as old password'));
                }
                if (user){

                    Users.findOne().where({ 'id': user.id }).then((foundUser) => {

                        Bcrypt.compare(Payload.password, foundUser.password, (err, isValid) => {

                            if (err) {
                                return reply(Boom.wrap(err));
                            }

                            if (isValid){
                                Bcrypt.hash(Payload.newPassword, 10, (err, hash) => {

                                    if (err) {
                                        return reply(Boom.internal());
                                    }
                                    Users.update({ id: foundUser.id }, { password: hash },
                                    (error, updatedUser) => {

                                        if (error){
                                            return reply(Boom.wrap(error));
                                        }

                                        return reply(updatedUser);
                                    });
                                });
                            }
                        });
                    })
                    .catch((err) => {

                        return reply(Boom.wrap(err));
                    });
                }
                else {
                    reply(Boom.notFound('User not found'));
                }
            }
        }
    ];
};
