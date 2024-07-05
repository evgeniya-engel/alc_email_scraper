const uploadFileToCloudStorage = (file, filePath, fileName) => {

  const STORAGE_BUCKET = 'alc-email-scrape';

  Logger.log('Processing: ' + file.getName());
  const bytes = file.getBytes();

  Logger.log("Uploading to Cloud Storage");
  
  const API = `https://www.googleapis.com/upload/storage/v1/b`;
  const location = encodeURIComponent(`${filePath}/${fileName}`);
  const url = `${API}/${STORAGE_BUCKET}/o?uploadType=media&name=${location}`;

  const service = getStorageService();
  const accessToken = service.getAccessToken();

  const response = UrlFetchApp.fetch(url, {
    method: 'POST',
    contentLength: bytes.length,
    contentType: 'text/csv',
    payload: bytes,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const result = JSON.parse(response.getContentText());
  Logger.log(JSON.stringify(result, null, 2));
}