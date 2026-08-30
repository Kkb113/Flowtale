const mysql = require('mysql');

const dbConfig = {
  host: '<>',
  user: '<>',
  password: '<>',
  database: '<>',
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
  data = data.filter(d => d.last_published_date !== null);
  const batches = [];
  const batchsize = 5;
  for (let i = 0; i < data.length; i += batchsize) {
    batches.push(data.slice(i, i + batchsize));
  }

  let i = 0;
  for (const batch of batches) {
    console.log('Processing batch', `${++i}/${batches.length}`);
    await Promise.all(batch.map(async (tour) => {
      await fetch(`https://api.service.sharefable.com/v1/repub/entity/rid/${tour.rid}`);
    }));
  }
  console.log('~~~ Completed');
})();
