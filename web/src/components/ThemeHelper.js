// Helper for Tailwind theme classes
export const getThemeColor = (color) => {
  const themes = {
    '#1e40af': { bg: 'bg-blue-600', hover: 'hover:bg-blue-700', text: 'text-blue-600', border: 'border-blue-600', focus: 'focus:ring-blue-500' },
    '#0f766e': { bg: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-600', border: 'border-teal-600', focus: 'focus:ring-teal-500' },
    '#065f46': { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-600', border: 'border-emerald-600', focus: 'focus:ring-emerald-500' },
    '#9f1239': { bg: 'bg-rose-600', hover: 'hover:bg-rose-700', text: 'text-rose-600', border: 'border-rose-600', focus: 'focus:ring-rose-500' },
    '#581c87': { bg: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-600', border: 'border-purple-600', focus: 'focus:ring-purple-500' }
  };
  return themes[color] || themes['#1e40af'];
};
