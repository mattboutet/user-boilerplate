'use strict';

const Uuid = require('uuid/v4');

module.exports = (srv, options) => {

    return {
        connection: options.connection,
        autoPK: false,
        attributes: {
            id: {
                type: 'string',
                uuidv4: true,
                primaryKey: true,
                required: true,
                defaultsTo: () => {

                    return Uuid({
                        rng: Uuid.nodeRNG
                    });
                }
            },
            user: {
                model: 'users'
            }
        }
    };
};
