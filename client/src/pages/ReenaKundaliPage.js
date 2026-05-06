import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./ReenaKundaliPage.css";

const infographicSlides = [
  {
    number: "01",
    title: "Kundali × Market Alignment",
    subtitle: "Where her stars meet patient wealth-building.",
    image: "/reena-kundali/infographics1.png",
  },
  {
    number: "02",
    title: "Planet → Sector Map",
    subtitle: "Each planet carries a different market energy.",
    image: "/reena-kundali/infographics2.png",
  },
  {
  number: "03",
  title: "Strongest Sector Alignment",
  subtitle:
    "So, from my calculations of your kundali and the market, the best sectors for you to study carefully would be Infrastructure & Capital Goods, Defence, Railways, Pharma & Healthcare, and Engineering / Industrial Themes.",
  image: "/reena-kundali/infographics3.png",
},
  {
    number: "04",
    title: "Public Systems & Long-Term Growth",
    subtitle: "Shani, Surya and kuja are the defining positve planets of your chart, hence why these sectors will do good for you",
    image: "/reena-kundali/infographics4.png",
  },
  {
    number: "05",
    title: "Healing Sectors",
    subtitle: "Pharma, Healthcare, Biotech and patient growth would come the 2nd most alligned sectors for you, reenaa.",
    image: "/reena-kundali/infographics5.png",
  },
  {
    number: "06",
    title: "Technology Watchlist",
    subtitle: "Skill is strong. Timing should be selective, i would say do not invest here",
    image: "/reena-kundali/infographics6.png",
  },
  {
    number: "07",
    title: "Power Sectors",
    subtitle: "Energy, metals and mining, strong but volatile. be caustios in these sectors",
    image: "/reena-kundali/infographics7.png",
  },
  {
    number: "08",
    title: "Market Timing Message",
    subtitle: "Your stars do not ask you to chase. They ask you to build. Here are your fabvoured and unfavourable sectors",
    image: "/reena-kundali/infographics8.png",
  },
];

export default function ReenaKundaliPage() {
    const [zoomedImage, setZoomedImage] = useState(null);
    useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, []); 
  return (
    <main className="kundali-page">
      <Link to="/reena" className="kundali-back-btn">
        ← Back to Reenaa
      </Link>

      <section className="kundali-hero">
        <p className="kundali-kicker">Phase 03</p>
        <h1>Kundali Market Map</h1>
        <p>
          A symbolic journey through Reenaa’s chart, her timing, and the sectors
          that align with patience, discipline, and long-term growth.
        </p>

        <div className="kundali-disclaimer">
          Symbolic reading only. Not financial advice.
        </div>

        <div className="kundali-scroll-hint">
          <span>Scroll to begin</span>
          <b>↓</b>
        </div>
      </section>
        
      {infographicSlides.map((slide) => (
        <section className="kundali-slide" key={slide.number}>
          <div className="kundali-slide-text">
            <span>{slide.number}</span>
            <p className="kundali-kicker">Kundali × Market</p>
            <h2>{slide.title}</h2>
            <p>{slide.subtitle}</p>
          </div>

          <button
  type="button"
  className="kundali-image-frame"
  onClick={() =>
    setZoomedImage(zoomedImage === slide.image ? null : slide.image)
  }
>
  <img src={slide.image} alt={slide.title} />
</button>

          <div className="kundali-scroll-hint small">
            <span>Continue</span>
            <b>↓</b>
          </div>
        </section>
      ))}

      <section className="kundali-ending">
        <p className="kundali-kicker">Final note</p>
        <h2>Build slowly. Choose wisely.</h2>
        <p>
          The message is not to chase every opportunity. It is to observe,
          understand, and grow with patience.
        </p>

        <Link to="/reena-trivia" className="kundali-return-btn">
  Open Trivia Chamber →
</Link>
      </section>
    {zoomedImage && (
  <button
    type="button"
    className="kundali-zoom-overlay"
    onClick={() => setZoomedImage(null)}
  >
    <img src={zoomedImage} alt="Zoomed infographic" />
  </button>
)}
    </main>
  );
}