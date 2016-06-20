'use strict';

module.exports = (srv, options) => {

    return {
        connection: options.connection,

        attributes: {
            email: {
                type: 'string',
                unique: true,
                required: true
            },
            password: {
                type: 'string',
                protected: true
            },
            firstName: {
                type: 'string',
                required: true
            },
            lastName: {
                type: 'string',
                required: true
            },
            resetToken: {
                type: 'string'
            }
        }
    };
};
