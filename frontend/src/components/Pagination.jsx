import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./Pagination.css";

export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(
          1,
          "...",
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        pages.push(
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages
        );
      }
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="cw-pagination-wrapper">
      <div className="cw-pagination-info">
        Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of <strong>{totalItems}</strong> entries
      </div>

      <div className="cw-pagination-controls">
        <button
          type="button"
          className="cw-pg-btn cw-pg-prev"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
          <span>Prev</span>
        </button>

        <div className="cw-pg-numbers">
          {pages.map((p, idx) =>
            p === "..." ? (
              <span key={`ellipsis-${idx}`} className="cw-pg-ellipsis">
                •••
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={`cw-pg-num ${p === currentPage ? "active" : ""}`}
                onClick={() => onPageChange(p)}
                aria-current={p === currentPage ? "page" : undefined}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          className="cw-pg-btn cw-pg-next"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

