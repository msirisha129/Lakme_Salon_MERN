import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ArrowRight, Clock, Filter } from 'lucide-react';
import API from '../utils/api';

const CATEGORIES = ['All', 'Hair', 'Skin', 'Nails', 'Bridal', 'Makeup', 'Spa'];

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setActiveCategory(cat);
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    const params = activeCategory !== 'All' ? `?category=${activeCategory}` : '';
    API.get(`/services${params}`)
      .then(r => { setServices(r.data.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [activeCategory]);

  const filtered = services.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const catEmojis = { Hair: '✂️', Skin: '✨', Nails: '💅', Bridal: '👰', Makeup: '💄', Spa: '🌸' };

  return (
    <div style={{ paddingTop: 72 }}>
      {/* Header */}
     <div style={{
  backgroundImage: "url('/images/services-bg.png')",
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  padding: '80px 0 60px',
  position: 'relative'
  
}}>
       <div style={{
  marginLeft: '120px',
  maxWidth: '520px',
  paddingTop: '40px'
}}>

  <span className="section-label">Our Menu</span>

  <h1 style={{
    color: 'white',
    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
    marginBottom: 16,
    lineHeight: 1.1
  }}>
    Beauty Services
  </h1>

  <div className="gold-line" />

  <p style={{
    color: 'rgba(255,255,255,0.55)',
    marginTop: 16,
    fontSize: 15
  }}>
    Premium treatments crafted for your beauty goals
  </p>

</div>
</div>

      <div className="container" style={{ padding: '40px 24px' }}>
        {/* Search + Filter */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 40, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              placeholder="Search services..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 42 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                padding: '10px 20px', fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase',
                borderRadius: 50, cursor: 'pointer', transition: 'all 0.25s',
                border: activeCategory === cat ? 'none' : '1px solid var(--border)',
                background: activeCategory === cat ? 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)' : 'transparent',
                color: activeCategory === cat ? 'white' : 'var(--text-secondary)',
                fontWeight: activeCategory === cat ? 600 : 400,
              }}>
                {cat !== 'All' && catEmojis[cat]} {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
              {filtered.length} services {activeCategory !== 'All' ? `in ${activeCategory}` : 'available'}
            </p>
            <div className="grid-3">
              {filtered.map((s, i) => (
                <div key={s._id} className="card">
                 <div style={{
  height: 220,
  overflow: 'hidden',
  position: 'relative'
}}>
  <img
src={
  s.image ? s.image :
  s.name.toLowerCase().includes('balayage') || s.name.toLowerCase().includes('highlight') ? 'https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?w=600&q=80' :
  s.name.toLowerCase().includes('butterfly') || s.name.toLowerCase().includes('haircut') || s.name.toLowerCase().includes('hair cut') ? 'https://images.unsplash.com/photo-1560869713-bf165a9cfac1?w=600&q=80' :
  s.name.toLowerCase().includes('hair color') || s.name.toLowerCase().includes('global color') ? 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80' :
  s.name.toLowerCase().includes('hair spa') ? 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&q=80' :
  s.name.toLowerCase().includes('keratin') || s.name.toLowerCase().includes('smoothen') ? 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600&q=80' :
  s.name.toLowerCase().includes('nanoplastia') ? 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600&q=80' :
  s.name.toLowerCase().includes('blowout') || s.name.toLowerCase().includes('blow') ? 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=600&q=80' :
  s.name.toLowerCase().includes('hydrafacial') || s.name.toLowerCase().includes('hydra') ? 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=600&q=80' :
  s.name.toLowerCase().includes('korean') || s.name.toLowerCase().includes('glass skin') ? 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=600&q=80' :
  s.name.toLowerCase().includes('anti-aging') || s.name.toLowerCase().includes('anti aging') ? 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80' :
  s.name.toLowerCase().includes('classic facial') || s.name.toLowerCase().includes('facial') ? 'https://images.unsplash.com/photo-1552693673-1bf958298935?w=600&q=80' :
  s.name.toLowerCase().includes('tan') || s.name.toLowerCase().includes('de-tan') ? 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&q=80' :
  s.name.toLowerCase().includes('body polish') || s.name.toLowerCase().includes('body scrub') ? 'https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=600&q=80' :
  s.name.toLowerCase().includes('wax') ? 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&q=80' :
  s.name.toLowerCase().includes('cleanup') || s.name.toLowerCase().includes('clean up') ? 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&q=80' :
  s.name.toLowerCase().includes('manicure') ? 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80' :
  s.name.toLowerCase().includes('pedicure') ? 'https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?w=600&q=80' :
  s.name.toLowerCase().includes('nail art') ? 'https://images.unsplash.com/photo-1604902396830-aca29e19b067?w=600&q=80' :
  s.name.toLowerCase().includes('gel nail') || s.name.toLowerCase().includes('gel') ? 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80' :
  s.name.toLowerCase().includes('bridal makeup') ? 'https://images.unsplash.com/photo-1595407753234-0882f1e77954?w=600&q=80' :
  s.name.toLowerCase().includes('mehendi') || s.name.toLowerCase().includes('mehndi') ? 'https://images.unsplash.com/photo-1591204578299-f1e9e3a4d98e?w=600&q=80' :
  s.name.toLowerCase().includes('saree') || s.name.toLowerCase().includes('sari') ? 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80' :
  s.name.toLowerCase().includes('pre-bridal') || s.name.toLowerCase().includes('pre bridal') ? 'https://images.unsplash.com/photo-1522413452208-996ff3f3e740?w=600&q=80' :
  s.name.toLowerCase().includes('party makeup') || s.name.toLowerCase().includes('party') ? 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80' :
  s.name.toLowerCase().includes('natural') || s.name.toLowerCase().includes('everyday') ? 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80' :
  s.name.toLowerCase().includes('massage') || s.name.toLowerCase().includes('full body') ? 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80' :
  s.name.toLowerCase().includes('foot') || s.name.toLowerCase().includes('reflexology') ? 'https://images.unsplash.com/photo-1591343395082-e120087004b4?w=600&q=80' :
  s.name.toLowerCase().includes('spa') ? 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=600&q=80' :
  s.category === 'Hair' ? 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80' :
  s.category === 'Skin' ? 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80' :
  s.category === 'Nails' ? 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80' :
  s.category === 'Bridal' ? 'https://images.unsplash.com/photo-1595407753234-0882f1e77954?w=600&q=80' :
  s.category === 'Makeup' ? 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80' :
  s.category === 'Spa' ? 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80' :
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80'
}
    alt={s.name}
    style={{
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }}
  />

  {s.popular && (
    <span style={{
      position: 'absolute',
      top: 12,
      right: 12,
      background: 'var(--gold)',
      color: 'white',
      fontSize: 9,
      padding: '3px 8px',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      borderRadius: 50
    }}>
      Popular
    </span>
  )}
</div>

                  <div style={{ padding: '20px 24px 24px' }}>
                    <span className="badge badge-gold" style={{ marginBottom: 10, display: 'inline-block' }}>{s.category}</span>
                    <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', marginBottom: 8, lineHeight: 1.3 }}>{s.name}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>{s.description}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)', fontSize: 12, marginBottom: 20 }}>
                      <Clock size={12} /> <span>{s.duration} mins</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
                      <div>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--gold)', fontWeight: 600 }}>₹{s.price?.toLocaleString()}</span>
                      </div>
                      <Link to={`/booking?service=${s._id}`} className="btn-primary" style={{ padding: '10px 20px', fontSize: 11 }}>
                        Book <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
