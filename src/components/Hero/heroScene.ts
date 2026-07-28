export const HERO_SCENE_EVENT = 'spark:hero-scene';

export type HeroScene = 'landscape' | 'about';

export function announceHeroScene(scene: HeroScene) {
  window.dispatchEvent(
    new CustomEvent<HeroScene>(HERO_SCENE_EVENT, {
      detail: scene,
    }),
  );
}
