'use strict';

const Path = require('path');
const Creds = require('./credentials');

module.exports = {

    server: {
        host: '0.0.0.0',
        port: process.env.PORT || 3000
    },

    main: {
        connection: process.env.NODE_ENV === 'dev' ? 'disk' : 'mysql',
        secrets: {
            jwtSecret: Creds.secrets.jwtSecret
        }
    },

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
            },
            disk: { adapter: 'disk' }
        },
        adapters: {
            disk: require('sails-disk'),
            mysql: require('sails-mysql')
        }
    },

    poop: {
        logPath: Path.normalize(`${__dirname}/../poop.log`)
    }

};
