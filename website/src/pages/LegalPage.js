import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaFileContract } from 'react-icons/fa';
import Loader from '../components/Loader';
import { getLegalDocByType } from '../api/legalApi';

const LegalPage = () => {
  // URL se dynamic 'type' extract karein (e.g., 'terms', 'privacy-policy')
  const { type } = useParams(); 
  const navigate = useNavigate();

  const [legalData, setLegalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLegalData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // API call with dynamic type
        const response = await getLegalDocByType(type); 
        const data = response?.document || response?.data || response;
        
        if (data && (data.content || data.text)) {
          setLegalData(data);
        } else {
          // Fallback if data structure is missing content
          setError(`Document for ${type} is empty or not formatted correctly.`);
        }
      } catch (err) {
        console.error(`API Error fetching ${type}:`, err);
        setError(`The document for ${type.replace('-', ' ')} is currently unavailable. (Error 404)`);
      } finally {
        setIsLoading(false);
      }
    };

    if (type) fetchLegalData();
  }, [type]);

  // Dynamic Title generation for fallback
  const getPageTitle = () => {
    if (legalData?.title) return legalData.title;
    if (type === 'terms') return 'Terms & Conditions';
    if (type === 'privacy-policy') return 'Privacy Policy';
    if (type === 'refund-policy') return 'Refund Policy';
    return 'Legal Document';
  };

  const formatContentToHtml = (content) => {
    if (!content) return "";
    if (/<[a-z][\s\S]*>/i.test(content)) return content;
    
    return content
      .split(/\n\s*\n/)
      .map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return "";
        
        if (trimmed.startsWith("### ")) {
          return `<h3 class="text-base sm:text-lg font-bold text-gray-900 mt-4 mb-2">${trimmed.replace(/^###\s*/, "")}</h3>`;
        }
        if (trimmed.startsWith("## ")) {
          return `<h2 class="text-lg sm:text-xl font-black text-gray-955 mt-6 mb-3 border-b border-gray-100 pb-1">${trimmed.replace(/^##\s*/, "")}</h2>`;
        }
        if (trimmed.startsWith("# ")) {
          return `<h1 class="text-xl sm:text-2xl font-black text-gray-955 mt-8 mb-4">${trimmed.replace(/^#\s*/, "")}</h1>`;
        }
        
        if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
          return `<h2 class="text-lg sm:text-xl font-black text-gray-955 mt-6 mb-3 border-b border-gray-100 pb-1">${trimmed.replace(/\*\*/g, "")}</h2>`;
        }
        
        const lines = trimmed
          .split("\n")
          .map(line => line.trim())
          .filter(Boolean)
          .join("<br />");
          
        return `<p class="mb-4 text-gray-700 leading-relaxed font-medium text-justify">${lines}</p>`;
      })
      .filter(Boolean)
      .join("\n");
  };

  const formattedDate = legalData?.updatedAt 
    ? new Date(legalData.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US');

  if (isLoading) return <Loader />;

  if (error) {
    return (
      <div className="text-center p-20 text-gray-800 flex flex-col items-center gap-4">
        <h2 className="text-2xl font-bold capitalize">{type.replace('-', ' ')}</h2>
        <p className="text-gray-500">{error}</p>
        <p className="text-xs text-gray-400 mt-2">Hint: Check if this document exists in your MongoDB Database.</p>
        <button onClick={() => navigate(-1)} className="bg-brand-orange text-white px-6 py-2 rounded-xl font-bold mt-4">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 px-2 sm:px-0 py-6">
      <div className="bg-brand-orange text-white p-5 sm:p-6 rounded-2xl flex items-center gap-4 shadow-md">
        <button onClick={() => navigate(-1)} className="text-xl hover:scale-110 transition">
          <FaArrowLeft />
        </button>
        <h1 className="text-lg sm:text-2xl font-black tracking-tight flex items-center gap-2 capitalize">
          <FaFileContract /> {getPageTitle()}
        </h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10 space-y-8">
        <p className="text-sm text-gray-500 font-medium">Last updated: {formattedDate}</p>

        {legalData?.content ? (
          <div 
            className="prose prose-sm sm:prose-base max-w-none text-gray-600 prose-headings:text-gray-900 prose-a:text-brand-orange"
            dangerouslySetInnerHTML={{ __html: formatContentToHtml(legalData.content) }}
          />
        ) : (
          <div className="text-gray-600 text-sm">
            Content mapping failed. Check backend JSON structure.
          </div>
        )}
      </div>
    </div>
  );
};

export default LegalPage;