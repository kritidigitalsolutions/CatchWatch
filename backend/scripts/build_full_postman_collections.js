const fs = require('fs');
const path = require('path');

// -------------------------------------------------------------
// 1. Definition of Route Mounts & Categories
// -------------------------------------------------------------
const routeMounts = [
  // ADMIN MOUNTS
  { file: 'routes/admin/auth.routes.js', base: '/api/admin/auth', type: 'Admin', folder: 'Auth' },
  { file: 'routes/admin/subadmin.routes.js', base: '/api/admin/subadmins', type: 'Admin', folder: 'Subadmins' },
  { file: 'routes/admin/user.routes.js', base: '/api/admin/users', type: 'Admin', folder: 'User Management' },
  { file: 'routes/admin/category.routes.js', base: '/api/admin/categories', type: 'Admin', folder: 'Categories' },
  { file: 'routes/admin/movie.routes.js', base: '/api/admin/movies', type: 'Admin', folder: 'Movies' },
  { file: 'routes/admin/series.routes.js', base: '/api/admin/series', type: 'Admin', folder: 'Series' },
  { file: 'routes/admin/episode.routes.js', base: '/api/admin/episodes', type: 'Admin', folder: 'Episodes' },
  { file: 'routes/admin/content.routes.js', base: '/api/admin/content', type: 'Admin', folder: 'Content' },
  { file: 'routes/admin/shortFilm.routes.js', base: '/api/admin/short-films', type: 'Admin', folder: 'Short Films' },
  { file: 'routes/admin/tvShow.routes.js', base: '/api/admin/tv-shows', type: 'Admin', folder: 'TV Shows' },
  { file: 'routes/admin/tvShowsEpisode.routes.js', base: '/api/admin/tv-shows-episodes', type: 'Admin', folder: 'TV Shows Episodes' },
  { file: 'routes/admin/verification.routes.js', base: '/api/admin/verification', type: 'Admin', folder: 'Verification Requests' },
  { file: 'routes/admin/legal.routes.js', base: '/api/admin/legal', type: 'Admin', folder: 'Legal Policies' },
  { file: 'routes/admin/help.routes.js', base: '/api/admin/help', type: 'Admin', folder: 'Help Center' },
  { file: 'routes/admin/plan.routes.js', base: '/api/admin/plan', type: 'Admin', folder: 'Plans' },
  { file: 'routes/admin/promo.routes.js', base: '/api/admin/promo', type: 'Admin', folder: 'Promo Codes' },
  { file: 'routes/admin/voucher.routes.js', base: '/api/admin/voucher', type: 'Admin', folder: 'Vouchers' },
  { file: 'routes/admin/subscription.routes.js', base: '/api/admin/subscription', type: 'Admin', folder: 'Subscriptions' },
  { file: 'routes/admin/notification.routes.js', base: '/api/admin/notifications', type: 'Admin', folder: 'Notifications' },
  { file: 'routes/admin/support.routes.js', base: '/api/admin/support', type: 'Admin', folder: 'Support Tickets' },
  { file: 'routes/admin/creator.routes.js', base: '/api/admin/creator', type: 'Admin', folder: 'Creator Management' },
  { file: 'routes/admin/redeem.routes.js', base: '/api/admin/redeem', type: 'Admin', folder: 'Redeem Requests' },
  { file: 'routes/admin/ad.routes.js', base: '/api/admin/ads', type: 'Admin', folder: 'Ads Engine' },
  { file: 'routes/admin/fraud.routes.js', base: '/api/admin/fraud', type: 'Admin', folder: 'Fraud Detection' },
  { file: 'routes/admin/analytics.routes.js', base: '/api/admin/analytics', type: 'Admin', folder: 'Analytics' },
  { file: 'routes/admin/settings.routes.js', base: '/api/admin/settings', type: 'Admin', folder: 'Settings' },

  // USER MOUNTS
  { file: 'routes/user/auth.routes.js', base: '/api/auth', type: 'User', folder: 'Auth' },
  { file: 'routes/user/user.routes.js', base: '/api/user', type: 'User', folder: 'User Profile' },
  { file: 'routes/user/chat.routes.js', base: '/api/chat', type: 'User', folder: 'Chat & Messaging' },
  { file: 'routes/user/call.routes.js', base: '/api/calls', type: 'User', folder: 'Audio & Video Calls' },
  { file: 'routes/user/movie.routes.js', base: '/api/movies', type: 'User', folder: 'Movies' },
  { file: 'routes/user/series.routes.js', base: '/api/series', type: 'User', folder: 'Series' },
  { file: 'routes/user/content.routes.js', base: '/api/content', type: 'User', folder: 'Content Explore' },
  { file: 'routes/user/shortFilm.routes.js', base: '/api/short-films', type: 'User', folder: 'Short Films' },
  { file: 'routes/user/tvShow.routes.js', base: '/api/tv-shows', type: 'User', folder: 'TV Shows' },
  { file: 'routes/user/tvShowsEpisode.routes.js', base: '/api/tv-shows-episodes', type: 'User', folder: 'TV Shows Episodes' },
  { file: 'routes/user/category.routes.js', base: '/api/categories', type: 'User', folder: 'Categories' },
  { file: 'routes/user/verification.routes.js', base: '/api/verification', type: 'User', folder: 'Verification' },
  { file: 'routes/user/legal.routes.js', base: '/api/legal', type: 'User', folder: 'Legal' },
  { file: 'routes/user/help.routes.js', base: '/api/help', type: 'User', folder: 'Help Center' },
  { file: 'routes/user/rating.routes.js', base: '/api/rating', type: 'User', folder: 'Ratings & Reviews' },
  { file: 'routes/user/plan.routes.js', base: '/api/plan', type: 'User', folder: 'Plans' },
  { file: 'routes/user/promo.routes.js', base: '/api/promo', type: 'User', folder: 'Promo Codes' },
  { file: 'routes/user/voucher.routes.js', base: '/api/voucher', type: 'User', folder: 'Vouchers' },
  { file: 'routes/user/subscription.routes.js', base: '/api/subscription', type: 'User', folder: 'Subscriptions' },
  { file: 'routes/user/watchlist.routes.js', base: '/api/watchlist', type: 'User', folder: 'Watchlist' },
  { file: 'routes/user/notification.routes.js', base: '/api/notifications', type: 'User', folder: 'Notifications' },
  { file: 'routes/user/interation.routes.js', base: '/api/interaction', type: 'User', folder: 'Interactions' },
  { file: 'routes/user/payment.routes.js', base: '/api/payment', type: 'User', folder: 'Payment (Razorpay)' },
  { file: 'routes/user/support.routes.js', base: '/api/support', type: 'User', folder: 'Support Tickets' },
  { file: 'routes/user/reel.routes.js', base: '/api/reels', type: 'User', folder: 'Reels' },
  { file: 'routes/user/comment.routes.js', base: '/api/comments', type: 'User', folder: 'Comments' },
  { file: 'routes/user/creator.routes.js', base: '/api/creator', type: 'User', folder: 'Creator Studio' },
  { file: 'routes/user/ad.routes.js', base: '/api/ads', type: 'User', folder: 'Ads Engine' }
];

