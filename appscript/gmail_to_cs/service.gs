// Replace these with your own values
const service_account = {

};

const getStorageService = () =>
  OAuth2.createService('FirestoreStorage')
    .setPrivateKey(service_account.private_key)
    .setIssuer(service_account.client_email)
    .setPropertyStore(PropertiesService.getUserProperties())
    .setCache(CacheService.getUserCache())
    .setTokenUrl('https://oauth2.googleapis.com/token')
    .setScope('https://www.googleapis.com/auth/devstorage.read_write');
