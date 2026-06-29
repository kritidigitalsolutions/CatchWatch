import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlay } from "react-icons/fa";

const MoviesPage = () => {
  const navigate = useNavigate();

  // Filter States - Mapped directly to your Mongoose payload query parameters
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [sortOrder, setSortOrder] = useState("trending");
// const [isLoading, setIsLoading] = useState(true);
  // Dynamic Media Catalog State Array - Exactly matches your backend MongoDB Document keys
  const [moviesList, setMoviesList] = useState([
    {
      _id: "mv1",
      title: "The Past",
      slug: "the-past-1719600000000",
      description:
        "An evil return brings absolute darkness over the living space. Stream the highly anticipated standard horror masterpiece release exclusively on CatchWatch today.",
      genre: ["Horror", "Thriller"],
      releaseYear: 2018,
      duration: "2h",
      language: "Hindi",
      poster:
        "https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=500&auto=format&fit=crop",
      banner:
        "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200&auto=format&fit=crop",
      isPremium: true,
      rating: 9.0,
    },
    {
      _id: "mv2",
      title: "Rugna The Film",
      slug: "rugna-the-film-1719600000001",
      description:
        "An award-winning dramatic perspective showcasing complex reality timelines, human bonds, and system societal hierarchies.",
      genre: ["Drama"],
      releaseYear: 2022,
      duration: "2h 10m",
      language: "Hindi",
      poster:
        "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=500&auto=format&fit=crop",
      banner:
        "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop",
      isPremium: false,
      rating: 8.5,
    },
    {
      _id: "mv3",
      title: "bab INT Low res",
      slug: "bab-int-low-res-1719600000002",
      description:
        "High octane action layout configurations mapping traditional underground fights, street racing modules, and fast pursuit tracks.",
      genre: ["Action"],
      releaseYear: 2022,
      duration: "1h 58m",
      language: "Hindi",
      poster:
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=500&auto=format&fit=crop",
      banner:
        "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop",
      isPremium: false,
      rating: 4.2,
    },
    {
      _id: "mv3",
      title: "bab INT Low res",
      slug: "bab-int-low-res-1719600000002",
      description:
        "High octane action layout configurations mapping traditional underground fights, street racing modules, and fast pursuit tracks.",
      genre: ["Action"],
      releaseYear: 2022,
      duration: "1h 58m",
      language: "Hindi",
      poster:
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=500&auto=format&fit=crop",
      banner:
        "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop",
      isPremium: false,
      rating: 4.2,
    },
    {
      _id: "mv3",
      title: "bab INT Low res",
      slug: "bab-int-low-res-1719600000002",
      description:
        "High octane action layout configurations mapping traditional underground fights, street racing modules, and fast pursuit tracks.",
      genre: ["Action"],
      releaseYear: 2022,
      duration: "1h 58m",
      language: "Hindi",
      poster:
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=500&auto=format&fit=crop",
      banner:
        "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop",
      isPremium: false,
      rating: 4.2,
    },
    {
      _id: "mv3",
      title: "bab INT Low res",
      slug: "bab-int-low-res-1719600000002",
      description:
        "High octane action layout configurations mapping traditional underground fights, street racing modules, and fast pursuit tracks.",
      genre: ["Action"],
      releaseYear: 2022,
      duration: "1h 58m",
      language: "Hindi",
      poster:
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=500&auto=format&fit=crop",
      banner:
        "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop",
      isPremium: false,
      rating: 4.2,
    },
    {
      _id: "mv3",
      title: "bab INT Low res",
      slug: "bab-int-low-res-1719600000002",
      description:
        "High octane action layout configurations mapping traditional underground fights, street racing modules, and fast pursuit tracks.",
      genre: ["Action"],
      releaseYear: 2022,
      duration: "1h 58m",
      language: "Hindi",
      poster:
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=500&auto=format&fit=crop",
      banner:
        "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop",
      isPremium: false,
      rating: 4.2,
    },
    {
      _id: "mv3",
      title: "bab INT Low res",
      slug: "bab-int-low-res-1719600000002",
      description:
        "High octane action layout configurations mapping traditional underground fights, street racing modules, and fast pursuit tracks.",
      genre: ["Action"],
      releaseYear: 2022,
      duration: "1h 58m",
      language: "Hindi",
      poster:
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=500&auto=format&fit=crop",
      banner:
        "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop",
      isPremium: false,
      rating: 4.2,
    },
    {
      _id: "mv3",
      title: "bab INT Low res",
      slug: "bab-int-low-res-1719600000002",
      description:
        "High octane action layout configurations mapping traditional underground fights, street racing modules, and fast pursuit tracks.",
      genre: ["Action"],
      releaseYear: 2022,
      duration: "1h 58m",
      language: "Hindi",
      poster:
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=500&auto=format&fit=crop",
      banner:
        "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop",
      isPremium: false,
      rating: 4.2,
    },
    {
      _id: "mv3",
      title: "bab INT Low res",
      slug: "bab-int-low-res-1719600000002",
      description:
        "High octane action layout configurations mapping traditional underground fights, street racing modules, and fast pursuit tracks.",
      genre: ["Action"],
      releaseYear: 2022,
      duration: "1h 58m",
      language: "Hindi",
      poster:
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=500&auto=format&fit=crop",
      banner:
        "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop",
      isPremium: false,
      rating: 4.2,
    },
    {
      _id: "mv3",
      title: "bab INT Low res",
      slug: "bab-int-low-res-1719600000002",
      description:
        "High octane action layout configurations mapping traditional underground fights, street racing modules, and fast pursuit tracks.",
      genre: ["Action"],
      releaseYear: 2022,
      duration: "1h 58m",
      language: "Hindi",
      poster:
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=500&auto=format&fit=crop",
      banner:
        "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop",
      isPremium: false,
      rating: 4.2,
    },
    {
      _id: "mv4",
      title: "metadoor",
      slug: "metadoor-1719600000003",
      description:
        "A psychological thriller track detailing code sequences, corporate intelligence leaks, and memory trace anomalies.",
      genre: ["Thriller"],
      releaseYear: 2024,
      duration: "2h 05m",
      language: "English",
      poster:
        "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=500&auto=format&fit=crop",
      banner:
        "https://images.unsplash.com/photo-1574375927938-d5a98e8edd86?q=80&w=1200&auto=format&fit=crop",
      isPremium: false,
      rating: 6.8,
    },
    {
      _id: "mv5",
      title: "Dark Horizon",
      slug: "dark-horizon-1719600000004",
      description:
        "Interstellar mapping array explorations highlighting deep space vacuum wormholes and planetary gravitational physics anomalies.",
      genre: ["Sci-Fi", "Action"],
      releaseYear: 2025,
      duration: "2h 35m",
      language: "English",
      poster:
        "https://images.unsplash.com/photo-1574375927938-d5a98e8edd86?q=80&w=500&auto=format&fit=crop",
      banner:
        "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200&auto=format&fit=crop",
      isPremium: true,
      rating: 7.9,
    },
  ]);

  // Featured Spotlight Slide - Set dynamically to load the highest priority item from database
  const featuredMovie = moviesList[0];

  useEffect(() => {
    setMoviesList()
    // BACKEND DATABASE INTEGRATION HOOK NODE:
    // fetch(`/api/v1/movies?genre=${selectedGenre}&sort=${sortOrder}`)
    //   .then(res => res.json())
    //   .then(data => setMoviesList(data))
    //   .catch(err => console.error("Database query failed:", err));
    console.log(
      "API Engine Trigger: Fetching data objects from collection matching properties:",
      { selectedGenre, sortOrder },
    );
  }, [selectedGenre, sortOrder]);

  // Client-Side Array Filter Matching Algorithm
  const filteredMovies = moviesList.filter(
    (movie) => selectedGenre === "All" || movie.genre.includes(selectedGenre),
  );

  return (
    <div className="space-y-10 max-w-7xl mx-auto w-full px-1">
      {/* 1. CINEMATIC FEATURE SPOTLIGHT WINDOW PANEL */}
      {featuredMovie && (
        <div className="relative w-full rounded-3xl bg-neutral-950 aspect-[16/8] md:aspect-[21/8] overflow-hidden shadow-xl border border-neutral-900 group">
          {/* Rich Backdrop Asset Layer */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-1000 ease-out"
            style={{ backgroundImage: `url(${featuredMovie.banner})` }}
          />
          {/* Deep Linear Overlay Gradient mask to safeguard text readability contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/70 to-transparent z-10" />

          {/* Core Descriptive Context Overlay */}
          <div className="absolute inset-0 z-20 p-6 sm:p-10 md:p-14 flex flex-col justify-center max-w-xl text-white space-y-3 select-none">
            <span className="bg-brand-orange text-[9px] sm:text-[10px] font-black tracking-widest px-3 py-1 rounded-xl w-max uppercase shadow-md shadow-brand-orange/10">
              Featured Blockbuster
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black mb-1 tracking-tight drop-shadow-md group-hover:text-brand-orange transition-colors duration-300">
              {featuredMovie.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300 font-bold">
              <span>{featuredMovie.releaseYear}</span>
              <span>•</span>
              <span>{featuredMovie.duration}</span>
              <span>•</span>
              <span className="text-brand-orange">
                {featuredMovie.genre.join(" / ")}
              </span>
            </div>
            <p className="text-xs text-neutral-300 hidden sm:line-clamp-3 leading-relaxed font-medium">
              {featuredMovie.description}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => navigate(`/watch/${featuredMovie.slug}`)}
                className="bg-brand-orange hover:bg-brand-orange/90 text-white font-black text-xs px-6 py-3 rounded-xl transition shadow transform active:scale-95"
              >
                <span className="flex items-center gap-1">
                  <FaPlay /> Play Content
                </span>
              </button>
              <button className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-5 py-3 rounded-xl backdrop-blur transition transform active:scale-95">
                Add to Wishlist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADVANCED CONTROL CONSOLE FILTER PANEL */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between md:items-center">
        {/* Horizontal Genre Selector Stream */}
        <div className="flex gap-4 p-2 overflow-x-auto overflow-y-hidden hide-scrollbar snap-x">
          {["All", "Action", "Drama", "Horror", "Thriller", "Sci-Fi"].map(
            (genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide snap-start whitespace-nowrap transition-all duration-200 ${
                  selectedGenre === genre
                    ? "bg-brand-orange text-orange-600 shadow-md shadow-brand-orange/10 scale-105"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {genre}
              </button>
            ),
          )}
        </div>

        {/* Catalog Sort Options Menu */}
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-black text-gray-600 focus:outline-none focus:border-brand-orange cursor-pointer self-start md:self-auto shadow-inner"
        >
          <option value="trending">Sorting Track: Trending Hits</option>
          <option value="rating">
            Sorting Track: Critic Score (High - Low)
          </option>
          <option value="newest">
            Sorting Track: New Releases ({new Date().getFullYear()})
          </option>
        </select>
      </div>

      {/* 3. DYNAMIC CONTENT POSTER MATRIX GRID */}
      <div className="space-y-4">
        <h3 className="text-xl font-black tracking-tight text-gray-900 border-l-4 border-brand-orange pl-3">
          Cinema Movies Collection
        </h3>

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
    </div>
  );
};

export default MoviesPage;
