import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaPlay } from "react-icons/fa";

const ContentExplorerPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Detect context type from query params (e.g., /explore?type=trending)
  const queryParams = new URLSearchParams(location.search);
  const pageContext = queryParams.get('context') || 'Recommended'; 

  // Filter State Parameters - Connect these to your backend API payload
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [sortBy, setSortBy] = useState('popular');
  const [catalogItems] = useState([]);
  // Local Mock State Catalog Matrix
  const [moviesList] = useState([
    {
      _id: 'mv1',
      title: 'The Past',
      slug: 'the-past-1719600000000',
      description: 'An evil return brings absolute darkness over the living space. Stream the highly anticipated standard horror masterpiece release exclusively on CatchWatch today.',
      genre: ['Horror', 'Thriller'],
      releaseYear: 2018,
      duration: '2h',
      language: 'Hindi',
      poster: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=500&auto=format&fit=crop',
      banner: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200&auto=format&fit=crop',
      isPremium: true,
      rating: 9.0
    },
    {
      _id: 'mv2',
      title: 'Rugna The Film',
      slug: 'rugna-the-film-1719600000001',
      description: 'An award-winning dramatic perspective showcasing complex reality timelines, human bonds, and system societal hierarchies.',
      genre: ['Drama'],
      releaseYear: 2022,
      duration: '2h 10m',
      language: 'Hindi',
      poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=500&auto=format&fit=crop',
      banner: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop',
      isPremium: false,
      rating: 8.5
    },
    {
      _id: 'mv3',
      title: 'bab INT Low res',
      slug: 'bab-int-low-res-1719600000002',
      description: 'High octane action layout configurations mapping traditional underground fights, street racing modules, and fast pursuit tracks.',
      genre: ['Action'],
      releaseYear: 2022,
      duration: '1h 58m',
      language: 'Hindi',
      poster: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=500&auto=format&fit=crop',
      banner: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
      isPremium: false,
      rating: 4.2
    },
    {
      _id: 'mv3',
      title: 'bab INT Low res',
      slug: 'bab-int-low-res-1719600000002',
      description: 'High octane action layout configurations mapping traditional underground fights, street racing modules, and fast pursuit tracks.',
      genre: ['Action'],
      releaseYear: 2022,
      duration: '1h 58m',
      language: 'Hindi',
      poster: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=500&auto=format&fit=crop',
      banner: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
      isPremium: false,
      rating: 4.2
    },
    {
      _id: 'mv3',
      title: 'bab INT Low res',
      slug: 'bab-int-low-res-1719600000002',
      description: 'High octane action layout configurations mapping traditional underground fights, street racing modules, and fast pursuit tracks.',
      genre: ['Action'],
      releaseYear: 2022,
      duration: '1h 58m',
      language: 'Hindi',
      poster: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=500&auto=format&fit=crop',
      banner: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
      isPremium: false,
      rating: 4.2
    },
    {
      _id: 'mv3',
      title: 'bab INT Low res',
      slug: 'bab-int-low-res-1719600000002',
      description: 'High octane action layout configurations mapping traditional underground fights, street racing modules, and fast pursuit tracks.',
      genre: ['Action'],
      releaseYear: 2022,
      duration: '1h 58m',
      language: 'Hindi',
      poster: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=500&auto=format&fit=crop',
      banner: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
      isPremium: false,
      rating: 4.2
    },
    {
      _id: 'mv3',
      title: 'bab INT Low res',
      slug: 'bab-int-low-res-1719600000002',
      description: 'High octane action layout configurations mapping traditional underground fights, street racing modules, and fast pursuit tracks.',
      genre: ['Action'],
      releaseYear: 2022,
      duration: '1h 58m',
      language: 'Hindi',
      poster: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=500&auto=format&fit=crop',
      banner: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
      isPremium: false,
      rating: 4.2
    },
    {
      _id: 'mv3',
      title: 'bab INT Low res',
      slug: 'bab-int-low-res-1719600000002',
      description: 'High octane action layout configurations mapping traditional underground fights, street racing modules, and fast pursuit tracks.',
      genre: ['Action'],
      releaseYear: 2022,
      duration: '1h 58m',
      language: 'Hindi',
      poster: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=500&auto=format&fit=crop',
      banner: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
      isPremium: false,
      rating: 4.2
    },
    {
      _id: 'mv3',
      title: 'bab INT Low res',
      slug: 'bab-int-low-res-1719600000002',
      description: 'High octane action layout configurations mapping traditional underground fights, street racing modules, and fast pursuit tracks.',
      genre: ['Action'],
      releaseYear: 2022,
      duration: '1h 58m',
      language: 'Hindi',
      poster: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=500&auto=format&fit=crop',
      banner: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
      isPremium: false,
      rating: 4.2
    },
    {
      _id: 'mv3',
      title: 'bab INT Low res',
      slug: 'bab-int-low-res-1719600000002',
      description: 'High octane action layout configurations mapping traditional underground fights, street racing modules, and fast pursuit tracks.',
      genre: ['Action'],
      releaseYear: 2022,
      duration: '1h 58m',
      language: 'Hindi',
      poster: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=500&auto=format&fit=crop',
      banner: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
      isPremium: false,
      rating: 4.2
    },
    {
      _id: 'mv3',
      title: 'bab INT Low res',
      slug: 'bab-int-low-res-1719600000002',
      description: 'High octane action layout configurations mapping traditional underground fights, street racing modules, and fast pursuit tracks.',
      genre: ['Action'],
      releaseYear: 2022,
      duration: '1h 58m',
      language: 'Hindi',
      poster: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=500&auto=format&fit=crop',
      banner: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
      isPremium: false,
      rating: 4.2
    },
    {
      _id: 'mv4',
      title: 'metadoor',
      slug: 'metadoor-1719600000003',
      description: 'A psychological thriller track detailing code sequences, corporate intelligence leaks, and memory trace anomalies.',
      genre: ['Thriller'],
      releaseYear: 2024,
      duration: '2h 05m',
      language: 'English',
      poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=500&auto=format&fit=crop',
      banner: 'https://images.unsplash.com/photo-1574375927938-d5a98e8edd86?q=80&w=1200&auto=format&fit=crop',
      isPremium: false,
      rating: 6.8
    },

  ]);

  // Hook to fetch backend data whenever filters mutate
  useEffect(() => {
    // BACKEND INTEGRATION PLACEHOLDER:
    // fetch(`https://api.catchwatch.com/v1/content?context=${pageContext}&genre=${selectedGenre}&type=${selectedType}&sort=${sortBy}`)
    //   .then(res => res.json())
    //   .then(data => setCatalogItems(data));
    console.log(`API Trigger: Fetching ${pageContext} data with:`, { selectedGenre, selectedType, sortBy });
  }, [pageContext, selectedGenre, selectedType, sortBy]);

  // Client-side fallback rendering filter logic
  const filteredCatalog = catalogItems.filter(item => {
    if (pageContext.toLowerCase() === 'trending' && !item.isTrending) return false;
    if (selectedGenre !== 'All' && item.genre !== selectedGenre) return false;
    if (selectedType !== 'All' && item.type !== selectedType) return false;
    return true;
  });
    // Client-Side Array Filter Matching Algorithm
  const filteredMovies = moviesList.filter(
    (movie) => selectedGenre === "All" || movie.genre.includes(selectedGenre),
  );


  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      {/* Dynamic Header Segment */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <button onClick={() => navigate(-1)} className="text-brand-orange font-bold text-sm mb-1 hover:underline flex items-center gap-1">
            ← Go Back
          </button>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight capitalize">
            Discover {pageContext} Content
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Explore comprehensive system media catalogs filtered in real-time.</p>
        </div>
        
        <div className="bg-brand-light-bg text-brand-orange text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl border border-brand-orange/10 self-start sm:self-auto">
          Displaying {filteredCatalog.length} Matches
        </div>
      </div>

      {/* Advanced Filter Management Console Panel */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Media Classification Type</label>
          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:border-brand-orange cursor-pointer"
          >
            <option value="All">All Formats</option>
            <option value="Movie">Cinematic Movies</option>
            <option value="TV Show">TV Shows</option>
            <option value="Short Film">Short Films / Reels</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Genre Specification</label>
          <select 
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:border-brand-orange cursor-pointer"
          >
            <option value="All">All Genres</option>
            <option value="Horror">Horror</option>
            <option value="Action">Action</option>
            <option value="Drama">Drama</option>
            <option value="Thriller">Thriller</option>
            <option value="Sci-Fi">Sci-Fi</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Sort Sequences</label>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:border-brand-orange cursor-pointer"
          >
            <option value="popular">System Metrics: High Popularity</option>
            <option value="rating">Critic Review: High Rating</option>
            <option value="newest">Chronological Row: Newest First</option>
          </select>
        </div>
      </div>

      {/* Dynamic Grid Distribution Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {filteredMovies.map((movie) => (
                  <div
                    key={movie._id}
                    onClick={() => navigate(`/watch/${movie.slug}`)}
                    className="relative bg-white border border-gray-100 rounded-2xl p-2.5 shadow-sm group hover:shadow-xl hover:-translate-y-1 transform transition-all duration-300 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Premium Badge Access Lock Indicator */}
                      {movie.isPremium && (
                        <span className="absolute top-4 left-4 z-10 bg-brand-orange text-[8px] text-white font-black tracking-widest px-2 py-0.5 rounded shadow-md uppercase">
                          Premium
                        </span>
                      )}
      
                      {/* Immersive Poster Image Box */}
                      <div className="w-full aspect-[2/3] bg-neutral-900 rounded-xl overflow-hidden relative shadow-inner">
                        <img
                          src={movie.poster}
                          alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90"
                          loading="lazy"
                        />
                        {/* Hover Floating Play overlay trigger state */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <div className="w-11 h-11 bg-brand-orange text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
                            <FaPlay />
                          </div>
                        </div>
                      </div>
      
                      {/* Text Metadata Details Layer */}
                      <div className="mt-3 font-extrabold text-sm text-gray-800 line-clamp-1 group-hover:text-brand-orange transition-colors duration-200 px-0.5">
                        {movie.title}
                      </div>
                      <div className="text-[11px] text-gray-400 font-bold mt-0.5 px-0.5">
                        {movie.genre.join(" / ")} • {movie.releaseYear}
                      </div>
                    </div>
      
                    {/* Dynamic Score Badge Layer Row Footer */}
                    <div className="mt-3 bg-brand-light-bg/50 border border-brand-orange/5 px-2 py-1 rounded-lg text-[10px] font-black text-brand-orange w-max flex items-center gap-1">
                      ⭐ {movie.rating.toFixed(1)}
                    </div>
                  </div>
                ))}
      
                {/* Empty Query Matrix Feedback Block State */}
                {filteredMovies.length === 0 && (
                  <div className="col-span-full bg-white border border-gray-100 rounded-2xl p-16 text-center text-sm font-semibold text-gray-400 shadow-sm">
                    No movie productions matching the current context sequence values
                    exist in the database.
                  </div>
                )}
              </div>
    </div>
  );
};

export default ContentExplorerPage;