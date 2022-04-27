import {DataTypes, Sequelize} from 'sequelize';

// Example for different types of connection

const sequelizeUriSqlite = new Sequelize('sqlite::memory:');

const sequelize = sequelizeUriSqlite;

const ShadowUser = sequelize.define(
    "ShadowUser",
    {
        shadowUserId: {
            type: DataTypes.UUID,
            primaryKey: true
        },
    },
    {}
);

const CreditCardDetails = sequelize.define(
    "CreditCardDetails",
    {
        pinCode: {
            type: DataTypes.STRING,
        },
        cvv1: {
            type: DataTypes.STRING,
        },
        cvv2: {
            type: DataTypes.STRING,
        },
        

        expirationDate: {
            type: DataTypes.DATEONLY,
        },
        cardHolderName: {
            type: DataTypes.STRING,
        },
        cardNumber: {
            type: DataTypes.STRING,
        },
    },
    {}
);

const User = sequelize.define(
    'User',
    {
        userId: {
            type: DataTypes.UUID,
            primaryKey: true
        },
        firstName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        lastName: {
            type: DataTypes.STRING,
            defaultValue: "Doe"
        },
        dateOfBirth: {
            type: DataTypes.DATEONLY
        },
        score: {
            type: DataTypes.DOUBLE
        },
        activated: {
            type: DataTypes.BOOLEAN
        },
        someCount: {
            type: DataTypes.INTEGER,
            autoIncrement: true
        },
        shadowId: {
            type: DataTypes.UUID,
            references: {
                model: ShadowUser,
                key: "shadowUserId"
            }
        },
        someRandomThing: DataTypes.TEXT,
        anotherSomeRandomThing: DataTypes.TEXT
    },
    {
        indexes: [{unique: true, fields: ['userId']}]
    }
);
