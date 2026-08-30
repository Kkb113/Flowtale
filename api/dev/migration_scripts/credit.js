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

const ENDPOINT = (orgId) => `http://localhost:8080/v1/ide/refill_fable_credit/${orgId}`;

async function processAllData() {
  const errs = [];
  const conn = await connectToDatabase();
  try {
    const orgs = await new Promise((resolve, reject) => {
      conn.query(`SELECT *
                  FROM org`, (queryErr, results) => {
        if (queryErr) reject(queryErr);
        resolve(results);
      });
    });

    let currentOrg = 1;
    const totalOrgs = orgs.length;
    for (const org of orgs) {
      try {
        const resp = await fetch(ENDPOINT(org.id), {
          method: 'POST',
        });
        if (resp.status >= 300) throw new Error('Response Status ' + resp.status);

        const json = await resp.json();
        const data = json.data;
        console.log(`[${currentOrg++}/${totalOrgs}] Refilled value: ${data.availableCredits}. For org ${org.id} plan ${data.paymentPlan}-${data.paymentInterval} status[${data.status}]`)
      } catch (e) {
        errs.push(`[${currentOrg++}/${totalOrgs}] For org ${org.id} faced an error. \n${e.stack}`)
      }
    }
  } finally {
    conn.end();
    console.log('~~~~~~~~~~~~~~Errors~~~~~~~~~~~~~~~~~');
    console.log(errs.join('\n'));
    console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    console.log('Released connection')
  }
}

processAllData().catch(err => console.error('Error processing data:', err));
