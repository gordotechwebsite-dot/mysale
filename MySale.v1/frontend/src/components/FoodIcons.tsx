import { createLucideIcon } from 'lucide-react';

export const Hamburger = createLucideIcon('Hamburger', [
  ['path', { d: 'M3 11a9 7 0 0 1 18 0Z', key: 'bun-top' }],
  ['path', { d: 'M8.5 7.5h.01', key: 'seed-1' }],
  ['path', { d: 'M12 6h.01', key: 'seed-2' }],
  ['path', { d: 'M15.5 7.5h.01', key: 'seed-3' }],
  ['path', { d: 'm3 14 3-1.5 3 1.5 3-1.5 3 1.5 3-1.5 3 1.5', key: 'lettuce' }],
  ['path', { d: 'M4 17h16v1a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3Z', key: 'bun-bottom' }],
]);

export const HotDog = createLucideIcon('HotDog', [
  ['rect', { x: '2', y: '10', width: '20', height: '4', rx: '2', key: 'sausage' }],
  ['path', { d: 'M4.5 10V9.5A3.5 3.5 0 0 1 8 6h8a3.5 3.5 0 0 1 3.5 3.5v.5', key: 'bun-top' }],
  ['path', { d: 'M4.5 14v.5A3.5 3.5 0 0 0 8 18h8a3.5 3.5 0 0 0 3.5-3.5V14', key: 'bun-bottom' }],
  ['path', { d: 'm7 12 1.5-.75L10 12l1.5-.75L13 12l1.5-.75L16 12l1.5-.75', key: 'mustard' }],
]);

export const Fries = createLucideIcon('Fries', [
  ['path', { d: 'M7.5 11V5', key: 'fry-1' }],
  ['path', { d: 'M10.5 11V3', key: 'fry-2' }],
  ['path', { d: 'M13.5 11V4', key: 'fry-3' }],
  ['path', { d: 'M16.5 11V6', key: 'fry-4' }],
  ['path', { d: 'M5 11h14l-1.5 10h-11Z', key: 'box' }],
]);

export const Tortilla = createLucideIcon('Tortilla', [
  ['path', { d: 'M13.17 5.17 3.17 15.17a4 4 0 0 0 5.66 5.66l10-10', key: 'wrap' }],
  ['ellipse', { cx: '16', cy: '8', rx: '4', ry: '1.8', transform: 'rotate(45 16 8)', key: 'filling' }],
  ['path', { d: 'm7.17 11.17 5.66 5.66', key: 'fold' }],
]);
