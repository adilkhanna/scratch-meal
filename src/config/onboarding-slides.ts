export interface OnboardingSlide {
  title: string;
  body: string;
  image: string;
  dynamic?: boolean; // title uses {username} placeholder
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    title: 'welcome',
    body: 'You took the first step to better eating!',
    image: '/onboarding-food-0.png',
  },
  {
    title: 'honestly,',
    body: "Good food doesn\u2019t have to be complicated.",
    image: '/onboarding-food-0.png',
  },
  {
    title: 'did you know',
    body: 'We eat out 5x a week on average.',
    image: '/onboarding-food-1.png',
  },
  {
    title: 'crazy how',
    body: "That\u2019s 200+ meals a year you didn\u2019t cook...",
    image: '/onboarding-food-2.png',
  },
  {
    title: 'trust us',
    body: '...And your body felt every single one.',
    image: '/onboarding-food-3.png',
  },
  {
    title: 'there\u2019s hope',
    body: 'No Stress. Better Meals. Every Week.',
    image: '/onboarding-food-4.png',
  },
  {
    title: 'Hi {username},',
    body: 'Let\u2019s dive in...',
    image: '/onboarding-food-3.png',
    dynamic: true,
  },
];
