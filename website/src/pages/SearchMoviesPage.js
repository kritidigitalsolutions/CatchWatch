import React, { useState } from 'react';

const SearchMoviesPage = () => {
  const [queryState, setQueryState] = useState('');
  
  const [contentCollection] = useState([
    { id: 's1', title: 'Rugna The Film', category: 'Movie', year: '2022' },
    { id: 's2', title: 'bab INT Low res', category: 'Movie', year: '2022' },
    { id: 's3', title: 'ADITC-PART1', category: 'Movie', year: 'Production' },
    { id: 's4', title: 'The Past', category: 'Movie', year: '2018' },
    { id: 's5', title: 'ADITC-PART2', category: 'Movie', year: 'Production' }
  ]);

  const searchResults = contentCollection.filter(item => 
    item.title.toLowerCase().includes(queryState.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      {/* Floating Input Search Interface Component */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-4 flex items-center gap-4 group focus-within:border-brand-orange transition">
        <span className="text-xl text-gray-400">🔍</span>
        <input 
          type="text" 
          placeholder="Search Movies & Reels..." 
          value={queryState}
          onChange={(e) => setQueryState(e.target.value)}
          className="w-full border-none text-base outline-none text-gray-800 font-medium placeholder-gray-400" 
        />
        {queryState && (
          <button onClick={() => setQueryState('')} className="text-gray-400 hover:text-gray-600 font-bold text-sm">✕</button>
        )}
      </div>

      {/* Target Content Feed Display View */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
        <h3 className="text-base font-extrabold text-gray-500 border-b border-gray-100 pb-3 mb-4 uppercase tracking-wider">
          {queryState ? `Search Matches (${searchResults.length})` : 'Recommended for You'}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {searchResults.map((item) => (
            <div 
              key={item.id} 
              className="flex items-center justify-between bg-brand-light-bg/30 hover:bg-brand-light-bg/60 p-3.5 rounded-xl border border-gray-100 group cursor-pointer transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gray-200 text-gray-400 flex items-center justify-center text-xl font-bold shadow-inner">
                  🎬
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800 group-hover:text-brand-orange transition">{item.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{item.category} • {item.year}</div>
                </div>
              </div>
              <div className="text-gray-300 group-hover:text-brand-orange font-bold transition-all transform group-hover:translate-x-1 pr-1">
                ➔
              </div>
            </div>
          ))}

          {searchResults.length === 0 && (
            <div className="col-span-full text-center py-12 text-sm text-gray-400 font-medium">
              No dynamic catalog results matching "{queryState}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchMoviesPage;