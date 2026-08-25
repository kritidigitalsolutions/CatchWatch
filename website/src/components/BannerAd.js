import React, { useState, useEffect } from 'react';
import API from '../api/axiosConfig';
import { FaExternalLinkAlt, FaTimes } from 'react-icons/fa';
import { HiSpeakerphone } from 'react-icons/hi';
import './BannerAd.css';

export default function BannerAd({ placement = "BANNER", className = "" }) {
  const [ad, setAd] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchAd = async () => {
      try {
        const isUserPremium = localStorage.getItem("userIsPremium") === "true";
        if (isUserPremium) return;

        const res = await API.get(`/ads/content-ad?placement=${placement}`);
        if (isMounted && res.data?.success && res.data?.hasAd && res.data?.ad) {
          setAd(res.data.ad);

          // Track Impression
          API.post('/ads/event', {
            adId: res.data.ad._id,
            campaignId: res.data.ad.campaignId,
            eventType: 'IMPRESSION',
          }).catch((err) => console.log('Ad impression tracking error:', err));
        }
      } catch (err) {
        console.log('No banner ad available:', err);
      }
    };

    fetchAd();

    return () => {
      isMounted = false;
    };
  }, [placement]);

  if (!ad || isDismissed) return null;

  const handleCtaClick = () => {
    API.post('/ads/event', {
      adId: ad._id,
      campaignId: ad.campaignId,
      eventType: 'CLICK',
    }).catch((err) => console.log('Ad click tracking error:', err));

    if (ad.destinationUrl && ad.destinationUrl !== '#') {
      window.open(ad.destinationUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const isVideo =
    ad.adType === 'VIDEO' ||
    (ad.mediaUrl && ad.mediaUrl.match(/\.(mp4|webm|m3u8)/i));

  return (
    <div className={`catchwatch-banner-ad-container ${className}`}>
      <div className="banner-ad-card" onClick={handleCtaClick}>
        {/* Top Badges */}
        <div className="banner-ad-header">
          <span className="banner-sponsored-tag">
            <HiSpeakerphone size={13} />
            <span>Sponsored Ad</span>
          </span>

          <button
            className="banner-dismiss-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsDismissed(true);
            }}
            title="Dismiss Ad"
          >
            <FaTimes size={12} />
          </button>
        </div>

        {/* Media Body */}
        <div className="banner-ad-content">
          <div className="banner-media-wrapper">
            {isVideo ? (
              <video
                src={ad.mediaUrl}
                autoPlay
                muted
                loop
                playsInline
                className="banner-ad-video"
              />
            ) : (
              <img
                src={ad.mediaUrl || ad.thumbnailUrl}
                alt={ad.title || 'Sponsored Advertisement'}
                className="banner-ad-image"
              />
            )}
          </div>

          <div className="banner-ad-details">
            <div className="banner-ad-text">
              <h4 className="banner-ad-title">{ad.title || 'Special Promotion'}</h4>
              <p className="banner-ad-sponsor">
                {ad.businessName || 'CatchWatch Featured Sponsor'}
              </p>
            </div>

            <button className="banner-ad-cta-btn" onClick={handleCtaClick}>
              <span>{ad.ctaText || 'Learn More'}</span>
              <FaExternalLinkAlt size={10} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
