import { useState } from 'react';
import { ExternalLink, MapPin, Navigation, Maximize2, Minimize2 } from 'lucide-react';

export default function GoogleMapView({
  location = 'Đà Nẵng, Việt Nam',
  address = '',
  title = 'Vị trí trên bản đồ Google Maps',
  height = 240,
  showActions = true,
  className = '',
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const fullQuery = [address, location].filter(Boolean).join(', ') || 'Đà Nẵng, Việt Nam';
  const encodedQuery = encodeURIComponent(fullQuery);
  const embedUrl = `https://maps.google.com/maps?q=${encodedQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  const viewMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedQuery}`;

  return (
    <div className={`google-map-widget ${isExpanded ? 'expanded' : ''} ${className}`}>
      <div className="google-map-header">
        <div className="google-map-title">
          <MapPin size={16} className="text-accent" />
          <span>{title}</span>
        </div>
        <div className="google-map-controls">
          <button
            type="button"
            className="map-control-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Thu nhỏ bản đồ' : 'Phóng to bản đồ'}
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      <div className="google-map-viewport" style={{ height: isExpanded ? 420 : height }}>
        <iframe
          title={`Google Map - ${fullQuery}`}
          src={embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>

      <div className="google-map-footer">
        <div className="google-map-address">
          <strong>{fullQuery}</strong>
        </div>
        {showActions && (
          <div className="google-map-actions">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="map-action-link primary"
            >
              <Navigation size={13} /> Chỉ đường
            </a>
            <a
              href={viewMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="map-action-link secondary"
            >
              <ExternalLink size={13} /> Mở Google Maps
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
