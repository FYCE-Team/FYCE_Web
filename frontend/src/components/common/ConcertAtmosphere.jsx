// Decorative score and stage light. Never announces or intercepts user input.
export default function ConcertAtmosphere() {
  return <div className="concert-atmosphere" aria-hidden="true">
    <div className="concert-light concert-light--left" />
    <div className="concert-light concert-light--right" />
    <svg className="concert-score" viewBox="0 0 1440 500" fill="none" preserveAspectRatio="xMidYMid slice">
      {[0, 1, 2, 3, 4].map(line => <path key={line} d={`M-100 ${290 + line * 16} C260 ${140 + line * 16} 480 ${400 + line * 16} 780 ${250 + line * 16} S1260 ${80 + line * 16} 1550 ${210 + line * 16}`} />)}
      <g className="concert-note concert-note--one"><ellipse cx="360" cy="258" rx="10" ry="6" transform="rotate(-24 360 258)" /><path d="M369 255V207" /></g>
      <g className="concert-note concert-note--two"><ellipse cx="970" cy="202" rx="10" ry="6" transform="rotate(-24 970 202)" /><path d="M979 199V151" /></g>
      <g className="concert-note concert-note--three"><ellipse cx="1180" cy="181" rx="10" ry="6" transform="rotate(-24 1180 181)" /><path d="M1189 178V130" /></g>
    </svg>
  </div>;
}
