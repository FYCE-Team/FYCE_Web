// Decorative score and stage light. Never announces or intercepts user input.
export default function ConcertAtmosphere({ ambient = false }) {
  return <div className={`concert-atmosphere${ambient ? " concert-atmosphere--ambient" : ""}`} aria-hidden="true">
    <div className="concert-light concert-light--left" />
    <div className="concert-light concert-light--right" />
    <svg className="concert-score" viewBox="0 0 1440 500" fill="none" preserveAspectRatio="xMidYMid slice">
      {[0, 1, 2, 3, 4].map(line => <path key={line} d={`M-100 ${290 + line * 16} C260 ${140 + line * 16} 480 ${400 + line * 16} 780 ${250 + line * 16} S1260 ${80 + line * 16} 1550 ${210 + line * 16}`} />)}
      {[0, 1, 2, 3, 4].map(line => <path key={`upper-${line}`} d={`M-100 ${80 + line * 12} C320 ${180 + line * 12} 480 ${-90 + line * 12} 840 ${55 + line * 12} S1280 ${210 + line * 12} 1550 ${110 + line * 12}`} />)}
      {Array.from({ length: 14 }, (_, i) => {
        const x = 80 + i * 100, y = 70 + (i % 4) * 85;
        return <g key={i} className="concert-note concert-note--floating" style={{ animationDelay: `${-i * 1.3}s`, animationDuration: `${7 + i % 4}s` }}><ellipse cx={x} cy={y} rx="8" ry="5" transform={`rotate(-24 ${x} ${y})`} /><path d={`M${x + 7} ${y - 2}V${y - 40}${i % 2 ? `q20 6 8 20` : ""}`} /></g>;
      })}
      <g className="concert-note concert-note--one"><ellipse cx="360" cy="258" rx="10" ry="6" transform="rotate(-24 360 258)" /><path d="M369 255V207" /></g>
      <g className="concert-note concert-note--two"><ellipse cx="970" cy="202" rx="10" ry="6" transform="rotate(-24 970 202)" /><path d="M979 199V151" /></g>
      <g className="concert-note concert-note--three"><ellipse cx="1180" cy="181" rx="10" ry="6" transform="rotate(-24 1180 181)" /><path d="M1189 178V130" /></g>
    </svg>
  </div>;
}
