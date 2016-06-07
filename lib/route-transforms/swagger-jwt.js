'use strict';
const Joi = require('joi');

module.exports = {
    name: 'swagger-jwt',
    root: 'config.validate',
    handler: (root, route, server, options) => {

        let transformed = root;

        transformed.headers = Joi.object({
            authorization: Joi.string()
            .description('JWT')
        }).unknown();

    },
    match: (root, route) => {

        return { value: route.config.auth.strategy == 'api-user-jwt', error: null };
    },
};
