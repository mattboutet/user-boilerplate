'use strict';

const Path = require('path');
const Creds = require('./credentials');

module.exports = {

    server: {
        host: '0.0.0.0',
        port: process.env.PORT || 3000
    },

    api: {},

    dogwater: {
        connections: {
            mysql: {
                adapter: 'mysql',

                host      : 'localhost',
                port      : 3306,
                user      : Creds.mysqlCreds.user,
                password  : Creds.mysqlCreds.password,
                database  : 'user-boilerplate',
                connectionLimit: 30,
                // Optional
                charset   : 'utf8',
                collation : 'utf8_swedish_ci'
            }
        },
        adapters: {
            mysql: require('sails-mysql')
        },
        models: Path.normalize(`${__dirname}/../lib/models`),
        data: {
            dir: Path.normalize(`${__dirname}/../lib`),
            pattern: 'fixtures.js'
        }
    },

    poop: {
        logPath: Path.normalize(`${__dirname}/../poop.log`)
    },

    secrets: {
        jwtSecret: Creds.secrets.jwtSecret
    }
};
