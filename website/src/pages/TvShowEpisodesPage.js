import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPlay, FaRegClock } from "react-icons/fa";
import Loader from '../components/Loader';

// API import karein
import { getAllEpisodesByTvShowId } from '../api/episodesApi'; // Ensure correct path

const TvShowEpisodesPage = () => {
    const { id } = useParams(); // URL se tvShowId
    const navigate = useNavigate();

    // Dynamic States
    const [episodes, setEpisodes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const FALLBACK_THUMBNAIL = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop";

    // API Se Episodes Fetch Karna
    useEffect(() => {
        const fetchEpisodes = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await getAllEpisodesByTvShowId(id);

                // Backend response handle karein
                const fetchedEpisodes = response?.episodes || response?.data || response || [];

                if (fetchedEpisodes.length > 0) {
                    // Episodes ko episodeNumber ke hisaab se sort karein
                    const sortedEpisodes = fetchedEpisodes.sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));
                    setEpisodes(sortedEpisodes);
                } else {
                    setError("No episodes found for this TV Show.");
                }
            } catch (err) {
                console.error("API Error fetching episodes:", err);
                setError("Failed to load episodes. Please check your connection.");
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchEpisodes();
    }, [id]);

    if (isLoading) return <Loader />;

    if (error || episodes.length === 0) {
        return (
            <div className="text-center p-20 text-white flex flex-col items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Oops!</h2>
                <p className="text-gray-500">{error || "Episodes not available."}</p>
                <button onClick={() => navigate(-1)} className="bg-brand-orange text-white px-6 py-2 rounded-xl font-bold">
                    Go Back
                </button>
            </div>
        );
    }

    // Pehle episode ka poster as a background banner use karne ke liye
    const showBanner = episodes[0]?.poster || episodes[0]?.thumbnail || FALLBACK_THUMBNAIL;

    return (
        <div className="space-y-8 max-w-5xl mx-auto w-full py-6 px-4">

            {/* Top Navigation Row */}
            <div className="flex items-center justify-between">
                <button onClick={() => navigate(-1)} className="text-brand-orange font-bold text-sm hover:underline flex items-center gap-2">
                    ← Back to TV Shows
                </button>
            </div>

            {/* Show Banner / Header */}
            <div className="relative w-full rounded-3xl bg-neutral-900 aspect-[21/6] overflow-hidden shadow-xl border border-neutral-800 flex items-end">
                <div 
                    className="absolute inset-0 bg-cover bg-center opacity-40"
                    style={{ backgroundImage: `url(${showBanner})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                <div className="relative z-10 p-6 sm:p-10 w-full">
                    <span className="bg-brand-orange text-[10px] text-white font-black tracking-widest px-3 py-1 rounded shadow-md uppercase mb-3 inline-block">
                        All Episodes
                    </span>
                    <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md">
                        Season Episodes
                    </h1>
                    <p className="text-sm text-gray-300 font-medium mt-2">
                        Select an episode below to start streaming.
                    </p>
                </div>
            </div>

            {/* Episodes List */}
            <div className="space-y-4">
                <div className="flex justify-between items-center mb-2 border-b border-gray-200 pb-3">
                    <h3 className="text-xl font-black text-gray-900">Episodes List</h3>
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                        {episodes.length} Episodes Available
                    </span>
                </div>

                <div className="flex flex-col gap-4">
                    {episodes.map((ep) => (
                        <div
                            key={ep._id}
                            // Yahan par hum standalone video player page par bhej rahe hain
                            onClick={() => navigate(`/watch-episode/${ep._id}`)} 
                            className="bg-white border border-gray-200 hover:border-brand-orange/50 hover:shadow-md rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row gap-4 sm:gap-6 group cursor-pointer transition-all duration-300"
                        >
                            {/* Episode Thumbnail */}
                            <div className="w-full sm:w-48 md:w-56 aspect-video bg-neutral-900 rounded-xl overflow-hidden relative flex-shrink-0 shadow-inner">
                                <img
                                    src={
                                      ep.thumbnail && ep.thumbnail.trim() !== ""
                                        ? ep.thumbnail
                                        : ep.poster && ep.poster.trim() !== ""
                                          ? ep.poster
                                          : FALLBACK_THUMBNAIL
                                    }
                                    alt={ep.title}
                                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <div className="w-12 h-12 bg-brand-orange text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                        <FaPlay />
                                    </div>
                                </div>
                                {ep.isPremium && (
                                    <span className="absolute top-2 left-2 bg-brand-orange text-[8px] text-white font-black px-1.5 py-0.5 rounded shadow-sm uppercase">
                                        PRO
                                    </span>
                                )}
                            </div>

                            {/* Episode Details */}
                            <div className="flex flex-col justify-center flex-1 min-w-0 py-1">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-black text-brand-orange uppercase tracking-wider bg-orange-50 px-2 py-0.5 rounded">
                                        Episode {ep.episodeNumber || '-'}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                        <FaRegClock className="text-gray-400" />
                                        {ep.duration ? `${ep.duration} mins` : "Standard"}
                                    </div>
                                </div>
                                
                                <h4 className="text-lg sm:text-xl font-extrabold text-gray-900 group-hover:text-brand-orange transition-colors truncate">
                                    {ep.title || "Untitled Episode"}
                                </h4>
                                
                                <p className="text-sm text-gray-500 font-medium leading-relaxed mt-2 line-clamp-2 sm:line-clamp-3">
                                    {ep.description || "Get ready for an exciting new episode. Click to start streaming in HD quality."}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default TvShowEpisodesPage;