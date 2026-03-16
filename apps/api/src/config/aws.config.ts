import { registerAs } from '@nestjs/config';

export default registerAs('aws', () => ({
  region: process.env.AWS_REGION || 'eu-west-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  s3Bucket: process.env.AWS_S3_BUCKET || 'pob-eqp-documents',
  s3BucketReplica: process.env.AWS_S3_BUCKET_REPLICA,
  presignedUrlExpirySec: parseInt(process.env.S3_PRESIGNED_EXPIRY_SEC || '3600', 10),
  cloudFrontUrl: process.env.CLOUDFRONT_URL,
}));
