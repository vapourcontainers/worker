import * as ossutil from '../utils/ossutil';
import { updateDownloadProgress } from '../server';

export default async function download(config: ossutil.IOssConfig, index: number, source: string, target: string): Promise<void> {
  const stat = await ossutil.stat(config, source);

  updateDownloadProgress({
    fileIndex: index,
    currentBytes: 0,
    totalBytes: stat.contentLength,
  });

  await ossutil.download(config, source, target, (bytes, totalBytes) => {
    updateDownloadProgress({
      fileIndex: index,
      currentBytes: bytes,
      totalBytes: totalBytes,
    });
  });

  updateDownloadProgress({
    fileIndex: index,
    currentBytes: stat.contentLength,
    totalBytes: stat.contentLength,
  });
}
