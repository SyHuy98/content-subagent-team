import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONTS, media } from '../theme';

type B = ReturnType<typeof import('../theme').brandOf>;

/** Hệ số tỉ lệ theo cạnh ngắn của khung (thiết kế chuẩn cho 1080px). */
export const useUnit = () => {
  const { width, height } = useVideoConfig();
  return Math.min(width, height) / 1080;
};

/** Hiệu ứng xuất hiện: trượt lên + mờ dần, có độ trễ (giây). */
export const useEnter = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay * fps, fps, config: { damping: 200 } });
  return { opacity: p, transform: `translateY(${(1 - p) * 40}px)` };
};

/** Mờ dần ở đầu và cuối mỗi cảnh để chuyển cảnh mượt. */
export const SceneFade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const f = Math.min(Math.round(fps * 0.35), Math.floor(durationInFrames / 3));
  const opacity = interpolate(frame, [0, f, durationInFrames - f, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const Background: React.FC<{ brand: B }> = ({ brand }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const r = Math.max(width, height) * 0.45;
  return (
    <AbsoluteFill style={{ background: brand.background, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', width: r, height: r, borderRadius: '50%', background: brand.primary, opacity: 0.16,
        left: -r * 0.3 + Math.sin(frame / 60) * 30, top: -r * 0.25 + Math.cos(frame / 70) * 30, filter: 'blur(20px)',
      }} />
      <div style={{
        position: 'absolute', width: r * 0.8, height: r * 0.8, borderRadius: '50%', background: brand.accent, opacity: 0.18,
        right: -r * 0.25 + Math.cos(frame / 55) * 30, bottom: -r * 0.2 + Math.sin(frame / 65) * 30, filter: 'blur(20px)',
      }} />
    </AbsoluteFill>
  );
};

export const Logo: React.FC<{ brand: B }> = ({ brand }) => {
  const u = useUnit();
  if (!brand.logo) return null;
  return (
    <Img src={media(brand.logo)!} style={{
      position: 'absolute', top: 56 * u, right: 56 * u, width: 150 * u, height: 150 * u, objectFit: 'contain',
      filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.18))',
    }} />
  );
};

export const Disclaimer: React.FC<{ text?: string; brand: B; onDark?: boolean }> = ({ text, brand, onDark }) => {
  const u = useUnit();
  if (!text) return null;
  return (
    <div style={{ position: 'absolute', bottom: 40 * u, left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: `0 ${60 * u}px` }}>
      <div style={{
        fontFamily: FONTS.body, fontSize: 26 * u, color: '#fff', padding: `${6 * u}px ${18 * u}px`, borderRadius: 999,
        background: onDark ? 'rgba(0,0,0,.45)' : `${brand.text}99`, textAlign: 'center',
      }}>{text}</div>
    </div>
  );
};

/** Ô phụ đề nền đặc, dễ đọc trên mọi khung hình. */
export const CaptionBox: React.FC<{ text: string; brand: B; delay?: number }> = ({ text, brand, delay = 0.15 }) => {
  const u = useUnit();
  const enter = useEnter(delay);
  return (
    <div style={{ position: 'absolute', left: 60 * u, right: 60 * u, bottom: 220 * u, display: 'flex', justifyContent: 'center', ...enter }}>
      <div style={{
        background: 'rgba(255,255,255,.94)', color: brand.text, fontFamily: FONTS.body, fontWeight: 800, fontSize: 54 * u,
        lineHeight: 1.3, padding: `${22 * u}px ${34 * u}px`, borderRadius: 28 * u, textAlign: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,.18)', borderBottom: `${8 * u}px solid ${brand.accent}`,
      }}>{text}</div>
    </div>
  );
};

/** Ảnh phủ kín khung, có zoom chậm (Ken Burns). */
export const CoverImage: React.FC<{ src: string; zoom?: 'in' | 'out'; dim?: number }> = ({ src, zoom = 'in', dim = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const s = interpolate(frame, [0, durationInFrames], zoom === 'in' ? [1, 1.12] : [1.12, 1]);
  return (
    <AbsoluteFill>
      <Img src={media(src)!} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${s})` }} />
      {dim > 0 && <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(0,0,0,${dim * 0.4}) 0%, rgba(0,0,0,${dim}) 100%)` }} />}
    </AbsoluteFill>
  );
};
