const { S3Client } = require('@aws-sdk/client-s3');

const S3_ENDPOINT = process.env.S3_ENDPOINT;
if (!S3_ENDPOINT) throw new Error('No S3 endpoint provided');

const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
if (!S3_ACCESS_KEY_ID) throw new Error('No S3 access key ID provided');

const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
if (!S3_SECRET_ACCESS_KEY) throw new Error('No S3 secret access key provided');

const S3 = new S3Client({
	region: 'auto', endpoint: S3_ENDPOINT, credentials: {
		accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY,
	},
});

module.exports = S3;