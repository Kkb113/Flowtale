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
    conn.query('select * from org', function (queryErr, results) {
      if (queryErr) reject(queryErr);
      resolve(results);
    });
  });

  for (const org of data) {
    console.log('Migrating ', org.id);
    try {
      let users = await new Promise((resolve, reject) => {
        conn.query(`SELECT *
                    FROM user
                    WHERE belongs_to_org = ${org.id}
                    ORDER BY created_at ASC
                    LIMIT 1;`, (queryErr, results) => {
          if (queryErr) reject(queryErr);
          resolve(results);
        });
      });
      let user = users[0];
      console.log("User fetched for org ", user);
      let data = await new Promise((resolve, reject) => {
        conn.query(`UPDATE org
                    SET created_by = ${user.id}
                    WHERE id = ${user.belongs_to_org};`, (queryErr, results) => {
          if (queryErr) reject(queryErr);
          resolve(results);
        });
      });
      console.log('Updated created_by for org', org.id)
    } catch (e) {
      console.error('Error', e.stack);
    }
  }

  console.log('~~~ Completed');
})();
