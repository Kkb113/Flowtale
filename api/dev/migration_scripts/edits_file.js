const mysql = require('mysql');
const {S3Client, HeadObjectCommand, PutObjectCommand} = require('@aws-sdk/client-s3');
const s3 = new S3Client({region: 'ap-south-1'});

const dbConfig = {
    host: '<>',
    user: '<>',
    password: '<>',
    database: '<>',
};
const bucketName = 'fable-tour-app-gamma';
const data = {
    v: 1,
    lastUpdatedAtUtc: -1,
    edits: {}
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

async function checkIfPathExists(prefix) {
    try {
        const command = new HeadObjectCommand({
            Bucket: bucketName,
            Key: prefix
        });
        await s3.send(command);
        //console.log(`Object ${objectKey} exists in bucket ${bucketName}.`);
        return true;
    } catch (error) {
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
            //console.log(`Object ${objectKey} does not exist in bucket ${bucketName}.`);
            return false;
        } else {
            // Handle other errors (like permission issues, etc.)
            console.error(`Error checking object existence: ${error.message}`);
            throw error;
        }
    }
}

async function upload(prefix) {

    await s3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: prefix,
        Body: JSON.stringify(data),
        ContentType: 'application/json',
        CacheControl: 'max-age=0'
    }));
    console.log('>>>> hash = ', prefix);
}

async function processBatch(offset, limit, conn) {
    const res = await new Promise((resolve, reject) => {
        conn.query(`select asset_prefix_hash
                    from tour LIMIT ${limit}
                    OFFSET ${offset}`, (queryErr, results) => {
            if (queryErr) reject(queryErr);
            resolve(results);
        });
    });
    const tasks = res.map(async (row) => {
        const prefix = `fahumithazeerin/tour/${row.asset_prefix_hash}/edits.json`;

        const exists = await checkIfPathExists(prefix);

        if (!exists) {
            await upload(prefix);
        }
    });

    await Promise.all(tasks);

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