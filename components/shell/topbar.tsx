export default function Topbar({ title, eyebrow = 'MONTHLY PROCUREMENT CONTROL' }: { title: string; eyebrow?: string }) {
  return <header className="topbar"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div><div className="top-meta"><span className="local-badge">LOCAL PROTOTYPE</span><span>기준월도 <b>2026.09</b></span></div></header>;
}
