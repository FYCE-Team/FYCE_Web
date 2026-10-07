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
  return bass ? <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><path d="M14 20C8 8 35 4 39 23C44 44 25 60 9 65M14 20C5 33 21 36 22 25C23 18 13 17 14 20" /><circle cx="51" cy="18" r="2" fill="currentColor" /><circle cx="51" cy="32" r="2" fill="currentColor" /></g> : <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M32 66C20 65 19 49 31 45C48 39 56 58 46 69C32 83 10 72 12 55C14 40 36 32 42 19C47 8 40 3 36 9C27 24 31 46 35 63L43 87C47 102 26 107 23 95C21 88 27 84 29 91" />
    <circle cx="28" cy="94" r="4" fill="currentColor" stroke="none" />
  </g>;
}
function Instrument({ type }) {
  return <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    {type === "piano" ? <>
      <path d="M35 116V47C35 27 64 18 105 24C149 30 179 51 171 77C166 92 145 95 144 117Z" fill="currentColor" fillOpacity=".12" />
      <path d="M35 112L144 112L144 139H35ZM38 48L142 48L163 69M43 141V164M135 141V164M166 79V136M80 48L99 25" />
      {Array.from({length:14},(_,i)=><path key={i} d={`M${42+i*7} 114V137`} strokeWidth="1.5" />)}
      {[0,1,3,4,5,7,8,10,11,12].map(i=><path key={i} d={`M${43+i*7} 113V127`} strokeWidth="4" />)}
    </> : type === "violin" ? <g transform="rotate(24 100 90)">
      <path d="M93 45C75 36 64 53 74 69C86 82 70 82 62 96C48 124 75 148 101 148C128 148 148 122 134 99C122 83 110 83 122 69C131 50 117 36 106 45Z" fill="currentColor" fillOpacity=".1" />
      <path d="M94 17L108 17L106 78H96ZM94 18C82 8 93 3 103 7C118 12 116 26 108 29M96 82L106 82M94 127L108 127L103 145H99Z" />
      <path d="M98 20V126M102 20V126M78 95C86 86 87 111 78 110M121 95C112 86 112 111 121 110M150 20L153 158M157 20L160 158" strokeWidth="1.8" />
      <path d="M90 26H95M108 34H114" />
    </g> : <g transform="rotate(-28 100 90)">
      <path d="M19 82H179Q189 90 179 98H19Z" fill="currentColor" fillOpacity=".1" />
      <path d="M30 82V98M173 82V98M47 82V98M51 78H149" />
      <ellipse cx="38" cy="89" rx="5" ry="3" fill="currentColor" />
      {[62,79,96,113,130,147].map(x=><g key={x}><circle cx={x} cy="90" r="4" fill="currentColor" fillOpacity=".35" /><path d={`M${x} 86V78`} strokeWidth="1.5" /></g>)}
    </g>}
  </g>;
}
export default function ConcertAtmosphere({ auth = false }) {
  return <div className={`concert-background${auth ? " concert-background-auth" : ""}`} aria-hidden="true">
    <svg className="concert-background-staff" viewBox="0 0 1440 900" preserveAspectRatio="none" fill="none">
      {[0,1,2,3,4].map(line => <path key={line} d={`M-80 ${180+line*18}C300 ${360+line*18} 640 ${10+line*18} 1520 ${260+line*18}`} />)}
      {[0,1,2,3,4].map(line => <path key={`low-${line}`} d={`M-80 ${660+line*18}C380 ${420+line*18} 790 ${970+line*18} 1520 ${600+line*18}`} />)}
    </svg>
    {positions.map(([left,top], i) => <svg key={i} className="concert-background-symbol" viewBox="0 0 65 110" style={{ left:`${left}%`,top:`${top}%`,animationDelay:`${-i*1.7}s`,animationDuration:`${16+i%4*3}s` }}><Note type={["whole","half","quarter","eighth","sixteenth"][i%5]} /></svg>)}
    {[[8,48,false],[89,8,true],[57,86,false],[79,57,true]].map(([left,top,bass], i) => <svg key={`clef-${i}`} className="concert-background-symbol concert-background-clef" viewBox="0 0 65 110" style={{left:`${left}%`,top:`${top}%`,animationDelay:`${-i*5}s`}}><Clef bass={bass} /></svg>)}
    {[[0,14,"piano"],[82,60,"violin"],[79,13,"flute"],[1,76,"flute"]].map(([left,top,type],i)=><svg key={type+i} className={`concert-background-instrument concert-instrument-${type}`} viewBox="0 0 200 180" style={{left:`${left}%`,top:`${top}%`,animationDelay:`${-i*4}s`,animationDuration:`${14+i*2}s`}}><Instrument type={type} /></svg>)}
  </div>;
}
