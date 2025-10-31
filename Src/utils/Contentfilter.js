// Content filtering

// Positive keywords to include in searches
export const POSITIVE_KEYWORDS = [
  'motivational',
  'inspiration',
  'inspiring',
  'happy',
  'happiness',
  'success',
  'positive',
  'uplifting',
  'joy',
  'joyful',
  'wholesome',
  'heartwarming',
  'feel good',
  'meditation',
  'wellness',
  'gratitude',
  'mindfulness',
  'peaceful',
  'healing',
  'kindness',
  'hope',
  'hopeful',
  'encouragement',
  'self improvement',
  'personal growth',
  'achievement',
  'beautiful',
  'amazing',
  'wonderful',
  'incredible',
  'empowering',
  'love',
  'caring',
  'compassion',
  'yoga',
  'fitness motivation',
  'healthy lifestyle',
  'nature',
  'travel',
  'adventure',
  'creativity',
  'art',
  'music',
  'dance',
  'celebration',
];

// Keywords to avoid (negative content)
export const NEGATIVE_KEYWORDS = [
  'violent',
  'violence',
  'fight',
  'fighting',
  'war',
  'death',
  'murder',
  'kill',
  'scary',
  'horror',
  'sad',
  'tragedy',
  'disaster',
  'accident',
  'crash',
  'angry',
  'rage',
  'hate',
  'hatred',
  'abuse',
  'toxic',
  'negative',
  'depressing',
  'depression',
  'suicide',
  'controversial',
  'political debate',
  'argument',
];

// Positive YouTube categories
export const POSITIVE_CATEGORIES = {
  MUSIC: '10',
  ENTERTAINMENT: '24',
  HOWTO_STYLE: '26',
  SCIENCE_TECH: '28',
  EDUCATION: '27',
  PEOPLE_BLOGS: '22',
  TRAVEL_EVENTS: '19',
  SPORTS: '17',
};

// Get random positive keywords for variety
export const getRandomPositiveKeywords = (count = 3) => {
  const shuffled = [...POSITIVE_KEYWORDS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Build positive search query
export const buildPositiveSearchQuery = (baseQuery = '') => {
  if (baseQuery.trim()) {
    // If user provides search, add positive modifier
    const positiveModifier = getRandomPositiveKeywords(1)[0];
    return `${baseQuery.trim()} ${positiveModifier}`;
  }

  // For trending/home content, use random positive keywords
  const keywords = getRandomPositiveKeywords(2);
  return keywords.join(' ');
};

// Check if content title/description contains negative keywords
export const containsNegativeContent = text => {
  if (!text) return false;

  const lowerText = text.toLowerCase();
  return NEGATIVE_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

// Filter videos for positive content
export const filterPositiveVideos = videos => {
  return videos.filter(video => {
    // Check title and description for negative content
    const hasNegativeTitle = containsNegativeContent(video.title);
    const hasNegativeDescription = containsNegativeContent(video.description);

    return !hasNegativeTitle && !hasNegativeDescription;
  });
};

// Build API URL with positive filters
export const buildPositiveAPIUrl = (baseUrl, options = {}) => {
  const {safeSearch = true, category = null, additionalParams = {}} = options;

  let url = baseUrl;

  // Add safe search
  if (safeSearch) {
    url += '&safeSearch=strict';
  }

  // Add category filter
  if (category && POSITIVE_CATEGORIES[category]) {
    url += `&videoCategoryId=${POSITIVE_CATEGORIES[category]}`;
  }

  // Add any additional parameters
  Object.keys(additionalParams).forEach(key => {
    url += `&${key}=${additionalParams[key]}`;
  });

  return url;
};

// Get positive shorts search query
export const getPositiveShortsQuery = () => {
  const categories = [
    'dance',
    'funny moments',
    'wholesome',
    'satisfying',
    'nature',
    'cute animals',
    'inspiring',
    'happy',
    'amazing',
    'beautiful',
    'talent',
    'skills',
    'art',
    'creative',
    'uplifting',
  ];

  const randomCategory =
    categories[Math.floor(Math.random() * categories.length)];
  return `${randomCategory} shorts`;
};

// Get positive video search query
export const getPositiveVideoQuery = () => {
  const queries = [
    'motivational speech',
    'inspiring stories',
    'success journey',
    'beautiful nature',
    'meditation music',
    'positive vibes',
    'happy moments',
    'feel good music',
    'uplifting songs',
    'wholesome content',
    'amazing talents',
    'incredible skills',
    'heartwarming',
    'personal growth',
    'self improvement',
  ];

  return queries[Math.floor(Math.random() * queries.length)];
};

export const extractCategory = (title, description) => {
  const text = `${title} ${description}`.toLowerCase();

  const categoryKeywords = {
    motivational: [
      'motivational',
      'inspiration',
      'inspiring',
      'success',
      'achievement',
    ],
    meditation: ['meditation', 'mindfulness', 'peaceful', 'calm', 'relaxation'],
    wellness: ['wellness', 'health', 'healthy', 'fitness', 'yoga'],
    nature: ['nature', 'wildlife', 'natural', 'earth', 'planet'],
    music: ['music', 'song', 'melody', 'musical', 'concert'],
    education: ['learn', 'education', 'tutorial', 'how to', 'guide'],
    creativity: ['art', 'creative', 'design', 'craft', 'diy'],
    happiness: ['happy', 'joy', 'joyful', 'happiness', 'positive'],
    gratitude: ['gratitude', 'grateful', 'thankful', 'appreciation'],
    growth: ['growth', 'development', 'improvement', 'progress'],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return category;
    }
  }

  return 'general';
};