// Helper to extract realistic request body based on route path & method
function getRequestBody(method, fullPath, folder) {
  if (method === 'GET' || method === 'DELETE') return null;

  const pathLower = fullPath.toLowerCase();

  if (pathLower.includes('/login')) {
    if (fullPath.includes('/admin/')) {
      return { email: 'admin@catchwatch.com', password: 'AdminPassword123!' };
    }
    return { email: 'user@example.com', password: 'UserPassword123!' };
  }
  if (pathLower.includes('/register') || pathLower.includes('/signup')) {
    return { email: 'user@example.com', password: 'UserPassword123!', name: 'John Doe', phone: '9876543210' };
  }
  if (pathLower.includes('/send-otp') || pathLower.includes('/forgot-password')) {
    return { email: 'user@example.com' };
  }
  if (pathLower.includes('/verify-otp')) {
    return { email: 'user@example.com', otp: '123456' };
  }
  if (pathLower.includes('/reset-password')) {
    return { email: 'user@example.com', otp: '123456', newPassword: 'NewPassword123!' };
  }
  if (pathLower.includes('/change-password')) {
    return { oldPassword: 'OldPassword123!', newPassword: 'NewPassword123!' };
  }
  if (pathLower.includes('/subadmins')) {
    return { name: 'Sub Admin', email: 'subadmin@catchwatch.com', password: 'Password123!', permissions: ['movies', 'series'] };
  }
  if (pathLower.includes('/categories')) {
    return { name: 'Action & Adventure', description: 'Thrilling action content', iconUrl: 'https://cdn.catchwatch.com/icons/action.png' };
  }
  if (pathLower.includes('/movies')) {
    return {
      title: 'Action Movie Title',
      description: 'An exciting action-packed blockbuster movie.',
      releaseYear: 2024,
      duration: 125,
      genre: ['Action', 'Thriller'],
      categoryId: '60d0fe4f5311236168a109ca',
      posterUrl: 'https://cdn.catchwatch.com/posters/movie.jpg',
      bannerUrl: 'https://cdn.catchwatch.com/banners/movie.jpg',
      videoUrl: 'https://cdn.catchwatch.com/videos/movie.mp4',
      trailerUrl: 'https://cdn.catchwatch.com/trailers/movie.mp4',
      accessType: 'free',
      isFeatured: true,
      status: 'published'
    };
  }
  if (pathLower.includes('/series')) {
    return {
      title: 'Web Series Title',
      description: 'An engrossing multi-episode web series.',
      releaseYear: 2024,
      genre: ['Drama', 'Mystery'],
      categoryId: '60d0fe4f5311236168a109ca',
      posterUrl: 'https://cdn.catchwatch.com/posters/series.jpg',
      bannerUrl: 'https://cdn.catchwatch.com/banners/series.jpg',
      trailerUrl: 'https://cdn.catchwatch.com/trailers/series.mp4',
      accessType: 'vip',
      status: 'published'
    };
  }
  if (pathLower.includes('/episodes')) {
    return {
      seriesId: '60d0fe4f5311236168a109cb',
      seasonNumber: 1,
      episodeNumber: 1,
      title: 'Episode 1: The Beginning',
      description: 'The inaugural episode of season 1.',
      duration: 45,
      videoUrl: 'https://cdn.catchwatch.com/videos/ep1.mp4',
      thumbnailUrl: 'https://cdn.catchwatch.com/thumbs/ep1.jpg',
      accessType: 'free'
    };
  }
  if (pathLower.includes('/short-films') || pathLower.includes('/shortdrama')) {
    return {
      title: 'Short Drama Title',
      description: 'A captivating short drama.',
      duration: 15,
      videoUrl: 'https://cdn.catchwatch.com/videos/short.mp4',
      posterUrl: 'https://cdn.catchwatch.com/posters/short.jpg',
      accessType: 'free'
    };
  }
  if (pathLower.includes('/tv-shows')) {
    return {
      title: 'TV Show Title',
      description: 'Popular television entertainment show.',
      network: 'CatchWatch Originals',
      posterUrl: 'https://cdn.catchwatch.com/posters/tvshow.jpg'
    };
  }
  if (pathLower.includes('/plan')) {
    return { name: 'VIP Monthly', price: 199, durationDays: 30, description: 'Unlimited access to all VIP movies & series' };
  }
  if (pathLower.includes('/promo')) {
    return { code: 'WELCOME50', discountPercent: 50, maxUses: 100, expiryDate: '2026-12-31' };
  }
  if (pathLower.includes('/voucher')) {
    return { voucherCode: 'VIPGIFT2026', planId: '60d0fe4f5311236168a109ce', validityDays: 30 };
  }
  if (pathLower.includes('/subscription')) {
    return { planId: '60d0fe4f5311236168a109ce', paymentMethod: 'Razorpay' };
  }
  if (pathLower.includes('/payment')) {
    if (pathLower.includes('/verify')) {
      return { razorpay_order_id: 'order_K12345678', razorpay_payment_id: 'pay_K87654321', razorpay_signature: 'signature_hash_here' };
    }
    return { planId: '60d0fe4f5311236168a109ce', amount: 199, currency: 'INR' };
  }
  if (pathLower.includes('/support')) {
    return { subject: 'Account Issue', message: 'Unable to stream full HD on device.', category: 'Technical' };
  }
  if (pathLower.includes('/chat')) {
    return { receiverId: '60d0fe4f5311236168a109cc', message: 'Hello! Checking in regarding content update.', mediaType: 'text' };
  }
  if (pathLower.includes('/calls')) {
    return { receiverId: '60d0fe4f5311236168a109cc', callType: 'video' };
  }
  if (pathLower.includes('/reels')) {
    return { caption: 'Exclusive highlight snippet! #CatchWatch', videoUrl: 'https://cdn.catchwatch.com/reels/reel1.mp4', tags: ['trending', 'viral'] };
  }
  if (pathLower.includes('/comments')) {
    return { contentId: '60d0fe4f5311236168a109cd', text: 'Great storyline and acting!' };
  }
  if (pathLower.includes('/rating')) {
    return { contentId: '60d0fe4f5311236168a109cd', rating: 5, review: 'Fantastic watch!' };
  }
  if (pathLower.includes('/watchlist')) {
    return { contentId: '60d0fe4f5311236168a109cd', contentType: 'movie' };
  }
  if (pathLower.includes('/interaction')) {
    return { targetId: '60d0fe4f5311236168a109cd', type: 'like' };
  }
  if (pathLower.includes('/notifications')) {
    return { title: 'New Release Alert', message: 'Check out the newly released season 2!', targetUser: 'all' };
  }

  // Generic fallback body for POST/PUT/PATCH
  return { sampleKey: 'sampleValue', timestamp: new Date().toISOString() };
}

