// User interests for profile (similar to dating apps)
// Each interest has an id and display name

export interface Interest {
  id: number;
  name: string;
}

export const INTERESTS: Interest[] = [
  // Sports & Fitness
  { id: 1, name: 'Gym' },
  { id: 2, name: 'Running' },
  { id: 3, name: 'Yoga' },
  { id: 4, name: 'Swimming' },
  { id: 5, name: 'Cycling' },
  { id: 6, name: 'Football' },
  { id: 7, name: 'Basketball' },
  { id: 8, name: 'Tennis' },
  { id: 9, name: 'Hiking' },
  { id: 10, name: 'Climbing' },

  // Food & Drinks
  { id: 11, name: 'Coffee' },
  { id: 12, name: 'Wine' },
  { id: 13, name: 'Craft Beer' },
  { id: 14, name: 'Cooking' },
  { id: 15, name: 'Brunch' },
  { id: 16, name: 'Vegan' },
  { id: 17, name: 'Foodie' },
  { id: 18, name: 'Sushi' },

  // Entertainment
  { id: 19, name: 'Movies' },
  { id: 20, name: 'Netflix' },
  { id: 21, name: 'Live Music' },
  { id: 22, name: 'Concerts' },
  { id: 23, name: 'Theater' },
  { id: 24, name: 'Stand-up' },
  { id: 25, name: 'Gaming' },
  { id: 26, name: 'Board Games' },

  // Arts & Culture
  { id: 27, name: 'Art' },
  { id: 28, name: 'Photography' },
  { id: 29, name: 'Museums' },
  { id: 30, name: 'Reading' },
  { id: 31, name: 'Writing' },
  { id: 32, name: 'Design' },

  // Music
  { id: 33, name: 'Music' },
  { id: 34, name: 'DJ' },
  { id: 35, name: 'Guitar' },
  { id: 36, name: 'Hip-Hop' },
  { id: 37, name: 'Electronic' },
  { id: 38, name: 'Rock' },

  // Lifestyle
  { id: 39, name: 'Travel' },
  { id: 40, name: 'Fashion' },
  { id: 41, name: 'Pets' },
  { id: 42, name: 'Dogs' },
  { id: 43, name: 'Cats' },
  { id: 44, name: 'Plants' },
  { id: 45, name: 'Meditation' },

  // Social
  { id: 46, name: 'Nightlife' },
  { id: 47, name: 'Parties' },
  { id: 48, name: 'Networking' },
  { id: 49, name: 'Volunteering' },
  { id: 50, name: 'Languages' },
];

export const getInterestById = (id: number): Interest | undefined => {
  return INTERESTS.find((interest) => interest.id === id);
};

export const getInterestsByIds = (ids: number[]): Interest[] => {
  return ids.map((id) => getInterestById(id)).filter(Boolean) as Interest[];
};
