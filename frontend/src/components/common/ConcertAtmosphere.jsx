// SVG paths avoid dependence on a platform music font.
const positions = [[5,12],[22,7],[45,15],[72,8],[92,22],[12,36],[34,43],[62,33],[84,49],[3,65],[27,70],[53,62],[75,78],[94,85],[15,91]];
function Note({ type }) {
  const open = type === "whole" || type === "half";
  return <>
    <ellipse cx="18" cy="58" rx={type === "whole" ? 13 : 11} ry="7" transform="rotate(-22 18 58)" fill={open ? "none" : "currentColor"} stroke="currentColor" strokeWidth={open ? 3.5 : 1.5} />
    {type !== "whole" && <path d="M28 55V7" fill="none" stroke="currentColor" strokeWidth="3" />}
    {["eighth", "sixteenth"].includes(type) && <path d="M28 7C30 20 49 17 42 36C42 23 31 26 28 20Z" fill="currentColor" />}
    {type === "sixteenth" && <path d="M28 20C30 33 49 30 42 49C42 36 31 39 28 33Z" fill="currentColor" />}
  </>;
}
function Clef({ bass }) {
  return bass ? <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><path d="M14 20C8 8 35 4 39 23C44 44 25 60 9 65M14 20C5 33 21 36 22 25C23 18 13 17 14 20" /><circle cx="51" cy="18" r="2" fill="currentColor" /><circle cx="51" cy="32" r="2" fill="currentColor" /></g> : <g fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><path d="M32 88C48 102 58 87 49 72L30 11C23-7 49-6 44 16C39 37 8 37 12 58C16 80 54 71 49 51C45 34 22 42 25 56C27 63 33 64 37 62M32 88C18 82 15 98 28 99" /></g>;
}
export default function ConcertAtmosphere() {
  return <div className="concert-background" aria-hidden="true">
    <svg className="concert-background-staff" viewBox="0 0 1440 900" preserveAspectRatio="none" fill="none">
      {[0,1,2,3,4].map(line => <path key={line} d={`M-80 ${180+line*18}C300 ${360+line*18} 640 ${10+line*18} 1520 ${260+line*18}`} />)}
      {[0,1,2,3,4].map(line => <path key={`low-${line}`} d={`M-80 ${660+line*18}C380 ${420+line*18} 790 ${970+line*18} 1520 ${600+line*18}`} />)}
    </svg>
    {positions.map(([left,top], i) => <svg key={i} className="concert-background-symbol" viewBox="0 0 65 110" style={{ left:`${left}%`,top:`${top}%`,animationDelay:`${-i*1.7}s`,animationDuration:`${16+i%4*3}s` }}><Note type={["whole","half","quarter","eighth","sixteenth"][i%5]} /></svg>)}
    {[[8,48,false],[89,8,true],[57,86,false],[79,57,true]].map(([left,top,bass], i) => <svg key={`clef-${i}`} className="concert-background-symbol concert-background-clef" viewBox="0 0 65 110" style={{left:`${left}%`,top:`${top}%`,animationDelay:`${-i*5}s`}}><Clef bass={bass} /></svg>)}
  </div>;
}
