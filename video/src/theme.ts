import { continueRender, delayRender, staticFile } from 'remotion';
import type { Brand, Ratio } from './types';
// Font đóng gói sẵn (không cần Internet khi dựng), có đủ dấu tiếng Việt.
import bv400 from '@fontsource/be-vietnam-pro/files/be-vietnam-pro-latin-400-normal.woff2';
import bv400v from '@fontsource/be-vietnam-pro/files/be-vietnam-pro-vietnamese-400-normal.woff2';
import bv600 from '@fontsource/be-vietnam-pro/files/be-vietnam-pro-latin-600-normal.woff2';
import bv600v from '@fontsource/be-vietnam-pro/files/be-vietnam-pro-vietnamese-600-normal.woff2';
import bv800 from '@fontsource/be-vietnam-pro/files/be-vietnam-pro-latin-800-normal.woff2';
import bv800v from '@fontsource/be-vietnam-pro/files/be-vietnam-pro-vietnamese-800-normal.woff2';
import pf600 from '@fontsource/playfair-display/files/playfair-display-latin-600-normal.woff2';
import pf600v from '@fontsource/playfair-display/files/playfair-display-vietnamese-600-normal.woff2';
import pf700 from '@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff2';
import pf700v from '@fontsource/playfair-display/files/playfair-display-vietnamese-700-normal.woff2';

export const FONTS = { heading: 'SpaHeading', body: 'SpaBody' };

// Dải ký tự theo Fontsource: latin + phần bổ sung cho tiếng Việt.
const LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const VIET = 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB';

const faces: [string, string, string, string][] = [
  [FONTS.body, '400', bv400, LATIN], [FONTS.body, '400', bv400v, VIET],
  [FONTS.body, '600', bv600, LATIN], [FONTS.body, '600', bv600v, VIET],
  [FONTS.body, '800', bv800, LATIN], [FONTS.body, '800', bv800v, VIET],
  [FONTS.heading, '600', pf600, LATIN], [FONTS.heading, '600', pf600v, VIET],
  [FONTS.heading, '700', pf700, LATIN], [FONTS.heading, '700', pf700v, VIET],
];

if (typeof document !== 'undefined') {
  const handle = delayRender('Tải font');
  Promise.all(faces.map(([family, weight, url, unicodeRange]) => {
    const f = new FontFace(family, `url(${url}) format('woff2')`, { weight, unicodeRange });
    document.fonts.add(f);
    return f.load();
  })).then(() => continueRender(handle), (err) => { console.error('Không tải được font', err); continueRender(handle); });
}

export const SIZES: Record<Ratio, [number, number]> = {
  '9:16': [1080, 1920],
  '4:5': [1080, 1350],
  '1:1': [1080, 1080],
  '16:9': [1920, 1080],
};

export const DEFAULT_BRAND: Required<Omit<Brand, 'logo' | 'name'>> & Pick<Brand, 'logo' | 'name'> = {
  name: '',
  primary: '#7A9E7E',
  accent: '#C9A96E',
  background: '#F5EDE3',
  text: '#3B2F2A',
  logo: undefined,
};

export const brandOf = (b?: Brand) => ({ ...DEFAULT_BRAND, ...(b || {}) });

/** Đường dẫn file trong workspace → URL dùng được khi dựng. Chấp nhận cả link https. */
export const media = (src?: string) => (!src ? undefined : /^https?:\/\//.test(src) ? src : staticFile(src));