// -------------------------------------------------------------
// 2. Parse Route Files
// -------------------------------------------------------------
const adminFolderItems = {};
const userFolderItems = {};

let routeCount = 0;

routeMounts.forEach(mount => {
  const filePath = path.join(__dirname, '..', mount.file);
  if (!fs.existsSync(filePath)) return;

  const code = fs.readFileSync(filePath, 'utf8');
  const regex = /router\.(get|post|put|patch|delete)\s*\(\s*(['"])([^'"]+)\2/g;
  let match;

  const targetStore = mount.type === 'Admin' ? adminFolderItems : userFolderItems;
  if (!targetStore[mount.folder]) {
    targetStore[mount.folder] = [];
  }

  while ((match = regex.exec(code)) !== null) {
    routeCount++;
    const method = match[1].toUpperCase();
    let subPath = match[3];
    if (subPath === '/') subPath = '';
    const fullPath = (mount.base + subPath).replace(/\/+/g, '/');

    // Build Postman request item
    const pathSegments = fullPath.split('/').filter(Boolean);

    // Convert route params e.g. :id -> {{id}} or keeps path format
    const formattedSegments = pathSegments.map(seg => seg.startsWith(':') ? `{{${seg.substring(1)}}}` : seg);
    const rawUrl = `{{baseUrl}}/${formattedSegments.join('/')}`;

    // Request Headers
    const tokenVar = mount.type === 'Admin' ? '{{adminToken}}' : '{{userToken}}';
    const headers = [
      { key: 'Authorization', value: `Bearer ${tokenVar}`, type: 'text' }
    ];

    let bodyData = null;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      headers.push({ key: 'Content-Type', value: 'application/json', type: 'text' });
      const sampleObj = getRequestBody(method, fullPath, mount.folder);
      if (sampleObj) {
        bodyData = {
          mode: 'raw',
          raw: JSON.stringify(sampleObj, null, 2),
          options: { raw: { language: 'json' } }
        };
      }
    }

    // Friendly request name
    const cleanSubPath = subPath ? subPath.replace(/\/+/g, ' ') : '';
    const requestName = `${method} - ${mount.folder}${cleanSubPath ? ' (' + cleanSubPath.trim() + ')' : ''}`;

    const requestObj = {
      name: requestName,
      request: {
        method: method,
        header: headers,
        url: {
          raw: rawUrl,
          host: ['{{baseUrl}}'],
          path: formattedSegments
        },
        description: `Endpoint in ${mount.file}`
      },
      response: []
    };

    if (bodyData) {
      requestObj.request.body = bodyData;
    }

    targetStore[mount.folder].push(requestObj);
  }
});

console.log(`Parsed total ${routeCount} routes into Admin & User structures.`);

// -------------------------------------------------------------
// 3. Transform Stores into Postman Folder Arrays
// -------------------------------------------------------------
function buildFolderStructure(store) {
  return Object.keys(store).map(folderName => ({
    name: folderName,
    item: store[folderName]
  }));
}

const adminFolders = buildFolderStructure(adminFolderItems);
const userFolders = buildFolderStructure(userFolderItems);

// Collection Variables
const collectionVariables = [
  { key: 'baseUrl', value: 'http://localhost:5000', type: 'string' },
  { key: 'adminToken', value: 'YOUR_ADMIN_JWT_TOKEN', type: 'string' },
  { key: 'userToken', value: 'YOUR_USER_JWT_TOKEN', type: 'string' }
];

// -------------------------------------------------------------
// 4. Generate JSON Collections
// -------------------------------------------------------------

// Collection A: CatchWatch Combined (Admin & User separate folders)
const combinedCollection = {
  info: {
    name: 'CatchWatch API - Complete Collection (Admin & User)',
    description: 'Complete Postman Collection for CatchWatch Backend. Includes separate folders for Admin APIs and User APIs.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: [
    {
      name: 'Admin API',
      item: adminFolders
    },
    {
      name: 'User API',
      item: userFolders
    }
  ],
  variable: collectionVariables
};

// Collection B: CatchWatch Admin Collection
const adminCollection = {
  info: {
    name: 'CatchWatch API - Admin Collection',
    description: 'Postman Collection for CatchWatch Admin Portal Backend Endpoints.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: adminFolders,
  variable: [
    { key: 'baseUrl', value: 'http://localhost:5000', type: 'string' },
    { key: 'adminToken', value: 'YOUR_ADMIN_JWT_TOKEN', type: 'string' }
  ]
};

// Collection C: CatchWatch User Collection
const userCollection = {
  info: {
    name: 'CatchWatch API - User Collection',
    description: 'Postman Collection for CatchWatch User & Mobile App Backend Endpoints.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: userFolders,
  variable: [
    { key: 'baseUrl', value: 'http://localhost:5000', type: 'string' },
    { key: 'userToken', value: 'YOUR_USER_JWT_TOKEN', type: 'string' }
  ]
};

// Write files to backend directory
const baseDir = path.join(__dirname, '..');
fs.writeFileSync(path.join(baseDir, 'CatchWatch_Complete_Postman_Collection.json'), JSON.stringify(combinedCollection, null, 2));
fs.writeFileSync(path.join(baseDir, 'CatchWatch_Admin_Postman_Collection.json'), JSON.stringify(adminCollection, null, 2));
fs.writeFileSync(path.join(baseDir, 'CatchWatch_User_Postman_Collection.json'), JSON.stringify(userCollection, null, 2));

console.log('Successfully generated Postman collections:');
console.log('1. CatchWatch_Complete_Postman_Collection.json (Combined Admin & User Folders)');
console.log('2. CatchWatch_Admin_Postman_Collection.json (Admin Folder Only)');
console.log('3. CatchWatch_User_Postman_Collection.json (User Folder Only)');
