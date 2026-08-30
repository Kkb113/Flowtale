const mysql = require('mysql');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'fable_tour_app',
  port: '3306'
};

async function connectToDatabase() {
  const connection = mysql.createConnection(dbConfig);

  return new Promise((resolve, reject) => {
    connection.connect((err) => {
      if (err) {
        console.error('Error connecting to MySQL database:', err);
        reject(err);
        return;
      }
      console.log('Connected to MySQL database!');
      resolve(connection);
    });
  });
}

(async function run() {
  const conn = await connectToDatabase();
  let data = await new Promise((resolve, reject) => {
    conn.query('select * from user', function (queryErr, results) {
      if (queryErr) reject(queryErr);
      resolve(results);
    });
  });

  for (const user of data) {
    console.log('Migrating ', user.id);
    try {
      if (user.belongs_to_org === undefined || user.belongs_to_org === null) continue;
      let data = await new Promise((resolve, reject) => {
        conn.query(`INSERT INTO user_org_join (user_id, org_id)
                    VALUES (${user.id}, ${user.belongs_to_org});`, (queryErr, results) => {
          if (queryErr) reject(queryErr);
          resolve(results);
        });
      });
      console.log('Created user entry in user_org_join table ', user.id)
    } catch (e) {
      console.error('Error', e.stack);
    }
  }

  console.log('~~~ Completed');
})();
