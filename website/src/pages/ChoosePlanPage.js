import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';

const ChoosePlanPage = () => {
  // const navigate = useNavigate();
  const [activePlanId, setActivePlanId] = useState('p1');

  const catalogPlans = [
    { id: 'p1', title: 'Test Plan Descriptor', price: '1', cycle: 'Fixed Block Term', features: ['All content tier access privileges', 'Complete Ad-free Streaming Matrix', 'Standard SD Quality video processing resolution'] },
    { id: 'p2', title: 'Premium Annual Plan', price: '1499', cycle: 'per 12-month sequence billing', features: ['All content tier access privileges', 'Complete Ad-free Streaming Matrix', 'Cinematic Ultra HD 4K high fidelity resolution'] },
    { id: 'p3', title: 'Premium Monthly Plan', price: '149', cycle: 'per 30-day structural row billing', features: ['All content tier access privileges', 'Complete Ad-free Streaming Matrix', 'Standard Full HD high display resolution'] }
  ];

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      <div className="text-center md:text-left border-b border-gray-200 pb-4">
        <h1 className="text-xl sm:text-3xl font-black tracking-tight text-gray-800">Select Access Membership Subscription</h1>
        <p className="text-xs sm:text-base text-gray-500 mt-1">Unlock premium high bit-rate assets streams directly from streaming microservices.</p>
      </div>

      {/* Grid Layout Cards Adaptive Grid Context */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {catalogPlans.map((plan) => (
          <div
            key={plan.id}
            onClick={() => setActivePlanId(plan.id)}
            className={`bg-white border rounded-2xl p-6 cursor-pointer flex flex-col justify-between min-h-[320px] transform transition-all ${
              activePlanId === plan.id 
                ? 'border-brand-orange ring-2 ring-brand-orange/20 shadow-md scale-[1.01]' 
                : 'border-gray-200 hover:border-gray-300 shadow-sm'
            }`}
          >
            <div>
              <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-gray-800 tracking-tight">{plan.title}</h3>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-0.5">{plan.cycle}</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-brand-orange">₹{plan.price}</span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {plan.features.map((feat, index) => (
                  <div key={index} className="flex items-start gap-2.5 text-xs text-gray-600 font-medium leading-relaxed">
                    <span className="text-green-500 font-bold text-sm">✓</span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button 
              className={`w-full font-bold py-3 px-4 rounded-xl text-xs sm:text-sm tracking-wide transition shadow-sm ${
                activePlanId === plan.id 
                  ? 'bg-brand-orange text-white hover:bg-brand-orange/90' 
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              onClick={(e) => { e.stopPropagation(); alert('Redirecting to secure merchant processing token configuration setup...'); }}
            >
              {activePlanId === plan.id ? 'Activate Package Plan Now' : 'Select Package Option'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChoosePlanPage;