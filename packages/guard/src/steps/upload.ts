import { stat } from 'fs/promises';

import * as ossutil from '../utils/ossutil';
import { updateUploadProgress } from '../server';

export default async function upload(config: ossutil.IOssConfig, source: string, target: string): Promise<void> {
  const { size } = await stat(source);

  updateUploadProgress({
    fileIndex: 0,
    currentBytes: 0,
    totalBytes: size,
  });

  await ossutil.upload(config, source, target, (bytes, totalBytes) => {
    updateUploadProgress({
      fileIndex: 0,
      currentBytes: bytes,
      totalBytes: totalBytes,
    });
  });

  updateUploadProgress({
    fileIndex: 0,
    currentBytes: size,
    totalBytes: size,
  });
}
