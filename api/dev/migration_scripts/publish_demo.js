const mysql = require('mysql');

const dbConfig = {
  host: '<>',
  user: '<>',
  password: '<>',
  database: 'fable_tour_app',
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
    conn.query('select * from tour', (queryErr, results) => {
      if (queryErr) reject(queryErr);
      resolve(results);
    });
  });

  const allTours = data;
  data = data.filter(d => d.last_published_date !== null);
  console.log("# of Published demo " + data.length + "/" + allTours.length);

  for (const tour of data) {
    console.log('Migrating ', tour.rid);
    let resp;
    try {
      resp = await fetch('https://api.service.sharefable.com/v1/m/tpub', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tourRid: tour.rid
        })
      });
      console.log('resp', resp.status)
    } catch (e) {
      console.error('Error', e.stack);
    }
  }

  console.log('~~~ Completed');
})();
