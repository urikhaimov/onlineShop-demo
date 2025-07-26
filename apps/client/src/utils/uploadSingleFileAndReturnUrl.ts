import { uploadFilesAndReturnUrls } from './uploadFilesAndReturnUrls';

export default async function uploadSingleFileAndReturnUrl(
  file: File,
  folderPath = 'logos',
): Promise<string> {
  const [url] = await uploadFilesAndReturnUrls([file], folderPath);
  return url;
}
