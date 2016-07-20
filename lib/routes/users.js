'use strict';

const Joi = require('joi');
const Boom = require('boom');
const Bcrypt = require('bcrypt');
const JWT = require('jsonwebtoken');
const Uuid = require('node-uuid');
const WL2Boom = require('waterline-to-boom');

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

                Users.findOne({ email: Payload.email }, (err, foundUser) => {

                    if (err) {
                        return reply(WL2Boom(err));
                    }

                    if (!foundUser) {
                        return reply(Boom.unauthorized('User or Password is invalid'));
                    }

                    Bcrypt.compare(Payload.password, foundUser.password, (err, isValid) => {

                        if (err) {
                            return reply(Boom.wrap(err));
                        }

                        if (isValid){
                            const secret = options.secrets.jwtSecret;

                            Tokens.create({ user: foundUser.id }, (tokenErr, token) => {

                                if (tokenErr) {
                                    return reply(WL2Boom(err));
                                }

                                const signed = JWT.sign({
                                    jti: token.id,
                                    user: foundUser.id
                                }, secret);//not currently using options param, but it's avail.
                                return reply(null, signed);
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

                Users.findOne({ id: request.params.id }, (err, user) => {

                    if (err) {
                        return reply(WL2Boom(err));
                    }
                    if (!user) {
                        return reply(Boom.notFound('User not found.'));
                    }

                    reply(user);
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

                const Users = request.collections().users;
                const user = request.auth.credentials.user;

                if (user){
                    
                    Users.findOne({ 'id': user.id },(error, foundUser) => {

                        if (error) {
                            return reply(WL2Boom(error));
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
            method: 'POST',
            path: '/user/request-reset',
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
                    },
                    (err, foundUser) => {

                        if (err) {
                            return reply(WL2Boom(err));
                        }

                        //NOTE: this just returns the resetToken for now
                        return reply(foundUser[0].resetToken);
                    }
                );
            }
        },
        {
            method: 'POST',
            path: '/user/reset-password',
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

                Users.findOne({ 'resetToken': Payload.resetToken }, (err, foundUser) => {

                    if (err) {
                        return reply(WL2Boom(err));
                    }

                    if (foundUser){
                        Bcrypt.hash(Payload.newPassword, 10, (err, hash) => {

                            if (err) {
                                return reply(Boom.internal());
                            }

                            Users.update({ id: foundUser.id }, { password: hash, resetToken: null },
                            (error, updatedUser) => {

                                if (error){
                                    return reply(WL2Boom(error));
                                }

                                return reply(updatedUser);
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
                            return reply(WL2Boom(error));
                        }

                        return reply(user);
                    });
                });
            }
        },
        {
            method: 'POST',
            path: '/user/change-password',
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

                    Users.findOne({ 'id': user.id }, (err, foundUser) => {

                        if (err) {
                            return reply(WL2Boom(err));
                        }

                        if (foundUser){

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
                                                return reply(WL2Boom(error));
                                            }

                                            return reply(updatedUser);
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
                else {
                    reply(Boom.notFound('User not found'));
                }
            }
        }
    ];
};
