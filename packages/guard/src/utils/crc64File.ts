import { promisify } from 'node:util';
import { crc64File } from 'crc64-ecma182.js';

export default promisify(crc64File);
