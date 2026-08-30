const fs = require('fs');
const awsS3 = require('@aws-sdk/client-s3');
const s3 = new awsS3.S3Client({region: 'us-east-2'});

(async function () {
  const allscreensStr = fs.readFileSync('screen.json', {
    encoding: 'utf-8'
  });
  const allscreens = JSON.parse(allscreensStr);

  for (const src of allscreens) {
    console.log(`/root/srn/${src.asset_prefix_hash}/*`)
  }

  // await Promise.all(allscreens.map(srn => doFor(srn.asset_prefix_hash)));
})();

async function doFor(hash) {
  const loc = `root/srn/${hash}/index.json`;
  const data = await getDataFromS3File('origin-scdna', loc);
  await fs.promises.writeFile(`bu/${hash}_index.json`, JSON.stringify(data), {
    encoding: 'utf-8'
  })
  data.isHTML4 = true;

  await s3.send(new awsS3.PutObjectCommand({
    Bucket: 'origin-scdna',
    Key: loc,
    Body: JSON.stringify(data),
    ContentType: 'application/json',
    CacheControl: 'max-age=2592000, stale-while-revalidate=60'
  }));
  console.log('>>>> hash = ', hash);
  return 0;
}

async function getDataFromS3File(bucketName, path) {
  const {Body: body0} = await s3.send(new awsS3.GetObjectCommand({
    Bucket: bucketName,
    Key: path,
  }));

  const chunks = [];
  const nBody = body0;
  for await (const bodyChunk of nBody) {
    chunks.push(Buffer.from(bodyChunk));
  }
  const contentStr = Buffer.concat(chunks).toString('utf-8');
  const data = JSON.parse(contentStr);
  return data;
}
