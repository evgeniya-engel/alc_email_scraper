// Replace these with your own values
const service_account = {
  private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCsg+8tOK+0bomQ\nu3HH7eG4BzOuCuBWdb3MJshMybL4Mvr24Y63c02HMzrSZJPykiGg4TrZqXgby3uW\n9ufjRAAFujwyWSM9gzHo7vWBahSWu4GKp0tUC3rm8HM9ccBVGZgCnWFKt/BRwdbT\ntL59yduFwS/eUmftd65K7ZFaPyAJZjnSYi7oZWhppqXiogbfdz2WHH8LZPTAiJ5g\nzhyQ7AoJA9VSlFk39/o1jzHtZNPGG/f1XxbaPCjNgu3L0VyE4fve3HfKVLjEt+pq\nwogJ+i5/+n+kjDu+gj0VAxxnR3OGFMaguLbwPO32u92E9HdZMpQK9dxXL7sZi/v2\niKK3mgfRAgMBAAECggEABPZCgd14iEsJn+UUT7jS3jUu0lmzvCjkzaNr7XF7uVHW\nEBXKwhIJ79KUZYrJCpgTaYow5CPQtZPzuRLe9pV1HrUNmDEiJ1nHrLh6zT8c2n0I\nK9HGA+PUpCHUXrcP3iK/UYvvSXPi8KcPo8U2GW4d50n4M3/RR25C0BrnLF5WcI65\nEjYuLa+8W+xkk9PtBbx+5701J1GqDezCczmdh/U7FpImQJ6vh7YcU1iyLf4VD5B4\n5x4X4OWLYMp2yhWTl2+lEbWcCS4xLvpfLGP4Zopgi7rfj5IusWj68F9PnLNQDgnS\nUOA4UK2aGgDoDIKnUiQwhIj5aegAeg9EXlXD5Z01sQKBgQDShAKOi4nHgEB9pLq0\ng8JXDb40OEIcyBIlFL5QqrB3obKoa14tLXFAaI8DZJ3y6em2Gm+Wa69xVqZ3LT9C\nZwyYsOcdYhkwX66osRoBwy4P448q0A712NdNnqStK00zwSrL+D+N1OmM9jWHGm+a\ns/AmACCCDM29QpLV93dL9TRzBQKBgQDRyg+3vW4GRYLhdJD3rwXkMSnic6/mA8Kc\nnAtZEBgeld4IiaXJY800pVdvfki0XN7xYEzwVv9NWhdTXtObIiW3vY1bqHBy6erz\nZU0nRtPZVXhUXL2cU7enb4tjsGBGYEvZbQ1NYa+fhxxDe2ZT6ejXmnPZSch5sHAx\n3aP7LC1zXQKBgCRBdgtEvvLsBK9e6oTiWFsT09k8gy5fyrg2LVzJOOExqQpWi36u\nX93e5BqKfqVyYbzqKqO2Yh3b9Yl68nUmOEYn2XX3Ci2JnRQShE8fZVR5NZQDB0CS\nGuqUUvo8BezO7Ob6Fz//FkYftTJSfDwhl0+EIBUlzV02FQHiv9oGHgVdAoGAfj22\neZ3PMIzxtlPbzIAQ7oE7MB7nkWVf3bf1CDIsIXOTudWC4w5gdLauR9RZUde0/NEz\nW0kutlBpSuz8LxU8VzYEc0yH5k6m6LJj3Ce94cGR+Eoae5DRKjtwSJvhQ1g9LGh4\nIcGP2lKGioEeUY6nY954qh/BOKEY0pkKTWIHM60CgYAP2zn+Ri8X+IOnRZP+ENlq\nNeHfkqcxxMjAYPYqI4g8HFYfE6yKdtq4C4cp09WPh33Bjo9IttcYiB/ZvsXjEE4H\n3HWzadIgMGTugc49kAIFpU86dYjevVtP9N2uVcbjwtli6EtDkF2oHZlSfALvPG7b\nQPsK5tNvcuUzxVJv+GTP/g==\n-----END PRIVATE KEY-----\n',
  client_email: '1047308774678-compute@developer.gserviceaccount.com',
};

const getStorageService = () =>
  OAuth2.createService('FirestoreStorage')
    .setPrivateKey(service_account.private_key)
    .setIssuer(service_account.client_email)
    .setPropertyStore(PropertiesService.getUserProperties())
    .setCache(CacheService.getUserCache())
    .setTokenUrl('https://oauth2.googleapis.com/token')
    .setScope('https://www.googleapis.com/auth/devstorage.read_write');