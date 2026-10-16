import s from './Bi.module.css';

// Tōnatiuh OS bilingual label: Spanish is the primary text, English rides
// underneath as a muted "(subtitle)" — the pattern used throughout the
// SuperDesign drafts ("Aplicaciones Recientes" / "(Recent Apps)").
//   (default) block subtitle under the label — headings, stat labels
//   inline    subtitle on the same line — buttons, tabs, links, tooltips
//   title     block subtitle sized for a page-level h1
export default function Bi({ es, en, inline = false, title = false }: { es: string; en: string; inline?: boolean; title?: boolean }) {
  return (
    <>
      {es}
      <span className={inline ? s.subInline : title ? s.subTitle : s.sub}> ({en})</span>
    </>
  );
}
