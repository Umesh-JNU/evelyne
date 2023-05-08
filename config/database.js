const { Sequelize } = require("sequelize");

const database = process.env.DATABASE;
const user = process.env.USER;
const password = process.env.PASSWORD;
const dialect = process.env.DIALECT;
const host = process.env.HOST;

const sequelize = new Sequelize(database, user, password, { host, dialect });

// const sequelize = new Sequelize({
//   dialect: "sqlite",
//   storage: "../employee.db",
// });

module.exports = {
  connectDatabase: async () => {
    try {
      sequelize.sync();
      // sequelize.sync({ force: true });
      await sequelize.authenticate();
      console.log("Connection has been established successfully.");
    } catch (error) {
      console.error("Unable to connect to the database:", error);
    }
  },
  db: sequelize,
};
// const sqlite3 = require('sqlite3');

// const db = new sqlite3.Database(process.env.DATABASE, (err) => {
//   if (err) {
//     return console.error(err.message);
//   }
//   console.log('Database connected successfully.');
// });

// const createTable = [
//   `CREATE TABLE IF NOT EXISTS employee('id' INTEGER PRIMARY KEY AUTOINCREMENT, 'name' varchar);`,
// ];

// module.exports = {
//   db,
//   connectDatabase: () => {
//     createTable.forEach(query => {
//       console.log("Running - ", query);
//       db.run(query);
//     })
//   }
// }
