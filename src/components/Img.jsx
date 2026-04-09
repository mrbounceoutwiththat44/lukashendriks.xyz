// In dev: renders the original <img> directly (opt/ files not generated yet).
// In prod (after vite build): serves AVIF to modern browsers, JPEG fallback.
//
// pictureStyle controls the <picture> element's layout behaviour.
// Default is display:contents (invisible to layout — img participates directly
// in the parent's formatting context). Pass an explicit pictureStyle when the
// parent relies on height:100%/width:auto sizing, as display:contents + percent
// heights is unreliable in Chrome for that sizing chain.

export default function Img({ src, alt = '', pictureStyle, ...rest }) {
  if (import.meta.env.DEV || !src) {
    return <img src={src} alt={alt} {...rest} />;
  }

  // /images/foo/bar.png  →  /images/opt/foo/bar
  const optBase = src
    .replace(/^\/images\//, '/images/opt/')
    .replace(/\.[^.]+$/, '');

  return (
    <picture style={pictureStyle ?? { display: 'contents' }}>
      <source srcSet={`${optBase}.avif`} type="image/avif" />
      <source srcSet={`${optBase}.jpg`}  type="image/jpeg" />
      {/* Original file as final fallback — layout never collapses if opt/ wasn't generated */}
      <img src={src} alt={alt} {...rest} />
    </picture>
  );
}
