import config from '../config.json';
import mysql from 'mysql2/promise';
import { Sequelize } from 'sequelize';
import accountModel from '../accounts/account.model';
import refreshTokenModel from '../accounts/refresh-token.model';

const db: any = {};
export default db;

initialize();

async function initialize() {
    if (process.env.SKIP_DB_INIT === 'true') {
        console.warn('Database initialization skipped (SKIP_DB_INIT=true)');
        return;
    }

    // Use environment variables for Clever Cloud, fallback to config.json for local dev
    const host = process.env.MYSQL_HOST || config.database.host;
    const port = Number(process.env.MYSQL_PORT) || config.database.port;
    const user = process.env.MYSQL_USER || config.database.user;
    const password = process.env.MYSQL_PASSWORD || config.database.password;
    const database = process.env.MYSQL_DATABASE || config.database.database;

    const connection = await mysql.createConnection({ host, port, user, password });

    // Create DB if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);

    // Connect to DB
    const sequelize = new Sequelize(database, user, password, { 
        host, 
        port, 
        dialect: 'mysql' 
    });


    // Init models
    db.Account = accountModel(sequelize);
    db.RefreshToken = refreshTokenModel(sequelize);

    // Define relationships
    db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
    db.RefreshToken.belongsTo(db.Account);

    // Sync models with database
    await sequelize.sync();
}