export interface StepTheme {
  /** CSS linear-gradient base color */
  base: string;
  /** CSS radial-gradient glow color (with opacity) */
  glow: string;
  /** Combined background CSS value */
  background: string;
}

const STEP_THEMES: Record<string, StepTheme> = {
  ingredients: {
    base: 'rgb(255,194,194)',
    glow: 'rgba(255,0,0,0.20)',
    background:
      "radial-gradient(ellipse at 50% 45%, rgba(255,0,0,0.20) 0%, rgba(255,0,0,0.08) 35%, transparent 70%), linear-gradient(180deg, rgb(255,194,194) 0%, rgb(255,194,194) 100%)",
  },
  dietary: {
    base: 'rgb(255,235,194)',
    glow: 'rgba(255,140,0,0.20)',
    background:
      "radial-gradient(ellipse at 50% 45%, rgba(255,140,0,0.20) 0%, rgba(255,140,0,0.08) 35%, transparent 70%), linear-gradient(180deg, rgb(255,235,194) 0%, rgb(255,235,194) 100%)",
  },
  cuisine: {
    base: 'rgb(194,235,210)',
    glow: 'rgba(0,160,80,0.20)',
    background:
      "radial-gradient(ellipse at 50% 45%, rgba(0,160,80,0.20) 0%, rgba(0,160,80,0.08) 35%, transparent 70%), linear-gradient(180deg, rgb(194,235,210) 0%, rgb(194,235,210) 100%)",
  },
  time: {
    base: 'rgb(214,194,255)',
    glow: 'rgba(120,0,255,0.20)',
    background:
      "radial-gradient(ellipse at 50% 45%, rgba(120,0,255,0.20) 0%, rgba(120,0,255,0.08) 35%, transparent 70%), linear-gradient(180deg, rgb(214,194,255) 0%, rgb(214,194,255) 100%)",
  },
};

export default STEP_THEMES;
