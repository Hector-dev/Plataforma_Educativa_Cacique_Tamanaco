export const THEME_STORAGE_KEY = 'cacique_theme';

export function applyTheme(isDark: boolean): void {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
}

export function loadTheme(): boolean {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  const isDark = saved !== 'light';
  applyTheme(isDark);
  return isDark;
}
