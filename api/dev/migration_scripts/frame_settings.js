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

async function processBatch(offset, limit, conn) {
    const res = await new Promise((resolve, reject) => {
        conn.query(`select *
                    from tour LIMIT ${limit}
                    OFFSET ${offset}`, (queryErr, results) => {
            if (queryErr) reject(queryErr);
            resolve(results);
        });
    });
    const updates = res.map(row => {
        let infoColumn = JSON.parse(row.info);

        if (infoColumn === null) {
            infoColumn = {frameSettings: "NOFRAME"};
        }

        if (!(infoColumn.hasOwnProperty('frameSettings'))) {
            infoColumn = {...infoColumn, frameSettings: "NOFRAME"};
        }

        return {id: row.id, info: infoColumn};
    });

    if (updates.length === 0) return;

    const caseStatements = updates.map(row =>
        `WHEN id = ${row.id} THEN '${JSON.stringify(row.info)}'`
    ).join(' ');

    const ids = updates.map(row => row.id).join(', ');

    const updateQuery = `
        UPDATE tour
        SET info = CASE ${caseStatements}
            END
        WHERE id IN (${ids})
    `;

    await new Promise((resolve, reject) => {
        conn.query(updateQuery, (queryErr, results) => {
            if (queryErr) reject(queryErr);
            resolve(results);
        });
    });

    console.log(`Processed batch with offset ${offset}`);
}

async function processAllData() {
    const limit = 100;
    let offset = 0;
    const conn = await connectToDatabase();
    try {
        const countResult = await new Promise((resolve, reject) => {
            conn.query(`SELECT COUNT(*) AS count
                        FROM tour`, (queryErr, results) => {
                if (queryErr) reject(queryErr);
                resolve(results);
            });
        });
        while (offset < countResult[0].count) {
            console.log('jere')
            await processBatch(offset, limit, conn);
            offset += limit;
        }
        console.log('All rows have been processed.');
    } finally {
        conn.end();
    }
}

processAllData().catch(err => console.error('Error processing data:', err));










