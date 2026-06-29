import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlay } from "react-icons/fa";

const HomePage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();
  // const [activeTab, setActiveTab] = useState("All Shows");

  const [trendingMovies] = useState([
    {
      id: "m1",
      
      title: "The Past",
      rating: "9.0",
      genre: "Horror • Thriller",
      isPremium: true,
    },
    {
      id: "m2",
      title: "Rugna The Film",
      rating: "8.5",
      genre: "Drama",
      isPremium: false,
    },
    {
      id: "m3",
      title: "bab INT Low res",
      rating: "0.0",
      genre: "Action",
      isPremium: false,
    },
    {
      id: "m3b",
      title: "ADITC-PART2",
      rating: "6.4",
      genre: "Thriller",
      isPremium: true,
    },
  ]);

  const [recommendedMovies] = useState([
    {
      id: "m4",
      image: "https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=400&auto=format&fit=crop",
      title: "The Past",
      rating: "9.0",
      genre: "Horror",
      isPremium: true,
    },
    {
      id: "m5",
      image: "https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=400&auto=format&fit=crop",
      title: "bab INT Low res",
      rating: "0.0",
      genre: "Action",
      isPremium: false,
    },
    {
      id: "m6",
      title: "metadoor",
      image: "https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=400&auto=format&fit=crop",
      rating: "0.0",
      genre: "Thriller",
      isPremium: false,
    },
    {
      id: "m7",
      image: "https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=400&auto=format&fit=crop",
      title: "ADITC-PART1",
      rating: "7.2",
      genre: "Drama",
      isPremium: false,
    },
    {
      id: "m8",
      image: "https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=400&auto=format&fit=crop",
      title: "Rugna The Film",
      rating: "8.5",
      genre: "Drama",
      isPremium: false,
    },
    {
      id: "m9",
      image: "https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=400&auto=format&fit=crop",
      title: "ADITC-PART2",
      rating: "0.0",
      genre: "Sci-Fi",
      isPremium: true,
    },
  ]);
  // const navigate = useNavigate();

  // Mock Top 10 data array - Add real cover banners and plug this into your backend pipeline later
  const topTenMovies = [
    {
      id: "top1",
      title: "The Past",
      rating: "9.0",
      image:
        "https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=400&auto=format&fit=crop",
      isPremium: true,
    },
    {
      id: "top2",
      title: "Rugna The Film",
      rating: "8.5",
      image:
        "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400&auto=format&fit=crop",
      isPremium: false,
    },
    {
      id: "top3",
      title: "ADITC-PART2",
      rating: "7.5",
      image:
        "https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=400&auto=format&fit=crop",
      isPremium: true,
    },
    {
      id: "top4",
      title: "metadoor",
      rating: "6.8",
      image:
        "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=400&auto=format&fit=crop",
      isPremium: false,
    },
    {
      id: "top5",
      title: "bab INT Low res",
      rating: "4.2",
      image:
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=400&auto=format&fit=crop",
      isPremium: false,
    },
    {
      id: "top6",
      title: "bab INT Low res",
      rating: "4.2",
      image:
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=400&auto=format&fit=crop",
      isPremium: false,
    },
    {
      id: "top7",
      title: "bab INT Low res",
      rating: "4.2",
      image:
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=400&auto=format&fit=crop",
      isPremium: false,
    },
    {
      id: "top8",
      title: "bab INT Low res",
      rating: "4.2",
      image:
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=400&auto=format&fit=crop",
      isPremium: false,
    },
    {
      id: "top9",
      title: "bab INT Low res",
      rating: "4.2",
      image:
        "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=400&auto=format&fit=crop",
      isPremium: false,
    },
  ];

  // Dynamic Carousel Dataset - Replace slide background images with your API backend URL path maps later
  const carouselSlides = [
    {
      id: "slide1",
      title: "THE PAST",
      tag: "Featured Trailer",
      subText: "OFFICIAL MOVIE CINEMATIC • RELEASED STREAM",
      image:
        "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200&auto=format&fit=crop", // Replace with your standard poster image asset
    },
    {
      id: "slide2",
      title: "RUGNA THE FILM",
      tag: "Trending Hit",
      subText: "EXCLUSIVELY STREAMING • AWARD WINNER 2022",
      image:
        "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop", // Replace with your standard poster image asset
    },
    {
      id: "slide3",
      title: "ADITC SERIES",
      tag: "New TV Show",
      subText: "SEASON 2 DISCOVERY EPISODES • ONGOING STREAM",
      image:
        "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop", // Replace with your standard poster image asset
    },
  ];

  // Automatic slow loop transition interval (Changes slide every 5 seconds)
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) =>
        prev === carouselSlides.length - 1 ? 0 : prev + 1,
      );
    }, 5000);

    return () => clearInterval(slideTimer);
  }, [carouselSlides.length]);
  // const tabs = ['All Shows', 'Movies', 'Short Films', 'TV Shows'];

  return (
    <div className="space-y-6 md:space-y-10">
      {/* Featured Video Banner Frame */}
      <div className="relative w-full rounded-2xl bg-neutral-900 aspect-[16/9] md:aspect-[21/9] overflow-hidden shadow-lg group">
        {/* Slider Core Container */}
        <div
          className="h-full w-full flex transition-transform duration-1000 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {carouselSlides.map((slide) => (
            <div
              key={slide.id}
              className="w-full h-full flex-shrink-0 relative flex flex-col justify-center items-center p-6 text-center text-white"
            >
              {/* Background Image Layer Segment */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url(${slide.image})` }}
              />

              {/* Deep Dark Overlay for absolute text visibility readability mapping */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/40 z-0" />

              {/* Content Context Block Display Layer */}
              <div className="relative z-10 max-w-xl space-y-2 select-none">
                <span className="inline-block bg-brand-orange text-[10px] md:text-xs font-black tracking-widest px-3 py-1 rounded-full uppercase shadow">
                  {slide.tag}
                </span>
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight drop-shadow-md">
                  {slide.title}
                </h2>
                <p className="text-brand-orange text-[10px] sm:text-xs md:text-sm font-bold tracking-wider drop-shadow">
                  {slide.subText}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Manual Interactive Dot Navigation Button Overlays */}
        <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center items-center gap-2.5">
          {carouselSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                currentSlide === index
                  ? "w-7 bg-brand-orange"
                  : "w-2.5 bg-white/40 hover:bg-white/70"
              }`}
              aria-label={`Go to slider panel view page index ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* 1. UPGRADED:  Trending Now Slider Section */}
      <div>
        <div className="flex justify-between items-center mb-5" >
          <h3 className="text-xl md:text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
            <span></span> Trending Now
          </h3>
          <button
            onClick={() => navigate("/explore?context=trending")}
            className="text-brand-orange text-xs md:text-sm font-bold tracking-wide hover:underline bg-brand-orange/5 px-3 py-1.5 rounded-xl transition"
          >
            More Content →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5" onClick={() => navigate("//watch/:123456789")}>
          {trendingMovies?.map((movie) => (
            <div
              key={movie.id}
              className="relative bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group hover:shadow-xl hover:-translate-y-1 transform transition-all duration-300 cursor-pointer flex flex-col"
            >
              {movie.isPremium && (
                <span className="absolute top-3 left-3 z-20 bg-brand-orange text-[9px] text-white font-black tracking-widest px-2.5 py-0.5 rounded-lg shadow-md uppercase">
                  Premium
                </span>
              )}

              {/* Image Container with Dynamic Gradient Overlay */}
              <div className="w-full aspect-[2/3] bg-neutral-900 relative overflow-hidden">
                <img
                  src={
                    movie.image ||
                    "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400&auto=format&fit=crop"
                  }
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="w-12 h-12 bg-brand-orange text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg shadow-brand-orange/40 scale-75 group-hover:scale-100 transform transition-transform duration-300">
                    <FaPlay />
                  </div>
                </div>
              </div>

              {/* Movie Meta Information */}
              <div className="p-3.5 bg-white flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-gray-800 line-clamp-1 group-hover:text-brand-orange transition-colors">
                    {movie.title}
                  </h4>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">
                    {movie.genre || "Action • Cinema"}
                  </p>
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-gray-50 pt-2 text-[11px] font-bold text-gray-500">
                  <span className="bg-brand-light-bg text-brand-orange px-2 py-0.5 rounded-md">
                    ⭐ {movie.rating || "8.0"}
                  </span>
                  <span>HD Stream</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. NEW CATEGORY:  Top 10 Global Leaderboard Row */}
      <div>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl md:text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
            <span></span> Top 10 Global Hits
          </h3>
          <button
            onClick={() => navigate("/charts")}
            className="text-brand-orange text-xs md:text-sm font-bold tracking-wide hover:underline bg-brand-orange/5 px-3 py-1.5 rounded-xl transition"
          >
            View Charts →
          </button>
        </div>

        {/* Horizontal Slider Track for Top 10 Cards */}
        <div className="flex gap-6 overflow-x-auto pb-4 pt-2 px-1 overflow-y-hidden hide-scrollbar snap-x" onClick={() => navigate("//watch/:123456789")}>
          {topTenMovies.map((movie, index) => (
            <div
              key={movie.id}
              className="flex-shrink-0 w-[140px]  sm:w-[160px] relative snap-start group cursor-pointer pl-8 sm:pl-12"
            >
              {/* Massive Rank Backdrop Numbers */}
              <span className="absolute left-[-10px] bottom-[-16px] text-7xl sm:text-9xl font-black tracking-tighter text-gray-200 select-none z-0 transition-colors group-hover:text-brand-orange/10 duration-300">
                {index + 1}
              </span>

              {/* Compact Card with Overlay */}
              <div className="relative z-10 bg-neutral-900 rounded-2xl overflow-hidden shadow-md aspect-[2/3] border border-white/10">
                <img
                  src={movie.image}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-3 flex flex-col justify-end">
                  <h4 className="text-white font-bold text-xs sm:text-sm truncate drop-shadow">
                    {movie.title}
                  </h4>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-brand-orange font-bold">
                      ⭐ {movie.rating}
                    </span>
                    {movie.isPremium && (
                      <span className="bg-brand-orange text-[7px] text-white font-black px-1 rounded">
                        PRO
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. UPGRADED:  Recommended Content Grid Layout Block */}
      <div>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl md:text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
            <span></span> Recommended Content
          </h3>
          <button
            onClick={() => navigate("/explore?context=recommended")}
            className="text-brand-orange text-xs md:text-sm font-bold tracking-wide hover:underline bg-brand-orange/5 px-3 py-1.5 rounded-xl transition"
          >
            See All →
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4" onClick={() => navigate("//watch/:123456789")}>
          {recommendedMovies?.map((movie) => (
            <div
              key={movie.id}
              className="relative bg-white border border-gray-100 rounded-2xl p-2 shadow-sm group hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div>
                {movie.isPremium && (
                  <span className="absolute top-3 left-3 z-10 bg-brand-orange text-[7px] text-white font-black px-1.5 py-0.5 rounded shadow-sm uppercase tracking-wider">
                    PRO
                  </span>
                )}

                <div className="w-full aspect-[2/3] bg-neutral-900 rounded-xl overflow-hidden relative shadow-inner">
                  <img
                    src={
                      movie.image ||
                      "https://images.unsplash.com/photo-1574375927938-d5a98e8edd86?q=80&w=400&auto=format&fit=crop"
                    }
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center text-brand-orange text-lg">
                    <span className="text-white text-2xl"><FaPlay /></span>
                  </div>
                </div>

                <div className="mt-2.5 font-bold text-xs sm:text-sm text-gray-800 truncate px-0.5 group-hover:text-brand-orange transition-colors">
                  {movie.title}
                </div>
              </div>

              <div className="text-[10px] sm:text-xs font-bold text-gray-500 flex items-center gap-1 mt-1.5 px-0.5">
                <span className="text-brand-orange">⭐</span>{" "}
                {movie.rating || "0.0"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
