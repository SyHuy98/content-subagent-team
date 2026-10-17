import React from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, Series, staticFile, useVideoConfig } from 'remotion';
import { parseMedia } from '@remotion/media-parser';
import { CaptionBox, Disclaimer, Logo, SceneFade } from './parts/common';
import { SceneView } from './parts/scenes';
import { brandOf, media, SIZES } from './theme';
import type { ClipEditProps } from './types';

/** Ghép clip quay thật: intro → các đoạn clip (cắt, phụ đề) → outro CTA, kèm logo và nhạc nền. */
export const ClipEdit: React.FC<ClipEditProps> = ({ clips, intro, outro, brand: b, music, disclaimer }) => {
  const brand = brandOf(b);
  const { fps } = useVideoConfig();
  const frames = (s: number) => Math.max(1, Math.round(s * fps));
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Series>
        {intro && (
          <Series.Sequence durationInFrames={frames(intro.duration)}>
            <SceneFade><SceneView scene={{ type: 'title', ...intro }} brand={brand} /></SceneFade>
          </Series.Sequence>
        )}
        {clips.map((c, i) => (
          <Series.Sequence key={i} durationInFrames={frames(c.duration || 3)}>
            <AbsoluteFill>
              <OffthreadVideo
                src={media(c.src)!}
                trimBefore={c.start ? Math.round(c.start * fps) : undefined}
                muted={c.muted ?? !!music?.src}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {c.caption && <CaptionBox text={c.caption} brand={brand} />}
            </AbsoluteFill>
          </Series.Sequence>
        ))}
        {outro && (
          <Series.Sequence durationInFrames={frames(outro.duration)}>
            <SceneFade><SceneView scene={{ type: 'cta', ...outro }} brand={brand} /></SceneFade>
          </Series.Sequence>
        )}
      </Series>
      <Logo brand={brand} />
      <Disclaimer text={disclaimer} brand={brand} onDark />
      {music?.src && <Audio src={media(music.src)!} volume={music.volume ?? 0.5} loop />}
    </AbsoluteFill>
  );
};

/** Tính độ dài từng đoạn clip (đọc thời lượng file nếu không có "end"). */
export const clipEditMetadata = async ({ props }: { props: ClipEditProps }) => {
  const fps = props.fps || 30;
  const clips = await Promise.all(props.clips.map(async (c) => {
    const start = Number(c.start) || 0;
    let end = c.end != null ? Number(c.end) : undefined;
    if (end == null) {
      const src = /^https?:\/\//.test(c.src) ? c.src : new URL(staticFile(c.src), window.location.href).href;
      const { durationInSeconds } = await parseMedia({ src, fields: { durationInSeconds: true }, acknowledgeRemotionLicense: true });
      end = durationInSeconds ?? start + 3;
    }
    return { ...c, duration: Math.max(0.5, end - start) };
  }));
  const total = (props.intro?.duration || 0) + clips.reduce((s, c) => s + c.duration, 0) + (props.outro?.duration || 0);
  const [width, height] = SIZES[props.ratio] || SIZES['9:16'];
  return { fps, width, height, durationInFrames: Math.max(1, Math.round(total * fps)), props: { ...props, clips } };
};
