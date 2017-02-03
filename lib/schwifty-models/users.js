'use strict';
const Model = require('schwifty').Model;
const Joi = require('joi');

module.exports = (srv, options) => {

    return class Users extends Model {

        static get tableName() {

            return 'users';
        }

        static get joiSchema() {

            return Joi.object({

                id: Joi.number(),
                email: Joi.string().email(),
                password: Joi.string().allow(null),//does objection have a counterpart to 'protected' for this?
                firstName: Joi.string(),
                lastName: Joi.string(),
                resetToken: Joi.string().allow(null)
            });
        }
    };
};
